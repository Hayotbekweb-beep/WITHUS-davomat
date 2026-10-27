export type Role = 'admin' | 'employee';
export type ShiftId = 'day' | 'night';

export interface Shift {
  id: ShiftId;
  name: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM" (keyingi kunga o'tishi mumkin)
}

export interface Settings {
  office: { lat: number; lng: number; radius: number; address: string };
  shifts: Shift[];
  graceMinutes: number; // shu daqiqagacha kechikish kechiriladi
  latePenaltyPerMinute: number; // so'm, grace dan keyingi har bir daqiqa uchun
  kpiWeights: { punctuality: number; attendance: number; presence: number; tasks: number };
}

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  role: Role;
  position: string; // Operator, Kassir...
  shift: ShiftId;
  baseSalary: number; // oylik asosiy maosh (so'm)
  kpiBonus: number; // KPI 100% bo'lganda beriladigan bonus (so'm)
  plannedShifts: number; // oyda rejalashtirilgan smenalar soni
  active: boolean;
}

export interface Session {
  id: string;
  uid: string;
  name: string;
  shift: ShiftId;
  month: string; // "YYYY-MM" (smena boshlangan oy)
  day: string; // "YYYY-MM-DD"
  scheduledStart: number; // ms
  scheduledEnd: number; // ms
  start: number; // ms
  end: number | null;
  lateMinutes: number;
  insideMs: number; // ofis hududida
  taskMs: number; // topshiriq bo'yicha tashqarida
  outsideMs: number; // sababsiz tashqarida
  unknownMs: number; // signal yo'q (telefon o'chgan, ilova yopilgan)
  lastTs: number;
  lastState: 'inside' | 'task' | 'outside';
  mockDetected: boolean;
  endedOutside?: boolean;
}

export interface Live {
  uid: string;
  name: string;
  sessionId: string | null;
  lat: number;
  lng: number;
  accuracy: number;
  ts: number;
  inside: boolean;
  mocked: boolean;
}

export type TaskStatus = 'pending' | 'arrived' | 'done' | 'cancelled';

export interface WorkTask {
  id: string;
  uid: string;
  name: string; // xodim ismi
  title: string;
  address: string;
  lat: number;
  lng: number;
  radius: number;
  deadline: number; // ms — shu vaqtgacha yetib borishi kerak
  createdAt: number;
  status: TaskStatus;
  arrivedAt: number | null;
  onTime: boolean | null;
  doneAt: number | null;
}
