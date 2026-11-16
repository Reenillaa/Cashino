import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, EmptyState, PressableScale, Screen, Section, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { onlineConfigured, supabase } from '@/services/supabase';
import { useSession } from '@/state/session';
import { usePlayErrors } from '@/games/shared/hooks';
import { haptic } from '@/services/haptics';

export interface LeagueRow { id: string; name: string; code: string; members: number; my_points: number; my_rank: number; leader: string }

/** Friend leagues: private groups joined with a 6-letter code, ranked by this week's season points. */
export default function Leagues() {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const userId = useSession((s) => s.userId);
  const [rows, setRows] = useState<LeagueRow[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const onError = usePlayErrors();

  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.rpc('my_leagues');
    if (error) throw new Error(error.message);
    setRows((data as LeagueRow[]) ?? []);
  }, [userId]);
  useEffect(() => {
    const id = setTimeout(() => void load().catch(() => setRows([])), 0);
    return () => clearTimeout(id);
  }, [load]);

  const run = async (fn: () => Promise<string | undefined>) => {
    if (busy || !supabase) return;
    try {
      setBusy(true);
      const id = await fn();
      haptic.success();
      await load();
      if (id) router.push(`/leagues/${id}`);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const create = () => run(async () => {
    const { data, error } = await supabase!.rpc('create_league', { p_name: name });
    if (error) throw new Error(error.message.replace(/^.*?(\w+)$/, '$1'));
    setName('');
    return (data as { id: string }[])[0]?.id;
  });
  const join = () => run(async () => {
    const { data, error } = await supabase!.rpc('join_league', { p_code: code });
    if (error) throw new Error(error.message.replace(/^.*?(\w+)$/, '$1'));
    setCode('');
    return data as string;
  });

  if (!onlineConfigured || !userId) {
    return (
      <Screen title={t('leagues.title')} back tabBar={false}>
        <EmptyState icon="users" title={t('leagues.signIn')} body={t('leagues.intro')} action={onlineConfigured ? t('common.signIn') : undefined} onAction={() => router.push('/auth')} />
      </Screen>
    );
  }
  const input = { height: 46, borderRadius: 14, backgroundColor: c.surface2, color: c.text, paddingHorizontal: 14, fontSize: 16 } as const;
  return (
    <Screen title={t('leagues.title')} back tabBar={false}>
      <View style={{ paddingHorizontal: SCREEN_PAD, gap: 10 }}>
        <View style={styles.hero}>
          <LinearGradient colors={['#12C08A', '#0B6E6E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <T weight="display" style={{ color: '#fff', fontSize: 20 }}>🏆 {t('leagues.title')}</T>
          <T variant="footnote" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('leagues.intro')}</T>
        </View>
        {rows === null ? <T color="text3" align="center">{t('common.loading')}</T> : rows.length === 0 ? <T color="text2" align="center" style={{ marginVertical: 10 }}>{t('leagues.none')}</T> : rows.map((l, i) => (
          <Animated.View key={l.id} entering={FadeInDown.delay(i * 40)}>
            <PressableScale onPress={() => router.push(`/leagues/${l.id}`)} feedback="select" scaleTo={0.98} accessibilityLabel={l.name} style={styles.row}>
              <View style={[styles.rank, { backgroundColor: l.my_rank === 1 ? '#FFD06B' : '#2A1A66' }]}>
                <T weight="display" style={{ color: l.my_rank === 1 ? '#231A3A' : '#fff' }}>{l.my_rank ? `${l.my_rank}º` : '–'}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff' }}>{l.name}</T>
                <T variant="caption" color="text3">{l.members} {t('leagues.members')} · 👑 {l.leader} · {l.code}</T>
              </View>
              <T weight="display" tabular style={{ color: '#5BE3B0' }}>{l.my_points ?? 0} pts</T>
            </PressableScale>
          </Animated.View>
        ))}
      </View>
      <Section title={t('leagues.join')}>
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: SCREEN_PAD }}>
          <TextInput value={code} onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ABC234" placeholderTextColor={c.text3} autoCapitalize="characters" accessibilityLabel={t('leagues.code')} style={[input, { flex: 1, fontFamily: 'GeistMono_500Medium', letterSpacing: 2 }]} />
          <Button title={t('social.join')} size="md" disabled={code.length !== 6 || busy} onPress={join} />
        </View>
      </Section>
      <Section title={t('leagues.create')}>
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: SCREEN_PAD }}>
          <TextInput value={name} onChangeText={(v) => setName(v.slice(0, 28))} placeholder={t('leagues.namePh')} placeholderTextColor={c.text3} accessibilityLabel={t('leagues.name')} style={[input, { flex: 1 }]} />
          <Button title={t('leagues.createBtn')} size="md" disabled={name.trim().length < 3 || busy} onPress={create} />
        </View>
        <T variant="caption" color="text3" style={{ paddingHorizontal: SCREEN_PAD, marginTop: 8 }}>{t('leagues.rules')}</T>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 16, gap: 6, overflow: 'hidden', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' },
  rank: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
