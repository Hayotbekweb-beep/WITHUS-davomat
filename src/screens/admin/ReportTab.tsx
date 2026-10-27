import { File, Paths } from 'expo-file-system';
import { t, tPosition } from '../../lib/i18n';
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
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('report') });
    } catch (e: any) {
      Alert.alert(t('error'), e?.message ?? String(e));
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
        <Row label={t('payrollTotal')} value={fmtMoney(total)} color={colors.primary} />
        <Button title={t('exportCsv')} outline onPress={exportCsv} />
      </Card>

      {reports.map((r) => (
        <Card key={r.user.uid}>
          <Pressable onPress={() => setOpen(open === r.user.uid ? null : r.user.uid)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{r.user.name}</Text>
                <Muted>{tPosition(r.user.position)}</Muted>
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
            <Text style={{ color: colors.red, fontWeight: '700', marginTop: 6 }}>{t('fakeGpsUsed')}</Text>
          )}
          {open === r.user.uid && (
            <View style={{ marginTop: 8 }}>
              <H>{t('attendance')}</H>
              <Row label={t('shifts')} value={`${r.shifts} / ${r.user.plannedShifts}`} />
              <Row label={t('lateness')} value={t('lateSummary', { n: r.lateCount, m: r.lateMinutes })} color={r.lateCount ? colors.red : undefined} />
              <Row label={t('inOffice')} value={fmtHours(r.insideMs)} />
              <Row label={t('onTask')} value={fmtHours(r.taskMs)} />
              <Row label={t('unexcusedOutside')} value={fmtHours(r.outsideMs)} color={r.outsideMs ? colors.orange : undefined} />
              <Row label={t('noSignal')} value={fmtHours(r.unknownMs)} />
              <Row label={t('countedVsPlan')} value={`${fmtHours(r.paidMs)} / ${fmtHours(r.plannedMs)}`} />
              <Row label={t('tasksOnTime')} value={`${r.tasksOnTime} / ${r.tasksTotal}`} />
              <H>KPI</H>
              <Row label={`${t('kpiPunctuality')} (${settings.kpiWeights.punctuality}%)`} value={`${r.kpi.punctuality.toFixed(0)}%`} />
              <Row label={`${t('kpiAttendance')} (${settings.kpiWeights.attendance}%)`} value={`${r.kpi.attendance.toFixed(0)}%`} />
              <Row label={`${t('kpiPresence')} (${settings.kpiWeights.presence}%)`} value={`${r.kpi.presence.toFixed(0)}%`} />
              <Row label={`${t('kpiTasks')} (${settings.kpiWeights.tasks}%)`} value={`${r.kpi.tasks.toFixed(0)}%`} />
              <H>{t('salary')}</H>
              <Row label={t('salaryBase')} value={fmtMoney(r.salary.base)} />
              <Row label={t('kpiBonus')} value={`+ ${fmtMoney(r.salary.bonus)}`} color={colors.green} />
              <Row label={t('latePenalty')} value={`− ${fmtMoney(r.salary.penalty)}`} color={colors.red} />
              <Row label={t('total')} value={fmtMoney(r.salary.total)} color={colors.primary} />
              <H>{t('days')}</H>
              {sessions
                .filter((s) => s.uid === r.user.uid)
                .sort((a, b) => a.start - b.start)
                .map((s) => (
                  <Row
                    key={s.id}
                    label={`${dayKey(s.start).slice(5)}  ${fmtTime(s.start)}–${s.end ? fmtTime(s.end) : '...'}`}
                    value={s.lateMinutes > settings.graceMinutes ? t('late', { n: s.lateMinutes }) : t('onTime')}
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
