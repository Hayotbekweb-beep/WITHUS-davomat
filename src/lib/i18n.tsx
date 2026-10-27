import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Lang = 'uz' | 'ru' | 'en';
export const LANGS: { value: Lang; label: string }[] = [
  { value: 'uz', label: "O'zbek" },
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
];

const STORAGE_KEY = 'withus-lang';

const dict = {
  // umumiy
  appSubtitle: { uz: 'Xodimlar davomati', ru: 'Учёт посещаемости', en: 'Staff attendance' },
  language: { uz: 'Til', ru: 'Язык', en: 'Language' },
  error: { uz: 'Xato', ru: 'Ошибка', en: 'Error' },
  save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
  saved: { uz: 'Saqlandi', ru: 'Сохранено', en: 'Saved' },
  cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
  back: { uz: 'Orqaga', ru: 'Назад', en: 'Back' },
  yes: { uz: 'Ha', ru: 'Да', en: 'Yes' },
  no: { uz: "Yo'q", ru: 'Нет', en: 'No' },
  logout: { uz: 'Chiqish', ru: 'Выйти', en: 'Log out' },
  hours: { uz: '{h} soat {m} daq', ru: '{h} ч {m} мин', en: '{h} h {m} min' },
  minutesShort: { uz: '{n} daq', ru: '{n} мин', en: '{n} min' },
  currency: { uz: "so'm", ru: 'сум', en: 'UZS' },
  shift_day: { uz: '1-smena (kunduzgi)', ru: '1-я смена (дневная)', en: 'Shift 1 (day)' },
  shift_night: { uz: '2-smena (tungi)', ru: '2-я смена (ночная)', en: 'Shift 2 (night)' },
  pos_Operator: { uz: 'Operator', ru: 'Оператор', en: 'Operator' },
  pos_Kassir: { uz: 'Kassir', ru: 'Кассир', en: 'Cashier' },
  pos_Menejer: { uz: 'Menejer', ru: 'Менеджер', en: 'Manager' },
  pos_Rahbar: { uz: 'Rahbar', ru: 'Руководитель', en: 'Director' },

  // App
  notConfigured: {
    uz: "Firebase sozlanmagan. README dagi ko'rsatma bo'yicha EXPO_PUBLIC_FIREBASE_* qiymatlarini kiriting.",
    ru: 'Firebase не настроен. Укажите значения EXPO_PUBLIC_FIREBASE_* по инструкции в README.',
    en: 'Firebase is not configured. Set the EXPO_PUBLIC_FIREBASE_* values as described in the README.',
  },
  inactiveAccount: {
    uz: 'Hisobingiz faol emas yoki topilmadi. Rahbarga murojaat qiling.',
    ru: 'Ваш аккаунт не активен или не найден. Обратитесь к руководителю.',
    en: 'Your account is inactive or not found. Contact your manager.',
  },

  // Login
  phone: { uz: 'Telefon raqam', ru: 'Номер телефона', en: 'Phone number' },
  password: { uz: 'Parol', ru: 'Пароль', en: 'Password' },
  yourName: { uz: 'Ismingiz', ru: 'Ваше имя', en: 'Your name' },
  directorName: { uz: 'Rahbar ismi', ru: 'Имя руководителя', en: "Director's name" },
  login: { uz: 'Kirish', ru: 'Войти', en: 'Sign in' },
  loginFailed: {
    uz: "Telefon raqam yoki parol noto'g'ri",
    ru: 'Неверный номер телефона или пароль',
    en: 'Wrong phone number or password',
  },
  setupNeedName: {
    uz: "Ism kiriting, parol kamida 6 belgi bo'lsin",
    ru: 'Введите имя, пароль — не менее 6 символов',
    en: 'Enter a name; password must be at least 6 characters',
  },
  createDirector: { uz: 'Rahbar hisobini yaratish', ru: 'Создать аккаунт руководителя', en: 'Create director account' },
  noDirectorYet: {
    uz: "Tizimda hali rahbar yo'q. Birinchi marta ochayotgan bo'lsangiz:",
    ru: 'В системе ещё нет руководителя. Если вы открываете впервые:',
    en: 'There is no director in the system yet. If this is the first launch:',
  },
  registerDirector: {
    uz: "Rahbar sifatida ro'yxatdan o'tish",
    ru: 'Зарегистрироваться как руководитель',
    en: 'Register as director',
  },
  credentialsFromDirector: {
    uz: 'Xodimlarga login va parolni rahbar beradi.',
    ru: 'Логин и пароль сотрудникам выдаёт руководитель.',
    en: 'Employees get their login and password from the director.',
  },

  // Tracking
  permDenied: {
    uz: 'Geolokatsiyaga ruxsat berilmadi. Telefon sozlamalaridan ruxsat bering.',
    ru: 'Нет доступа к геолокации. Разрешите его в настройках телефона.',
    en: 'Location permission denied. Allow it in the phone settings.',
  },
  fakeGps: {
    uz: "Soxta joylashuv (Fake GPS) aniqlandi. Uni o'chiring.",
    ru: 'Обнаружена поддельная геолокация (Fake GPS). Отключите её.',
    en: 'Fake GPS detected. Turn it off.',
  },
  notInOffice: {
    uz: 'Siz ofis hududida emassiz (ofisdan {d} m uzoqdasiz). Ishni ofisda boshlang.',
    ru: 'Вы не в офисе (до офиса {d} м). Начните работу в офисе.',
    en: 'You are not in the office ({d} m away). Start work at the office.',
  },
  notifTitle: { uz: 'WITHUS davomat', ru: 'WITHUS посещаемость', en: 'WITHUS attendance' },
  notifBody: {
    uz: 'Ish vaqti kuzatilmoqda. Ishni tugatganda "Tugatish" ni bosing.',
    ru: 'Идёт учёт рабочего времени. По окончании нажмите «Завершить».',
    en: 'Work time is being tracked. Tap "Finish" when you are done.',
  },

  // Employee
  hello: { uz: 'Salom, {name}', ru: 'Здравствуйте, {name}', en: 'Hello, {name}' },
  workInProgress: { uz: 'Ish davom etmoqda', ru: 'Рабочий день идёт', en: 'Working' },
  started: { uz: 'Boshlangan', ru: 'Начало', en: 'Started' },
  lateness: { uz: 'Kechikish', ru: 'Опоздание', en: 'Late' },
  inOffice: { uz: 'Ofisda', ru: 'В офисе', en: 'In office' },
  onTask: { uz: 'Topshiriqda', ru: 'На задании', en: 'On task' },
  outside: { uz: 'Tashqarida', ru: 'Вне офиса', en: 'Outside' },
  now: { uz: 'Hozir', ru: 'Сейчас', en: 'Now' },
  finishWork: { uz: 'Ishni tugatish', ru: 'Завершить работу', en: 'Finish work' },
  finishConfirm: { uz: 'Ish kunini yakunlaysizmi?', ru: 'Завершить рабочий день?', en: 'Finish the work day?' },
  finishYes: { uz: 'Ha, tugatish', ru: 'Да, завершить', en: 'Yes, finish' },
  notStarted: { uz: 'Ish boshlanmagan', ru: 'Работа не начата', en: 'Not started' },
  startHint: {
    uz: 'Ofisga kelganingizda tugmani bosing. Joylashuvingiz tekshiriladi.',
    ru: 'Нажмите кнопку, когда придёте в офис. Ваше местоположение будет проверено.',
    en: 'Tap the button when you arrive at the office. Your location will be checked.',
  },
  startWork: { uz: 'Ishni boshlash', ru: 'Начать работу', en: 'Start work' },
  workStarted: { uz: 'Ish boshlandi', ru: 'Работа начата', en: 'Work started' },
  timeIs: { uz: 'Vaqt: {t}', ru: 'Время: {t}', en: 'Time: {t}' },
  lateBy: { uz: 'Kechikish: {n} daqiqa.', ru: 'Опоздание: {n} мин.', en: 'Late by {n} min.' },
  noBgWarning: {
    uz: "Diqqat: fon rejimida kuzatuvga ruxsat yo'q. Ish vaqtida ilovani yopmang yoki sozlamalardan 'Har doim' ruxsatini bering.",
    ru: 'Внимание: нет разрешения на фоновую геолокацию. Не закрывайте приложение в рабочее время или включите «Всегда» в настройках.',
    en: 'Note: background location is not allowed. Keep the app open during work or choose "Always" in settings.',
  },
  cannotStart: { uz: "Ishni boshlab bo'lmadi", ru: 'Не удалось начать работу', en: 'Could not start work' },
  expoGoNote: {
    uz: 'Test rejimi (Expo Go, iPhone): kuzatuv faqat ilova ochiq turganda ishlaydi.',
    ru: 'Тестовый режим (Expo Go, iPhone): учёт работает только при открытом приложении.',
    en: 'Test mode (Expo Go, iPhone): tracking works only while the app is open.',
  },
  tasks: { uz: 'Topshiriqlar', ru: 'Задания', en: 'Tasks' },
  noActiveTasks: { uz: "Faol topshiriq yo'q", ru: 'Нет активных заданий', en: 'No active tasks' },
  arriveBy: { uz: 'Yetib borish muddati', ru: 'Прибыть до', en: 'Arrive by' },
  status: { uz: 'Holat', ru: 'Статус', en: 'Status' },
  arrivedOnTime: { uz: "Yetib keldingiz (o'z vaqtida)", ru: 'Вы на месте (вовремя)', en: 'Arrived (on time)' },
  arrivedLate: { uz: 'Yetib keldingiz (kechikib)', ru: 'Вы на месте (с опозданием)', en: 'Arrived (late)' },
  onTheWay: { uz: "Yo'lda", ru: 'В пути', en: 'On the way' },
  openInMaps: { uz: 'Xaritada ochish', ru: 'Открыть карту', en: 'Open in maps' },
  done: { uz: 'Bajarildi', ru: 'Выполнено', en: 'Done' },
  thisMonth: { uz: 'Shu oy ({m})', ru: 'Этот месяц ({m})', en: 'This month ({m})' },
  shiftsWorked: { uz: 'Ishlangan smenalar', ru: 'Отработано смен', en: 'Shifts worked' },
  lateTimes: { uz: '{n} marta', ru: '{n} раз', en: '{n} times' },
  countedTime: { uz: 'Hisoblangan vaqt', ru: 'Учтённое время', en: 'Counted time' },
  estSalary: { uz: 'Taxminiy maosh', ru: 'Примерная зарплата', en: 'Estimated salary' },
  finishFirst: { uz: 'Avval ishni tugating', ru: 'Сначала завершите работу', en: 'Finish work first' },

  // Admin tabs
  tabMap: { uz: 'Xarita', ru: 'Карта', en: 'Map' },
  tabTasks: { uz: 'Topshiriq', ru: 'Задания', en: 'Tasks' },
  tabReport: { uz: 'KPI/Maosh', ru: 'KPI/Зарплата', en: 'KPI/Pay' },
  tabStaff: { uz: 'Xodimlar', ru: 'Сотрудники', en: 'Staff' },
  tabSettings: { uz: 'Sozlama', ru: 'Настройки', en: 'Settings' },

  // Map
  noSignalSince: { uz: "Signal yo'q ({t} dan beri)", ru: 'Нет сигнала (с {t})', en: 'No signal (since {t})' },
  onTaskTitle: { uz: 'Topshiriqda: {title}', ru: 'На задании: {title}', en: 'On task: {title}' },
  outsideOffice: { uz: 'Ofisdan tashqarida ({d} m)', ru: 'Вне офиса ({d} м)', en: 'Outside office ({d} m)' },
  absent: { uz: 'Kelmagan', ru: 'Не пришёл', en: 'Absent' },
  finishedShift: { uz: 'Ishni tugatgan', ru: 'Завершил работу', en: 'Finished' },
  offShift: { uz: 'Smenada emas', ru: 'Не на смене', en: 'Off shift' },
  noStaffYet: {
    uz: "Xodimlar qo'shilmagan. \"Xodimlar\" bo'limiga o'ting.",
    ru: 'Сотрудники не добавлены. Перейдите в раздел «Сотрудники».',
    en: 'No staff yet. Go to the "Staff" tab.',
  },

  // Staff
  addStaff: { uz: "+ Xodim qo'shish", ru: '+ Добавить сотрудника', en: '+ Add employee' },
  editStaff: { uz: 'Xodimni tahrirlash', ru: 'Редактировать сотрудника', en: 'Edit employee' },
  newStaff: { uz: 'Yangi xodim', ru: 'Новый сотрудник', en: 'New employee' },
  fullName: { uz: 'Ism familiya', ru: 'Имя и фамилия', en: 'Full name' },
  phoneLogin: { uz: 'Telefon raqam (login)', ru: 'Номер телефона (логин)', en: 'Phone number (login)' },
  passwordMin: { uz: 'Parol (kamida 6 belgi)', ru: 'Пароль (не менее 6 символов)', en: 'Password (min 6 characters)' },
  position: { uz: 'Lavozim', ru: 'Должность', en: 'Position' },
  shift: { uz: 'Smena', ru: 'Смена', en: 'Shift' },
  baseSalary: { uz: "Asosiy oylik (so'm)", ru: 'Оклад (сум)', en: 'Base salary (UZS)' },
  kpiBonusLabel: {
    uz: "KPI bonus — 100% bo'lganda (so'm)",
    ru: 'Бонус KPI — при 100% (сум)',
    en: 'KPI bonus at 100% (UZS)',
  },
  plannedShiftsLabel: { uz: 'Oyda rejadagi smenalar soni', ru: 'Плановых смен в месяц', en: 'Planned shifts per month' },
  needNamePhone: {
    uz: "Ism va telefon raqamni to'liq kiriting",
    ru: 'Введите имя и полный номер телефона',
    en: 'Enter the name and full phone number',
  },
  passwordShort: { uz: "Parol kamida 6 belgi bo'lsin", ru: 'Пароль — не менее 6 символов', en: 'Password must be at least 6 characters' },
  staffAdded: { uz: "Xodim qo'shildi", ru: 'Сотрудник добавлен', en: 'Employee added' },
  sendCredentials: {
    uz: 'Xodimga quyidagini yuboring:\n\nLogin: {phone}\nParol: {password}',
    ru: 'Отправьте сотруднику:\n\nЛогин: {phone}\nПароль: {password}',
    en: 'Send this to the employee:\n\nLogin: {phone}\nPassword: {password}',
  },
  phoneTaken: {
    uz: "Bu raqam allaqachon ro'yxatdan o'tgan",
    ru: 'Этот номер уже зарегистрирован',
    en: 'This number is already registered',
  },
  activate: { uz: 'Faollashtirish', ru: 'Активировать', en: 'Activate' },
  deactivate: { uz: "O'chirish", ru: 'Отключить', en: 'Deactivate' },
  activateConfirm: { uz: '{name} qayta faollashtirilsinmi?', ru: 'Снова активировать {name}?', en: 'Reactivate {name}?' },
  deactivateConfirm: {
    uz: "{name} ishdan bo'shatilsinmi? Ilovaga kira olmaydi.",
    ru: 'Уволить {name}? Доступ к приложению будет закрыт.',
    en: 'Deactivate {name}? They will lose access to the app.',
  },
  edit: { uz: 'Tahrirlash', ru: 'Изменить', en: 'Edit' },
  staffSummary: {
    uz: 'Oylik: {base} · KPI bonus: {bonus} · Reja: {n} smena',
    ru: 'Оклад: {base} · Бонус KPI: {bonus} · План: {n} смен',
    en: 'Salary: {base} · KPI bonus: {bonus} · Plan: {n} shifts',
  },

  // Tasks
  sendTask: { uz: '+ Topshiriq yuborish', ru: '+ Отправить задание', en: '+ Send task' },
  newTask: { uz: 'Yangi topshiriq', ru: 'Новое задание', en: 'New task' },
  employee: { uz: 'Xodim', ru: 'Сотрудник', en: 'Employee' },
  task: { uz: 'Topshiriq', ru: 'Задание', en: 'Task' },
  taskPlaceholder: {
    uz: 'Masalan: Chiptani mijozga yetkazish',
    ru: 'Например: доставить билет клиенту',
    en: 'E.g. deliver the ticket to a client',
  },
  address: { uz: 'Manzil', ru: 'Адрес', en: 'Address' },
  addressPlaceholder: { uz: "Ko'cha, uy", ru: 'Улица, дом', en: 'Street, building' },
  findAddress: { uz: 'Manzilni xaritadan topish', ru: 'Найти адрес на карте', en: 'Find address on map' },
  notFound: { uz: 'Topilmadi', ru: 'Не найдено', en: 'Not found' },
  tapMapHint: { uz: 'Manzilni xaritada bosib belgilang', ru: 'Отметьте адрес нажатием на карту', en: 'Tap the map to mark the address' },
  orTapMap: { uz: 'Yoki xaritada kerakli joyni bosing:', ru: 'Или нажмите на нужное место на карте:', en: 'Or tap the place on the map:' },
  deadlineMinutes: {
    uz: 'Necha daqiqada yetib borishi kerak',
    ru: 'За сколько минут нужно прибыть',
    en: 'Minutes to arrive',
  },
  send: { uz: 'Yuborish', ru: 'Отправить', en: 'Send' },
  taskNeedFields: {
    uz: 'Xodim, topshiriq nomi va xaritadagi nuqtani tanlang',
    ru: 'Выберите сотрудника, название задания и точку на карте',
    en: 'Choose an employee, a task title and a point on the map',
  },
  noTasks: { uz: "Topshiriqlar yo'q", ru: 'Заданий нет', en: 'No tasks' },
  sentAt: { uz: 'Yuborilgan', ru: 'Отправлено', en: 'Sent' },
  deadline: { uz: 'Muddat', ru: 'Срок', en: 'Deadline' },
  taskMissed: { uz: "Yetib bormadi (muddat o'tdi)", ru: 'Не прибыл (срок истёк)', en: 'Did not arrive (overdue)' },
  taskArrivedOnTime: { uz: "Yetib bordi {t} (o'z vaqtida)", ru: 'Прибыл {t} (вовремя)', en: 'Arrived {t} (on time)' },
  taskArrivedLate: { uz: 'Kechikib bordi {t}', ru: 'Прибыл с опозданием {t}', en: 'Arrived late {t}' },
  taskDone: { uz: 'Bajarildi', ru: 'Выполнено', en: 'Done' },
  taskDoneLate: { uz: 'Bajarildi (kechikib)', ru: 'Выполнено (с опозданием)', en: 'Done (late)' },
  taskDoneNoArrival: {
    uz: 'Bajarildi (manzilga borgani qayd etilmagan)',
    ru: 'Выполнено (прибытие не зафиксировано)',
    en: 'Done (arrival not recorded)',
  },
  taskCancelled: { uz: 'Bekor qilingan', ru: 'Отменено', en: 'Cancelled' },
  addressMarker: { uz: 'Manzil', ru: 'Адрес', en: 'Address' },

  // Report
  payrollTotal: { uz: 'Jami maosh fondi', ru: 'Общий фонд зарплаты', en: 'Total payroll' },
  exportCsv: { uz: 'Excel (CSV) yuklab olish', ru: 'Скачать Excel (CSV)', en: 'Download Excel (CSV)' },
  report: { uz: 'Hisobot', ru: 'Отчёт', en: 'Report' },
  fakeGpsUsed: { uz: '⚠ Soxta joylashuv (Fake GPS) ishlatilgan!', ru: '⚠ Использовалась поддельная геолокация (Fake GPS)!', en: '⚠ Fake GPS was used!' },
  attendance: { uz: 'Davomat', ru: 'Посещаемость', en: 'Attendance' },
  shifts: { uz: 'Smenalar', ru: 'Смены', en: 'Shifts' },
  lateSummary: { uz: '{n} marta, {m} daq', ru: '{n} раз, {m} мин', en: '{n} times, {m} min' },
  unexcusedOutside: { uz: 'Sababsiz tashqarida', ru: 'Вне офиса без причины', en: 'Outside without reason' },
  noSignal: { uz: "Signal yo'q", ru: 'Нет сигнала', en: 'No signal' },
  countedVsPlan: { uz: 'Hisoblangan / reja', ru: 'Учтено / план', en: 'Counted / planned' },
  tasksOnTime: { uz: "Topshiriqlar (o'z vaqtida)", ru: 'Задания (вовремя)', en: 'Tasks (on time)' },
  kpiPunctuality: { uz: "O'z vaqtida kelish", ru: 'Пунктуальность', en: 'Punctuality' },
  kpiAttendance: { uz: 'Davomat', ru: 'Посещаемость', en: 'Attendance' },
  kpiPresence: { uz: "Ish joyida bo'lish", ru: 'Присутствие на рабочем месте', en: 'Presence at work' },
  kpiTasks: { uz: 'Topshiriqlar', ru: 'Задания', en: 'Tasks' },
  salary: { uz: 'Maosh', ru: 'Зарплата', en: 'Salary' },
  salaryBase: { uz: "Asosiy (ishlangan soat bo'yicha)", ru: 'Оклад (по отработанным часам)', en: 'Base (by hours worked)' },
  kpiBonus: { uz: 'KPI bonus', ru: 'Бонус KPI', en: 'KPI bonus' },
  latePenalty: { uz: 'Kechikish jarimasi', ru: 'Штраф за опоздания', en: 'Late penalty' },
  total: { uz: 'Jami', ru: 'Итого', en: 'Total' },
  days: { uz: 'Kunlar', ru: 'Дни', en: 'Days' },
  late: { uz: 'kech {n} daq', ru: 'опоздание {n} мин', en: 'late {n} min' },
  onTime: { uz: 'vaqtida', ru: 'вовремя', en: 'on time' },

  // CSV
  csvMonth: { uz: 'Oy', ru: 'Месяц', en: 'Month' },
  csvLates: { uz: 'Kechikishlar', ru: 'Опоздания', en: 'Lates' },
  csvPenaltyMin: { uz: 'Jarima daqiqa', ru: 'Штрафные минуты', en: 'Penalty minutes' },
  csvInside: { uz: 'Ofisda (soat)', ru: 'В офисе (ч)', en: 'In office (h)' },
  csvTask: { uz: 'Topshiriqda (soat)', ru: 'На задании (ч)', en: 'On task (h)' },
  csvOutside: { uz: 'Sababsiz tashqarida (soat)', ru: 'Вне офиса без причины (ч)', en: 'Outside w/o reason (h)' },
  csvUnknown: { uz: "Signal yo'q (soat)", ru: 'Нет сигнала (ч)', en: 'No signal (h)' },
  csvPaid: { uz: 'Hisoblangan soat', ru: 'Учтённые часы', en: 'Counted hours' },
  csvPlanned: { uz: 'Reja (soat)', ru: 'План (ч)', en: 'Planned (h)' },
  csvTasks: { uz: 'Topshiriqlar', ru: 'Задания', en: 'Tasks' },
  csvTasksOnTime: { uz: "O'z vaqtida", ru: 'Вовремя', en: 'On time' },
  csvBase: { uz: 'Asosiy', ru: 'Оклад', en: 'Base' },
  csvPenalty: { uz: 'Jarima', ru: 'Штраф', en: 'Penalty' },
  csvTotal: { uz: 'Jami maosh', ru: 'Итого зарплата', en: 'Total salary' },
  csvYes: { uz: 'HA', ru: 'ДА', en: 'YES' },

  // Settings
  officeArea: { uz: 'Ofis hududi', ru: 'Зона офиса', en: 'Office area' },
  officeMarker: { uz: 'Ofis', ru: 'Офис', en: 'Office' },
  officeHint: {
    uz: 'Ofisda turib quyidagi tugmani bosing yoki xaritada ofis joyini bosing.',
    ru: 'Находясь в офисе, нажмите кнопку ниже или отметьте офис на карте.',
    en: 'While in the office, tap the button below or tap the office on the map.',
  },
  useMyLocation: { uz: 'Hozirgi joyimni ofis qilish', ru: 'Сделать текущее место офисом', en: 'Set my current location as office' },
  allowLocation: { uz: 'Geolokatsiyaga ruxsat bering', ru: 'Разрешите доступ к геолокации', en: 'Allow location access' },
  marked: { uz: 'Belgilandi', ru: 'Отмечено', en: 'Marked' },
  markedAccuracy: {
    uz: 'Aniqlik: ±{n} m. "Saqlash" ni bosing.',
    ru: 'Точность: ±{n} м. Нажмите «Сохранить».',
    en: 'Accuracy: ±{n} m. Tap "Save".',
  },
  radius: { uz: 'Hudud radiusi (metr)', ru: 'Радиус зоны (метры)', en: 'Zone radius (meters)' },
  shiftsTitle: { uz: 'Smenalar', ru: 'Смены', en: 'Shifts' },
  shiftStart: { uz: 'Boshlanish', ru: 'Начало', en: 'Start' },
  shiftEnd: { uz: 'Tugash', ru: 'Конец', en: 'End' },
  badTime: {
    uz: "Vaqtni SS:DD ko'rinishida kiriting, masalan 08:00",
    ru: 'Введите время в формате ЧЧ:ММ, например 08:00',
    en: 'Enter time as HH:MM, e.g. 08:00',
  },
  lateRules: { uz: 'Kechikish', ru: 'Опоздания', en: 'Lateness' },
  graceMinutes: { uz: 'Kechiriladigan daqiqalar', ru: 'Допустимое опоздание (мин)', en: 'Grace period (min)' },
  penaltyPerMinute: {
    uz: "Har bir kechikkan daqiqa uchun jarima (so'm)",
    ru: 'Штраф за каждую минуту опоздания (сум)',
    en: 'Penalty per late minute (UZS)',
  },
  kpiWeights: { uz: 'KPI ulushlari (%)', ru: 'Веса KPI (%)', en: 'KPI weights (%)' },
  kpiPunctualityLong: { uz: "O'z vaqtida kelish", ru: 'Пунктуальность', en: 'Punctuality' },
  kpiAttendanceLong: { uz: 'Davomat (smenalar)', ru: 'Посещаемость (смены)', en: 'Attendance (shifts)' },
  kpiPresenceLong: { uz: "Ish joyida bo'lish", ru: 'Присутствие на рабочем месте', en: 'Presence at work' },
  kpiTasksLong: {
    uz: "Topshiriqlarni o'z vaqtida bajarish",
    ru: 'Своевременное выполнение заданий',
    en: 'Tasks completed on time',
  },
} satisfies Record<string, Record<Lang, string>>;

export type TKey = keyof typeof dict;

let current: Lang = detectLang();

function detectLang(): Lang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (loc.startsWith('ru')) return 'ru';
    if (loc.startsWith('en')) return 'en';
  } catch {
    // Intl mavjud bo'lmasa o'zbek tili
  }
  return 'uz';
}

export function getLang(): Lang {
  return current;
}

// React tashqarisida ham ishlatiladi (fon vazifasi, xato xabarlari)
export function t(key: TKey, params?: Record<string, string | number>): string {
  let s: string = dict[key][current] ?? dict[key].uz;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

// Firestore'da saqlangan lavozim nomini tanlangan tilda ko'rsatish
export function tPosition(p: string): string {
  const key = `pos_${p}` as TKey;
  return key in dict ? t(key) : p;
}

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: current,
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(current);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'uz' || v === 'ru' || v === 'en') {
          current = v;
          setLangState(v);
        }
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    current = l;
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

// Til o'zgarganda komponent qayta chiziladi
export function useI18n() {
  const ctx = useContext(LangContext);
  return { ...ctx, t };
}
