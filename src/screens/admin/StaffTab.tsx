import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { t, tPosition } from '../../lib/i18n';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chips, colors, Field, H, Muted } from '../../components/ui';
import { phoneToEmail } from '../../lib/defaults';
import { createLoginAccount, db } from '../../lib/firebase';
import { fmtMoney, getShift, shiftName } from '../../lib/time';
import { Settings, ShiftId, UserProfile } from '../../lib/types';
import { useEmployees } from './useAdminData';

const POSITIONS = ['Operator', 'Kassir', 'Menejer'];

interface Form {
  name: string;
  phone: string;
  password: string;
  position: string;
  shift: ShiftId;
  baseSalary: string;
  kpiBonus: string;
  plannedShifts: string;
}

const emptyForm: Form = {
  name: '',
  phone: '',
  password: '',
  position: 'Operator',
  shift: 'day',
  baseSalary: '',
  kpiBonus: '',
  plannedShifts: '15',
};

const num = (s: string) => Number(s.replace(/\s/g, '')) || 0;

export default function StaffTab({ settings }: { settings: Settings }) {
  const employees = useEmployees();
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Form) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
  };
  const openEdit = (u: UserProfile) => {
    setEditing(u);
    setForm({
      name: u.name,
      phone: u.phone,
      password: '',
      position: u.position,
      shift: u.shift,
      baseSalary: String(u.baseSalary),
      kpiBonus: String(u.kpiBonus),
      plannedShifts: String(u.plannedShifts),
    });
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 9) {
      return Alert.alert(t('error'), t('needNamePhone'));
    }
    if (!editing && form.password.length < 6) {
      return Alert.alert(t('error'), t('passwordShort'));
    }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        position: form.position,
        shift: form.shift,
        baseSalary: num(form.baseSalary),
        kpiBonus: num(form.kpiBonus),
        plannedShifts: num(form.plannedShifts),
      };
      if (editing) {
        await updateDoc(doc(db, 'users', editing.uid), data);
      } else {
        const uid = await createLoginAccount(phoneToEmail(form.phone), form.password);
        await setDoc(doc(db, 'users', uid), { uid, role: 'employee', active: true, ...data });
        Alert.alert(t('staffAdded'), t('sendCredentials', { phone: form.phone, password: form.password }));
      }
      setForm(null);
    } catch (e: any) {
      const msg = String(e?.code ?? e?.message ?? e);
      Alert.alert(t('error'), msg.includes('email-already-in-use') ? t('phoneTaken') : msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (u: UserProfile) =>
    Alert.alert(
      u.active === false ? t('activate') : t('deactivate'),
      t(u.active === false ? 'activateConfirm' : 'deactivateConfirm', { name: u.name }),
      [
        { text: t('cancel') },
        { text: t('yes'), onPress: () => updateDoc(doc(db, 'users', u.uid), { active: u.active === false }) },
      ],
    );

  if (form) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card>
          <H>{editing ? t('editStaff') : t('newStaff')}</H>
          <Field label={t('fullName')} value={form.name} onChangeText={set('name')} />
          <Field
            label={t('phoneLogin')}
            value={form.phone}
            onChangeText={set('phone')}
            keyboardType="phone-pad"
            editable={!editing}
          />
          {!editing && <Field label={t('passwordMin')} value={form.password} onChangeText={set('password')} />}
          <Text style={{ color: colors.muted, marginBottom: 4 }}>{t('position')}</Text>
          <Chips options={POSITIONS.map((p) => ({ value: p, label: tPosition(p) }))} value={form.position} onChange={set('position')} />
          <Text style={{ color: colors.muted, marginBottom: 4 }}>{t('shift')}</Text>
          <Chips
            options={settings.shifts.map((s) => ({ value: s.id, label: `${shiftName(s)} ${s.start}–${s.end}` }))}
            value={form.shift}
            onChange={(v) => setForm({ ...form, shift: v })}
          />
          <Field label={t('baseSalary')} value={form.baseSalary} onChangeText={set('baseSalary')} keyboardType="numeric" />
          <Field label={t('kpiBonusLabel')} value={form.kpiBonus} onChangeText={set('kpiBonus')} keyboardType="numeric" />
          <Field label={t('plannedShiftsLabel')} value={form.plannedShifts} onChangeText={set('plannedShifts')} keyboardType="numeric" />
          <Button title={t('save')} onPress={save} loading={saving} />
          <Button title={t('cancel')} outline onPress={() => setForm(null)} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Button title={t('addStaff')} onPress={openNew} />
      {employees.map((u) => {
        const sh = getShift(settings, u.shift);
        return (
          <Card key={u.uid} style={u.active === false ? { opacity: 0.5 } : undefined}>
            <Pressable onPress={() => openEdit(u)}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>{u.name}</Text>
              <Muted>
                {tPosition(u.position)} · {shiftName(sh)} ({sh.start}–{sh.end}) · {u.phone}
              </Muted>
              <Muted>
                {t('staffSummary', { base: fmtMoney(u.baseSalary), bonus: fmtMoney(u.kpiBonus), n: u.plannedShifts })}
              </Muted>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title={t('edit')} outline style={{ flex: 1 }} onPress={() => openEdit(u)} />
              <Button
                title={u.active === false ? t('activate') : t('deactivate')}
                outline
                color={u.active === false ? colors.green : colors.red}
                style={{ flex: 1 }}
                onPress={() => toggleActive(u)}
              />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
