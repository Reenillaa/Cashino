import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { T, formatCoins } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { useT } from '@/i18n';
import { useWellbeing, weekSummary } from '@/state/wellbeing';
import { useNow } from '@/features/time/useNow';

const hm = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

/**
 * The honest week: time played, rounds, chips bet and chips that came back, day by day. No spin: it says
 * plainly how many of every 100 chips bet came back (it is almost always fewer than 100).
 */
export function WeekSummary() {
  const { t, lang } = useT();
  const days = useWellbeing((s) => s.days);
  const now = useNow(60_000);
  const w = weekSummary(days, now);
  if (!w.total.rounds && !w.total.ms) return null;
  const maxAbs = Math.max(1, ...w.list.map((d) => Math.abs(d.payout - d.bet)));
  const dayName = (day: number) => new Date(day * 86_400_000 + 43_200_000).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'narrow' });
  return (
    <View style={[styles.card, { marginHorizontal: SCREEN_PAD }]}>
      <LinearGradient colors={['#14223A', '#0B1222']} style={StyleSheet.absoluteFill} />
      <T weight="display" style={{ color: '#fff', fontSize: 16 }}>🧾 {t('limits.weekTitle')}</T>
      <View style={styles.grid}>
        {[
          [t('limits.weekTime'), hm(w.total.ms)],
          [t('limits.weekRounds'), formatCoins(w.total.rounds)],
          [t('limits.weekBet'), formatCoins(w.total.bet)],
          [t('limits.weekBack'), formatCoins(w.total.payout)],
        ].map(([k, v]) => (
          <View key={k} style={styles.cell}>
            <T weight="display" tabular style={{ color: '#fff', fontSize: 16 }}>{v}</T>
            <T variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>{k}</T>
          </View>
        ))}
      </View>
      {/* net per day: green above the line, red below */}
      <View style={styles.bars}>
        {w.list.map((d, i) => {
          const net = d.payout - d.bet;
          const h = Math.round((Math.abs(net) / maxAbs) * 34);
          return (
            <View key={d.day} style={styles.barCol}>
              <View style={styles.barTop}>{net > 0 ? <Animated.View entering={FadeInUp.delay(i * 50)} style={[styles.bar, { height: h, backgroundColor: '#5BE3B0' }]} /> : null}</View>
              <View style={styles.axis} />
              <View style={styles.barBottom}>{net < 0 ? <Animated.View entering={FadeInUp.delay(i * 50)} style={[styles.bar, { height: h, backgroundColor: '#FF5C7A' }]} /> : null}</View>
              <T variant="caption" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{dayName(d.day)}</T>
            </View>
          );
        })}
      </View>
      <T variant="footnote" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {w.total.bet
          ? t('limits.weekHonest', { back: Math.round(w.back * 100), net: `${w.net >= 0 ? '+' : '−'}${formatCoins(Math.abs(w.net))}` })
          : t('limits.weekNoBets')}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, padding: 14, borderRadius: 22, overflow: 'hidden', gap: 12, borderWidth: 1, borderColor: 'rgba(91,227,176,0.25)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { flexGrow: 1, width: '45%', padding: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)' },
  bars: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
  barCol: { alignItems: 'center', width: 28, gap: 2 },
  barTop: { height: 34, justifyContent: 'flex-end' },
  barBottom: { height: 34, justifyContent: 'flex-start' },
  bar: { width: 14, borderRadius: 4 },
  axis: { width: 26, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
});
