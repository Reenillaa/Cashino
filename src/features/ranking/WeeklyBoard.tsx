import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Avatar, Button, PressableScale, Skeleton, T, formatCoins } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { callFn, onlineConfigured } from '@/services/supabase';
import { useSession } from '@/state/session';
import { weekAt, SEASON_EPOCH } from '@/engine/meta/progression.ts';
import { useNow } from '@/features/time/useNow';

interface Row { user_id: string; username: string; avatar: string; level: number; value: number; rank: number }
interface Award { category: 'points' | 'winner'; rank: number; user_id: string; value: number; prize: number; profiles?: { username: string; avatar: string } | null }
interface Board { week: number; points: Row[]; winner: Row[]; lastWeek: Award[]; myAwards: { week: number; category: string; rank: number; prize: number }[]; prizes: number[] }
type Cat = 'points' | 'winner';

const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM = ['#FFD06B', '#D9DEEE', '#E09A5A'];
const CAT: Record<Cat, { emoji: string; colors: [string, string] }> = {
  points: { emoji: '🏆', colors: ['#7B5CFF', '#4B2BD6'] },
  winner: { emoji: '💰', colors: ['#12C08A', '#0B6E6E'] },
};

/**
 * The weekly leaderboard, made to read at a glance: two categories (points from playing a bit every day,
 * and the biggest winner of the week), a podium, prizes for the top 3 paid automatically when the week ends.
 */
