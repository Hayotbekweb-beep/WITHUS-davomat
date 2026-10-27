import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { LANGS, t, useI18n } from '../lib/i18n';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chips, colors, Field, Muted } from '../components/ui';
import { DEFAULT_SETTINGS, phoneToEmail } from '../lib/defaults';
import { auth, db } from '../lib/firebase';

export default function LoginScreen() {
  const { lang, setLang } = useI18n();
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
      Alert.alert(t('error'), t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Birinchi foydalanuvchi — rahbar. Firestore qoidalari faqat bir marta ruxsat beradi.
  const setupAdmin = async () => {
    if (!name.trim() || password.length < 6) {
      Alert.alert(t('error'), t('setupNeedName'));
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
      Alert.alert(t('error'), e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 80 }}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.primary }}>WITHUS TRIP</Text>
          <Text style={{ fontSize: 16, color: colors.muted, marginTop: 4 }}>{t('appSubtitle')}</Text>
        </View>
        <Chips options={LANGS} value={lang} onChange={setLang} />
        <Card>
          {mode === 'setup' && (
            <Field label={t('yourName')} value={name} onChangeText={setName} placeholder={t('directorName')} />
          )}
          <Field
            label={t('phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="90 123 45 67"
          />
          <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
          {mode === 'login' ? (
            <Button title={t('login')} onPress={login} loading={loading} />
          ) : (
            <Button title={t('createDirector')} onPress={setupAdmin} loading={loading} />
          )}
        </Card>
        {adminExists === false && mode === 'login' && (
          <Card>
            <Muted>{t('noDirectorYet')}</Muted>
            <Button title={t('registerDirector')} outline onPress={() => setMode('setup')} />
          </Card>
        )}
        {mode === 'setup' && <Button title={t('back')} outline onPress={() => setMode('login')} />}
        <Muted>{t('credentialsFromDirector')}</Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
