import * as Location from 'expo-location';
import { t as tr } from '../../lib/i18n';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { LeafletMap } from '../../components/LeafletMap';
import { Button, Card, Chips, colors, Field, H, Muted, Row } from '../../components/ui';
import { db } from '../../lib/firebase';
import { fmtDateTime } from '../../lib/time';
import { Settings, WorkTask } from '../../lib/types';
import { useEmployees, useTasks } from './useAdminData';

const DEADLINES = ['30', '60', '90', '120', '180'];

function statusText(t: WorkTask): { text: string; color: string } {
  switch (t.status) {
    case 'pending':
      return Date.now() > t.deadline
        ? { text: tr('taskMissed'), color: colors.red }
        : { text: tr('onTheWay'), color: colors.orange };
    case 'arrived':
      return t.onTime
        ? { text: tr('taskArrivedOnTime', { t: fmtDateTime(t.arrivedAt!) }), color: colors.green }
        : { text: tr('taskArrivedLate', { t: fmtDateTime(t.arrivedAt!) }), color: colors.red };
    case 'done':
      return {
        text: tr(t.onTime === false ? 'taskDoneLate' : t.onTime ? 'taskDone' : 'taskDoneNoArrival'),
        color: t.onTime ? colors.green : colors.orange,
      };
    default:
      return { text: tr('taskCancelled'), color: colors.gray };
  }
}

export default function TasksTab({ settings }: { settings: Settings }) {
  const employees = useEmployees().filter((e) => e.active !== false);
  const tasks = useTasks();
  const [creating, setCreating] = useState(false);
  const [uid, setUid] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [minutes, setMinutes] = useState('60');
  const [saving, setSaving] = useState(false);

  const findAddress = async () => {
    try {
      const r = await Location.geocodeAsync(`${address}, Toshkent`);
      if (!r.length) return Alert.alert(tr('notFound'), tr('tapMapHint'));
      setPoint({ lat: r[0].latitude, lng: r[0].longitude });
    } catch {
      Alert.alert(tr('notFound'), tr('tapMapHint'));
    }
  };

  const save = async () => {
    const emp = employees.find((e) => e.uid === uid);
    if (!emp || !title.trim() || !point) {
      return Alert.alert(tr('error'), tr('taskNeedFields'));
    }
    setSaving(true);
    try {
      const now = Date.now();
      await addDoc(collection(db, 'tasks'), {
        uid: emp.uid,
        name: emp.name,
        title: title.trim(),
        address: address.trim(),
        lat: point.lat,
        lng: point.lng,
        radius: 100,
        deadline: now + Number(minutes) * 60000,
        createdAt: now,
        status: 'pending',
        arrivedAt: null,
        onTime: null,
        doneAt: null,
      });
      setCreating(false);
      setTitle('');
      setAddress('');
      setPoint(null);
    } catch (e: any) {
      Alert.alert(tr('error'), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (creating) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card>
          <H>{tr('newTask')}</H>
          <Text style={{ color: colors.muted, marginBottom: 4 }}>{tr('employee')}</Text>
          <Chips options={employees.map((e) => ({ value: e.uid, label: e.name }))} value={uid} onChange={setUid} />
          <Field label={tr('task')} value={title} onChangeText={setTitle} placeholder={tr('taskPlaceholder')} />
          <Field label={tr('address')} value={address} onChangeText={setAddress} placeholder={tr('addressPlaceholder')} />
          <Button title={tr('findAddress')} outline onPress={findAddress} />
          <Muted>{tr('orTapMap')}</Muted>
          <View style={{ height: 280, marginVertical: 8 }}>
            <LeafletMap
              onPress={(lat, lng) => setPoint({ lat, lng })}
              markers={point ? [{ id: 'p', ...point, color: '#7C3AED', label: tr('addressMarker') }] : []}
              circles={[
                { ...settings.office, color: colors.primary },
                ...(point ? [{ ...point, radius: 100, color: '#7C3AED' }] : []),
              ]}
              center={point ?? { lat: settings.office.lat, lng: settings.office.lng }}
            />
          </View>
          <Text style={{ color: colors.muted, marginBottom: 4 }}>{tr('deadlineMinutes')}</Text>
          <Chips options={DEADLINES.map((d) => ({ value: d, label: tr('minutesShort', { n: d }) }))} value={minutes} onChange={setMinutes} />
          <Button title={tr('send')} onPress={save} loading={saving} />
          <Button title={tr('cancel')} outline onPress={() => setCreating(false)} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Button title={tr('sendTask')} onPress={() => setCreating(true)} />
      {tasks.length === 0 && <Muted>{tr('noTasks')}</Muted>}
      {tasks.slice(0, 50).map((t) => {
        const s = statusText(t);
        return (
          <Card key={t.id}>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>{t.title}</Text>
            <Muted>
              {t.name} · {t.address}
            </Muted>
            <Row label={tr('sentAt')} value={fmtDateTime(t.createdAt)} />
            <Row label={tr('deadline')} value={fmtDateTime(t.deadline)} />
            <Text style={{ color: s.color, fontWeight: '600', marginTop: 4 }}>{s.text}</Text>
            {(t.status === 'pending' || t.status === 'arrived') && (
              <Button
                title={tr('cancel')}
                outline
                color={colors.red}
                onPress={() => updateDoc(doc(db, 'tasks', t.id), { status: 'cancelled' })}
              />
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}
