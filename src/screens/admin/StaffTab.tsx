import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { showAlert } from '../../lib/alert';
import { t, TKey, tPosition } from '../../lib/i18n';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chips, colors, Field, H, Muted } from '../../components/ui';
import { phoneToEmail } from '../../lib/defaults';
import { createLoginAccount, db } from '../../lib/firebase';
import { fmtMoney, getShift, isValidHM, shiftName, userShift } from '../../lib/time';
import { Settings, ShiftId, UserProfile } from '../../lib/types';
import { useEmployees } from './useAdminData';

const POSITIONS = ['Operator', 'Kassir', 'Menejer'];

interface Form {
  name: string;
  phone: string;
  password: string;
  position: string;
  shift: ShiftId;
  workStart: string;
  workEnd: string;
  workDays: number[];
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
  workStart: '',
  workEnd: '',
  workDays: [1, 2, 3, 4, 5, 6, 0],
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
    const sh = getShift(settings, 'day');
    setForm({ ...emptyForm, workStart: sh.start, workEnd: sh.end });
  };
  const openEdit = (u: UserProfile) => {
    setEditing(u);
    setForm({
      name: u.name,
      phone: u.phone,
      password: '',
      position: u.position,
      shift: u.shift,
      workStart: userShift(settings, u).start,
      workEnd: userShift(settings, u).end,
      workDays: u.workDays?.length ? u.workDays : [0, 1, 2, 3, 4, 5, 6],
      baseSalary: String(u.baseSalary),
      kpiBonus: String(u.kpiBonus),
      plannedShifts: String(u.plannedShifts),
    });
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 9) {
      return showAlert(t('error'), t('needNamePhone'));
    }
    if (!editing && form.password.length < 6) {
      return showAlert(t('error'), t('passwordShort'));
    }
    if (!isValidHM(form.workStart) || !isValidHM(form.workEnd)) {
      return showAlert(t('error'), t('badTime'));
    }
    if (!form.workDays.length) {
      return showAlert(t('error'), t('needWorkDay'));
    }
    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        position: form.position,
        shift: form.shift,
        workStart: form.workStart,
        workEnd: form.workEnd,
        workDays: [...form.workDays].sort(),
        baseSalary: num(form.baseSalary),
        kpiBonus: num(form.kpiBonus),
        plannedShifts: num(form.plannedShifts),
      };
      if (editing) {
        await updateDoc(doc(db, 'users', editing.uid), data);
      } else {
        const uid = await createLoginAccount(phoneToEmail(form.phone), form.password);
        await setDoc(doc(db, 'users', uid), { uid, role: 'employee', active: true, ...data });
        showAlert(t('staffAdded'), t('sendCredentials', { phone: form.phone, password: form.password }));
      }
      setForm(null);
    } catch (e: any) {
      const msg = String(e?.code ?? e?.message ?? e);
      showAlert(t('error'), msg.includes('email-already-in-use') ? t('phoneTaken') : msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (u: UserProfile) =>
    showAlert(
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
          <H>{t('workHours')}</H>
          <Muted>{t('workHoursHint')}</Muted>
          <View style={{ height: 8 }} />
          <Chips
            options={settings.shifts.map((s) => ({ value: s.id, label: `${shiftName(s)} ${s.start}–${s.end}` }))}
            value={form.shift}
            onChange={(v) => {
              const sh = getShift(settings, v);
              setForm({ ...form, shift: v, workStart: sh.start, workEnd: sh.end });
            }}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label={t('workStart')} value={form.workStart} onChangeText={set('workStart')} placeholder="08:30" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('workEnd')} value={form.workEnd} onChangeText={set('workEnd')} placeholder="18:00" />
            </View>
          </View>
          <Text style={{ color: colors.muted, marginBottom: 4 }}>{t('workDays')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const on = form.workDays.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() =>
                    setForm({ ...form, workDays: on ? form.workDays.filter((x) => x !== d) : [...form.workDays, d] })
                  }
                  style={{
                    width: 44,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: on ? colors.primary : colors.border,
                    backgroundColor: on ? colors.primary : '#fff',
                  }}
                >
                  <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '600' }}>{t(`wd${d}` as TKey)}</Text>
                </Pressable>
              );
            })}
          </View>
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
        const sh = userShift(settings, u);
        const days =
          u.workDays?.length && u.workDays.length < 7
            ? ' · ' + [1, 2, 3, 4, 5, 6, 0].filter((d) => u.workDays!.includes(d)).map((d) => t(`wd${d}` as TKey)).join(', ')
            : '';
        return (
          <Card key={u.uid} style={u.active === false ? { opacity: 0.5 } : undefined}>
            <Pressable onPress={() => openEdit(u)}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>{u.name}</Text>
              <Muted>
                {tPosition(u.position)} · {shiftName(sh)} ({sh.start}–{sh.end}){days} · {u.phone}
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
