import * as Location from 'expo-location';
import { signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Card, colors, H, Muted, Row } from '../components/ui';
import { useSettings } from '../lib/data';
import { auth, db } from '../lib/firebase';
import { buildReport } from '../lib/payroll';
import { fmtDateTime, fmtHours, fmtMoney, fmtTime, getShift, monthKey } from '../lib/time';
import {
  backgroundSupported,
  checkIn,
  checkOut,
  getTrackingState,
  handleLocations,
  markTaskLocal,
  resumeIfNeeded,
} from '../lib/tracking';
import { Session, UserProfile, WorkTask } from '../lib/types';

export default function EmployeeHome({ profile }: { profile: UserProfile }) {
  const settings = useSettings();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [monthSessions, setMonthSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [busy, setBusy] = useState(false);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const month = monthKey(Date.now());
  const shift = getShift(settings, profile.shift);

  const refreshState = useCallback(async () => {
    const st = await getTrackingState();
    setSessionId(st?.sessionId ?? null);
  }, []);

  useEffect(() => {
    refreshState();
    resumeIfNeeded();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshState());
    return () => sub.remove();
  }, [refreshState]);

  // Ilova ochiq paytda (yoki fon kuzatuvi imkonsiz bo'lsa) joylashuvni shu yerdan kuzatamiz
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 60000, distanceInterval: 20 },
      (loc) => handleLocations([loc]),
    )
      .then((s) => (cancelled ? s.remove() : (watchRef.current = s)))
      .catch(() => {});
    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return setSession(null);
    return onSnapshot(doc(db, 'sessions', sessionId), (s) =>
      setSession(s.exists() ? ({ id: s.id, ...s.data() } as Session) : null),
    );
  }, [sessionId]);

  useEffect(() => {
    const q1 = query(collection(db, 'sessions'), where('uid', '==', profile.uid), where('month', '==', month));
    const u1 = onSnapshot(q1, (s) => setMonthSessions(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Session)));
    const q2 = query(collection(db, 'tasks'), where('uid', '==', profile.uid));
    const u2 = onSnapshot(q2, (s) =>
      setTasks(
        s.docs
          .map((d) => ({ id: d.id, ...d.data() }) as WorkTask)
          .sort((a, b) => b.createdAt - a.createdAt),
      ),
    );
    return () => {
      u1();
      u2();
    };
  }, [profile.uid, month]);

  const onCheckIn = async () => {
    setBusy(true);
    try {
      const r = await checkIn(profile, settings);
      await refreshState();
      const late =
        r.lateMinutes > settings.graceMinutes ? `\nKechikish: ${r.lateMinutes} daqiqa.` : '';
      const bg = r.background
        ? ''
        : "\n\nDiqqat: fon rejimida kuzatuvga ruxsat yo'q. Ish vaqtida ilovani yopmang yoki sozlamalardan 'Har doim' ruxsatini bering.";
      Alert.alert('Ish boshlandi', `Vaqt: ${fmtTime(Date.now())}${late}${bg}`);
    } catch (e: any) {
      Alert.alert('Ishni boshlab bo\'lmadi', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  const onCheckOut = () =>
    Alert.alert('Ishni tugatish', 'Ish kunini yakunlaysizmi?', [
      { text: "Yo'q" },
      {
        text: 'Ha, tugatish',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await checkOut();
            await refreshState();
          } catch (e: any) {
            Alert.alert('Xato', e?.message ?? String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  const markDone = async (t: WorkTask) => {
    await updateDoc(doc(db, 'tasks', t.id), { status: 'done', doneAt: Date.now() });
    await markTaskLocal(t.id, 'done');
  };

  const report = buildReport(profile, monthSessions, tasks.filter((t) => monthKey(t.createdAt) === month), settings);
  const openTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'arrived');

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingTop: 56 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refreshState} />}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Salom, {profile.name}</Text>
      <Muted>
        {profile.position} · {shift.name}: {shift.start}–{shift.end}
      </Muted>

      <Card style={{ marginTop: 16 }}>
        {session ? (
          <>
            <H>Ish davom etmoqda</H>
            <Row label="Boshlangan" value={fmtTime(session.start)} />
            <Row
              label="Kechikish"
              value={session.lateMinutes > settings.graceMinutes ? `${session.lateMinutes} daq` : "Yo'q"}
              color={session.lateMinutes > settings.graceMinutes ? colors.red : colors.green}
            />
            <Row label="Ofisda" value={fmtHours(session.insideMs)} />
            <Row label="Topshiriqda" value={fmtHours(session.taskMs)} />
            <Row label="Tashqarida" value={fmtHours(session.outsideMs)} color={colors.orange} />
            <Row
              label="Hozir"
              value={session.lastState === 'inside' ? 'Ofisda' : session.lastState === 'task' ? 'Topshiriqda' : 'Tashqarida'}
            />
            <Button title="Ishni tugatish" color={colors.red} onPress={onCheckOut} loading={busy} />
          </>
        ) : (
          <>
            <H>Ish boshlanmagan</H>
            <Muted>Ofisga kelganingizda tugmani bosing. Joylashuvingiz tekshiriladi.</Muted>
            <Button title="Ishni boshlash" color={colors.green} onPress={onCheckIn} loading={busy} style={{ marginTop: 12 }} />
          </>
        )}
        {!backgroundSupported && (
          <Muted>
            Test rejimi (Expo Go, iPhone): kuzatuv faqat ilova ochiq turganda ishlaydi.
          </Muted>
        )}
      </Card>

      <Card>
        <H>Topshiriqlar</H>
        {openTasks.length === 0 && <Muted>Faol topshiriq yo'q</Muted>}
        {openTasks.map((t) => (
          <View key={t.id} style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, marginTop: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>{t.title}</Text>
            <Muted>{t.address}</Muted>
            <Row label="Yetib borish muddati" value={fmtDateTime(t.deadline)} color={Date.now() > t.deadline && t.status === 'pending' ? colors.red : undefined} />
            <Row
              label="Holat"
              value={t.status === 'arrived' ? (t.onTime ? "Yetib keldingiz (o'z vaqtida)" : 'Yetib keldingiz (kechikib)') : 'Yo\'lda'}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                title="Xaritada ochish"
                outline
                style={{ flex: 1 }}
                onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`)}
              />
              <Button title="Bajarildi" style={{ flex: 1 }} onPress={() => markDone(t)} disabled={t.status !== 'arrived'} />
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <H>Shu oy ({month})</H>
        <Row label="Ishlangan smenalar" value={`${report.shifts} / ${profile.plannedShifts}`} />
        <Row label="Kechikishlar" value={`${report.lateCount} marta`} />
        <Row label="Hisoblangan vaqt" value={fmtHours(report.paidMs)} />
        <Row label="KPI" value={`${report.kpi.total.toFixed(0)}%`} />
        <Row label="Taxminiy maosh" value={fmtMoney(report.salary.total)} color={colors.primary} />
      </Card>

      <Button title="Chiqish" outline color={colors.muted} onPress={() => {
        if (sessionId) return Alert.alert('Avval ishni tugating');
        signOut(auth);
      }} />
    </ScrollView>
  );
}
