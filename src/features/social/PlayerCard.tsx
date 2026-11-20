import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, GameLogo, Skeleton, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import { supabase } from '@/services/supabase';
import { GAME_IDS, type GameId } from '@/engine/games/types.ts';

interface Card { username: string; avatar: string; level: number; since: string; rounds: number; games: number; favourite: string | null; best_win: number | null; best_game: string | null; best_mult: number | null; best_streak: number; achievements: number; highlights: number }
const isGame = (g: string | null): g is GameId => !!g && (GAME_IDS as readonly string[]).includes(g);

/** A friend's card: level, favourite game, best win, best multiplier, best streak and achievements. */
export function PlayerCard({ userId }: { userId: string }) {
  const { t, lang } = useT();
  const [card, setCard] = useState<Card | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data, error } = (await supabase?.rpc('player_card', { p_user: userId })) ?? { data: null, error: true };
      if (!alive) return;
      const row = Array.isArray(data) ? (data[0] as Card | undefined) : undefined;
      if (error || !row) setFailed(true);
      else setCard(row);
    })();
    return () => {
      alive = false;
    };
  }, [userId]);
  if (failed) return <T variant="footnote" color="text3" style={{ margin: 10 }}>{t('common.offline')}</T>;
  if (!card) return <Skeleton rows={2} height={48} style={{ marginTop: 8 }} />;
  const stats: [string, string, string][] = [
    ['🎲', t('card.rounds'), formatCoins(card.rounds)],
    ['🏆', t('card.bestWin'), card.best_win && card.best_win > 0 ? `+${formatCoins(card.best_win)}` : '—'],
    ['✖️', t('card.bestMult'), card.best_mult ? `×${Number(card.best_mult).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US')}` : '—'],
    ['🔥', t('card.bestStreak'), card.best_streak ? `${card.best_streak}` : '—'],
    ['🎖️', t('card.achievements'), `${card.achievements}`],
    ['⭐', t('card.highlights'), `${card.highlights}`],
  ];
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.card}>
      <LinearGradient colors={['#2A1A66', '#120A33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Animated.View entering={ZoomIn.springify()}><Avatar id={card.avatar} size={54} /></Animated.View>
        <View style={{ flex: 1 }}>
          <T weight="display" style={{ color: '#fff', fontSize: 17 }}>@{card.username}</T>
          <T variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>{t('card.level', { n: card.level })} · {t('card.since', { date: new Date(card.since).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', year: 'numeric' }) })}</T>
        </View>
        {isGame(card.favourite) ? (
          <View style={{ alignItems: 'center' }}>
            <GameLogo game={card.favourite} size={40} />
            <T variant="caption" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{t('card.favourite')}</T>
          </View>
        ) : null}
      </View>
      <View style={styles.grid}>
        {stats.map(([e, label, v], i) => (
          <Animated.View key={label} entering={FadeInDown.delay(60 + i * 40)} style={styles.stat}>
            <T style={{ fontSize: 15 }}>{e}</T>
            <T weight="display" tabular style={{ color: '#fff', fontSize: 15 }}>{v}</T>
            <T variant="caption" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10.5 }}>{label}</T>
          </Animated.View>
        ))}
      </View>
      {isGame(card.best_game) && card.best_win && card.best_win > 0 ? (
        <T variant="caption" style={{ color: 'rgba(255,255,255,0.75)' }}>{t('card.bestAt', { game: t(`games.names.${card.best_game}`) })}</T>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 6, padding: 12, borderRadius: 18, overflow: 'hidden', gap: 10, borderWidth: 1, borderColor: 'rgba(169,150,255,0.35)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stat: { width: '31.5%', flexGrow: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', gap: 1 },
});
