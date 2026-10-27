import * as Location from 'expo-location';
import { LANGS, t, useI18n } from '../../lib/i18n';
import { shiftName } from '../../lib/time';
import { signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { LeafletMap } from '../../components/LeafletMap';
import { Button, Card, Chips, colors, Field, H, Muted } from '../../components/ui';
import { saveSettings } from '../../lib/data';
import { auth } from '../../lib/firebase';
import { Settings } from '../../lib/types';

export default function SettingsTab({ settings }: { settings: Settings }) {
  const { lang, setLang } = useI18n();
  const [s, setS] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  useEffect(() => setS(settings), [settings]);

  const setOffice = (lat: number, lng: number) => setS((p) => ({ ...p, office: { ...p.office, lat, lng } }));

  const useCurrent = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert(t('allowLocation'));
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
    setOffice(loc.coords.latitude, loc.coords.longitude);
    Alert.alert(t('marked'), t('markedAccuracy', { n: Math.round(loc.coords.accuracy ?? 0) }));
  };

  const setShift = (i: number, key: 'start' | 'end', v: string) =>
    setS((p) => ({ ...p, shifts: p.shifts.map((sh, j) => (j === i ? { ...sh, [key]: v } : sh)) }));

  const setWeight = (k: keyof Settings['kpiWeights'], v: string) =>
    setS((p) => ({ ...p, kpiWeights: { ...p.kpiWeights, [k]: Number(v) || 0 } }));

  const save = async () => {
    const bad = s.shifts.some((sh) => !/^\d{2}:\d{2}$/.test(sh.start) || !/^\d{2}:\d{2}$/.test(sh.end));
    if (bad) return Alert.alert(t('error'), t('badTime'));
    setSaving(true);
    try {
      await saveSettings(s);
      Alert.alert(t('saved'));
    } catch (e: any) {
      Alert.alert(t('error'), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Card>
        <H>{t('language')}</H>
        <Chips options={LANGS} value={lang} onChange={setLang} />
      </Card>

      <Card>
        <H>{t('officeArea')}</H>
        <Muted>{s.office.address}</Muted>
        <View style={{ height: 260, marginVertical: 8 }}>
          <LeafletMap
            onPress={setOffice}
            circles={[{ ...s.office, color: colors.primary }]}
            markers={[{ id: 'o', lat: s.office.lat, lng: s.office.lng, color: colors.primary, label: t('officeMarker') }]}
            center={{ lat: s.office.lat, lng: s.office.lng }}
          />
        </View>
        <Muted>{t('officeHint')}</Muted>
        <Button title={t('useMyLocation')} outline onPress={useCurrent} />
        <Field
          label={t('radius')}
          value={String(s.office.radius)}
          keyboardType="numeric"
          onChangeText={(v) => setS({ ...s, office: { ...s.office, radius: Number(v) || 0 } })}
        />
      </Card>

      <Card>
        <H>{t('shiftsTitle')}</H>
        {s.shifts.map((sh, i) => (
          <View key={sh.id}>
            <Text style={{ fontWeight: '600', marginBottom: 6 }}>{shiftName(sh)}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label={t('shiftStart')} value={sh.start} onChangeText={(v) => setShift(i, 'start', v)} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t('shiftEnd')} value={sh.end} onChangeText={(v) => setShift(i, 'end', v)} />
              </View>
            </View>
          </View>
        ))}
      </Card>

      <Card>
        <H>{t('lateRules')}</H>
        <Field
          label={t('graceMinutes')}
          value={String(s.graceMinutes)}
          keyboardType="numeric"
          onChangeText={(v) => setS({ ...s, graceMinutes: Number(v) || 0 })}
        />
        <Field
          label={t('penaltyPerMinute')}
          value={String(s.latePenaltyPerMinute)}
          keyboardType="numeric"
          onChangeText={(v) => setS({ ...s, latePenaltyPerMinute: Number(v) || 0 })}
        />
      </Card>

      <Card>
        <H>{t('kpiWeights')}</H>
        <Field label={t('kpiPunctualityLong')} value={String(s.kpiWeights.punctuality)} keyboardType="numeric" onChangeText={(v) => setWeight('punctuality', v)} />
        <Field label={t('kpiAttendanceLong')} value={String(s.kpiWeights.attendance)} keyboardType="numeric" onChangeText={(v) => setWeight('attendance', v)} />
        <Field label={t('kpiPresenceLong')} value={String(s.kpiWeights.presence)} keyboardType="numeric" onChangeText={(v) => setWeight('presence', v)} />
        <Field label={t('kpiTasksLong')} value={String(s.kpiWeights.tasks)} keyboardType="numeric" onChangeText={(v) => setWeight('tasks', v)} />
      </Card>

      <Button title={t('save')} onPress={save} loading={saving} />
      <Button title={t('logout')} outline color={colors.muted} onPress={() => signOut(auth)} />
    </ScrollView>
  );
}
