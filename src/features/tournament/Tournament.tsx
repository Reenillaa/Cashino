import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Avatar, Button, GameLogo, PressableScale, Skeleton, T, formatCoins } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { callFn, onlineConfigured } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useNow } from '@/features/time/useNow';
import type { GameId } from '@/engine/games/types.ts';
import { TOURNAMENT_PRIZES, tournamentDay, tournamentEnds, tournamentGame } from '@/engine/meta/tournament.ts';

interface Row { user_id: string; username: string; avatar: string; level: number; value: number; rounds: number; rank: number }
interface Award { rank: number; game: string; user_id: string; value: number; prize: number; profiles?: { username: string; avatar: string } | null }
export interface TournamentData { day: number; game: GameId; endsAt: number; board: Row[]; yesterday: Award[]; yesterdayGame: GameId; myAwards: { day: number; rank: number; game: string; prize: number }[]; prizes: number[] }

const MEDAL = ['🥇', '🥈', '🥉'];
const PODIUM = ['#FFD06B', '#D9DEEE', '#E09A5A'];

/** Today's tournament: the game for everybody, and (with an account) the board from the server. */
export function useTournament() {
  const userId = useSession((s) => s.userId);
  const now = useNow(30_000);
  const day = tournamentDay(now);
  const [data, setData] = useState<TournamentData | null>(null);
  const [err, setErr] = useState(false);
  const load = useCallback(async () => {
    if (!userId || !onlineConfigured) return;
    try {
      setData(await callFn<TournamentData>('rewards', { action: 'tournament' }));
      setErr(false);
    } catch {
      setErr(true);
    }
  }, [userId]);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [load, day]);
  const fresh = data && data.day === day ? data : null;
  return { day, game: tournamentGame(day), endsAt: tournamentEnds(day), now, data: fresh, err, signedIn: !!userId, reload: load };
}

export const leftLabel = (ms: number) => {
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};

/** Slowly turning rays behind the trophy. */
function Rays() {
  const { reduceMotion } = useTheme();
  const r = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) r.set(withRepeat(withTiming(1, { duration: 16000 }), -1, false));
  }, [reduceMotion, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value * 360}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.rays, st]}>
      {Array.from({ length: 12 }, (_, i) => <View key={i} style={[styles.ray, { transform: [{ rotate: `${i * 30}deg` }] }]} />)}
    </Animated.View>
  );
}

