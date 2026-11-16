import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { Aurora, ChipLogo, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { RouletteWheelArt } from '@/games/roulette/WheelArt';
import { brand, motion } from '@/design/tokens';

const EASE_ENTER = Easing.bezier(...motion.easeEnter);
const EASE = Easing.bezier(...motion.ease);

/** Roulette wheel drawn for the intro (European order, gold rim, chip-logo hub). */
export function IntroWheel({ size }: { size: number }) {
  return <RouletteWheelArt size={size} id={`iw${Math.round(size)}`} />;
}

/**
 * Launch animation: a roulette wheel spins in, the ball races round the rim the other way and drops
 * into a pocket at the top, then the camera dives into the ball and the app appears through it.
 * ~2.6 s, tap to skip, skipped with reduced motion.
 */
export function Splash() {
  const { reduceMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const [done, setDone] = useState(reduceMotion);
  const spin = useSharedValue(0);
  const ball = useSharedValue(0);
  const zoom = useSharedValue(0);
  const word = useSharedValue(0);
  const size = Math.min(width * 0.72, 300);
  const R = size * 0.375; // ball track (inside the pockets)
  const finish = () => setDone(true);
  const close = () =>
    zoom.set(withTiming(1, { duration: 260, easing: EASE }, (f) => {
      if (f) runOnJS(finish)();
    }));
  useEffect(() => {
    if (reduceMotion) return;
    spin.set(withTiming(1, { duration: 1900, easing: Easing.out(Easing.cubic) }));
    ball.set(withTiming(1, { duration: 1650, easing: Easing.out(Easing.quad) }));
    word.set(withSequence(withDelay(250, withTiming(1, { duration: 500, easing: EASE_ENTER })), withDelay(900, withTiming(0, { duration: 300 }))));
    zoom.set(withDelay(1850, withTiming(1, { duration: 820, easing: Easing.in(Easing.cubic) }, (f) => {
      if (f) runOnJS(finish)();
    })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // The wheel turns +2.2 laps; the ball runs −3 laps and ends at the top (−90°).
  const wheel = useAnimatedStyle(() => ({ opacity: Math.min(1, spin.value * 6), transform: [{ rotate: `${spin.value * 800}deg` }, { scale: 0.7 + 0.3 * Math.min(1, spin.value * 3) }] }));
  const ballStyle = useAnimatedStyle(() => {
    const a = (-90 - (1 - ball.value) * 1080) * (Math.PI / 180);
    const rr = R + (1 - ball.value) * size * 0.07; // spirals inwards as it slows
    return { opacity: Math.min(1, ball.value * 8), transform: [{ translateX: rr * Math.cos(a) }, { translateY: rr * Math.sin(a) }] };
  });
  // Camera dive: bring the ball to the centre while scaling everything up, then fade into the app.
  const stage = useAnimatedStyle(() => {
    const s = 1 + 26 * zoom.value * zoom.value;
    return { transform: [{ translateY: R * s * Math.min(1, zoom.value * 2.2) }, { scale: s }] };
  });
  const wrap = useAnimatedStyle(() => ({ opacity: zoom.value < 0.7 ? 1 : 1 - (zoom.value - 0.7) / 0.3 }));
  const text = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 14 }] }));
  if (done) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, wrap]}>
      <Aurora colors={[brand.violet, brand.pink, brand.amber]} height={height} alpha={0.5} />
      <Pressable style={styles.center} onPress={close} accessibilityLabel="Cashino">
        <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, stage]}>
          <Animated.View style={[StyleSheet.absoluteFill, wheel]}>
            <IntroWheel size={size} />
          </Animated.View>
          <Animated.View style={[styles.ball, { width: size * 0.07, height: size * 0.07, borderRadius: size * 0.035 }, ballStyle]} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', bottom: height * 0.16 }, text]}>
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

/** Tab switch flourish: the chip pops in the middle with a quick spin and dissolves (~0.55 s, no blocking). */
export function TabFlash() {
  const { reduceMotion } = useTheme();
  const [done, setDone] = useState(reduceMotion);
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    p.set(withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }, (f) => {
      if (f) runOnJS(setDone)(true);
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const dim = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.2, 1], [0, 0.45, 0]) }));
  const chip = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.15, 0.7, 1], [0, 1, 1, 0]),
    transform: [{ rotate: `${interpolate(p.value, [0, 1], [-90, 270])}deg` }, { scale: interpolate(p.value, [0, 0.35, 1], [0.4, 1.05, 1.5]) }],
  }));
  if (done) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 40 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dim]} />
      <Animated.View style={chip}>
        <ChipLogo size={64} id="tabflash" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#000', zIndex: 1000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  word: { color: '#fff', fontFamily: 'Unbounded_800ExtraBold', fontSize: 34, lineHeight: 42, letterSpacing: -1.2 },
  ball: { position: 'absolute', backgroundColor: '#FFFFFF', shadowColor: '#fff', shadowOpacity: 0.8, shadowRadius: 8 },
  curtain: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
});
