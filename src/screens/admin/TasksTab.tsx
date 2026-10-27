import * as Location from 'expo-location';
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
        ? { text: 'Yetib bormadi (muddat o\'tdi)', color: colors.red }
        : { text: "Yo'lda", color: colors.orange };
    case 'arrived':
      return t.onTime
        ? { text: `Yetib bordi ${fmtDateTime(t.arrivedAt!)} (o'z vaqtida)`, color: colors.green }
        : { text: `Kechikib bordi ${fmtDateTime(t.arrivedAt!)}`, color: colors.red };
    case 'done':
      return { text: `Bajarildi${t.onTime === false ? ' (kechikib)' : t.onTime ? '' : ' (manzilga borgani qayd etilmagan)'}`, color: t.onTime ? colors.green : colors.orange };
    default:
      return { text: 'Bekor qilingan', color: colors.gray };
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
      if (!r.length) return Alert.alert('Topilmadi', 'Manzilni xaritada bosib belgilang');
      setPoint({ lat: r[0].latitude, lng: r[0].longitude });
    } catch {
      Alert.alert('Topilmadi', 'Manzilni xaritada bosib belgilang');
    }
  };

  const save = async () => {
    const emp = employees.find((e) => e.uid === uid);
    if (!emp || !title.trim() || !point) {
      return Alert.alert('Xato', 'Xodim, topshiriq nomi va xaritadagi nuqtani tanlang');
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
      Alert.alert('Xato', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (creating) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card>
          <H>Yangi topshiriq</H>
          <Text style={{ color: colors.muted, marginBottom: 4 }}>Xodim</Text>
          <Chips options={employees.map((e) => ({ value: e.uid, label: e.name }))} value={uid} onChange={setUid} />
          <Field label="Topshiriq" value={title} onChangeText={setTitle} placeholder="Masalan: Chiptani mijozga yetkazish" />
          <Field label="Manzil" value={address} onChangeText={setAddress} placeholder="Ko'cha, uy" />
          <Button title="Manzilni xaritadan topish" outline onPress={findAddress} />
          <Muted>Yoki xaritada kerakli joyni bosing:</Muted>
          <View style={{ height: 280, marginVertical: 8 }}>
            <LeafletMap
              onPress={(lat, lng) => setPoint({ lat, lng })}
              markers={point ? [{ id: 'p', ...point, color: '#7C3AED', label: 'Manzil' }] : []}
              circles={[
                { ...settings.office, color: colors.primary },
                ...(point ? [{ ...point, radius: 100, color: '#7C3AED' }] : []),
              ]}
              center={point ?? { lat: settings.office.lat, lng: settings.office.lng }}
            />
          </View>
          <Text style={{ color: colors.muted, marginBottom: 4 }}>Necha daqiqada yetib borishi kerak</Text>
          <Chips options={DEADLINES.map((d) => ({ value: d, label: `${d} daq` }))} value={minutes} onChange={setMinutes} />
          <Button title="Yuborish" onPress={save} loading={saving} />
          <Button title="Bekor qilish" outline onPress={() => setCreating(false)} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Button title="+ Topshiriq yuborish" onPress={() => setCreating(true)} />
      {tasks.length === 0 && <Muted>Topshiriqlar yo'q</Muted>}
      {tasks.slice(0, 50).map((t) => {
        const s = statusText(t);
        return (
          <Card key={t.id}>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>{t.title}</Text>
            <Muted>
              {t.name} · {t.address}
            </Muted>
            <Row label="Yuborilgan" value={fmtDateTime(t.createdAt)} />
            <Row label="Muddat" value={fmtDateTime(t.deadline)} />
            <Text style={{ color: s.color, fontWeight: '600', marginTop: 4 }}>{s.text}</Text>
            {(t.status === 'pending' || t.status === 'arrived') && (
              <Button
                title="Bekor qilish"
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
