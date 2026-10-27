import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { Live, Session, UserProfile, WorkTask } from '../../lib/types';

export function useCollection<T>(path: string, field?: string, value?: string): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const ref = collection(db, path);
    const q = field && value !== undefined ? query(ref, where(field, '==', value)) : ref;
    return onSnapshot(
      q,
      (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
      () => {},
    );
  }, [path, field, value]);
  return items;
}

export const useEmployees = () =>
  [...useCollection<UserProfile>('users', 'role', 'employee')].sort((a, b) => a.name.localeCompare(b.name));
export const useLive = () => useCollection<Live>('live');
export const useMonthSessions = (month: string) => useCollection<Session>('sessions', 'month', month);
export const useTasks = () =>
  [...useCollection<WorkTask>('tasks')].sort((a, b) => b.createdAt - a.createdAt);
