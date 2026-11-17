import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { PAYLINES } from '@/engine/games/lineslot.ts';
import { useTheme } from '@/design/theme';

/**
 * The personality of each line slot: how its winning lines are drawn, what flies out of a winning symbol,
 * what runs along the line and what floats in the background.
 */
export type SlotThemeId = 'water' | 'jungle' | 'mine' | 'fire' | 'pirate' | 'vegas' | 'candy';
export interface SlotTheme {
  id: SlotThemeId;
  /** Line colours: glow, body, highlight (each winning line takes the next body colour). */
  glow: string;
  bodies: [string, string][];
  shine: string;
  /** Pulsing frame of winning cells. */
  frame: string;
  particle: 'bubble' | 'leaf' | 'spark' | 'ember' | 'coin' | 'star' | 'candy';
}
export const SLOT_THEMES: Record<SlotThemeId, SlotTheme> = {
  water: { id: 'water', glow: '#3FD0FF', bodies: [['#B8F1FF', '#1FA7E0'], ['#9FFFE0', '#12A07A'], ['#D6E4FF', '#3D7BFF']], shine: '#FFFFFF', frame: '#7FE6FF', particle: 'bubble' },
  jungle: { id: 'jungle', glow: '#3BE39A', bodies: [['#8CFFB8', '#0E9A5A'], ['#D4FF8A', '#5AA012'], ['#7FF0C0', '#0B7A60']], shine: '#E8FFF0', frame: '#9CFFC8', particle: 'leaf' },
  mine: { id: 'mine', glow: '#FFB938', bodies: [['#FFF3A0', '#C98B12'], ['#FFE070', '#B06A08'], ['#FFF6D6', '#D9A21C']], shine: '#FFFFFF', frame: '#FFD06B', particle: 'spark' },
  fire: { id: 'fire', glow: '#FF5A2A', bodies: [['#FFF3A0', '#FF5A1C'], ['#FFD06B', '#E8183F'], ['#FFE58A', '#FF8A1C']], shine: '#FFFFFF', frame: '#FFB36B', particle: 'ember' },
  vegas: { id: 'vegas', glow: '#FF4FA3', bodies: [['#FFFFFF', '#FF4FA3']], shine: '#FFFFFF', frame: '#FF7AC0', particle: 'star' },
  candy: { id: 'candy', glow: '#FF8AD0', bodies: [['#FFE0F0', '#FF4FA3']], shine: '#FFFFFF', frame: '#FFFFFF', particle: 'candy' },
  pirate: { id: 'pirate', glow: '#FFD06B', bodies: [['#F2DDB0', '#B07A3A'], ['#FFE6A7', '#9A5A1E'], ['#F4E8C8', '#8A6A3A']], shine: '#FFF6D6', frame: '#FFE58A', particle: 'coin' },
};

type Pt = { x: number; y: number };
/** Smooth curve (Catmull-Rom → cubic Bézier) through the line's cell centres, a little past both ends. */
function curve(line: number, cell: number) {
  const rows = PAYLINES[line];
  const pts: Pt[] = rows.map((row, reel) => ({ x: reel * cell + cell / 2, y: row * cell + cell / 2 }));
  const all = [{ x: pts[0].x - cell * 0.45, y: pts[0].y }, ...pts, { x: pts[4].x + cell * 0.45, y: pts[4].y }];
  const ext = [all[0], ...all, all[all.length - 1]];
  let d = `M${all[0].x},${all[0].y}`;
  const samples: Pt[] = [all[0]];
  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
    for (let k = 1; k <= 8; k++) {
      const t = k / 8, u = 1 - t;
      samples.push({
        x: u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x,
        y: u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y,
      });
    }
  }
  return { d, samples, end: all[all.length - 1], start: all[0] };
}

/** Little leaves along a vine, alternating sides, following the curve's direction. */
function leaves(samples: Pt[], cell: number) {
  const out: React.ReactNode[] = [];
  const s = cell / 70;
  for (let i = 3; i < samples.length - 3; i += 5) {
    const a = samples[i - 1], b = samples[i + 1];
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + (i % 2 ? -55 : 55) + (i % 2 ? 0 : 180);
    out.push(
      <G key={i} transform={`translate(${samples[i].x} ${samples[i].y}) rotate(${ang}) scale(${s})`}>
        <Path d="M0 0 C6 -10 20 -10 26 0 C20 10 6 10 0 0 Z" fill="#3BE39A" stroke="#0B4E32" strokeWidth={1.6} />
        <Path d="M2 0 L22 0" stroke="#0B6E40" strokeWidth={1.2} />
      </G>,
    );
  }
  return out;
}

