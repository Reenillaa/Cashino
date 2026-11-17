import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Path, RadialGradient, Stop, Circle, G } from 'react-native-svg';
import { useIsFocused } from 'expo-router';
import { useTheme } from '@/design/theme';
import type { SlotThemeId } from './WinFx';

/** Deterministic pseudo-random value per index (no randomness during render). */
const rnd = (i: number, salt: number) => ((Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1;

/** Something that rises from the bottom to the top over and over (bubbles, embers). */
function Riser({ i, kind, h }: { i: number; kind: 'bubble' | 'ember' | 'dust' | 'candy'; h: number }) {
  const t = useSharedValue(0);
  const dur = 5200 + rnd(i, 1) * 5200;
  useEffect(() => {
    t.set(withDelay(rnd(i, 2) * 5000, withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false)));
  }, [t, i, dur]);
  const sway = 10 + rnd(i, 3) * 18;
  const down = kind === 'dust';
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 0.85, 1], [0, kind === 'dust' ? 0.5 : 0.9, kind === 'dust' ? 0.5 : 0.7, 0]),
    transform: [{ translateY: down ? t.value * (h + 40) - 20 : (1 - t.value) * (h + 40) - 20 }, { translateX: Math.sin(t.value * 6.28 * 2 + i) * sway }],
  }));
  const s = kind === 'bubble' ? 5 + rnd(i, 4) * 12 : kind === 'ember' ? 3 + rnd(i, 4) * 4 : 2 + rnd(i, 4) * 3;
  const look =
    kind === 'bubble' ? { width: s, height: s, borderRadius: s, borderWidth: 1.2, borderColor: 'rgba(220,248,255,0.8)', backgroundColor: 'rgba(127,230,255,0.12)' }
      : kind === 'ember' ? { width: s, height: s, borderRadius: s, backgroundColor: i % 3 ? '#FF8A1C' : '#FFD06B', shadowColor: '#FF5A1C', shadowOpacity: 1, shadowRadius: 6 }
        : kind === 'candy' ? { width: s * 2.4, height: s * 2.4, borderRadius: s * 0.6, backgroundColor: ['#FF8AD0', '#9CE8FF', '#FFF09A', '#B8FFD8', '#D8C0FF'][i % 5], opacity: 0.55, transform: [{ rotate: `${i * 40}deg` }] }
          : { width: s, height: s, borderRadius: s, backgroundColor: '#FFE6A7' };
  return <Animated.View style={[{ position: 'absolute', top: 0, left: `${rnd(i, 5) * 100}%` }, st]}><View style={look} /></Animated.View>;
}

/** A firefly / star that drifts in a small loop and blinks. */
function Blinker({ i, kind }: { i: number; kind: 'firefly' | 'star' }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(rnd(i, 7) * 3000, withRepeat(withTiming(1, { duration: 3200 + rnd(i, 8) * 3000, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [t, i]);
  const r = kind === 'firefly' ? 14 : 0;
  const st = useAnimatedStyle(() => ({
    opacity: kind === 'firefly' ? interpolate(t.value, [0, 0.5, 1], [0.15, 1, 0.3]) : interpolate(t.value, [0, 0.5, 1], [0.25, 1, 0.4]),
    transform: [{ translateX: Math.cos(t.value * 6.28 + i) * r }, { translateY: Math.sin(t.value * 6.28 + i) * r }, { scale: kind === 'star' ? 0.7 + t.value * 0.5 : 1 }],
  }));
  const s = kind === 'firefly' ? 5 : 2 + rnd(i, 9) * 2.5;
  return (
    <Animated.View style={[{ position: 'absolute', left: `${rnd(i, 10) * 100}%`, top: `${rnd(i, 11) * (kind === 'star' ? 55 : 100)}%` }, st]}>
      <View style={{ width: s, height: s, borderRadius: s, backgroundColor: kind === 'firefly' ? '#E8FF8A' : '#FFFFFF', shadowColor: kind === 'firefly' ? '#C8FF4A' : '#FFFFFF', shadowOpacity: 1, shadowRadius: kind === 'firefly' ? 8 : 4 }} />
    </Animated.View>
  );
}

/** A slow pulse (light rays, lantern glow, fog). */
function Pulse({ children, min = 0.35, max = 1, ms = 2600, delay = 0, drift = 0 }: { children: React.ReactNode; min?: number; max?: number; ms?: number; delay?: number; drift?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: ms, easing: Easing.inOut(Easing.sin) })), -1, false)));
  }, [t, ms, delay]);
  const st = useAnimatedStyle(() => ({ opacity: min + (max - min) * t.value, transform: [{ translateX: drift * (t.value - 0.5) }] }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st]}>{children}</Animated.View>;
}

