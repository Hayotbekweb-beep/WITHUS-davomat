import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button, Card, colors, Field, Muted } from '../components/ui';
import { DEFAULT_SETTINGS, phoneToEmail } from '../lib/defaults';
import { auth, db } from '../lib/firebase';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'login' | 'setup'>('login');

  useEffect(() => {
    getDoc(doc(db, 'meta', 'admin'))
      .then((s) => setAdminExists(s.exists()))
      .catch(() => setAdminExists(true));
  }, []);

  const login = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, phoneToEmail(phone), password);
    } catch {
      Alert.alert('Xato', "Telefon raqam yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  // Birinchi foydalanuvchi — rahbar. Firestore qoidalari faqat bir marta ruxsat beradi.
  const setupAdmin = async () => {
    if (!name.trim() || password.length < 6) {
      Alert.alert('Xato', "Ism kiriting, parol kamida 6 belgi bo'lsin");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, phoneToEmail(phone), password);
      const uid = cred.user.uid;
      const batch = writeBatch(db);
      batch.set(doc(db, 'meta', 'admin'), { uid });
      batch.set(doc(db, 'users', uid), {
        uid,
        name: name.trim(),
        phone,
        role: 'admin',
        position: 'Rahbar',
        shift: 'day',
        baseSalary: 0,
        kpiBonus: 0,
        plannedShifts: 0,
        active: true,
      });
      batch.set(doc(db, 'settings', 'main'), DEFAULT_SETTINGS);
      await batch.commit();
    } catch (e: any) {
      Alert.alert('Xato', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 80 }}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.primary }}>WITHUS TRIP</Text>
          <Text style={{ fontSize: 16, color: colors.muted, marginTop: 4 }}>Xodimlar davomati</Text>
        </View>
        <Card>
          {mode === 'setup' && (
            <Field label="Ismingiz" value={name} onChangeText={setName} placeholder="Rahbar ismi" />
          )}
          <Field
            label="Telefon raqam"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="90 123 45 67"
          />
          <Field label="Parol" value={password} onChangeText={setPassword} secureTextEntry />
          {mode === 'login' ? (
            <Button title="Kirish" onPress={login} loading={loading} />
          ) : (
            <Button title="Rahbar hisobini yaratish" onPress={setupAdmin} loading={loading} />
          )}
        </Card>
        {adminExists === false && mode === 'login' && (
          <Card>
            <Muted>Tizimda hali rahbar yo'q. Birinchi marta ochayotgan bo'lsangiz:</Muted>
            <Button title="Rahbar sifatida ro'yxatdan o'tish" outline onPress={() => setMode('setup')} />
          </Card>
        )}
        {mode === 'setup' && <Button title="Orqaga" outline onPress={() => setMode('login')} />}
        <Muted>Xodimlarga login va parolni rahbar beradi.</Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
