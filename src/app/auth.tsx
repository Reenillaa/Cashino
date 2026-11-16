import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button, Icon, PressableScale, Screen, Segmented, Surface, T, formatCoins } from '@/design/components';
import { signInWithProvider, type OAuthProvider } from '@/features/auth/oauth';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { supabase, onlineConfigured } from '@/services/supabase';
import { useWallet } from '@/state/wallet';
import { useSession } from '@/state/session';
import { ECONOMY, guestMigrationAmount } from '@/engine/meta/economy.ts';
import { migrateGuest, syncLearning } from '@/features/sync/sync';

/** Social sign-in buttons appear only for providers enabled in Supabase (EXPO_PUBLIC_OAUTH_PROVIDERS="google,apple"). */
const OAUTH = (process.env.EXPO_PUBLIC_OAUTH_PROVIDERS ?? '').split(',').map((x: string) => x.trim()).filter((x: string): x is OAuthProvider => x === 'apple' || x === 'google');

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
  const [oauthBusy, setOauthBusy] = useState<OAuthProvider | null>(null);
  const afterSignIn = async () => {
    await useSession.getState().refresh();
    void syncLearning();
    if (!migrated && guestBalance > 0) setMigrate(true);
    else router.back();
  };
  const provider = async (p: OAuthProvider) => {
    setMsg(null);
    if (!onlineConfigured) return setMsg(t('auth.notConfigured'));
    setOauthBusy(p);
    try {
      const ok = await signInWithProvider(p);
      if (ok && Platform.OS !== 'web') await afterSignIn();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setOauthBusy(null);
    }
  };
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
    if (!supabase) return setMsg(t('auth.notConfigured'));
    setBusy(true);
    try {
      if (mode === 'signUp') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username: username.trim() || undefined } } });
        if (error) throw error;
        if (!data.session) {
          setMsg(t('auth.checkEmail'));
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await afterSignIn();
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
          {!onlineConfigured ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: c.surface2 }}>
              <Icon name="wifiOff" size={18} color={c.text2} />
              <T variant="footnote" color="text2" style={{ flex: 1 }}>{t('auth.notConfigured')} {t('auth.offlineOk')}</T>
            </View>
          ) : null}
          {OAUTH.length ? (
            <>
            {OAUTH.includes('apple') ? <ProviderButton kind="apple" label={t('auth.withApple')} busy={oauthBusy === 'apple'} onPress={() => void provider('apple')} /> : null}
            {OAUTH.includes('google') ? <ProviderButton kind="google" label={t('auth.withGoogle')} busy={oauthBusy === 'google'} onPress={() => void provider('google')} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.surface3 }} />
              <T variant="footnote" color="text3">{t('auth.orEmail')}</T>
              <View style={{ flex: 1, height: 1, backgroundColor: c.surface3 }} />
            </View>
            </>
          ) : null}
          <Segmented value={mode} onChange={setMode} options={[{ value: 'signUp', label: t('auth.signUp') }, { value: 'signIn', label: t('auth.signIn') }]} />
          {mode === 'signUp' && input({ value: username, onChangeText: (v) => setUsername(v.replace(/[^A-Za-z0-9_.]/g, '').slice(0, 20)), placeholder: t('auth.username'), accessibilityLabel: t('auth.username'), textContentType: 'username' })}
          {input({ value: email, onChangeText: setEmail, placeholder: t('auth.email'), keyboardType: 'email-address', accessibilityLabel: t('auth.email'), textContentType: 'emailAddress', autoComplete: 'email' })}
          {input({ value: password, onChangeText: setPassword, placeholder: t('auth.password'), secureTextEntry: true, accessibilityLabel: t('auth.password'), textContentType: mode === 'signUp' ? 'newPassword' : 'password' })}
          {msg ? <T variant="footnote" color="warn">{msg}</T> : null}
          <Button title={mode === 'signUp' ? t('auth.signUp') : t('auth.signIn')} onPress={() => void submit()} loading={busy} />
          <Button
            title={t('auth.magicLink')}
            kind="ghost"
            onPress={() => (supabase ? void supabase.auth.signInWithOtp({ email }).then(({ error }) => setMsg(error ? error.message : t('auth.checkEmail'))) : setMsg(t('auth.notConfigured')))}
            disabled={!/^\S+@\S+\.\S+$/.test(email)}
          />
          <T variant="footnote" color="text3" align="center">{t('common.noMoneyDisclaimer')}</T>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Apple / Google sign-in buttons in each brand's own style (black Apple, white Google), as their guidelines ask. */
function ProviderButton({ kind, label, busy, onPress }: { kind: OAuthProvider; label: string; busy: boolean; onPress: () => void }) {
  const apple = kind === 'apple';
  return (
    <PressableScale onPress={onPress} disabled={busy} feedback="select" scaleTo={0.97} accessibilityLabel={label}
      style={{ height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: apple ? '#000' : '#fff', borderWidth: apple ? 1 : 0, borderColor: 'rgba(255,255,255,0.25)' }}>
      {busy ? <ActivityIndicator color={apple ? '#fff' : '#000'} /> : apple ? (
        <Svg width={20} height={22} viewBox="0 0 24 24"><Path fill="#fff" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></Svg>
      ) : (
        <Svg width={20} height={20} viewBox="0 0 48 48">
          <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </Svg>
      )}
      <T weight="semibold" style={{ color: apple ? '#fff' : '#1F1F1F', fontSize: 17 }}>{label}</T>
    </PressableScale>
  );
}
