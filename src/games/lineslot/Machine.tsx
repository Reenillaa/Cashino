import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { REELS, ROWS } from '@/engine/games/lineslot.ts';
import { Pop, SLOT_THEMES, WinCellFx, WinLine, type SlotTheme } from './WinFx';
import { useTheme } from '@/design/theme';

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
const Reel = React.memo(function Reel({ i, strip, cell, spinKey, duration, tease, render, tile, wins }: { i: number; strip: number[]; cell: number; spinKey: number; duration: number; tease: boolean; render: (code: number, size: number) => React.ReactNode; tile?: (code: number) => [string, string] | null; wins: string }) {
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
        {strip.map((c, k) => {
          // the symbols that only fly past while spinning are stretched and faded: a cheap motion blur
          const blur = k >= ROWS && k < strip.length - ROWS;
          const tc = tile?.(c);
          return (
            <View key={k} style={{ height: cell, alignItems: 'center', justifyContent: 'center' }}>
              <View style={[styles.tile, { width: cell - 6, height: cell - 6, borderRadius: cell * 0.2 }, blur && styles.blurTile]}>
                <LinearGradient colors={tc ?? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={[styles.tileShine, { borderRadius: cell * 0.2 }]} />
              </View>
              <View style={blur ? { opacity: 0.55, transform: [{ scaleY: 1.35 }] } : null}>
                {k < ROWS ? <Pop active={wins.includes(String(k))}>{render(c, cell * 0.84)}</Pop> : render(c, cell * 0.84)}
              </View>
            </View>
          );
        })}
      </Animated.View>
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']} locations={[0, 0.22, 0.78, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tease, gl]} />
      {i > 0 ? <View style={styles.divider} /> : null}
    </View>
  );
});

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
  /** Optional tile colours per symbol (premium symbols get a coloured tile). */
  tile?: (code: number) => [string, string] | null;
  /** The slot's personality: line style, particles, frames. */
  theme?: SlotTheme;
  title: React.ReactNode;
  colors: [string, string];
  rim: string;
  children?: React.ReactNode;
}

/**
 * The slot cabinet: marquee on top, a glass window with five reels, a gold rim. Reels drop one after another;
 * winning lines and cells light up after they stop; `children` draws effects on top (fish collection…).
 */
export function Machine({ grid, prev, spinKey, cell, turbo, tease, render, filler, lines, cells, expanded, tile, theme = SLOT_THEMES.mine, title, colors, rim, children }: MachineProps) {
  const times = useMemo(() => reelTimes(turbo, tease), [turbo, tease]);
  const strips = useMemo(
    () => grid.map((col, i) => [...col, ...Array.from({ length: FILL + i * 3 }, filler), ...(prev[i] ?? col)]),
    [spinKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const W = cell * REELS, H = cell * ROWS;
  // winning rows of each reel, as a small string so a reel only re-renders when its own wins change
  const wins = Array.from({ length: REELS }, (_, r) => cells.filter((c) => c.reel === r).map((c) => c.row).sort().join(''));
  const seen = new Set<string>();
  const uniq = cells.filter((c) => (seen.has(`${c.reel}-${c.row}`) ? false : (seen.add(`${c.reel}-${c.row}`), true)));
  return (
    <View style={styles.chrome}>
    <LinearGradient colors={['#FFF6D6', rim, '#7A4E08', rim, '#FFF6D6']} locations={[0, 0.25, 0.5, 0.75, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 30 }]} />
    <View style={styles.cabinet}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
      <View style={styles.marquee}>{title}</View>
      <Bulbs n={Math.max(8, Math.round(W / 26))} fast={spinKey} />
      <View style={[styles.window, { width: W + 8, height: H + 8, borderColor: rim }]}>
        <View style={{ flexDirection: 'row' }}>
          {strips.map((s, i) => <Reel key={i} i={i} strip={s} cell={cell} spinKey={spinKey} duration={times[i]} tease={tease.includes(i)} render={render} tile={tile} wins={wins[i]} />)}
        </View>
        {expanded?.reels.length ? expanded.reels.map((r) => (
          <Animated.View key={`x${r}`} entering={ZoomIn.springify().damping(12)} style={[styles.expand, { left: 4 + r * cell, width: cell, height: H }]}>
            <LinearGradient colors={['#FFE58A', '#C98B12']} style={StyleSheet.absoluteFill} />
            {expanded.render(cell * 1.15)}
          </Animated.View>
        )) : null}
        <View pointerEvents="none" style={{ position: 'absolute', left: 4, top: 4, width: W, height: H }}>
          {uniq.map((c, k) => <WinCellFx key={`${spinKey}-${c.reel}-${c.row}`} x={c.reel} y={c.row} cell={cell} theme={theme} order={k} />)}
          {lines.map((l, k) => <WinLine key={`${spinKey}-${l}`} line={l} order={k} cell={cell} width={W} height={H} theme={theme} />)}
          {children}
        </View>
        {/* glass: a soft diagonal reflection over the reels */}
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.13)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.06)']} locations={[0, 0.35, 0.8, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
      <Bulbs n={Math.max(8, Math.round(W / 26))} fast={spinKey} reverse />
    </View>
    </View>
  );
}

/** A row of chasing bulbs above / below the reels (one cheap JS tick, faster for a moment after each spin). */
function Bulbs({ n, fast, reverse }: { n: number; fast: number; reverse?: boolean }) {
  const { reduceMotion } = useTheme();
  const [k, setK] = useState(0);
  const spunAt = useRef(0);
  useEffect(() => {
    if (fast) spunAt.current = Date.now();
  }, [fast]);
  useEffect(() => {
    if (reduceMotion) return;
    let n = 0;
    const id = setInterval(() => {
      n++;
      // fast chase for a moment after each spin, calm otherwise
      if (Date.now() - spunAt.current < 2600 || n % 4 === 0) setK((x) => x + 1);
    }, 90);
    return () => clearInterval(id);
  }, [reduceMotion]);
  return (
    <View style={styles.bulbs} pointerEvents="none">
      {Array.from({ length: n }, (_, i) => {
        const on = (reverse ? n - i : i) % 3 === k % 3;
        return <View key={i} style={[styles.bulb, on ? styles.bulbOn : null]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chrome: { borderRadius: 30, padding: 4, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  cabinet: { borderRadius: 26, padding: 10, paddingTop: 4, paddingBottom: 6, alignItems: 'center', overflow: 'hidden' },
  bulbs: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'space-between', paddingHorizontal: 10, marginVertical: 5 },
  bulb: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,229,138,0.28)' },
  bulbOn: { backgroundColor: '#FFF3C4', shadowColor: '#FFD06B', shadowOpacity: 1, shadowRadius: 6 },
  tile: { position: 'absolute', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  blurTile: { opacity: 0.4 },
  tileShine: { position: 'absolute', left: 3, right: 3, top: 2, height: '38%', backgroundColor: 'rgba(255,255,255,0.07)' },
  marquee: { height: 36, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  window: { borderRadius: 16, borderWidth: 3, padding: 4, backgroundColor: '#05030C', overflow: 'hidden' },
  reel: { overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)' },
  divider: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  tease: { borderWidth: 3, borderColor: '#FFD06B', borderRadius: 8, backgroundColor: 'rgba(255,208,107,0.12)' },
  expand: { position: 'absolute', top: 4, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF3C4' },
});
