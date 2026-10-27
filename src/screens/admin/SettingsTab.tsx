import * as Location from 'expo-location';
import { signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { LeafletMap } from '../../components/LeafletMap';
import { Button, Card, colors, Field, H, Muted } from '../../components/ui';
import { saveSettings } from '../../lib/data';
import { auth } from '../../lib/firebase';
import { Settings } from '../../lib/types';

export default function SettingsTab({ settings }: { settings: Settings }) {
  const [s, setS] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setS(settings), [settings]);

  const setOffice = (lat: number, lng: number) => setS((p) => ({ ...p, office: { ...p.office, lat, lng } }));

  const useCurrent = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert('Geolokatsiyaga ruxsat bering');
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    setOffice(loc.coords.latitude, loc.coords.longitude);
    Alert.alert('Belgilandi', `Aniqlik: ±${Math.round(loc.coords.accuracy ?? 0)} m. "Saqlash" ni bosing.`);
  };

  const setShift = (i: number, key: 'start' | 'end', v: string) =>
    setS((p) => ({ ...p, shifts: p.shifts.map((sh, j) => (j === i ? { ...sh, [key]: v } : sh)) }));

  const setWeight = (k: keyof Settings['kpiWeights'], v: string) =>
    setS((p) => ({ ...p, kpiWeights: { ...p.kpiWeights, [k]: Number(v) || 0 } }));

  const save = async () => {
    const bad = s.shifts.some((sh) => !/^\d{2}:\d{2}$/.test(sh.start) || !/^\d{2}:\d{2}$/.test(sh.end));
    if (bad) return Alert.alert('Xato', 'Vaqtni SS:DD ko\'rinishida kiriting, masalan 08:00');
    setSaving(true);
    try {
      await saveSettings(s);
      Alert.alert('Saqlandi');
    } catch (e: any) {
      Alert.alert('Xato', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <H>Ofis hududi</H>
        <Muted>{s.office.address}</Muted>
        <View style={{ height: 260, marginVertical: 8 }}>
          <LeafletMap
            onPress={setOffice}
            circles={[{ ...s.office, color: colors.primary }]}
            markers={[{ id: 'o', lat: s.office.lat, lng: s.office.lng, color: colors.primary, label: 'Ofis' }]}
            center={{ lat: s.office.lat, lng: s.office.lng }}
          />
        </View>
        <Muted>Ofisda turib quyidagi tugmani bosing yoki xaritada ofis joyini bosing.</Muted>
        <Button title="Hozirgi joyimni ofis qilish" outline onPress={useCurrent} />
        <Field
          label="Hudud radiusi (metr)"
          value={String(s.office.radius)}
          keyboardType="numeric"
          onChangeText={(v) => setS({ ...s, office: { ...s.office, radius: Number(v) || 0 } })}
        />
      </Card>

      <Card>
        <H>Smenalar</H>
        {s.shifts.map((sh, i) => (
          <View key={sh.id}>
            <Text style={{ fontWeight: '600', marginBottom: 6 }}>{sh.name}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Boshlanish" value={sh.start} onChangeText={(v) => setShift(i, 'start', v)} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Tugash" value={sh.end} onChangeText={(v) => setShift(i, 'end', v)} />
              </View>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <H>Kechikish</H>
        <Field
          label="Kechiriladigan daqiqalar"
          value={String(s.graceMinutes)}
          keyboardType="numeric"
          onChangeText={(v) => setS({ ...s, graceMinutes: Number(v) || 0 })}
        />
        <Field
          label="Har bir kechikkan daqiqa uchun jarima (so'm)"
          value={String(s.latePenaltyPerMinute)}
          keyboardType="numeric"
          onChangeText={(v) => setS({ ...s, latePenaltyPerMinute: Number(v) || 0 })}
        />
      </Card>

      <Card>
        <H>KPI ulushlari (%)</H>
        <Field label="O'z vaqtida kelish" value={String(s.kpiWeights.punctuality)} keyboardType="numeric" onChangeText={(v) => setWeight('punctuality', v)} />
        <Field label="Davomat (smenalar)" value={String(s.kpiWeights.attendance)} keyboardType="numeric" onChangeText={(v) => setWeight('attendance', v)} />
        <Field label="Ish joyida bo'lish" value={String(s.kpiWeights.presence)} keyboardType="numeric" onChangeText={(v) => setWeight('presence', v)} />
        <Field label="Topshiriqlarni o'z vaqtida bajarish" value={String(s.kpiWeights.tasks)} keyboardType="numeric" onChangeText={(v) => setWeight('tasks', v)} />
      </Card>

      <Button title="Saqlash" onPress={save} loading={saving} />
      <Button title="Chiqish" outline color={colors.muted} onPress={() => signOut(auth)} />
    </ScrollView>
  );
}
