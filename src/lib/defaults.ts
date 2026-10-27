import { Settings } from './types';

// Ofis: Toshkent sh., Yunusobod tumani, Yangishahar 16-uy.
// Koordinata taxminiy — rahbar "Sozlamalar" bo'limida ofisda turib
// "Hozirgi joyni ofis qilish" tugmasini bosib aniqlashtirishi kerak.
export const DEFAULT_SETTINGS: Settings = {
  office: {
    lat: 41.3615,
    lng: 69.2875,
    radius: 80,
    address: 'Toshkent sh., Yunusobod tumani, Yangishahar 16-uy, 38-xonadon',
  },
  shifts: [
    { id: 'day', name: '1-smena (kunduzgi)', start: '08:00', end: '19:00' },
    { id: 'night', name: '2-smena (tungi)', start: '19:00', end: '08:00' },
  ],
  graceMinutes: 10,
  latePenaltyPerMinute: 1000,
  kpiWeights: { punctuality: 30, attendance: 30, presence: 20, tasks: 20 },
};

export const LOGIN_DOMAIN = 'withus-davomat.app';

export function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-9);
  return `${digits}@${LOGIN_DOMAIN}`;
}
