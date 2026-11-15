import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Screen, Segmented, Surface, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { supabase, onlineConfigured } from '@/services/supabase';
import { useWallet } from '@/state/wallet';
import { useSession } from '@/state/session';
import { ECONOMY, guestMigrationAmount } from '@/engine/meta/economy.ts';
import { migrateGuest, syncLearning } from '@/features/sync/sync';

export default function Auth() {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [migrate, setMigrate] = useState(false);
  const guestBalance = useWallet((s) => s.balance);
  const migrated = useWallet((s) => s.migratedToAccount);
  if (!onlineConfigured || !supabase) {
    return (
      <Screen title={t('auth.title')} back tabBar={false}>
        <EmptyState icon="wifiOff" title={t('auth.notConfigured')} body={t('social.signedOutBody')} />
      </Screen>
    );
  }
  const input = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput
      placeholderTextColor={c.text3}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={{ height: 50, borderRadius: 14, backgroundColor: c.surface2, color: c.text, paddingHorizontal: 14, fontFamily: 'Geist_400Regular', fontSize: 16 }}
    />
  );
  const submit = async () => {
    setMsg(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg(t('auth.invalid'));
    if (password.length < 8) return setMsg(t('auth.weakPassword'));
    setBusy(true);
    try {
      if (mode === 'signUp') {
        const { data, error } = await supabase!.auth.signUp({ email, password, options: { data: { username: username.trim() || undefined } } });
        if (error) throw error;
        if (!data.session) {
          setMsg(t('auth.checkEmail'));
          return;
        }
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await useSession.getState().refresh();
      void syncLearning();
      if (!migrated && guestBalance > 0) setMigrate(true);
      else router.back();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (migrate) {
    return (
      <Screen title={t('auth.migrateTitle')} back tabBar={false}>
        <Surface style={{ marginHorizontal: SCREEN_PAD, gap: 12 }}>
          <T variant="body" color="text2">{t('auth.migrateBody', { amount: formatCoins(guestMigrationAmount(guestBalance)), cap: formatCoins(ECONOMY.guestMigrationCap) })}</T>
          <Button title={t('auth.migrate')} onPress={() => void migrateGuest().catch(() => undefined).finally(() => router.back())} />
          <Button title={t('common.skip')} kind="ghost" onPress={() => router.back()} />
        </Surface>
      </Screen>
    );
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={t('auth.title')} subtitle={t('auth.subtitle')} back tabBar={false}>
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 12 }}>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'signUp', label: t('auth.signUp') }, { value: 'signIn', label: t('auth.signIn') }]} />
          {mode === 'signUp' && input({ value: username, onChangeText: (v) => setUsername(v.replace(/[^A-Za-z0-9_.]/g, '').slice(0, 20)), placeholder: t('auth.username'), accessibilityLabel: t('auth.username'), textContentType: 'username' })}
          {input({ value: email, onChangeText: setEmail, placeholder: t('auth.email'), keyboardType: 'email-address', accessibilityLabel: t('auth.email'), textContentType: 'emailAddress', autoComplete: 'email' })}
          {input({ value: password, onChangeText: setPassword, placeholder: t('auth.password'), secureTextEntry: true, accessibilityLabel: t('auth.password'), textContentType: mode === 'signUp' ? 'newPassword' : 'password' })}
          {msg ? <T variant="footnote" color="warn">{msg}</T> : null}
          <Button title={mode === 'signUp' ? t('auth.signUp') : t('auth.signIn')} onPress={() => void submit()} loading={busy} />
          <Button
            title={t('auth.magicLink')}
            kind="ghost"
            onPress={() => void supabase!.auth.signInWithOtp({ email }).then(({ error }) => setMsg(error ? error.message : t('auth.checkEmail')))}
            disabled={!/^\S+@\S+\.\S+$/.test(email)}
          />
          <T variant="footnote" color="text3" align="center">{t('common.noMoneyDisclaimer')}</T>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
