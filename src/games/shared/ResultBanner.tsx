import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { T, formatCoins, formatMult } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
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
 * Result card after the animation (Offsuit's in-game stats panel): rises softly into place,
 * holds, then fades away. No bounce. A win is a big green number; a loss is quiet.
 */
export function ResultBanner({ result }: { result: ResultInfo | null }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useSharedValue(0);
  useEffect(() => {
    if (!result) return;
    s.set(0);
    s.set(reduceMotion
      ? withSequence(withTiming(1, { duration: 0 }), withDelay(1600, withTiming(0, { duration: 200 })))
      : withSequence(withTiming(1, { duration: 420, easing: EASE_ENTER }), withDelay(1300, withTiming(0, { duration: 320, easing: EASE }))));
  }, [result?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ opacity: s.value, transform: [{ translateY: (1 - s.value) * 14 }, { scale: 0.96 + 0.04 * s.value }] }));
  if (!result) return null;
  const win = result.net > 0;
  const push = result.net === 0 && result.payout > 0;
  const amount = Math.abs(win ? result.net : push ? 0 : result.net);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View accessibilityLiveRegion="polite" style={[styles.card, { backgroundColor: alpha(win ? '#0E2A1D' : '#1C1C1F', 0.96) }, style]}>
        <T variant="callout" color={win ? 'win' : 'text2'}>{win ? t('play.youWon') : push ? t('play.pushResult') : t('play.youLost')}</T>
        {result.multiplier !== undefined && win ? <T variant="display" tabular style={{ color: c.win }}>{formatMult(result.multiplier)}</T> : null}
        {result.label ? <T variant="body" color="text2" align="center">{result.label}</T> : null}
        <T variant="title" weight="medium" tabular style={{ color: win ? c.win : c.text2, marginTop: 4 }}>
          {win ? '+' : push ? '±' : '−'}{formatCoins(amount)} {t('common.coins')}
        </T>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minWidth: 200, maxWidth: 300, alignItems: 'center', paddingVertical: 20, paddingHorizontal: 30, borderRadius: 28 },
});
