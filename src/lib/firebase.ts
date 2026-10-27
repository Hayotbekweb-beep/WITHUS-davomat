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

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'not-configured',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isConfigured = Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY && firebaseConfig.projectId);

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