/**
 * The scenery behind each slot machine: underwater light and bubbles, a jungle with fireflies, a dusty mine
 * with lanterns, rising embers, or a starry night at sea. Pure decoration; paused when hidden or with reduced motion.
 */
export function Ambient({ kind }: { kind: SlotThemeId }) {
  const { reduceMotion } = useTheme();
  const focused = useIsFocused();
  const [h, setH] = React.useState(700);
  const live = focused && !reduceMotion;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {kind === 'water' ? (
        <>
          <LinearGradient colors={['rgba(31,167,224,0.28)', 'rgba(11,78,122,0.05)', 'rgba(3,20,40,0.4)']} style={StyleSheet.absoluteFill} />
          <Pulse min={0.25} max={0.7} ms={3400} drift={30}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <Defs>
                <RadialGradient id="amw" cx="0.5" cy="0" r="1"><Stop offset="0" stopColor="#CFF6FF" stopOpacity={0.45} /><Stop offset="1" stopColor="#CFF6FF" stopOpacity={0} /></RadialGradient>
              </Defs>
              {[[12, 6], [38, 9], [64, 5], [86, 8]].map(([x, w], k) => <Path key={k} d={`M${x} 0 L${x + w} 0 L${x + w * 3} 100 L${x + w} 100 Z`} fill="url(#amw)" />)}
            </Svg>
          </Pulse>
          {live ? Array.from({ length: 16 }, (_, i) => <Riser key={i} i={i} kind="bubble" h={h} />) : null}
          <Svg style={styles.bottom} width="100%" height={70} viewBox="0 0 100 20" preserveAspectRatio="none">
            <Path d="M0 20 L0 12 Q6 2 10 12 Q14 4 18 13 L22 20 Z M70 20 Q74 6 78 14 Q82 2 86 12 Q92 6 96 14 L100 20 Z" fill="#0B6E52" opacity={0.6} />
            <Path d="M0 20 Q20 14 40 18 T80 16 T100 18 L100 20 Z" fill="#06283A" opacity={0.8} />
          </Svg>
        </>
      ) : kind === 'jungle' ? (
        <>
          <LinearGradient colors={['rgba(4,35,26,0.1)', 'rgba(18,192,138,0.12)', 'rgba(2,20,14,0.5)']} style={StyleSheet.absoluteFill} />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* hanging vines with leaves on both sides */}
            {[[4, 34], [12, 22], [90, 30], [97, 40]].map(([x, len], k) => (
              <G key={k}>
                <Path d={`M${x} 0 Q${x + (k % 2 ? 2 : -2)} ${len / 2} ${x} ${len}`} stroke="#0B4E32" strokeWidth={0.6} fill="none" />
                {Array.from({ length: Math.floor(len / 6) }, (_, j) => <Path key={j} d={`M${x} ${4 + j * 6} q${j % 2 ? 3 : -3} -1 ${j % 2 ? 4 : -4} 2 q${j % 2 ? -2 : 2} 1 ${j % 2 ? -4 : 4} -2 Z`} fill="#14804A" opacity={0.8} />)}
              </G>
            ))}
          </Svg>
          {live ? Array.from({ length: 14 }, (_, i) => <Blinker key={i} i={i} kind="firefly" />) : null}
        </>
      ) : kind === 'mine' ? (
        <>
          <LinearGradient colors={['rgba(58,30,6,0.2)', 'rgba(18,8,2,0.55)']} style={StyleSheet.absoluteFill} />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* timber frame of the tunnel */}
            <Path d="M3 100 L3 6 M97 100 L97 6" stroke="#5A3210" strokeWidth={3} />
            <Path d="M0 6 L100 6" stroke="#6A3A12" strokeWidth={3.5} />
            <Path d="M3 14 L12 6 M97 14 L88 6" stroke="#4A2808" strokeWidth={1.6} />
          </Svg>
          {[[12, 4], [88, 4]].map(([x, y], k) => (
            <Pulse key={k} min={0.55} max={1} ms={420 + k * 130} delay={k * 200}>
              <Svg style={{ position: 'absolute', left: `${x - 12}%`, top: `${y - 4}%` }} width="24%" height={140} viewBox="0 0 100 100">
                <Defs><RadialGradient id={`ml${k}`} cx="0.5" cy="0.3" r="0.6"><Stop offset="0" stopColor="#FFD06B" stopOpacity={0.55} /><Stop offset="1" stopColor="#FFD06B" stopOpacity={0} /></RadialGradient></Defs>
                <Circle cx={50} cy={30} r={50} fill={`url(#ml${k})`} />
                <Path d="M44 10 C44 4 56 4 56 10" stroke="#3A3550" strokeWidth={2} fill="none" />
                <Path d="M42 12 L58 12 L56 30 L44 30 Z" fill="#FFE58A" stroke="#7A4A00" strokeWidth={1.5} />
              </Svg>
            </Pulse>
          ))}
          {live ? Array.from({ length: 18 }, (_, i) => <Riser key={i} i={i} kind="dust" h={h} />) : null}
        </>
      ) : kind === 'vegas' ? (
        <>
          <LinearGradient colors={['rgba(74,12,38,0.35)', 'rgba(26,6,36,0.1)', 'rgba(74,12,38,0.5)']} style={StyleSheet.absoluteFill} />
          {/* neon tubes down both sides, flickering like an old sign */}
          {[['4%', '#FF4FA3'], ['94%', '#3FD0FF']].map(([x, c], k) => (
            <Pulse key={k} min={0.45} max={1} ms={160 + k * 90} delay={k * 400}>
              <View style={{ position: 'absolute', left: String(x) as `${number}%`, top: '8%', bottom: '8%', width: 4, borderRadius: 2, backgroundColor: String(c), shadowColor: String(c), shadowOpacity: 1, shadowRadius: 14 }} />
            </Pulse>
          ))}
          {live ? Array.from({ length: 16 }, (_, i) => <Blinker key={i} i={i} kind="star" />) : null}
          <LinearGradient colors={['rgba(255,79,163,0)', 'rgba(255,79,163,0.18)']} start={{ x: 0.5, y: 0.75 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        </>
      ) : kind === 'candy' ? (
        <>
          <LinearGradient colors={['rgba(255,138,208,0.22)', 'rgba(123,31,162,0.08)', 'rgba(255,138,208,0.25)']} style={StyleSheet.absoluteFill} />
          {live ? Array.from({ length: 16 }, (_, i) => <Riser key={i} i={i} kind="candy" h={h} />) : null}
        </>
      ) : kind === 'fire' ? (
        <>
          <LinearGradient colors={['rgba(255,90,42,0.05)', 'rgba(138,15,58,0.15)', 'rgba(255,90,42,0.35)']} style={StyleSheet.absoluteFill} />
          <Pulse min={0.4} max={0.9} ms={900}>
            <LinearGradient colors={['rgba(255,138,28,0)', 'rgba(255,90,28,0.45)']} start={{ x: 0.5, y: 0.6 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
          </Pulse>
          {live ? Array.from({ length: 22 }, (_, i) => <Riser key={i} i={i} kind="ember" h={h} />) : null}
        </>
      ) : (
        <>
          <LinearGradient colors={['rgba(26,16,80,0.4)', 'rgba(14,8,48,0.1)', 'rgba(8,24,64,0.6)']} style={StyleSheet.absoluteFill} />
          {live ? Array.from({ length: 22 }, (_, i) => <Blinker key={i} i={i} kind="star" />) : null}
          <Svg style={{ position: 'absolute', right: '6%', top: '3%' }} width={64} height={64} viewBox="0 0 64 64">
            <Defs><RadialGradient id="moon" cx="0.5" cy="0.5" r="0.5"><Stop offset="0.6" stopColor="#FFF3C4" stopOpacity={0.35} /><Stop offset="1" stopColor="#FFF3C4" stopOpacity={0} /></RadialGradient></Defs>
            <Circle cx={32} cy={32} r={32} fill="url(#moon)" />
            <Circle cx={32} cy={32} r={16} fill="#FFF3C4" />
            <Circle cx={38} cy={27} r={14} fill="#1A1050" />
          </Svg>
          <Pulse min={0.2} max={0.55} ms={5200} drift={60}>
            <LinearGradient colors={['rgba(200,210,255,0)', 'rgba(200,210,255,0.18)', 'rgba(200,210,255,0)']} start={{ x: 0, y: 0.7 }} end={{ x: 0, y: 0.95 }} style={StyleSheet.absoluteFill} />
          </Pulse>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
