import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import { DEFAULT_SETTINGS } from './defaults';
import { Settings } from './types';

export const settingsRef = () => doc(db, 'settings', 'main');

export async function loadSettings(): Promise<Settings> {
  const snap = await getDoc(settingsRef());
  return snap.exists() ? { ...DEFAULT_SETTINGS, ...(snap.data() as Settings) } : DEFAULT_SETTINGS;
}

export async function saveSettings(s: Settings) {
  await setDoc(settingsRef(), s);
}

export function useSettings(): Settings {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(
    () =>
      onSnapshot(
        settingsRef(),
        (snap) => snap.exists() && setS({ ...DEFAULT_SETTINGS, ...(snap.data() as Settings) }),
        () => {},
      ),
    [],
  );
  return s;
}
