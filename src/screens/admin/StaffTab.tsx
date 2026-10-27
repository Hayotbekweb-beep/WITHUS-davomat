import { doc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chips, colors, Field, H, Muted } from '../../components/ui';
import { phoneToEmail } from '../../lib/defaults';
import { createLoginAccount, db } from '../../lib/firebase';
import { fmtMoney, getShift } from '../../lib/time';
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
      return Alert.alert('Xato', 'Ism va telefon raqamni to\'liq kiriting');
    }
    if (!editing && form.password.length < 6) {
      return Alert.alert('Xato', "Parol kamida 6 belgi bo'lsin");
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
        Alert.alert(
          "Xodim qo'shildi",
          `Xodimga quyidagini yuboring:\n\nLogin: ${form.phone}\nParol: ${form.password}`,
        );
      }
      setForm(null);
    } catch (e: any) {
      const msg = String(e?.code ?? e?.message ?? e);
      Alert.alert('Xato', msg.includes('email-already-in-use') ? 'Bu raqam allaqachon ro\'yxatdan o\'tgan' : msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (u: UserProfile) =>
    Alert.alert(
      u.active === false ? 'Faollashtirish' : "O'chirish",
      u.active === false ? `${u.name} qayta faollashtirilsinmi?` : `${u.name} ishdan bo'shatilsinmi? Ilovaga kira olmaydi.`,
      [
        { text: 'Bekor' },
        { text: 'Ha', onPress: () => updateDoc(doc(db, 'users', u.uid), { active: u.active === false }) },
      ],
    );

  if (form) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Card>
          <H>{editing ? 'Xodimni tahrirlash' : 'Yangi xodim'}</H>
          <Field label="Ism familiya" value={form.name} onChangeText={set('name')} />
          <Field
            label="Telefon raqam (login)"
            value={form.phone}
            onChangeText={set('phone')}
            keyboardType="phone-pad"
            editable={!editing}
          />
          {!editing && <Field label="Parol (kamida 6 belgi)" value={form.password} onChangeText={set('password')} />}
          <Text style={{ color: colors.muted, marginBottom: 4 }}>Lavozim</Text>
          <Chips options={POSITIONS.map((p) => ({ value: p, label: p }))} value={form.position} onChange={set('position')} />
          <Text style={{ color: colors.muted, marginBottom: 4 }}>Smena</Text>
          <Chips
            options={settings.shifts.map((s) => ({ value: s.id, label: `${s.name} ${s.start}–${s.end}` }))}
            value={form.shift}
            onChange={(v) => setForm({ ...form, shift: v })}
          />
          <Field label="Asosiy oylik (so'm)" value={form.baseSalary} onChangeText={set('baseSalary')} keyboardType="numeric" />
          <Field label="KPI bonus — 100% bo'lganda (so'm)" value={form.kpiBonus} onChangeText={set('kpiBonus')} keyboardType="numeric" />
          <Field label="Oyda rejadagi smenalar soni" value={form.plannedShifts} onChangeText={set('plannedShifts')} keyboardType="numeric" />
          <Button title="Saqlash" onPress={save} loading={saving} />
          <Button title="Bekor qilish" outline onPress={() => setForm(null)} />
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Button title="+ Xodim qo'shish" onPress={openNew} />
      {employees.map((u) => {
        const sh = getShift(settings, u.shift);
        return (
          <Card key={u.uid} style={u.active === false ? { opacity: 0.5 } : undefined}>
            <Pressable onPress={() => openEdit(u)}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>{u.name}</Text>
              <Muted>
                {u.position} · {sh.name} ({sh.start}–{sh.end}) · {u.phone}
              </Muted>
              <Muted>
                Oylik: {fmtMoney(u.baseSalary)} · KPI bonus: {fmtMoney(u.kpiBonus)} · Reja: {u.plannedShifts} smena
              </Muted>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Tahrirlash" outline style={{ flex: 1 }} onPress={() => openEdit(u)} />
              <Button
                title={u.active === false ? 'Faollashtirish' : "O'chirish"}
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
