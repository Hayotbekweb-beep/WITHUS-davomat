import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from './firebase';
import { distanceM, isInside } from './geo';
import { dayKey, getShift, monthKey, scheduleFor } from './time';
import { Settings, UserProfile, WorkTask } from './types';

export const LOCATION_TASK = 'withus-location-task';
const STATE_KEY = 'withus-tracking-state';
const MAX_GAP_MS = 15 * 60000; // bundan uzun uzilish "signal yo'q" deb hisoblanadi
const AUTO_CLOSE_MS = 2 * 3600000; // smena tugaganidan 2 soat o'tib avtomatik yopiladi
const TASK_REFRESH_MS = 5 * 60000;

type Bucket = 'insideMs' | 'taskMs' | 'outsideMs' | 'unknownMs';
type TaskLite = Pick<WorkTask, 'id' | 'lat' | 'lng' | 'radius' | 'deadline' | 'status'>;

interface TrackingState {
  uid: string;
  name: string;
  sessionId: string;
  office: Settings['office'];
  scheduledEnd: number;
  lastTs: number;
  lastState: 'inside' | 'task' | 'outside';
  pending: Record<Bucket, number>;
  mocked: boolean;
  tasks: TaskLite[];
  tasksFetchedAt: number;
}

const emptyPending = (): Record<Bucket, number> => ({
  insideMs: 0,
  taskMs: 0,
  outsideMs: 0,
  unknownMs: 0,
});

export async function getTrackingState(): Promise<TrackingState | null> {
  const raw = await AsyncStorage.getItem(STATE_KEY);
  return raw ? (JSON.parse(raw) as TrackingState) : null;
}
const saveState = (s: TrackingState) => AsyncStorage.setItem(STATE_KEY, JSON.stringify(s));

// Expo Go (iOS) fonda geolokatsiyani qo'llamaydi — u holda faqat ilova ochiqligida kuzatiladi
export const backgroundSupported =
  !(Platform.OS === 'ios' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

async function refreshTasks(st: TrackingState) {
  const snap = await getDocs(query(collection(db, 'tasks'), where('uid', '==', st.uid)));
  st.tasks = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<WorkTask, 'id'>) }))
    .filter((t) => t.status === 'pending' || t.status === 'arrived')
    .map(({ id, lat, lng, radius, deadline, status }) => ({ id, lat, lng, radius, deadline, status }));
  st.tasksFetchedAt = Date.now();
}

let processing: Promise<void> = Promise.resolve();

// Fon vazifasi ham, ilova ochiq paytdagi kuzatuv ham shu funksiyani chaqiradi
export function handleLocations(locations: Location.LocationObject[]): Promise<void> {
  processing = processing.then(() => processLocations(locations)).catch(() => {});
  return processing;
}

async function processLocations(locations: Location.LocationObject[]) {
  const st = await getTrackingState();
  if (!st || !locations.length) return;
  await auth.authStateReady();
  if (!auth.currentUser || auth.currentUser.uid !== st.uid) return;

  if (Date.now() - st.tasksFetchedAt > TASK_REFRESH_MS) {
    await refreshTasks(st).catch(() => {});
  }

  const sorted = [...locations].sort((a, b) => a.timestamp - b.timestamp);
  const arrivals: { id: string; at: number; onTime: boolean }[] = [];
  let last: Location.LocationObject | null = null;

  for (const loc of sorted) {
    const ts = loc.timestamp;
    if (ts <= st.lastTs) continue;
    const { latitude: lat, longitude: lng, accuracy } = loc.coords;
    const inside = isInside(lat, lng, accuracy, st.office);

    for (const t of st.tasks) {
      if (t.status === 'pending' && distanceM(lat, lng, t.lat, t.lng) <= t.radius + Math.min(accuracy ?? 0, 50)) {
        t.status = 'arrived';
        arrivals.push({ id: t.id, at: ts, onTime: ts <= t.deadline });
      }
    }
    const onTask = st.tasks.some((t) => t.status === 'pending' || t.status === 'arrived');

    const delta = ts - st.lastTs;
    const prev: Bucket =
      st.lastState === 'inside' ? 'insideMs' : st.lastState === 'task' ? 'taskMs' : 'outsideMs';
    st.pending[delta <= MAX_GAP_MS ? prev : 'unknownMs'] += delta;

    st.lastTs = ts;
    st.lastState = inside ? 'inside' : onTask ? 'task' : 'outside';
    if (loc.mocked) st.mocked = true;
    last = loc;
  }
  if (!last) return;

  // Avval lokal holat saqlanadi, keyin serverga yoziladi; tarmoq bo'lmasa
  // pending qiymatlar keyingi safar yuboriladi.
  await saveState(st);
  const p = st.pending;
  await updateDoc(doc(db, 'sessions', st.sessionId), {
    insideMs: increment(p.insideMs),
    taskMs: increment(p.taskMs),
    outsideMs: increment(p.outsideMs),
    unknownMs: increment(p.unknownMs),
    lastTs: st.lastTs,
    lastState: st.lastState,
    ...(st.mocked ? { mockDetected: true } : {}),
  });
  st.pending = emptyPending();
  await saveState(st);

  await setDoc(doc(db, 'live', st.uid), {
    uid: st.uid,
    name: st.name,
    sessionId: st.sessionId,
    lat: last.coords.latitude,
    lng: last.coords.longitude,
    accuracy: last.coords.accuracy ?? 0,
    ts: last.timestamp,
    inside: st.lastState === 'inside',
    mocked: !!last.mocked,
  });

  for (const a of arrivals) {
    await updateDoc(doc(db, 'tasks', a.id), { status: 'arrived', arrivedAt: a.at, onTime: a.onTime });
  }

  if (st.lastTs > st.scheduledEnd + AUTO_CLOSE_MS) {
    await finishSession(st, st.lastTs, st.lastState !== 'inside');
  }
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  await handleLocations(data.locations);
});

