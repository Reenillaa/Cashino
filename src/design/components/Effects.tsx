import React, { useEffect, useId, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme';

/** A diagonal glint that sweeps across its parent every few seconds (tiles, primary buttons). */
export function Shine({ every = 4200, delay = 0, opacity = 0.32 }: { every?: number; delay?: number; opacity?: number }) {
  const { reduceMotion } = useTheme();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || !w) return;
    x.set(0);
    x.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }), withTiming(1, { duration: Math.max(0, every - 900) }), withTiming(0, { duration: 0 })), -1)));
  }, [w, reduceMotion, every, delay, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -w * 0.6 + x.value * w * 1.8 }, { skewX: '-20deg' }] }));
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
      <Animated.View style={[{ position: 'absolute', top: -10, bottom: -10, width: Math.max(40, w * 0.28) }, style]}>
        <LinearGradient colors={['rgba(255,255,255,0)', `rgba(255,255,255,${opacity})`, 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

function Blob({ color, size, x, y, dx, dy, period, alpha }: { color: string; size: number; x: number; y: number; dx: number; dy: number; period: number; alpha: number }) {
  const { reduceMotion } = useTheme();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) t.set(withRepeat(withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduceMotion, period, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x + dx * t.value }, { translateY: y + dy * t.value }, { scale: 1 + 0.12 * t.value }] }));
  const id = `b${color.replace('#', '')}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={alpha} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Slow-moving coloured light behind content. Without `height` it covers the whole parent with light
 * at the top and the bottom and only a very soft darkening in the middle (no visible cut).
 */
export function Aurora({ colors, height, alpha = 0.45 }: { colors: string[]; height?: number; alpha?: number }) {
  const [box, setBox] = useState({ w: 390, h: height ?? 800 });
  const { w, h } = box;
  const full = height === undefined;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, !full && { height }, { overflow: 'hidden' }]}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Blob color={colors[0]} size={w * 1.2} x={-w * 0.4} y={-w * 0.5} dx={w * 0.14} dy={w * 0.1} period={7000} alpha={alpha} />
      <Blob color={colors[1] ?? colors[0]} size={w * 1.05} x={w * 0.3} y={-w * 0.3} dx={-w * 0.14} dy={w * 0.14} period={8600} alpha={alpha * 0.9} />
      {colors[2] ? <Blob color={colors[2]} size={w * 0.9} x={w * 0.05} y={full ? h * 0.38 : h * 0.3} dx={w * 0.12} dy={-w * 0.1} period={9800} alpha={alpha * (full ? 0.55 : 0.6)} /> : null}
      {full ? <Blob color={colors[0]} size={w * 1.3} x={-w * 0.15} y={h - w * 0.75} dx={w * 0.1} dy={-w * 0.06} period={11000} alpha={alpha * 0.7} /> : null}
      <LinearGradient
        pointerEvents="none"
        colors={full ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.1)'] : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)', '#000000']}
        locations={full ? [0, 0.55, 1] : [0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
