import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  signOut,
} from 'firebase/auth';
// React Native build'ida mavjud, lekin web tiplarida e'lon qilinmagan
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// WITHUS TRIP Firebase loyihasi. Bu web-kalitlar maxfiy emas (har bir APK ichida bo'ladi),
// ma'lumotlarni firestore.rules himoya qiladi. Boshqa loyihaga ulash uchun
// EXPO_PUBLIC_FIREBASE_* muhit o'zgaruvchilarini bering.
const env = (v: string | undefined, fallback: string) => v || fallback;

export const firebaseConfig = {
  apiKey: env(process.env.EXPO_PUBLIC_FIREBASE_API_KEY, 'AIzaSyCu8wYSl1mknxAlcMlM-3N0MBMeaX5yzKA'),
  authDomain: env(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, 'withus-davomat.firebaseapp.com'),
  projectId: env(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID, 'withus-davomat'),
  storageBucket: env(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, 'withus-davomat.firebasestorage.app'),
  messagingSenderId: env(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, '520561840291'),
  appId: env(process.env.EXPO_PUBLIC_FIREBASE_APP_ID, '1:520561840291:web:dfa20c6e06c6e086b72f16'),
};

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

function initAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = initAuth(app);
export const db = getFirestore(app);

// Rahbar yangi xodim yaratganda o'z sessiyasidan chiqib ketmasligi uchun
// alohida (ikkinchi) Firebase ilovasi orqali yaratiladi.
export async function createLoginAccount(email: string, password: string): Promise<string> {
  const secondary =
    getApps().find((a) => a.name === 'secondary') ?? initializeApp(firebaseConfig, 'secondary');
  let secAuth: Auth;
  try {
    secAuth = initializeAuth(secondary, { persistence: inMemoryPersistence });
  } catch {
    secAuth = getAuth(secondary);
  }
  const cred = await createUserWithEmailAndPassword(secAuth, email, password);
  await signOut(secAuth);
  return cred.user.uid;
}
