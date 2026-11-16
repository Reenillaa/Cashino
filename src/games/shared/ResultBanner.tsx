import React, { useContext, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AccentContext, T, formatCoins, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { motion } from '@/design/tokens';
import { useT } from '@/i18n';

export interface ResultInfo {
  key: string;
  net: number;
  payout: number;
  multiplier?: number;
  label?: string;
}

const EASE_ENTER = Easing.bezier(...motion.easeEnter);
const EASE = Easing.bezier(...motion.ease);

/**
 * Result after the animation. A win bursts into chips of the game's colours and shows a vivid card
 * that pops up; a loss is a quiet grey card. It holds briefly, then fades away.
 */
export function ResultBanner({ result }: { result: ResultInfo | null }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const accent = useContext(AccentContext);
  const s = useSharedValue(0);
  const burst = useSharedValue(0);
  const win = !!result && result.net > 0;
  useEffect(() => {
    if (!result) return;
    s.set(0);
    burst.set(0);
    s.set(reduceMotion
      ? withSequence(withTiming(1, { duration: 0 }), withDelay(1600, withTiming(0, { duration: 200 })))
      : withSequence(withTiming(1, { duration: 380, easing: EASE_ENTER }), withDelay(1400, withTiming(0, { duration: 320, easing: EASE }))));
    if (result.net > 0 && !reduceMotion) burst.set(withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [result?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ translateY: (1 - s.value) * 18 }, { scale: 0.9 + 0.1 * s.value }] }));
  const big = win && (result?.multiplier ?? 0) >= 5;
  const rain = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ x: ((i * 37) % 100) / 100, delay: (i * 53) % 420, spin: i % 2 ? 1 : -1, size: 16 + (i % 3) * 5 })), []);
  const pieces = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * Math.PI * 2 + (i % 3) * 0.2, d: 90 + (i % 4) * 28, r: 5 + (i % 3) * 2 })), []);
  if (!result) return null;
  const push = result.net === 0 && result.payout > 0;
  const amount = Math.abs(win ? result.net : push ? 0 : result.net);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      {big && !reduceMotion ? rain.map((r, i) => <RainCoin key={`${result.key}-r${i}`} r={r} />) : null}
      {win && !reduceMotion ? pieces.map((p, i) => <Chip key={`${result.key}-${i}`} p={p} burst={burst} color={i % 3 === 2 ? '#FFD84D' : accent[i % 2]} />) : null}
      <Animated.View accessibilityLiveRegion="polite" style={[styles.card, !win && { backgroundColor: 'rgba(28,28,34,0.96)' }, win && { shadowColor: accent[0], shadowOpacity: 0.7, shadowRadius: 26 }, style]}>
        {win ? <LinearGradient colors={accent as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
        {big ? <T weight="display" style={{ color: '#FFE58A', fontSize: 15, letterSpacing: 3, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 }}>{t('play.bigWin')}</T> : null}
        <T variant="callout" weight="semibold" style={{ color: win ? 'rgba(255,255,255,0.9)' : c.text2 }}>{win ? t('play.youWon') : push ? t('play.pushResult') : t('play.youLost')}</T>
        {result.multiplier !== undefined && win ? <T weight="display" tabular style={{ color: '#fff', fontSize: 38, lineHeight: 46 }}>{formatMult(result.multiplier)}</T> : null}
        {result.label ? <T variant="body" align="center" style={{ color: win ? 'rgba(255,255,255,0.85)' : c.text2 }}>{result.label}</T> : null}
        <T weight="display" tabular style={{ color: win ? '#fff' : c.text2, marginTop: 4, fontSize: 24, lineHeight: 30 }}>
          {win ? '+' : push ? '±' : '−'}{formatCoins(amount)} {t('common.coins')}
        </T>
      </Animated.View>
    </View>
  );
}

function Chip({ p, burst, color }: { p: { a: number; d: number; r: number }; burst: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: burst.value === 0 ? 0 : 1 - burst.value,
    transform: [{ translateX: Math.cos(p.a) * p.d * burst.value }, { translateY: Math.sin(p.a) * p.d * burst.value + 60 * burst.value * burst.value }, { scale: 1 - 0.4 * burst.value }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: p.r * 2, height: p.r * 2, borderRadius: p.r, backgroundColor: color, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)' }, style]} />;
}

/** Big wins (×5 or more): gold coins rain down across the stage. */
function RainCoin({ r }: { r: { x: number; delay: number; spin: number; size: number } }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(r.delay, withTiming(1, { duration: 1500, easing: Easing.in(Easing.quad) })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({
    opacity: v.value === 0 ? 0 : v.value > 0.85 ? (1 - v.value) / 0.15 : 1,
    transform: [{ translateY: -260 + v.value * 560 }, { rotateY: `${v.value * 720 * r.spin}deg` }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', top: '50%', left: `${4 + r.x * 88}%`, width: r.size, height: r.size, borderRadius: r.size / 2, backgroundColor: '#FFC93C', borderWidth: 2, borderColor: '#B87A0A', alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={{ width: r.size * 0.5, height: r.size * 0.5, borderRadius: r.size, borderWidth: 1.5, borderColor: 'rgba(138,83,0,0.6)' }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 210, maxWidth: 300, alignItems: 'center', paddingVertical: 20, paddingHorizontal: 30, borderRadius: 30, overflow: 'hidden' },
});
