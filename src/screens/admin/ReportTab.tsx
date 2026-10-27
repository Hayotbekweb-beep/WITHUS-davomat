import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, colors, H, Muted, Row } from '../../components/ui';
import { buildReport, reportsToCsv } from '../../lib/payroll';
import { dayKey, fmtHours, fmtMoney, fmtTime, monthKey } from '../../lib/time';
import { Settings } from '../../lib/types';
import { useEmployees, useMonthSessions, useTasks } from './useAdminData';

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 15).getTime());
}

export default function ReportTab({ settings }: { settings: Settings }) {
  const [month, setMonth] = useState(monthKey(Date.now()));
  const [open, setOpen] = useState<string | null>(null);
  const employees = useEmployees();
  const sessions = useMonthSessions(month);
  const allTasks = useTasks();

  const reports = useMemo(() => {
    const tasks = allTasks.filter((t) => monthKey(t.createdAt) === month);
    return employees
      .filter((e) => e.active !== false || sessions.some((s) => s.uid === e.uid))
      .map((e) => buildReport(e, sessions, tasks, settings));
  }, [employees, sessions, allTasks, settings, month]);

  const total = reports.reduce((a, r) => a + r.salary.total, 0);

  const exportCsv = async () => {
    try {
      const file = new File(Paths.cache, `withus-maosh-${month}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(reportsToCsv(month, reports));
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Hisobot' });
    } catch (e: any) {
      Alert.alert('Xato', e?.message ?? String(e));
    }
  };

  const kpiColor = (v: number) => (v >= 85 ? colors.green : v >= 60 ? colors.orange : colors.red);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button title="‹" outline onPress={() => setMonth(shiftMonth(month, -1))} style={{ width: 56 }} />
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{month}</Text>
        <Button title="›" outline onPress={() => setMonth(shiftMonth(month, 1))} style={{ width: 56 }} />
      </View>

      <Card>
        <Row label="Jami maosh fondi" value={fmtMoney(total)} color={colors.primary} />
        <Button title="Excel (CSV) yuklab olish" outline onPress={exportCsv} />
      </Card>

      {reports.map((r) => (
        <Card key={r.user.uid}>
          <Pressable onPress={() => setOpen(open === r.user.uid ? null : r.user.uid)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{r.user.name}</Text>
                <Muted>{r.user.position}</Muted>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: kpiColor(r.kpi.total) }}>
                  KPI {r.kpi.total.toFixed(0)}%
                </Text>
                <Text style={{ fontWeight: '700' }}>{fmtMoney(r.salary.total)}</Text>
              </View>
            </View>
          </Pressable>
          {r.mockDetected && (
            <Text style={{ color: colors.red, fontWeight: '700', marginTop: 6 }}>
              ⚠ Soxta joylashuv (Fake GPS) ishlatilgan!
            </Text>
          )}
          {open === r.user.uid && (
            <View style={{ marginTop: 8 }}>
              <H>Davomat</H>
              <Row label="Smenalar" value={`${r.shifts} / ${r.user.plannedShifts}`} />
              <Row label="Kechikishlar" value={`${r.lateCount} marta, ${r.lateMinutes} daq`} color={r.lateCount ? colors.red : undefined} />
              <Row label="Ofisda" value={fmtHours(r.insideMs)} />
              <Row label="Topshiriqda" value={fmtHours(r.taskMs)} />
              <Row label="Sababsiz tashqarida" value={fmtHours(r.outsideMs)} color={r.outsideMs ? colors.orange : undefined} />
              <Row label="Signal yo'q" value={fmtHours(r.unknownMs)} />
              <Row label="Hisoblangan / reja" value={`${fmtHours(r.paidMs)} / ${fmtHours(r.plannedMs)}`} />
              <Row label="Topshiriqlar (o'z vaqtida)" value={`${r.tasksOnTime} / ${r.tasksTotal}`} />
              <H>KPI</H>
              <Row label={`O'z vaqtida kelish (${settings.kpiWeights.punctuality}%)`} value={`${r.kpi.punctuality.toFixed(0)}%`} />
              <Row label={`Davomat (${settings.kpiWeights.attendance}%)`} value={`${r.kpi.attendance.toFixed(0)}%`} />
              <Row label={`Ish joyida bo'lish (${settings.kpiWeights.presence}%)`} value={`${r.kpi.presence.toFixed(0)}%`} />
              <Row label={`Topshiriqlar (${settings.kpiWeights.tasks}%)`} value={`${r.kpi.tasks.toFixed(0)}%`} />
              <H>Maosh</H>
              <Row label="Asosiy (ishlangan soat bo'yicha)" value={fmtMoney(r.salary.base)} />
              <Row label="KPI bonus" value={`+ ${fmtMoney(r.salary.bonus)}`} color={colors.green} />
              <Row label="Kechikish jarimasi" value={`− ${fmtMoney(r.salary.penalty)}`} color={colors.red} />
              <Row label="Jami" value={fmtMoney(r.salary.total)} color={colors.primary} />
              <H>Kunlar</H>
              {sessions
                .filter((s) => s.uid === r.user.uid)
                .sort((a, b) => a.start - b.start)
                .map((s) => (
                  <Row
                    key={s.id}
                    label={`${dayKey(s.start).slice(5)}  ${fmtTime(s.start)}–${s.end ? fmtTime(s.end) : '...'}`}
                    value={s.lateMinutes > settings.graceMinutes ? `kech ${s.lateMinutes} daq` : 'vaqtida'}
                    color={s.lateMinutes > settings.graceMinutes ? colors.red : colors.green}
                  />
                ))}
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}
