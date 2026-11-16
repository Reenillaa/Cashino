import React, { useCallback, useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { Avatar, Button, Chip, Screen, T } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { supabase } from '@/services/supabase';
import { useSession } from '@/state/session';
import { usePlayErrors } from '@/games/shared/hooks';
import { weekAt } from '@/engine/meta/progression.ts';
import { useNow } from '@/features/time/useNow';

interface Row { user_id: string; username: string; avatar: string; level: number; points: number; rank: number; is_owner: boolean; league_name: string; league_code: string; week: number }
const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeagueTable() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const router = useRouter();
  const userId = useSession((s) => s.userId);
  const now = useNow();
  const thisWeek = weekAt(now);
  const [week, setWeek] = useState(thisWeek);
  const [rows, setRows] = useState<Row[]>([]);
  const [copied, setCopied] = useState(false);
  const onError = usePlayErrors();

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc('league_table', { p_id: String(id), p_week: week });
    if (error) throw new Error(error.message);
    setRows((data as Row[]) ?? []);
  }, [id, week]);
  useEffect(() => {
    const first = setTimeout(() => void load().catch(onError), 0);
    const every = setInterval(() => void load().catch(() => undefined), 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  const info = rows[0];
  const msLeft = (Date.UTC(2026, 0, 5) + thisWeek * 7 * 86_400_000) - now;
  const left = `${Math.floor(msLeft / 86_400_000)}d ${Math.floor((msLeft % 86_400_000) / 3_600_000)}h`;
  const share = async () => {
    if (!info) return;
    const msg = t('leagues.shareMsg', { name: info.league_name, code: info.league_code });
    try {
      await Clipboard.setStringAsync(info.league_code);
      setCopied(true);
      await Share.share({ message: msg });
    } catch {
      // sharing cancelled or unavailable: the code is already copied
    }
  };
  const leave = async () => {
    if (!supabase) return;
    const { error } = await supabase.rpc('leave_league', { p_id: String(id) });
    if (error) return onError(new Error(error.message));
    router.back();
  };
  const top = rows.slice(0, 3);
  return (
    <Screen title={info?.league_name ?? t('leagues.title')} back tabBar={false}>
      <View style={{ paddingHorizontal: SCREEN_PAD, gap: 12 }}>
        <View style={styles.head}>
          <LinearGradient colors={['#2A1A66', '#0B6E6E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            <Chip label={t('leagues.thisWeek')} selected={week === thisWeek} onPress={() => setWeek(thisWeek)} />
            <Chip label={t('leagues.lastWeek')} selected={week === thisWeek - 1} onPress={() => setWeek(thisWeek - 1)} />
          </View>
          {week === thisWeek ? <T variant="footnote" align="center" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>⏳ {t('leagues.endsIn', { t: left })}</T> : null}
          {/* podium: 2nd, 1st, 3rd */}
          <View style={styles.podium}>
            {[1, 0, 2].map((k) => {
              const r = top[k];
              if (!r) return <View key={k} style={{ flex: 1 }} />;
              const h = [96, 70, 54][k];
              return (
                <Animated.View key={r.user_id} entering={ZoomIn.delay(k * 120).springify()} style={{ flex: 1, alignItems: 'center' }}>
                  <T style={{ fontSize: 22 }}>{MEDAL[k]}</T>
                  <Avatar id={r.avatar} size={k === 0 ? 54 : 42} />
                  <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff', fontSize: 12, maxWidth: 96 }}>{r.user_id === userId ? t('common.you') : r.username}</T>
                  <View style={[styles.step, { height: h, backgroundColor: ['#FFD06B', '#C9C4DA', '#E09A5A'][k] }]}>
                    <T weight="display" tabular style={{ color: '#231A3A' }}>{r.points}</T>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>
        {rows.map((r, i) => (
          <Animated.View key={r.user_id} entering={FadeInDown.delay(Math.min(i, 10) * 30)} style={[styles.row, r.user_id === userId && { borderColor: '#FFD06B' }]}>
            <T weight="display" tabular style={{ color: '#fff', width: 28 }}>{r.rank}</T>
            <Avatar id={r.avatar} size={30} />
            <View style={{ flex: 1 }}>
              <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff' }}>{r.user_id === userId ? t('common.you') : r.username}{r.is_owner ? ' 👑' : ''}</T>
              <T variant="caption" color="text3">{t('leagues.level', { n: r.level })}</T>
            </View>
            <T weight="display" tabular style={{ color: '#5BE3B0' }}>{r.points} pts</T>
          </Animated.View>
        ))}
        {info ? (
          <View style={styles.codeBox}>
            <T variant="footnote" color="text2">{t('leagues.inviteWith')}</T>
            <T weight="display" style={{ color: '#FFD06B', fontSize: 30, letterSpacing: 6 }}>{info.league_code}</T>
            <Button title={copied ? `✓ ${t('leagues.copied')}` : t('leagues.invite')} onPress={share} size="md" />
          </View>
        ) : null}
        <T variant="caption" color="text3" align="center">{t('leagues.rules')}</T>
        <Button title={t('leagues.leave')} kind="ghost" size="sm" onPress={leave} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { borderRadius: 24, padding: 14, overflow: 'hidden' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12, gap: 8 },
  step: { alignSelf: 'stretch', marginTop: 6, borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'transparent' },
  codeBox: { alignItems: 'center', gap: 8, padding: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
});