export function WeeklyBoard() {
  const { t } = useT();
  const router = useRouter();
  const userId = useSession((s) => s.userId);
  const [cat, setCat] = useState<Cat>('points');
  const [board, setBoard] = useState<Board | null>(null);
  const [err, setErr] = useState(false);
  const now = useNow(60_000);
  const week = weekAt(now);
  const ends = SEASON_EPOCH + week * 7 * 86_400_000;
  const left = Math.max(0, ends - now);
  const leftLabel = `${Math.floor(left / 86_400_000)}d ${Math.floor((left % 86_400_000) / 3_600_000)}h`;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setBoard(await callFn<Board>('rewards', { action: 'weekly' }));
      setErr(false);
    } catch {
      setErr(true);
    }
  }, [userId]);
  useEffect(() => {
    const id = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 60_000);
    return () => {
      clearTimeout(id);
      clearInterval(every);
    };
  }, [load]);

  const prizes = board?.prizes ?? [10000, 5000, 2500];
  const rows = board ? board[cat] : [];
  const me = rows.find((r) => r.user_id === userId);
  const won = board?.myAwards.find((a) => a.week === week - 1);
  const fmt = (v: number) => (cat === 'points' ? `${formatCoins(v)} pts` : `+${formatCoins(v)} 🪙`);

  return (
    <View style={{ gap: 14 }}>
      {/* week hero with the prizes */}
      <View style={[styles.hero, { marginHorizontal: SCREEN_PAD }]}>
        <LinearGradient colors={['#FF4FA3', '#7B5CFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <T weight="display" style={{ color: '#fff', fontSize: 22 }}>{t('weekly.title', { n: week })}</T>
            <T variant="footnote" style={{ color: 'rgba(255,255,255,0.9)' }}>⏳ {t('weekly.endsIn', { t: leftLabel })}</T>
          </View>
          <T style={{ fontSize: 40 }}>🏁</T>
        </View>
        <View style={styles.prizes}>
          {prizes.map((p, i) => (
            <View key={i} style={styles.prize}>
              <T style={{ fontSize: 18 }}>{MEDAL[i]}</T>
              <T weight="display" tabular style={{ color: '#231A3A', fontSize: 14 }}>{formatCoins(p)}</T>
            </View>
          ))}
        </View>
        <T variant="caption" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>{t('weekly.prizesNote')}</T>
      </View>

      {won ? (
        <Animated.View entering={ZoomIn.springify()} style={[styles.won, { marginHorizontal: SCREEN_PAD }]}>
          <T style={{ fontSize: 30 }}>{MEDAL[won.rank - 1]}</T>
          <T weight="display" style={{ color: '#231A3A', flex: 1 }}>{t('weekly.youWon', { prize: formatCoins(won.prize), cat: t(`weekly.cat.${won.category}`) })}</T>
        </Animated.View>
      ) : null}

      {/* categories */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: SCREEN_PAD }}>
        {(['points', 'winner'] as Cat[]).map((k) => (
          <PressableScale key={k} onPress={() => setCat(k)} feedback="select" scaleTo={0.97} accessibilityLabel={t(`weekly.cat.${k}`)} style={[styles.cat, cat === k ? styles.catOn : null]}>
            <LinearGradient colors={cat === k ? CAT[k].colors : ['#1C1430', '#1C1430']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <T style={{ fontSize: 24 }}>{CAT[k].emoji}</T>
            <T weight="display" style={{ color: '#fff', fontSize: 15 }}>{t(`weekly.cat.${k}`)}</T>
            <T variant="caption" numberOfLines={2} style={{ color: 'rgba(255,255,255,0.8)' }}>{t(`weekly.catBody.${k}`)}</T>
          </PressableScale>
        ))}
      </View>

      {!onlineConfigured || !userId ? (
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 10 }}>
          <T color="text2" align="center">{t('weekly.signIn')}</T>
          {onlineConfigured ? <Button title={t('profile.createAccount')} onPress={() => router.push('/auth')} /> : null}
        </View>
      ) : !board ? (
        err ? <T color="text3" align="center">{t('common.offline')}</T> : <Skeleton rows={5} style={{ marginHorizontal: SCREEN_PAD }} />
      ) : rows.length === 0 ? (
        <View style={[styles.empty, { marginHorizontal: SCREEN_PAD }]}>
          <T style={{ fontSize: 40 }}>🪑</T>
          <T weight="display" style={{ color: '#fff' }}>{t('weekly.emptyTitle')}</T>
          <T variant="footnote" color="text2" align="center">{t(`weekly.empty.${cat}`)}</T>
        </View>
      ) : (
        <>
          {/* podium: 2nd · 1st · 3rd */}
          <View style={[styles.podium, { marginHorizontal: SCREEN_PAD }]}>
            {[1, 0, 2].map((k) => {
              const r = rows[k];
              if (!r) return <View key={k} style={{ flex: 1 }} />;
              return (
                <Animated.View key={r.user_id} entering={ZoomIn.delay(k * 120).springify()} style={{ flex: 1, alignItems: 'center' }}>
                  {k === 0 ? <T style={{ fontSize: 26 }}>👑</T> : null}
                  <View style={[styles.podAv, { borderColor: PODIUM[k] }]}><Avatar id={r.avatar} size={k === 0 ? 62 : 50} /></View>
                  <T weight="display" numberOfLines={1} style={{ color: '#fff', fontSize: 13, maxWidth: 104, marginTop: 4 }}>{r.user_id === userId ? t('common.you') : r.username}</T>
                  <T weight="displaySemi" tabular style={{ color: PODIUM[k], fontSize: 12 }}>{fmt(r.value)}</T>
                  <View style={[styles.step, { height: [92, 66, 50][k], backgroundColor: PODIUM[k] }]}>
                    <T style={{ fontSize: 22 }}>{MEDAL[k]}</T>
                    <T weight="display" tabular style={{ color: '#231A3A', fontSize: 11 }}>+{formatCoins(prizes[k])}</T>
                  </View>
                </Animated.View>
              );
            })}
          </View>
          {/* the rest */}
          <View style={{ paddingHorizontal: SCREEN_PAD, gap: 6 }}>
            {rows.slice(3).map((r, i) => (
              <Animated.View key={r.user_id} entering={FadeInDown.delay(Math.min(i, 12) * 25)} style={[styles.row, r.user_id === userId && styles.rowMe]}>
                <View style={styles.rank}><T weight="display" tabular style={{ color: '#fff', fontSize: 13 }}>{r.rank}</T></View>
                <Avatar id={r.avatar} size={34} />
                <View style={{ flex: 1 }}>
                  <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff' }}>{r.user_id === userId ? t('common.you') : r.username}</T>
                  <T variant="caption" color="text3">{t('common.level')} {r.level}</T>
                </View>
                <T weight="display" tabular style={{ color: cat === 'winner' ? '#5BE3B0' : '#FFD06B' }}>{fmt(r.value)}</T>
              </Animated.View>
            ))}
          </View>
          <View style={[styles.mine, { marginHorizontal: SCREEN_PAD }]}>
            <T weight="display" tabular style={{ color: '#fff', fontSize: 22, minWidth: 54 }}>{me ? `#${me.rank}` : '—'}</T>
            <View style={{ flex: 1 }}>
              <T variant="caption" color="text3">{t('ranking.you')}</T>
              <T weight="displaySemi" style={{ color: '#fff' }}>{me ? fmt(me.value) : t(`weekly.notYet.${cat}`)}</T>
            </View>
          </View>
        </>
      )}

      {/* last week's champions */}
      {board?.lastWeek.length ? (
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 8 }}>
          <T weight="display" style={{ color: '#fff', fontSize: 16 }}>🏅 {t('weekly.lastWeek')}</T>
          {(['points', 'winner'] as Cat[]).map((k) => {
            const list = board.lastWeek.filter((a) => a.category === k);
            if (!list.length) return null;
            return (
              <View key={k} style={styles.champs}>
                <T style={{ fontSize: 18 }}>{CAT[k].emoji}</T>
                {list.map((a) => (
                  <View key={a.rank} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                    <T>{MEDAL[a.rank - 1]}</T>
                    <T variant="caption" numberOfLines={1} style={{ color: '#fff', flex: 1 }}>{a.user_id === userId ? t('common.you') : a.profiles?.username ?? '—'}</T>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 26, padding: 16, overflow: 'hidden' },
  prizes: { flexDirection: 'row', gap: 8, marginTop: 12 },
  prize: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.92)' },
  won: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 20, backgroundColor: '#FFD06B' },
  cat: { flex: 1, minHeight: 104, borderRadius: 20, padding: 12, overflow: 'hidden', gap: 2, borderWidth: 2, borderColor: 'transparent' },
  catOn: { borderColor: '#FFFFFF' },
  empty: { alignItems: 'center', gap: 6, padding: 20, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  podAv: { borderWidth: 3, borderRadius: 999, padding: 2 },
  step: { alignSelf: 'stretch', marginTop: 8, borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: 'center', paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'transparent' },
  rowMe: { borderColor: '#FFD06B', backgroundColor: 'rgba(255,208,107,0.1)' },
  rank: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  mine: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  champs: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
});
