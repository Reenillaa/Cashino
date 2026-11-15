import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ChipLogo, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { motion } from '@/design/tokens';

const EASE_ENTER = Easing.bezier(...motion.easeEnter);
const EASE = Easing.bezier(...motion.ease);

/**
 * Launch animation: the chip rolls in (turns a third of a lap while it settles), the wordmark rises
 * under it, then everything fades into the app. ~1.5 s, tap to skip, skipped with reduced motion.
 */
export function Splash() {
  const { reduceMotion } = useTheme();
  const [done, setDone] = useState(reduceMotion);
  const chip = useSharedValue(0);
  const word = useSharedValue(0);
  const out = useSharedValue(0);
  const close = (fast = false) =>
    out.set(withTiming(1, { duration: fast ? 160 : 380, easing: EASE }, (f) => {
      if (f) runOnJS(setDone)(true);
    }));
  useEffect(() => {
    if (reduceMotion) return;
    chip.set(withTiming(1, { duration: 820, easing: EASE_ENTER }));
    word.set(withDelay(360, withTiming(1, { duration: 520, easing: EASE_ENTER })));
    out.set(withDelay(1200, withTiming(1, { duration: 380, easing: EASE }, (f) => {
      if (f) runOnJS(setDone)(true);
    })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const wrap = useAnimatedStyle(() => ({ opacity: 1 - out.value }));
  const logo = useAnimatedStyle(() => ({
    opacity: chip.value,
    transform: [{ rotate: `${interpolate(chip.value, [0, 1], [-120, 0])}deg` }, { scale: interpolate(chip.value, [0, 1], [0.55, 1]) + 0.06 * out.value }],
  }));
  const text = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 12 }] }));
  if (done) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, wrap]}>
      <Pressable style={styles.center} onPress={() => close(true)} accessibilityLabel="Cashino">
        <Animated.View style={logo}>
          <ChipLogo size={116} id="splash" />
        </Animated.View>
        <Animated.View style={text}>
          <T style={styles.word}>cashino</T>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Short branded curtain when a game opens: black with the chip spinning, then it fades away while the
 * room carousel rises underneath (~0.7 s, never blocks touches).
 */
export function LogoCurtain() {
  const { reduceMotion } = useTheme();
  const [done, setDone] = useState(reduceMotion);
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    p.set(withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }, (f) => {
      if (f) runOnJS(setDone)(true);
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const bg = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.3, 1], [1, 1, 0]) }));
  const chip = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.15, 0.6, 1], [0, 1, 1, 0]),
    transform: [{ rotate: `${interpolate(p.value, [0, 1], [0, 300])}deg` }, { scale: interpolate(p.value, [0, 0.3, 1], [0.7, 1, 1.15]) }],
  }));
  if (done) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.curtain, bg]}>
      <Animated.View style={chip}>
        <ChipLogo size={72} id="curtain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#000', zIndex: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  word: { color: '#fff', fontFamily: 'Geist_600SemiBold', fontSize: 36, lineHeight: 42, letterSpacing: -1.2 },
  curtain: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
});