/** Home: the tournament of the day — which game, how long is left, the prizes and where you stand. */
export function TournamentCard() {
  const { t } = useT();
  const router = useRouter();
  const { reduceMotion } = useTheme();
  const tour = useTournament();
  const userId = useSession((s) => s.userId);
  const me = tour.data?.board.find((r) => r.user_id === userId);
  const leader = tour.data?.board[0];
  const wonYesterday = tour.data?.myAwards.find((a) => a.day === tour.day - 1);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) pulse.set(withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1, false));
  }, [reduceMotion, pulse]);
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.4 }));
  const name = t(`games.names.${tour.game}`);
  return (
    <View style={{ marginHorizontal: SCREEN_PAD, marginTop: 24, gap: 10 }}>
      {wonYesterday ? (
        <Animated.View entering={ZoomIn.springify()} style={styles.won}>
          <T style={{ fontSize: 28 }}>{MEDAL[wonYesterday.rank - 1]}</T>
          <T weight="display" style={{ color: '#231A3A', flex: 1 }}>{t('tour.youWon', { prize: formatCoins(wonYesterday.prize), game: t(`games.names.${wonYesterday.game}`) })}</T>
        </Animated.View>
      ) : null}
      <PressableScale onPress={() => router.push(`/game/${tour.game}`)} scaleTo={0.98} accessibilityLabel={`${t('tour.title')}: ${name}`} style={styles.card}>
        <LinearGradient colors={['#2A0F5A', '#7A1A6A', '#C8501A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Animated.View pointerEvents="none" style={[styles.glow, glow]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.logoWrap}>
            <Rays />
            <GameLogo game={tour.game} size={64} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.tag}><T weight="display" style={{ color: '#2A0800', fontSize: 10.5, letterSpacing: 0.8 }}>🏆 {t('tour.title').toUpperCase()}</T></View>
            <T weight="display" numberOfLines={1} style={{ color: '#fff', fontSize: 21 }}>{name}</T>
            <T variant="footnote" style={{ color: 'rgba(255,255,255,0.85)' }}>⏳ {t('tour.endsIn', { t: leftLabel(tour.endsAt - tour.now) })}</T>
          </View>
        </View>
        <View style={styles.prizes}>
          {TOURNAMENT_PRIZES.map((p, i) => (
            <View key={i} style={styles.prize}>
              <T style={{ fontSize: 15 }}>{MEDAL[i]}</T>
              <T weight="display" tabular style={{ color: '#231A3A', fontSize: 13 }}>{formatCoins(p)}</T>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <T variant="footnote" numberOfLines={2} style={{ color: '#fff', flex: 1 }}>
            {!tour.signedIn ? t('tour.signIn') : me ? t('tour.yourPos', { rank: me.rank, value: formatCoins(me.value) }) : leader ? t('tour.leader', { name: leader.username, value: formatCoins(leader.value) }) : t('tour.nobody')}
          </T>
          <View style={styles.cta}><T weight="display" style={{ color: '#2A0F5A', fontSize: 13 }}>{t('tour.play')}</T></View>
        </View>
      </PressableScale>
    </View>
  );
}

/** Ranking tab: today's full board, yesterday's winners and how it works. */
export function TournamentBoard() {
  const { t } = useT();
  const router = useRouter();
  const tour = useTournament();
  const userId = useSession((s) => s.userId);
  const rows = tour.data?.board ?? [];
  const prizes = tour.data?.prizes ?? [...TOURNAMENT_PRIZES];
  return (
    <View style={{ gap: 14 }}>
      <TournamentCard />
      <T variant="footnote" color="text2" style={{ marginHorizontal: SCREEN_PAD }}>{t('tour.how')}</T>
      {!onlineConfigured || !tour.signedIn ? (
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 10 }}>
          {onlineConfigured ? <Button title={t('profile.createAccount')} onPress={() => router.push('/auth')} /> : null}
        </View>
      ) : !tour.data ? (
        tour.err ? <T color="text3" align="center">{t('common.offline')}</T> : <Skeleton rows={5} style={{ marginHorizontal: SCREEN_PAD }} />
      ) : rows.length === 0 ? (
        <View style={[styles.empty, { marginHorizontal: SCREEN_PAD }]}>
          <T style={{ fontSize: 40 }}>🎯</T>
          <T weight="display" style={{ color: '#fff' }}>{t('tour.emptyTitle')}</T>
          <T variant="footnote" color="text2" align="center">{t('tour.emptyBody', { game: t(`games.names.${tour.game}`) })}</T>
        </View>
      ) : (
        <>
          <View style={[styles.podium, { marginHorizontal: SCREEN_PAD }]}>
            {[1, 0, 2].map((k) => {
              const r = rows[k];
              if (!r) return <View key={k} style={{ flex: 1 }} />;
              return (
                <Animated.View key={r.user_id} entering={ZoomIn.delay(k * 120).springify()} style={{ flex: 1, alignItems: 'center' }}>
                  {k === 0 ? <T style={{ fontSize: 26 }}>👑</T> : null}
                  <View style={[styles.podAv, { borderColor: PODIUM[k] }]}><Avatar id={r.avatar} size={k === 0 ? 62 : 50} /></View>
                  <T weight="display" numberOfLines={1} style={{ color: '#fff', fontSize: 13, maxWidth: 104, marginTop: 4 }}>{r.user_id === userId ? t('common.you') : r.username}</T>
                  <T weight="displaySemi" tabular style={{ color: PODIUM[k], fontSize: 12 }}>+{formatCoins(r.value)} 🪙</T>
                  <View style={[styles.step, { height: [92, 66, 50][k], backgroundColor: PODIUM[k] }]}>
                    <T style={{ fontSize: 22 }}>{MEDAL[k]}</T>
                    <T weight="display" tabular style={{ color: '#231A3A', fontSize: 11 }}>+{formatCoins(prizes[k])}</T>
                  </View>
                </Animated.View>
              );
            })}
          </View>
          <View style={[styles.list, { marginHorizontal: SCREEN_PAD }]}>
            {rows.slice(3).map((r, i) => (
              <Animated.View key={r.user_id} entering={FadeInDown.delay(Math.min(i, 12) * 30)} style={[styles.row, i > 0 && styles.rowLine, r.user_id === userId && { backgroundColor: 'rgba(255,208,107,0.12)' }]}>
                <T weight="display" tabular style={{ color: 'rgba(255,255,255,0.6)', width: 30 }}>{r.rank}</T>
                <Avatar id={r.avatar} size={30} />
                <T numberOfLines={1} style={{ color: '#fff', flex: 1 }}>{r.user_id === userId ? t('common.you') : r.username}</T>
                <T weight="displaySemi" tabular style={{ color: '#5BE3B0' }}>+{formatCoins(r.value)}</T>
              </Animated.View>
            ))}
          </View>
        </>
      )}
      {tour.data?.yesterday.length ? (
        <View style={{ marginHorizontal: SCREEN_PAD, gap: 6 }}>
          <T weight="displaySemi" style={{ color: '#fff' }}>{t('tour.yesterday', { game: t(`games.names.${tour.data.yesterdayGame}`) })}</T>
          {tour.data.yesterday.map((a) => (
            <View key={a.rank} style={[styles.row, styles.rowCard]}>
              <T style={{ fontSize: 18 }}>{MEDAL[a.rank - 1]}</T>
              <Avatar id={a.profiles?.avatar ?? 'a1'} size={28} />
              <T numberOfLines={1} style={{ color: '#fff', flex: 1 }}>{a.user_id === userId ? t('common.you') : a.profiles?.username ?? '—'}</T>
              <T weight="displaySemi" tabular style={{ color: '#FFD06B' }}>+{formatCoins(a.prize)}</T>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Inside a game: a small reminder when it is today's tournament game. */
export function TournamentBadge({ game }: { game: GameId }) {
  const { t } = useT();
  const now = useNow(60_000);
  const day = tournamentDay(now);
  if (tournamentGame(day) !== game) return null;
  return (
    <Animated.View entering={FadeInDown} style={styles.badge} accessibilityLiveRegion="polite">
      <T weight="displaySemi" style={{ color: '#2A0800', fontSize: 12 }}>🏆 {t('tour.badge', { t: leftLabel(tournamentEnds(day) - now) })}</T>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 14, overflow: 'hidden', gap: 12, borderWidth: 1.5, borderColor: 'rgba(255,208,107,0.55)' },
  glow: { position: 'absolute', right: -40, top: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: '#FFB938', shadowColor: '#FFB938', shadowOpacity: 1, shadowRadius: 60 },
  logoWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  rays: { position: 'absolute', width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', width: 6, height: 120, borderRadius: 3, backgroundColor: 'rgba(255,229,138,0.16)' },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: '#FFD06B' },
  prizes: { flexDirection: 'row', gap: 8 },
  prize: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.92)' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cta: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: '#FFD06B', justifyContent: 'center' },
  won: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: '#FFD06B' },
  empty: { alignItems: 'center', gap: 6, padding: 20, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  podAv: { borderWidth: 3, borderRadius: 40, padding: 2 },
  step: { alignSelf: 'stretch', marginTop: 8, borderTopLeftRadius: 14, borderTopRightRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  list: { borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 50 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  rowCard: { borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
  badge: { alignSelf: 'center', marginTop: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#FFD06B' },
});
