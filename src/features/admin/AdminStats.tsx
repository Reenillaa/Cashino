import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GameLogo, Skeleton, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import { callFn } from '@/services/supabase';
import { GAME_IDS, type GameId } from '@/engine/games/types.ts';

interface Stats {
  players: number; new7: number; active1: number; active7: number; rounds7: number; chips: number;
  games: { game: string; rounds: number; players: number; wagered: number; paid: number }[];
  scratch: { card: string; sold: number; wagered: number; paid: number }[];
  days: { day: string; players: number; rounds: number }[];
}
const isGame = (g: string): g is GameId => (GAME_IDS as readonly string[]).includes(g);

/** For the owner: who plays, what they play, how the scratch cards sell — to decide with data, not by eye. */
export function AdminStats() {
  const { t } = useT();
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    callFn<{ stats: Stats }>('admin', { action: 'stats' }).then((r) => setS(r.stats)).catch(() => setErr(true));
  }, []);
  if (err) return <T color="text3">{t('common.offline')}</T>;
  if (!s) return <Skeleton rows={3} height={50} avatar={false} />;
  const maxDay = Math.max(1, ...s.days.map((d) => d.players));
  const maxRounds = Math.max(1, ...s.games.map((g) => g.rounds));
  const kpis: [string, string][] = [
    [t('adminStats.players'), formatCoins(s.players)],
    [t('adminStats.new7'), formatCoins(s.new7)],
    [t('adminStats.active1'), formatCoins(s.active1)],
    [t('adminStats.active7'), formatCoins(s.active7)],
    [t('adminStats.rounds7'), formatCoins(s.rounds7)],
    [t('adminStats.chips'), formatCoins(s.chips)],
  ];
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.kpis}>
        {kpis.map(([k, v], i) => (
          <Animated.View key={k} entering={FadeInDown.delay(i * 40)} style={styles.kpi}>
            <T weight="display" tabular style={{ color: '#fff', fontSize: 18 }}>{v}</T>
            <T variant="caption" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.6)' }}>{k}</T>
          </Animated.View>
        ))}
      </View>
      <View style={styles.box}>
        <LinearGradient colors={['#1C1430', '#120C20']} style={StyleSheet.absoluteFill} />
        <T weight="displaySemi" style={{ color: '#fff' }}>{t('adminStats.daily')}</T>
        <View style={styles.chart}>
          {s.days.map((d) => (
            <View key={d.day} style={styles.col}>
              <T variant="caption" tabular style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>{d.players}</T>
              <View style={[styles.colBar, { height: 6 + (d.players / maxDay) * 70 }]} />
              <T variant="caption" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>{d.day.slice(8)}</T>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.box}>
        <LinearGradient colors={['#1C1430', '#120C20']} style={StyleSheet.absoluteFill} />
        <T weight="displaySemi" style={{ color: '#fff' }}>{t('adminStats.games')}</T>
        {s.games.slice(0, 12).map((g) => (
          <View key={g.game} style={styles.gameRow}>
            {isGame(g.game) ? <GameLogo game={g.game} size={26} /> : <View style={{ width: 26 }} />}
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T variant="footnote" style={{ color: '#fff' }} numberOfLines={1}>{isGame(g.game) ? t(`games.names.${g.game}`) : g.game}</T>
                <T variant="caption" tabular style={{ color: 'rgba(255,255,255,0.65)' }}>{formatCoins(g.rounds)} · {g.players} 👤 · {g.wagered ? Math.round((g.paid / g.wagered) * 100) : 0}%</T>
              </View>
              <View style={styles.track}><View style={[styles.fill, { width: `${(g.rounds / maxRounds) * 100}%` }]} /></View>
            </View>
          </View>
        ))}
      </View>
      {s.scratch.length ? (
        <View style={styles.box}>
          <LinearGradient colors={['#1C1430', '#120C20']} style={StyleSheet.absoluteFill} />
          <T weight="displaySemi" style={{ color: '#fff' }}>🎟️ {t('adminStats.scratch')}</T>
          {s.scratch.map((x) => (
            <View key={x.card} style={styles.gameRow}>
              <T variant="footnote" style={{ color: '#fff', flex: 1 }}>{t(`scratch.names.${x.card}`, { defaultValue: x.card })}</T>
              <T variant="caption" tabular style={{ color: 'rgba(255,255,255,0.7)' }}>{t('adminStats.sold', { n: formatCoins(x.sold) })} · {x.wagered ? Math.round((x.paid / x.wagered) * 100) : 0}%</T>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpi: { width: '31%', flexGrow: 1, padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)' },
  box: { borderRadius: 18, padding: 12, gap: 8, overflow: 'hidden' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 104 },
  col: { alignItems: 'center', gap: 2, flex: 1 },
  colBar: { width: '62%', borderRadius: 4, backgroundColor: '#A996FF' },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: '#5BE3B0' },
});
