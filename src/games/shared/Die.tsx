import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/design/theme';

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.24], [0.73, 0.24], [0.27, 0.5], [0.73, 0.5], [0.27, 0.76], [0.73, 0.76]],
};

/** A chunky die that tumbles (spins, hops, faces flicker) while `rolling`, then lands on `face`. */
export function TumbleDie({ face, rolling, size = 84, delay = 0, glow = '#FFFFFF' }: { face: number; rolling: boolean; size?: number; delay?: number; glow?: string }) {
  const { reduceMotion } = useTheme();
  const rot = useSharedValue(0);
  const hop = useSharedValue(0);
  const [shown, setShown] = useState(face);
  useEffect(() => {
    if (reduceMotion) return;
    if (rolling) {
      rot.set(withDelay(delay, withRepeat(withTiming(360, { duration: 420, easing: Easing.linear }), -1, false)));
      hop.set(withDelay(delay, withRepeat(withSequence(withTiming(-26, { duration: 150, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) })), -1, false)));
      const iv = setInterval(() => setShown(1 + Math.floor(Math.random() * 6)), 90);
      return () => clearInterval(iv);
    }
    cancelAnimation(rot);
    cancelAnimation(hop);
    rot.set(withSpring(rot.get() % 360 > 180 ? 360 + (delay ? -8 : 6) : delay ? -8 : 6, { damping: 11, stiffness: 140 }));
    hop.set(withSpring(0, { damping: 9, stiffness: 260 }));
  }, [rolling, reduceMotion, delay, rot, hop]);
  const face_ = rolling && !reduceMotion ? shown : face;
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }, { rotate: `${rot.value}deg` }] }));
  const shadow = useAnimatedStyle(() => ({ transform: [{ scaleX: 1 + hop.value / 80 }], opacity: 0.55 + hop.value / 80 }));
  return (
    <View style={{ width: size, height: size + 22, alignItems: 'center', justifyContent: 'flex-start' }}>
      <Animated.View style={[{ width: size, height: size }, style]}>
        <View style={[styles.die, { width: size, height: size, borderRadius: size * 0.22, shadowColor: glow }]}>
          <LinearGradient colors={['#FFFFFF', '#E9E5F5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: size * 0.22 }]} />
          <View style={[styles.bevel, { borderRadius: size * 0.22 }]} />
          {PIPS[face_].map(([x, y], i) => (
            <View key={i} style={{ position: 'absolute', left: x * size - size * 0.085, top: y * size - size * 0.085, width: size * 0.17, height: size * 0.17, borderRadius: size * 0.085, backgroundColor: face_ === 1 ? '#FF3B5C' : '#231A3A' }} />
          ))}
        </View>
      </Animated.View>
      <Animated.View style={[styles.shadow, { width: size * 0.8, marginTop: 6 }, shadow]} />
    </View>
  );
}

const styles = StyleSheet.create({
  die: { overflow: 'visible', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  bevel: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)', borderBottomColor: 'rgba(0,0,0,0.12)', borderRightColor: 'rgba(0,0,0,0.08)' },
  shadow: { height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.45)' },
});
