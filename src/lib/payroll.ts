import { shiftDurationMs, getShift } from './time';
import { Session, Settings, UserProfile, WorkTask } from './types';

export interface MonthReport {
  user: UserProfile;
  shifts: number;
  lateCount: number;
  lateMinutes: number; // jarimaga tortiladigan daqiqalar (grace dan keyin)
  insideMs: number;
  taskMs: number;
  outsideMs: number;
  unknownMs: number;
  paidMs: number;
  plannedMs: number;
  tasksTotal: number;
  tasksOnTime: number;
  mockDetected: boolean;
  kpi: { punctuality: number; attendance: number; presence: number; tasks: number; total: number };
  salary: { base: number; bonus: number; penalty: number; total: number };
}

const pct = (a: number, b: number, empty = 100) => (b > 0 ? Math.min(100, (a / b) * 100) : empty);

export function buildReport(
  user: UserProfile,
  sessions: Session[],
  tasks: WorkTask[],
  settings: Settings,
): MonthReport {
  const shift = getShift(settings, user.shift);
  const shiftMs = shiftDurationMs(shift);
  const own = sessions.filter((s) => s.uid === user.uid);

  let lateCount = 0;
  let lateMinutes = 0;
  let insideMs = 0;
  let taskMs = 0;
  let outsideMs = 0;
  let unknownMs = 0;
  let paidMs = 0;
  let mockDetected = false;

  for (const s of own) {
    if (s.lateMinutes > settings.graceMinutes) {
      lateCount++;
      lateMinutes += s.lateMinutes - settings.graceMinutes;
    }
    insideMs += s.insideMs;
    taskMs += s.taskMs;
    outsideMs += s.outsideMs;
    unknownMs += s.unknownMs;
    // Haq to'lanadigan vaqt: ofisda + topshiriqda, bir smenada smena davomiyligidan oshmaydi
    paidMs += Math.min(s.insideMs + s.taskMs, shiftMs);
    if (s.mockDetected) mockDetected = true;
  }

  const plannedMs = user.plannedShifts * shiftMs;
  const ownTasks = tasks.filter((t) => t.uid === user.uid && t.status !== 'cancelled');
  const tasksOnTime = ownTasks.filter((t) => t.onTime === true).length;

  const w = settings.kpiWeights;
  const kpi = {
    punctuality: pct(own.length - lateCount, own.length, 0),
    attendance: pct(own.length, user.plannedShifts, 0),
    presence: pct(insideMs + taskMs, insideMs + taskMs + outsideMs, 0),
    tasks: pct(tasksOnTime, ownTasks.length),
    total: 0,
  };
  const wSum = w.punctuality + w.attendance + w.presence + w.tasks || 1;
  kpi.total =
    (kpi.punctuality * w.punctuality +
      kpi.attendance * w.attendance +
      kpi.presence * w.presence +
      kpi.tasks * w.tasks) /
    wSum;

  const base = user.baseSalary * Math.min(1, plannedMs ? paidMs / plannedMs : 0);
  const bonus = (user.kpiBonus * kpi.total) / 100;
  const penalty = lateMinutes * settings.latePenaltyPerMinute;
  const total = Math.max(0, base + bonus - penalty);

  return {
    user,
    shifts: own.length,
    lateCount,
    lateMinutes,
    insideMs,
    taskMs,
    outsideMs,
    unknownMs,
    paidMs,
    plannedMs,
    tasksTotal: ownTasks.length,
    tasksOnTime,
    mockDetected,
    kpi,
    salary: { base, bonus, penalty, total },
  };
}

export function reportsToCsv(month: string, reports: MonthReport[]): string {
  const h = (ms: number) => (ms / 3600000).toFixed(1);
  const r = (n: number) => Math.round(n);
  const rows = [
    [
      'Oy', 'Xodim', 'Lavozim', 'Smenalar', 'Kechikishlar', 'Jarima daqiqa', 'Ofisda (soat)',
      'Topshiriqda (soat)', 'Sababsiz tashqarida (soat)', "Signal yo'q (soat)", "Hisoblangan soat",
      'Reja (soat)', 'Topshiriqlar', "O'z vaqtida", 'KPI %', 'Asosiy', 'KPI bonus', 'Jarima', 'Jami maosh',
      'Fake GPS',
    ],
    ...reports.map((x) => [
      month, x.user.name, x.user.position, x.shifts, x.lateCount, x.lateMinutes, h(x.insideMs),
      h(x.taskMs), h(x.outsideMs), h(x.unknownMs), h(x.paidMs), h(x.plannedMs), x.tasksTotal,
      x.tasksOnTime, x.kpi.total.toFixed(1), r(x.salary.base), r(x.salary.bonus),
      r(x.salary.penalty), r(x.salary.total), x.mockDetected ? 'HA' : '',
    ]),
  ];
  return '﻿' + rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
}
