import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button, colors } from './src/components/ui';
import { auth, db, isConfigured } from './src/lib/firebase';
import { UserProfile } from './src/lib/types';
import AdminHome from './src/screens/admin/AdminHome';
import EmployeeHome from './src/screens/EmployeeHome';
import LoginScreen from './src/screens/LoginScreen';

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return setProfile(user === null ? null : undefined);
    setProfile(undefined);
    return onSnapshot(
      doc(db, 'users', user.uid),
      (s) => setProfile(s.exists() ? (s.data() as UserProfile) : null),
      () => setProfile(null),
    );
  }, [user]);

  let content: React.ReactNode;
  if (!isConfigured) {
    content = (
      <Center>
        <Text style={{ textAlign: 'center' }}>
          Firebase sozlanmagan. README dagi ko'rsatma bo'yicha EXPO_PUBLIC_FIREBASE_* qiymatlarini kiriting.
        </Text>
      </Center>
    );
  } else if (user === undefined || (user && profile === undefined)) {
    content = (
      <Center>
        <ActivityIndicator size="large" color={colors.primary} />
      </Center>
    );
  } else if (!user) {
    content = <LoginScreen />;
  } else if (!profile || profile.active === false) {
    content = (
      <Center>
        <Text style={{ textAlign: 'center', marginBottom: 12 }}>
          Hisobingiz faol emas yoki topilmadi. Rahbarga murojaat qiling.
        </Text>
        <Button title="Chiqish" onPress={() => signOut(auth)} />
      </Center>
    );
  } else if (profile.role === 'admin') {
    content = <AdminHome />;
  } else {
    content = <EmployeeHome profile={profile} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      {content}
    </View>
  );
}

const Center = ({ children }: { children: React.ReactNode }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>{children}</View>
);