/** Little flame tongues licking up from a fire line. */
function flames(samples: Pt[], cell: number) {
  const out: React.ReactNode[] = [];
  const s = cell / 70;
  for (let i = 2; i < samples.length - 2; i += 3) {
    const h = (i % 2 ? 1 : 0.65) * s;
    out.push(
      <G key={i} transform={`translate(${samples[i].x} ${samples[i].y}) scale(${h})`}>
        <Path d="M0 0 C-7 -6 -6 -14 0 -24 C2 -16 8 -12 6 -4 C5 -1 3 0 0 0 Z" fill="#FF8A1C" stroke="#E8183F" strokeWidth={1.4} />
        <Path d="M0 -2 C-3 -6 -2 -11 0 -15 C2 -10 4 -7 2 -3 Z" fill="#FFF3A0" />
      </G>,
    );
  }
  return out;
}

/** A themed winning line that draws itself from left to right, with something running along it. */
export function WinLine({ line, order, cell, width, height, theme }: { line: number; order: number; cell: number; width: number; height: number; theme: SlotTheme }) {
  const { reduceMotion } = useTheme();
  const { d, samples, end, start } = useMemo(() => curve(line, cell), [line, cell]);
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  const run = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    reveal.set(withDelay(order * 140, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) })));
    run.set(withDelay(order * 140 + 300, withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, false)));
  }, [order, reduceMotion, reveal, run]);
  const [hi, lo] = theme.bodies[order % theme.bodies.length];
  const gid = `wl${theme.id}${line}`;
  const W = width + cell, X0 = -cell / 2;
  const clip = useAnimatedStyle(() => ({ width: reveal.value * W }));
  const xs = samples.map((p) => p.x), ys = samples.map((p) => p.y);
  const steps = samples.map((_, k) => k / (samples.length - 1));
  const runner = useAnimatedStyle(() => ({
    opacity: reveal.value >= 1 ? interpolate(run.value, [0, 0.08, 0.92, 1], [0, 1, 1, 0]) : 0,
    transform: [{ translateX: interpolate(run.value, steps, xs) }, { translateY: interpolate(run.value, steps, ys) }],
  }));
  const r = cell * 0.16;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'visible' }]}>
      <Animated.View style={[{ position: 'absolute', left: X0, top: 0, height, overflow: 'hidden' }, clip]}>
        <Svg width={W} height={height} viewBox={`${X0} 0 ${W} ${height}`}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={lo} />
              <Stop offset="0.5" stopColor={hi} />
              <Stop offset="1" stopColor={lo} />
            </LinearGradient>
          </Defs>
          {/* soft glow under everything */}
          <Path d={d} stroke={theme.glow} strokeOpacity={0.28} strokeWidth={cell * 0.26} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {theme.id === 'water' ? (
            <>
              <Path d={d} stroke="#0B4E7A" strokeWidth={cell * 0.11} strokeLinecap="round" fill="none" />
              <Path d={d} stroke={`url(#${gid})`} strokeWidth={cell * 0.075} strokeLinecap="round" fill="none" />
              <Path d={d} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={cell * 0.065} strokeDasharray={`0 ${cell * 0.28}`} strokeLinecap="round" fill="none" />
            </>
          ) : theme.id === 'jungle' ? (
            <>
              <Path d={d} stroke="#063A22" strokeWidth={cell * 0.12} strokeLinecap="round" fill="none" />
              <Path d={d} stroke={`url(#${gid})`} strokeWidth={cell * 0.08} strokeLinecap="round" fill="none" />
              <Path d={d} stroke="#063A22" strokeOpacity={0.5} strokeWidth={cell * 0.02} strokeDasharray={`${cell * 0.12} ${cell * 0.1}`} fill="none" />
              {leaves(samples, cell)}
            </>
          ) : theme.id === 'mine' ? (
            <>
              <Path d={d} stroke="#5A3200" strokeWidth={cell * 0.13} strokeLinecap="round" fill="none" />
              <Path d={d} stroke={`url(#${gid})`} strokeWidth={cell * 0.095} strokeLinecap="round" fill="none" />
              <Path d={d} stroke="#7A4A00" strokeWidth={cell * 0.035} strokeDasharray={`${cell * 0.13} ${cell * 0.07}`} fill="none" />
            </>
          ) : theme.id === 'fire' ? (
            <>
              <Path d={d} stroke="#E8183F" strokeOpacity={0.75} strokeWidth={cell * 0.16} strokeLinecap="round" fill="none" />
              <Path d={d} stroke={`url(#${gid})`} strokeWidth={cell * 0.1} strokeLinecap="round" fill="none" />
              <Path d={d} stroke="#FFF6C4" strokeWidth={cell * 0.035} strokeLinecap="round" fill="none" />
              <Path d={d} stroke="#FFE58A" strokeWidth={cell * 0.06} strokeDasharray={`0 ${cell * 0.33}`} strokeLinecap="round" fill="none" />
              {flames(samples, cell)}
            </>
          ) : (
            <>
              <Path d={d} stroke="#3A1A08" strokeOpacity={0.7} strokeWidth={cell * 0.1} strokeLinecap="round" fill="none" />
              <Path d={d} stroke={`url(#${gid})`} strokeWidth={cell * 0.06} strokeDasharray={`${cell * 0.16} ${cell * 0.1}`} strokeLinecap="round" fill="none" />
              <Circle cx={start.x + cell * 0.1} cy={start.y} r={cell * 0.06} fill="#F2DDB0" stroke="#3A1A08" strokeWidth={1.5} />
              <G transform={`translate(${end.x - cell * 0.12} ${end.y})`}>
                <Path d={`M${-cell * 0.09} ${-cell * 0.09} L${cell * 0.09} ${cell * 0.09} M${cell * 0.09} ${-cell * 0.09} L${-cell * 0.09} ${cell * 0.09}`} stroke="#3A1A08" strokeWidth={cell * 0.07} strokeLinecap="round" />
                <Path d={`M${-cell * 0.09} ${-cell * 0.09} L${cell * 0.09} ${cell * 0.09} M${cell * 0.09} ${-cell * 0.09} L${-cell * 0.09} ${cell * 0.09}`} stroke="#E8304F" strokeWidth={cell * 0.04} strokeLinecap="round" />
              </G>
            </>
          )}
          {/* a thin shine on top */}
          {theme.id !== 'pirate' ? <Path d={d} stroke={theme.shine} strokeOpacity={0.55} strokeWidth={cell * 0.018} strokeLinecap="round" fill="none" transform={`translate(0 ${-cell * 0.02})`} /> : null}
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: -r, top: -r, width: r * 2, height: r * 2 }, runner]}>
        <Runner theme={theme.id} size={r * 2} />
      </Animated.View>
    </View>
  );
}

