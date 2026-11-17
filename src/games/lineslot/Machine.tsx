import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Polyline } from 'react-native-svg';
import { PAYLINES, REELS, ROWS } from '@/engine/games/lineslot.ts';
import { useTheme } from '@/design/theme';

export const LINE_COLORS = ['#FFD06B', '#FF4FA3', '#5BE3B0', '#A996FF', '#3D9BFF', '#FF8A3D', '#E8304F', '#12C08A', '#FFFFFF', '#C04BFF'];
const FILL = 12;

/** Spin timing: every reel drops after the previous one; reels after a "tease" spin longer. */
export function reelTimes(turbo: boolean, tease: number[]): number[] {
  const base = turbo ? 420 : 820;
  const step = turbo ? 110 : 230;
  let extra = 0;
  return Array.from({ length: REELS }, (_, i) => {
    if (tease.includes(i)) extra += turbo ? 500 : 1100;
    return base + i * step + extra;
  });
}

/** One reel: a strip [new 3, random fill…, old 3] that drops from above and lands with a small bounce. */
const Reel = React.memo(function Reel({ i, strip, cell, spinKey, duration, tease, render }: { i: number; strip: number[]; cell: number; spinKey: number; duration: number; tease: boolean; render: (code: number, size: number) => React.ReactNode }) {
  const { reduceMotion } = useTheme();
  const y = useSharedValue(0);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!spinKey) return;
    if (reduceMotion) {
      y.set(0);
      return;
    }
    y.set(-(strip.length - ROWS) * cell);
    y.set(withSequence(
      withTiming(cell * 0.14, { duration, easing: Easing.out(Easing.cubic) }),
      withTiming(-cell * 0.03, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 90 }),
    ));
    glow.set(tease ? withSequence(withTiming(1, { duration: 200 }), withTiming(1, { duration: Math.max(0, duration - 400) }), withTiming(0, { duration: 200 })) : 0);
  }, [spinKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const gl = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <View style={[styles.reel, { width: cell, height: cell * ROWS }]}>
      <Animated.View style={st}>
        {strip.map((c, k) => (
          <View key={k} style={{ height: cell, alignItems: 'center', justifyContent: 'center' }}>{render(c, cell * 0.86)}</View>
        ))}
      </Animated.View>
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} locations={[0, 0.22, 0.78, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tease, gl]} />
      {i > 0 ? <View style={styles.divider} /> : null}
    </View>
  );
});

/** A pulsing frame on a winning cell. */
function WinCell({ x, y, cell, color }: { x: number; y: number; cell: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withRepeat(withSequence(withTiming(1, { duration: 280 }), withTiming(0.35, { duration: 280 })), -1, true));
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.92 + 0.08 * p.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.win, { left: x * cell + 3, top: y * cell + 3, width: cell - 6, height: cell - 6, borderColor: color, shadowColor: color }, st]} />;
}

export interface MachineProps {
  grid: number[][];
  prev: number[][];
  spinKey: number;
  cell: number;
  turbo: boolean;
  tease: number[];
  render: (code: number, size: number) => React.ReactNode;
  filler: () => number;
  /** Paylines to draw and cells to pulse once the reels stop. */
  lines: number[];
  cells: { reel: number; row: number }[];
  /** Reels covered by an expanding symbol (Jade). */
  expanded?: { reels: number[]; render: (size: number) => React.ReactNode } | null;
  title: React.ReactNode;
  colors: [string, string];
  rim: string;
  children?: React.ReactNode;
}

/**
 * The slot cabinet: marquee on top, a glass window with five reels, a gold rim. Reels drop one after another;
 * winning lines and cells light up after they stop; `children` draws effects on top (fish collection…).
 */
export function Machine({ grid, prev, spinKey, cell, turbo, tease, render, filler, lines, cells, expanded, title, colors, rim, children }: MachineProps) {
  const times = useMemo(() => reelTimes(turbo, tease), [turbo, tease]);
  const strips = useMemo(
    () => grid.map((col, i) => [...col, ...Array.from({ length: FILL + i * 3 }, filler), ...(prev[i] ?? col)]),
    [spinKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const W = cell * REELS, H = cell * ROWS;
  return (
    <View style={[styles.cabinet, { borderColor: rim }]}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <View style={styles.marquee}>{title}</View>
      <View style={[styles.window, { width: W + 8, height: H + 8, borderColor: rim }]}>
        <View style={{ flexDirection: 'row' }}>
          {strips.map((s, i) => <Reel key={i} i={i} strip={s} cell={cell} spinKey={spinKey} duration={times[i]} tease={tease.includes(i)} render={render} />)}
        </View>
        {expanded?.reels.length ? expanded.reels.map((r) => (
          <Animated.View key={`x${r}`} entering={ZoomIn.springify().damping(12)} style={[styles.expand, { left: 4 + r * cell, width: cell, height: H }]}>
            <LinearGradient colors={['#FFE58A', '#C98B12']} style={StyleSheet.absoluteFill} />
            {expanded.render(cell * 1.15)}
          </Animated.View>
        )) : null}
        {lines.length ? (
          <Svg pointerEvents="none" width={W} height={H} style={{ position: 'absolute', left: 4, top: 4 }}>
            {lines.map((l) => (
              <Polyline key={l} points={PAYLINES[l].map((row, reel) => `${reel * cell + cell / 2},${row * cell + cell / 2}`).join(' ')} stroke={LINE_COLORS[l]} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" fill="none" opacity={0.95} />
            ))}
          </Svg>
        ) : null}
        <View pointerEvents="none" style={{ position: 'absolute', left: 4, top: 4, width: W, height: H }}>
          {cells.map((c) => <WinCell key={`${c.reel}-${c.row}`} x={c.reel} y={c.row} cell={cell} color="#FFE58A" />)}
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabinet: { borderRadius: 26, borderWidth: 3, padding: 10, paddingTop: 6, alignItems: 'center', overflow: 'hidden' },
  marquee: { height: 40, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  window: { borderRadius: 16, borderWidth: 3, padding: 4, backgroundColor: '#05030C', overflow: 'hidden' },
  reel: { overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' },
  divider: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  tease: { borderWidth: 3, borderColor: '#FFD06B', borderRadius: 8, backgroundColor: 'rgba(255,208,107,0.12)' },
  win: { position: 'absolute', borderWidth: 3, borderRadius: 12, shadowOpacity: 0.9, shadowRadius: 10 },
  expand: { position: 'absolute', top: 4, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF3C4' },
});