async function startBackgroundUpdates() {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 60000,
    distanceInterval: 0,
    deferredUpdatesInterval: 60000,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Other,
    foregroundService: {
      notificationTitle: 'WITHUS davomat',
      notificationBody: 'Ish vaqti kuzatilmoqda. Ishni tugatganda "Tugatish" ni bosing.',
      notificationColor: '#0B5FFF',
      killServiceOnDestroy: false,
    },
  });
}

export async function ensurePermissions(): Promise<{ background: boolean }> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    throw new Error("Geolokatsiyaga ruxsat berilmadi. Telefon sozlamalaridan ruxsat bering.");
  }
  if (!backgroundSupported) return { background: false };
  const bg = await Location.requestBackgroundPermissionsAsync();
  return { background: bg.status === 'granted' };
}

export async function checkIn(profile: UserProfile, settings: Settings) {
  const { background } = await ensurePermissions();
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
  const { latitude: lat, longitude: lng, accuracy } = loc.coords;
  if (loc.mocked) throw new Error("Soxta joylashuv (Fake GPS) aniqlandi. Uni o'chiring.");
  if (!isInside(lat, lng, accuracy, settings.office)) {
    const d = Math.round(distanceM(lat, lng, settings.office.lat, settings.office.lng));
    throw new Error(`Siz ofis hududida emassiz (ofisdan ${d} m uzoqdasiz). Ishni ofisda boshlang.`);
  }

  const now = Date.now();
  const shift = getShift(settings, profile.shift);
  const sched = scheduleFor(shift, now);
  const lateMinutes = Math.max(0, Math.round((now - sched.start) / 60000));

  const ref = await addDoc(collection(db, 'sessions'), {
    uid: profile.uid,
    name: profile.name,
    shift: shift.id,
    month: monthKey(sched.start),
    day: dayKey(sched.start),
    scheduledStart: sched.start,
    scheduledEnd: sched.end,
    start: now,
    end: null,
    lateMinutes,
    insideMs: 0,
    taskMs: 0,
    outsideMs: 0,
    unknownMs: 0,
    lastTs: now,
    lastState: 'inside',
    mockDetected: false,
    background,
  });

  const st: TrackingState = {
    uid: profile.uid,
    name: profile.name,
    sessionId: ref.id,
    office: settings.office,
    scheduledEnd: sched.end,
    lastTs: now,
    lastState: 'inside',
    pending: emptyPending(),
    mocked: false,
    tasks: [],
    tasksFetchedAt: 0,
  };
  await saveState(st);
  await setDoc(doc(db, 'live', profile.uid), {
    uid: profile.uid,
    name: profile.name,
    sessionId: ref.id,
    lat,
    lng,
    accuracy: accuracy ?? 0,
    ts: now,
    inside: true,
    mocked: false,
  });
  if (background) await startBackgroundUpdates();
  return { lateMinutes, background };
}

async function finishSession(st: TrackingState, end: number, outside: boolean) {
  await updateDoc(doc(db, 'sessions', st.sessionId), { end, endedOutside: outside });
  await updateDoc(doc(db, 'live', st.uid), { sessionId: null, ts: end });
  await AsyncStorage.removeItem(STATE_KEY);
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

export async function checkOut() {
  const st = await getTrackingState();
  if (!st) return;
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await handleLocations([loc]);
  } catch {
    // joylashuv olinmasa ham ishni yopamiz
  }
  const fresh = (await getTrackingState()) ?? st;
  await finishSession(fresh, Date.now(), fresh.lastState !== 'inside');
}

// Ilova qayta ochilganda fon kuzatuvi to'xtab qolgan bo'lsa qayta yoqiladi
export async function resumeIfNeeded(): Promise<boolean> {
  const st = await getTrackingState();
  if (!st) return false;
  if (backgroundSupported) {
    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.status === 'granted') await startBackgroundUpdates().catch(() => {});
  }
  return true;
}

export async function markTaskLocal(id: string, status: WorkTask['status']) {
  const st = await getTrackingState();
  if (!st) return;
  st.tasks = st.tasks.map((t) => (t.id === id ? { ...t, status } : t));
  await saveState(st);
}
