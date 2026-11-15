import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { T, formatCoins, formatMult } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { useT } from '@/i18n';

export interface ResultInfo {
  key: string;
  net: number;
  payout: number;
  multiplier?: number;
  label?: string;
}

/** Centered win/lose card that pops in after the animation finishes and fades away. */
export function ResultBanner({ result }: { result: ResultInfo | null }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useSharedValue(0);
  useEffect(() => {
    if (!result) return;
    s.set(0);
    s.set(reduceMotion
      ? withSequence(withTiming(1, { duration: 0 }), withDelay(1400, withTiming(0, { duration: 200 })))
      : withSequence(withSpring(1, { damping: 14, stiffness: 220 }), withDelay(1200, withTiming(0, { duration: 260 }))));
  }, [result?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ scale: 0.9 + 0.1 * s.value }] }));
  if (!result) return null;
  const win = result.net > 0;
  const push = result.net === 0 && result.payout > 0;
  const col = win ? c.win : push ? c.text2 : c.text2;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: alpha(c.bgElevated, 0.92), borderColor: win ? alpha(c.win, 0.5) : c.hairlineStrong }, style]}>
        <T variant="caption" style={{ color: col }}>{win ? t('play.youWon') : push ? t('play.pushResult') : t('play.youLost')}</T>
        {result.multiplier !== undefined && <T variant="display" tabular style={{ color: win ? c.win : c.text }}>{formatMult(result.multiplier)}</T>}
        {result.label ? <T variant="callout" color="text2">{result.label}</T> : null}
        <T variant="headline" tabular style={{ color: col, marginTop: 4 }}>{win ? '+' : push ? '±' : '−'}{formatCoins(Math.abs(win ? result.net : push ? 0 : result.net))} Ti</T>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 180, alignItems: 'center', paddingVertical: 18, paddingHorizontal: 28, borderRadius: 24, borderWidth: 1 },
});