/** What travels along a winning line. */
function Runner({ theme, size }: { theme: SlotThemeId; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <RadialGradient id={`rn${theme}`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.35" stopColor={theme === 'water' ? '#7FE6FF' : theme === 'jungle' ? '#E8FF8A' : theme === 'fire' ? '#FFD06B' : '#FFE58A'} stopOpacity={0.9} />
          <Stop offset="1" stopColor={theme === 'water' ? '#1FA7E0' : theme === 'jungle' ? '#3BE39A' : theme === 'fire' ? '#FF5A1C' : '#FFB938'} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={20} cy={20} r={20} fill={`url(#rn${theme})`} />
      {theme === 'water' ? (
        <G transform="translate(20 20)">
          <Path d="M-10 0 C-6 -6 4 -6 8 0 C4 6 -6 6 -10 0 Z" fill="#FFD06B" stroke="#9A4A00" strokeWidth={1.2} />
          <Path d="M8 0 L13 -4 L13 4 Z" fill="#FF8A1C" />
          <Circle cx={-5} cy={-1} r={1.3} fill="#1A1430" />
        </G>
      ) : theme === 'mine' ? (
        <Path d="M20 6 L23 17 L34 20 L23 23 L20 34 L17 23 L6 20 L17 17 Z" fill="#FFFFFF" />
      ) : theme === 'pirate' ? (
        <G>
          <Circle cx={20} cy={20} r={9} fill="#FFD06B" stroke="#8A5200" strokeWidth={1.5} />
          <Circle cx={20} cy={20} r={6} fill="none" stroke="#C98B12" strokeWidth={1} />
          <Path d="M17 18 L23 18 M20 15 L20 25" stroke="#8A5200" strokeWidth={1.4} />
        </G>
      ) : theme === 'fire' ? (
        <Path d="M20 8 C24 14 28 16 28 23 C28 29 24 32 20 32 C16 32 12 29 12 23 C12 18 16 16 17 12 C18 16 20 17 20 8 Z" fill="#FFF3A0" />
      ) : (
        <Circle cx={20} cy={20} r={4} fill="#FFFFFF" />
      )}
    </Svg>
  );
}

/** One particle of a winning cell's burst. Its direction, distance and timing come from its index. */
function Particle({ i, n, cell, kind, delay }: { i: number; n: number; cell: number; kind: SlotTheme['particle']; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay + (i % 3) * 60, withRepeat(withTiming(1, { duration: 1100 + (i % 4) * 120, easing: Easing.out(Easing.quad) }), -1, false)));
  }, [p, i, delay]);
  const ang = (i / n) * Math.PI * 2 + (i % 2) * 0.3;
  const dist = cell * (0.42 + (i % 3) * 0.12);
  // bubbles and embers float up, the rest fly out
  const rise = kind === 'bubble' || kind === 'ember';
  const fall = kind === 'coin' || kind === 'candy';
  const st = useAnimatedStyle(() => {
    const t = p.value;
    const x = rise ? Math.cos(ang) * dist * 0.45 * t + Math.sin(t * 8 + i) * cell * 0.04 : Math.cos(ang) * dist * t;
    const y = rise ? -dist * 1.1 * t : Math.sin(ang) * dist * t + (fall ? cell * 0.5 * t * t : 0);
    return { opacity: interpolate(t, [0, 0.15, 0.75, 1], [0, 1, 0.8, 0]), transform: [{ translateX: x }, { translateY: y }, { rotate: `${t * (kind === 'leaf' ? 300 : 180) * (i % 2 ? 1 : -1)}deg` }, { scale: interpolate(t, [0, 0.3, 1], [0.4, 1, kind === 'spark' ? 0.2 : 0.8]) }] };
  });
  const s = cell * (kind === 'spark' ? 0.11 : 0.1) * (1 + (i % 3) * 0.2);
  const look: ViewStyle =
    kind === 'bubble' ? { width: s, height: s, borderRadius: s, borderWidth: 1.5, borderColor: '#E8FBFF', backgroundColor: 'rgba(127,230,255,0.25)' }
      : kind === 'leaf' ? { width: s * 1.6, height: s, borderTopLeftRadius: s, borderBottomRightRadius: s, backgroundColor: i % 2 ? '#3BE39A' : '#9CFF6A', borderWidth: 1, borderColor: '#0B4E32' }
        : kind === 'spark' ? { width: s, height: s, backgroundColor: i % 2 ? '#FFF3C4' : '#FFD06B', transform: [{ rotate: '45deg' }], shadowColor: '#FFD06B', shadowOpacity: 1, shadowRadius: 6 }
          : kind === 'ember' ? { width: s * 0.8, height: s * 0.8, borderRadius: s, backgroundColor: i % 2 ? '#FFD06B' : '#FF5A1C', shadowColor: '#FF8A1C', shadowOpacity: 1, shadowRadius: 6 }
            : kind === 'star' ? { width: s * 1.1, height: s * 1.1, backgroundColor: i % 2 ? '#FF7AC0' : '#7FE6FF', transform: [{ rotate: '45deg' }], borderRadius: 2, shadowColor: i % 2 ? '#FF4FA3' : '#3FD0FF', shadowOpacity: 1, shadowRadius: 8 }
              : kind === 'candy' ? { width: s * 1.2, height: s * 0.8, borderRadius: s * 0.3, backgroundColor: ['#FF4FA3', '#7FE6FF', '#FFE070', '#5BE3B0', '#B98BFF', '#FF8A3D'][i % 6], borderWidth: 1, borderColor: '#FFFFFF' }
                : { width: s * 1.2, height: s * 1.2, borderRadius: s, backgroundColor: '#FFD06B', borderWidth: 1.5, borderColor: '#8A5200' };
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: cell / 2 - s / 2, top: cell / 2 - s / 2 }, st]}><View style={look} /></Animated.View>;
}

