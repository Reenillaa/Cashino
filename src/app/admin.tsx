import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Button, EmptyState, PressableScale, Screen, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { callFn } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useProgress } from '@/state/progress';
import { useAdmin } from '@/features/admin/useAdmin';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

interface Person { id: string; username: string; display_name?: string | null; avatar: string; level: number; balance: number }
const QUICK = [1_000, 10_000, 100_000, 1_000_000];
const newRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Developer panel: find any player and gift chips in one tap. Only works for admin accounts (server-checked). */
export default function AdminPanel() {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const isAdmin = useAdmin((s) => s.admin);
  const me = useSession((s) => s.userId);
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [sel, setSel] = useState<Person | null>(null);
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const search = useCallback(async (text: string) => {
    try {
      const r = await callFn<{ people: Person[] }>('admin', { action: 'search', q: text });
      setPeople(r.people);
    } catch {
      setPeople([]);
    }
  }, []);
  useEffect(() => {
    if (!isAdmin) return;
    const id = setTimeout(() => void search(q), 250);
    return () => clearTimeout(id);
  }, [q, isAdmin, search]);

  const gift = async (amount: number) => {
    if (!sel || busy || !(amount > 0)) return;
    try {
      setBusy(true);
      const r = await callFn<{ balance: number }>('admin', { action: 'gift', userId: sel.id, amount, note: note.trim() || null, requestId: newRequestId() });
      sfx('cashout');
      haptic.success();
      useProgress.getState().pushToast({ kind: 'info', title: t('admin.sent', { amount: formatCoins(amount), name: sel.username }) });
      setSel({ ...sel, balance: r.balance });
      setPeople((list) => list.map((p) => (p.id === sel.id ? { ...p, balance: r.balance } : p)));
      if (sel.id === me) void useSession.getState().refresh().catch(() => undefined);
    } catch (e) {
      useProgress.getState().pushToast({ kind: 'info', title: `${t('common.error')} (${(e as { code?: string }).code ?? 'error'})` });
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return (
      <Screen title={t('admin.title')} back tabBar={false}>
        <EmptyState icon="lock" title={t('admin.only')} action={t('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }
  const input = [styles.input, { backgroundColor: c.surface2, color: c.text }];
  return (
    <Screen title={`👑 ${t('admin.title')}`} subtitle={t('admin.subtitle')} back tabBar={false}>
      <View style={{ paddingHorizontal: SCREEN_PAD, gap: 12 }}>
        <TextInput value={q} onChangeText={setQ} placeholder={t('admin.search')} placeholderTextColor={c.text3} autoCapitalize="none" accessibilityLabel={t('admin.search')} style={input} />
        {sel ? (
          <Animated.View entering={FadeInDown} style={styles.card}>
            <LinearGradient colors={['#FFB938', '#D9741C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar id={sel.avatar} size={44} />
              <View style={{ flex: 1 }}>
                <T weight="display" style={{ color: '#231A3A', fontSize: 18 }}>{sel.id === me ? `${sel.username} (${t('common.you')})` : sel.username}</T>
                <T weight="displaySemi" tabular style={{ color: '#231A3A' }}>🪙 {formatCoins(sel.balance)}</T>
              </View>
              <PressableScale onPress={() => setSel(null)} feedback="select" accessibilityLabel={t('common.close')}><T style={{ color: '#231A3A', fontSize: 20 }}>✕</T></PressableScale>
            </View>
            <View style={styles.quick}>
              {QUICK.map((a) => (
                <PressableScale key={a} onPress={() => void gift(a)} disabled={busy} feedback="none" scaleTo={0.94} accessibilityLabel={`+${a}`} style={styles.q}>
                  <T weight="display" style={{ color: '#fff', fontSize: 15 }}>+{a >= 1e6 ? '1M' : formatCoins(a)}</T>
                </PressableScale>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={custom} onChangeText={(v) => setCustom(v.replace(/[^0-9]/g, '').slice(0, 8))} placeholder={t('admin.amount')} placeholderTextColor="rgba(35,26,58,0.5)" keyboardType="number-pad" accessibilityLabel={t('admin.amount')} style={[styles.input, styles.light, { flex: 1 }]} />
              <Button title={t('admin.give')} size="md" onPress={() => void gift(Number(custom))} disabled={!Number(custom) || busy} />
            </View>
            <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 80))} placeholder={t('admin.note')} placeholderTextColor="rgba(35,26,58,0.5)" accessibilityLabel={t('admin.note')} style={[styles.input, styles.light]} />
          </Animated.View>
        ) : null}
        {people.map((p, i) => (
          <Animated.View key={p.id} entering={FadeInDown.delay(Math.min(i, 10) * 25)}>
            <PressableScale onPress={() => setSel(p)} feedback="select" scaleTo={0.98} accessibilityLabel={p.username} style={[styles.row, { backgroundColor: c.surface1 }, sel?.id === p.id && { borderColor: '#FFD06B' }]}>
              <Avatar id={p.avatar} size={36} />
              <View style={{ flex: 1 }}>
                <T weight="displaySemi" numberOfLines={1}>{p.id === me ? `${p.username} (${t('common.you')})` : p.username}</T>
                <T variant="caption" color="text3">{t('common.level')} {p.level}</T>
              </View>
              <T weight="display" tabular style={{ color: '#5BE3B0' }}>{formatCoins(p.balance)}</T>
            </PressableScale>
          </Animated.View>
        ))}
        <T variant="caption" color="text3" align="center">{t('admin.footer')}</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { height: 46, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  light: { backgroundColor: 'rgba(255,255,255,0.85)', color: '#231A3A' },
  card: { borderRadius: 22, padding: 14, gap: 10, overflow: 'hidden' },
  quick: { flexDirection: 'row', gap: 8 },
  q: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#231A3A' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, borderWidth: 1.5, borderColor: 'transparent' },
});
