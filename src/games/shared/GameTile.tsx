import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import type { GameId } from '@/engine/games/types.ts';
import { GameLogo, PressableScale, Shine, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { gameVivid, motion, radius } from '@/design/tokens';
import { useT } from '@/i18n';

const EASE_ENTER = Easing.bezier(...motion.easeEnter);

/**
 * Game card with personality: the game's vivid gradient, its own illustrated logo floating gently,
 * soft light shapes for depth and a glint that sweeps across now and then. One tap opens the game.
 */
export function GameTile({
  id, onPress, big, index = 0, badge, style,
}: { id: GameId; onPress: () => void; big?: boolean; index?: number; badge?: string; style?: StyleProp<ViewStyle> }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const name = t(`games.names.${id}`);
  const blurb = t(`games.blurbs.${id}`);
  const focused = useIsFocused();
  const float = useSharedValue(0);
  // Only the big featured cards keep moving (performance: the grid stays still, the press still reacts).
  useEffect(() => {
    if (reduceMotion || !big || !focused || Platform.OS === 'web') {
      cancelAnimation(float);
      return;
    }
    float.set(withRepeat(withTiming(1, { duration: 2400 + (index % 4) * 300, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, index, float, big, focused]);
  const logo = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * float.value }, { rotate: `${(float.value - 0.5) * 6}deg` }] }));
  const logoSize = big ? 92 : 70;
  return (
    <Animated.View style={style} entering={reduceMotion ? undefined : FadeInDown.duration(560).delay(Math.min(index, 10) * 50).easing(EASE_ENTER)}>
      <PressableScale onPress={onPress} scaleTo={0.95} feedback="light" accessibilityLabel={`${name}. ${blurb}`}>
        <View style={[styles.card, big ? styles.big : styles.tile]}>
          <LinearGradient colors={gameVivid[id]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {/* depth: two soft light discs */}
          <View style={[styles.disc, { width: logoSize * 2.2, height: logoSize * 2.2, borderRadius: logoSize * 1.1, right: -logoSize * 0.7, top: -logoSize * 0.8 }]} />
          <View style={[styles.disc, { width: logoSize * 1.2, height: logoSize * 1.2, borderRadius: logoSize * 0.6, left: -logoSize * 0.4, bottom: -logoSize * 0.5, opacity: 0.6 }]} />
          {big ? <Shine delay={600 + index * 900} every={6500} /> : null}
          <View style={styles.top}>
            <Animated.View style={logo}>
              <GameLogo game={id} size={logoSize} />
            </Animated.View>
            {badge ? (
              <View style={styles.badge}>
                <View style={styles.live} />
                <T variant="caption" weight="semibold" style={{ color: '#fff', fontSize: 11 }}>{badge}</T>
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }} />
          <T weight="displaySemi" numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontSize: big ? 22 : 16, lineHeight: big ? 28 : 21, letterSpacing: -0.4 }}>
            {name}
          </T>
          <T variant="footnote" numberOfLines={2} style={{ color: 'rgba(255,255,255,0.82)', marginTop: 3, fontSize: big ? 14 : 12.5, lineHeight: big ? 19 : 16 }}>
            {blurb}
          </T>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: 14, overflow: 'hidden' },
  tile: { height: 184 },
  big: { width: 270, height: 210, padding: 18 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  disc: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.12)' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.25)' },
  live: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3BE39A' },
});