/** A winning cell: a glowing themed frame, a soft light behind and particles flying out. */
export function WinCellFx({ x, y, cell, theme, order }: { x: number; y: number; cell: number; theme: SlotTheme; order: number }) {
  const { reduceMotion } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      p.set(1);
      return;
    }
    p.set(withRepeat(withSequence(withTiming(1, { duration: 320 }), withTiming(0.4, { duration: 320 })), -1, true));
  }, [p, reduceMotion]);
  const frame = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.94 + 0.06 * p.value }] }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x * cell, top: y * cell, width: cell, height: cell }}>
      <Animated.View style={[styles.frame, { left: 3, top: 3, width: cell - 6, height: cell - 6, borderRadius: cell * 0.2, borderColor: theme.frame, shadowColor: theme.frame }, frame]} />
      {reduceMotion ? null : Array.from({ length: 6 }, (_, i) => <Particle key={i} i={i} n={6} cell={cell} kind={theme.particle} delay={order * 70} />)}
    </View>
  );
}

/** A winning symbol bounces and wiggles while its line is shown. */
export function Pop({ children, active }: { children: React.ReactNode; active: boolean }) {
  const { reduceMotion } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!active || reduceMotion) {
      p.set(withTiming(0, { duration: 150 }));
      return;
    }
    p.set(withRepeat(withSequence(withTiming(1, { duration: 260, easing: Easing.out(Easing.back(2)) }), withTiming(0.25, { duration: 420 })), -1, false));
  }, [active, p, reduceMotion]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.14 * p.value }, { rotate: `${Math.sin(p.value * Math.PI) * 5}deg` }] }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', borderWidth: 3, shadowOpacity: 1, shadowRadius: 12 },
});
