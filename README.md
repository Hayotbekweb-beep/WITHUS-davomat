# WITHUS Davomat

WITHUS TRIP aviakassasi xodimlari uchun davomat, geolokatsiya, KPI va oylik maosh ilovasi (Android + iPhone).

## Imkoniyatlar

**Xodim ilovasi**
- Telefon raqam + parol bilan kirish (login/parolni rahbar beradi)
- **"Ishni boshlash"** — faqat ofis hududida (radius bo'yicha) ishlaydi, kechikish avtomatik hisoblanadi
- Geolokatsiyaga ruxsat **bir marta** so'raladi ("Har doim ruxsat berish")
- Ish vaqtida har ~1 daqiqada joylashuv yuboriladi (Android'da bildirishnoma ko'rinib turadi)
- Rahbar yuborgan topshiriqlar, manzilga yetib borish avtomatik qayd etiladi
- Fake GPS (soxta joylashuv) aniqlansa rahbarga belgi chiqadi
- Shu oydagi smenalar, kechikishlar, KPI va taxminiy maosh

**Rahbar paneli** (o'sha ilovaning o'zida, rahbar hisobi bilan kirilganda)
- 🗺 **Xarita** — kim ofisda 🟢, kim tashqarida 🟠, kim topshiriqda 🔵, kim kelmagan 🔴, signali yo'q ⚪
- 📍 **Topshiriq** — xodimni manzilga yuborish, muddat; yetib bordimi/kechikdimi/bormadimi
- 📊 **KPI / Maosh** — oy bo'yicha hisobot, kunlar kesimida, Excel (CSV) yuklab olish
- 👥 **Xodimlar** — qo'shish, smena, oylik, KPI bonus, ishdan bo'shatish
- ⚙️ **Sozlamalar** — ofis joyi va radiusi, smena vaqtlari, kechikish jarimasi, KPI ulushlari

## Hisoblash qoidalari

Smenalar: **1-smena 08:00–19:00** (11 soat), **2-smena 19:00–08:00** (13 soat).

| Ko'rsatkich | Qanday hisoblanadi |
|---|---|
| Kechikish | "Ishni boshlash" vaqti − smena boshlanishi. 10 daqiqagacha kechiriladi |
| Hisoblangan vaqt | Ofisda + topshiriqda o'tgan vaqt (bir smenada smena davomiyligidan oshmaydi). Sababsiz tashqarida yurgan vaqt hisoblanmaydi |
| KPI 30% | O'z vaqtida kelish — kechikmagan smenalar ulushi |
| KPI 30% | Davomat — ishlangan smenalar / rejadagi smenalar |
| KPI 20% | Ish joyida bo'lish — (ofis + topshiriq) / (ofis + topshiriq + sababsiz tashqarida) |
| KPI 20% | Topshiriqlar — muddatida yetib borilganlar ulushi |

**Maosh = Asosiy oylik × (hisoblangan soat / rejadagi soat) + KPI bonus × KPI% − kechikish jarimasi**

Masalan: oylik 4 000 000, KPI bonus 1 000 000, reja 15 smena (165 soat), ishlagani 147 soat, KPI 83%, 30 daqiqa jarima (×1000):
4 000 000 × 147/165 + 1 000 000 × 0.83 − 30 000 ≈ **4 361 700 so'm**.

Barcha foiz va summalarni "Sozlamalar" va "Xodimlar" bo'limidan o'zgartirish mumkin.

---

## O'rnatish (bir marta, ~20 daqiqa)

### 1. Firebase (bepul server)
1. https://console.firebase.google.com → **Add project** → nom: `withus-davomat` (Google Analytics shart emas).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
3. **Build → Firestore Database → Create database** → joy: `europe-west3 (Frankfurt)` → **production mode**.
4. Firestore → **Rules** bo'limiga shu repodagi [`firestore.rules`](firestore.rules) faylining matnini to'liq qo'yib **Publish** bosing.
5. **Project settings (⚙️) → Your apps → Web (`</>`)** → ilova qo'shing → ko'rsatilgan `firebaseConfig` qiymatlarini nusxalang.

### 2. GitHub Secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret** — quyidagi 6 tasini qo'shing:

| Secret nomi | firebaseConfig dagi qiymat |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |

### 3. Android APK
Repo → **Actions → Android APK → Run workflow**. ~15 daqiqadan keyin APK **Releases → latest** sahifasida paydo bo'ladi: `withus-davomat.apk`.
Shu sahifa havolasini xodimlarga yuboring — telefonda ochib, yuklab, o'rnatadilar ("Noma'lum manbalardan o'rnatish"ga ruxsat berish kerak).

> Har bir xodim telefonida: **Sozlamalar → Ilovalar → WITHUS Davomat → Batareya → Cheklovsiz** qilib qo'ying, aks holda ba'zi telefonlar (Xiaomi, Samsung, Huawei) fonda kuzatuvni to'xtatib qo'yadi.

### 4. Birinchi ishga tushirish
1. Rahbar ilovani ochadi → **"Rahbar sifatida ro'yxatdan o'tish"** (bu tugma faqat bir marta, birinchi foydalanuvchiga chiqadi).
2. ⚙️ Sozlamalar → ofisda turib **"Hozirgi joyimni ofis qilish"** → **Saqlash**. (Standart koordinata taxminiy!)
3. 👥 Xodimlar → 3 kunduzgi (2 operator, 1 kassir) va 1 tungi operatorni qo'shing, har biriga login/parol bering.

---

## iPhone

### Bepul test (Expo Go)
Apple pulli hisobsiz iPhone'ga o'z ilovani o'rnatishga ruxsat bermaydi, shuning uchun test **Expo Go** orqali qilinadi:
1. iPhone'ga App Store'dan **Expo Go** ni o'rnating.
2. Kompyuterda (Windows/Mac): [Node.js](https://nodejs.org) o'rnating, repo'ni yuklab oling, `.env.example` dan nusxa olib `.env` yarating va Firebase qiymatlarini yozing.
3. `npm install` va `npx expo start --tunnel` → chiqqan QR kodni iPhone kamerasi bilan skanerlang.

⚠ Expo Go'da iPhone **fonda kuzatmaydi** — faqat ilova ochiq turganda. Kirish/chiqish, kechikish, topshiriqlar ishlaydi; lekin ilova yopilgan vaqt "Signal yo'q" bo'lib qoladi. Bu faqat test uchun.

### Doimiy ishlatish (fonda kuzatuv bilan)
- [Apple Developer Program](https://developer.apple.com/programs/) — yiliga $99.
- [expo.dev](https://expo.dev) da bepul hisob, keyin: `npx eas-cli build -p ios` va `npx eas-cli submit -p ios` → **TestFlight** orqali xodimlarga tarqatiladi (App Store'ga chiqarish shart emas).

---

## Muhim: qonun va xodimlar roziligi
O'zbekiston "Shaxsga doir ma'lumotlar to'g'risida"gi qonuniga ko'ra geolokatsiya — shaxsiy ma'lumot. Tavsiya:
- Har bir xodimdan yozma **rozilik** oling (ish vaqtida joylashuv kuzatilishi, maqsadi — davomat, KPI va maosh hisobi).
- Ilova joylashuvni **faqat "Ishni boshlash" va "Ishni tugatish" orasida** kuzatadi — ishdan keyin kuzatmaydi.
- Ichki tartib qoidalarida kechikish jarimasi va KPI tartibini yozib qo'ying.

## Cheklovlar
- Kechikish va vaqt hisobi xodim telefonida hisoblanadi; Firestore qoidalari boshlanish vaqtini soxtalashtirish va boshqa xodim ma'lumotini o'zgartirishni bloklaydi. To'liq serverda hisoblash uchun Firebase Cloud Functions (pullik Blaze tarif) kerak bo'ladi.
- Xodim telefonni o'chirsa yoki internet bo'lmasa — vaqt "Signal yo'q" deb belgilanadi (internet qaytganda to'plangan vaqt yuboriladi).
- Bepul Firebase limiti (kuniga 20 000 yozuv) 4 xodim uchun yetarli (~6 000/kun).

## Dasturchilar uchun
```bash
npm install
cp .env.example .env   # qiymatlarni to'ldiring
npx expo start         # Expo Go bilan test
npm run typecheck
```
Texnologiya: Expo SDK 58 (React Native), Firebase Auth + Firestore, expo-location + expo-task-manager (fon kuzatuvi), Leaflet + OpenStreetMap (xarita, API kalit shart emas).
