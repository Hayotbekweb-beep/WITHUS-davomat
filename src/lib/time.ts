import { Settings, Shift, ShiftId } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const monthKey = (ms: number) => dayKey(ms).slice(0, 7);
export const fmtTime = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtDateTime = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${fmtTime(ms)}`;
};
export const fmtHours = (ms: number) => {
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)} soat ${m % 60} daq`;
};
export const fmtMoney = (n: number) =>
  `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`;

const parseHM = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return { h, m };
};

export function shiftDurationMs(shift: Shift): number {
  const s = parseHM(shift.start);
  const e = parseHM(shift.end);
  let mins = e.h * 60 + e.m - (s.h * 60 + s.m);
  if (mins <= 0) mins += 24 * 60;
  return mins * 60000;
}

export function getShift(settings: Settings, id: ShiftId): Shift {
  return settings.shifts.find((s) => s.id === id) ?? settings.shifts[0];
}

// Ishga kelgan vaqtga eng yaqin smena boshlanishini topadi
// (tungi smena yarim tundan o'tganini ham to'g'ri hisoblaydi).
export function scheduleFor(shift: Shift, at: number): { start: number; end: number } {
  const { h, m } = parseHM(shift.start);
  let best = 0;
  for (const offset of [-1, 0, 1]) {
    const d = new Date(at);
    d.setDate(d.getDate() + offset);
    d.setHours(h, m, 0, 0);
    const t = d.getTime();
    if (!best || Math.abs(t - at) < Math.abs(best - at)) best = t;
  }
  return { start: best, end: best + shiftDurationMs(shift) };
}

// Hozir shu smena vaqti ichidamizmi
export function isShiftNow(shift: Shift, now: number): boolean {
  const { start, end } = scheduleFor(shift, now);
  if (now >= start && now <= end) return true;
  const prev = start - 24 * 3600000;
  return now >= prev && now <= prev + shiftDurationMs(shift);
}
