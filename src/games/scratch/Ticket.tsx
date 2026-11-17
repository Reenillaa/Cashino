import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, G, Mask, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { ScratchCardId, ScratchLayout } from '@/engine/games/scratch.ts';
import { vg } from '../lineslot/art/kit';
import { Paints } from './icons';
import { SPOTS, TH, TW, spotBox, winningSpots, type Spot } from './geometry';
import { TicketContent, TicketPrint } from './TicketArt';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

let uid = 0;
const usePrefix = () => useMemo(() => `sc${++uid}x`, []);
const BRUSH = 13; // scratch radius in artboard units
const CELL = 7; // coverage grid
const DONE_AT = 0.58; // a spot clears itself once this much is scratched

/** Foil of each ticket: metal colours, ink for the "RASCA" print and a small emblem. */
const FOIL: Record<ScratchCardId, { stops: string[]; ink: string; emblem: 'coin' | 'wave' | 'dot' | 'star' | 'flower' }> = {
  tapas: { stops: ['#FFF3B0', '#E8B83A', '#B8820E', '#F4D46A'], ink: '#6A3A00', emblem: 'coin' },
  playa: { stops: ['#F2FCFF', '#B8D8E8', '#7AA8C0', '#DCEFF8'], ink: '#0B4A7A', emblem: 'wave' },
  feria: { stops: ['#FFFFFF', '#D6D6DE', '#9A9AAE', '#E8E8F0'], ink: '#B0102E', emblem: 'dot' },
  siesta: { stops: ['#D8DCFF', '#9AA0D8', '#5A60A0', '#B8BCF0'], ink: '#1A1450', emblem: 'star' },
  paella: { stops: ['#FFF0A0', '#F4C430', '#C88A0A', '#FFE07A'], ink: '#7A2A00', emblem: 'flower' },
};

function emblemPath(kind: string, x: number, y: number) {
  if (kind === 'coin') return `M${x - 2.6} ${y} a2.6 2.6 0 1 0 5.2 0 a2.6 2.6 0 1 0 -5.2 0`;
  if (kind === 'wave') return `M${x - 4} ${y} q2 -2.4 4 0 t4 0`;
  if (kind === 'dot') return `M${x - 1.8} ${y} a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0`;
  if (kind === 'star') return `M${x} ${y - 3} L${x + 0.9} ${y - 0.9} L${x + 3} ${y} L${x + 0.9} ${y + 0.9} L${x} ${y + 3} L${x - 0.9} ${y + 0.9} L${x - 3} ${y} L${x - 0.9} ${y - 0.9} Z`;
  return `M${x} ${y - 3} Q${x + 3} ${y} ${x} ${y + 3} Q${x - 3} ${y} ${x} ${y - 3} Z M${x - 3} ${y} Q${x} ${y + 3} ${x + 3} ${y} Q${x} ${y - 3} ${x - 3} ${y} Z`;
}

/** One foil spot: its own little SVG, masked by the strokes scratched over it. */
const FoilSpot = React.memo(function FoilSpot({ p, i, spot, card, scale, d, cleared, label }: { p: string; i: number; spot: Spot; card: ScratchCardId; scale: number; d: string; cleared: boolean; label: boolean }) {
  const b = spotBox(spot);
  const f = FOIL[card];
  const op = useSharedValue(1);
  useEffect(() => {
    op.set(cleared ? withTiming(0, { duration: 380, easing: Easing.out(Easing.quad) }) : 1);
  }, [cleared, op]);
  const st = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: 1 + (1 - op.value) * 0.08 }] }));
  const id = `${p}m${i}`;
  const shape = spot.kind === 'rect' ? <Rect x={spot.x} y={spot.y} width={spot.w} height={spot.h} rx={spot.r} fill="#FFFFFF" /> : <Circle cx={spot.cx} cy={spot.cy} r={spot.r} fill="#FFFFFF" />;
  const marks: string[] = [];
  for (let y = b.y + 6; y < b.y + b.h; y += 11) for (let x = b.x + 6 + ((y - b.y) % 22 ? 5 : 0); x < b.x + b.w; x += 11) marks.push(emblemPath(f.emblem, x, y));
  const hatch: string[] = [];
  for (let k = -b.h; k < b.w; k += 6) hatch.push(`M${b.x + k} ${b.y + b.h} L${b.x + k + b.h} ${b.y}`);
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { left: b.x * scale, top: b.y * scale, width: b.w * scale, height: b.h * scale }, st]}>
      <Svg width={b.w * scale} height={b.h * scale} viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`}>
        <Defs>
          {vg(`${p}f${i}`, f.stops)}
          <Mask id={id} maskUnits="userSpaceOnUse" x={b.x - 2} y={b.y - 2} width={b.w + 4} height={b.h + 4}>
            {shape}
            {d ? <Path d={d} stroke="#000000" strokeWidth={BRUSH * 2} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
          </Mask>
        </Defs>
        <G mask={`url(#${id})`}>
          <Rect x={b.x} y={b.y} width={b.w} height={b.h} fill={`url(#${p}f${i})`} />
          <Path d={hatch.join(' ')} stroke="#FFFFFF" strokeWidth={1} opacity={0.18} />
          <Path d={marks.join(' ')} fill={f.ink} stroke={f.ink} strokeWidth={0.6} opacity={0.22} />
          <Rect x={b.x} y={b.y} width={b.w} height={b.h * 0.42} fill="#FFFFFF" opacity={0.16} />
          {label ? (
            <G>
              <SvgText x={b.x + b.w / 2} y={b.y + b.h / 2 + 4} fontSize={Math.min(13, b.w / 5.4)} fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" textAnchor="middle" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={2.4} strokeLinejoin="round" opacity={0.75}>RASCA</SvgText>
              <SvgText x={b.x + b.w / 2} y={b.y + b.h / 2 + 4} fontSize={Math.min(13, b.w / 5.4)} fontWeight="900" fontFamily="Arial Black, Arial, sans-serif" textAnchor="middle" fill={f.ink}>RASCA</SvgText>
            </G>
          ) : null}
          {spot.kind === 'rect' ? <Rect x={spot.x + 0.8} y={spot.y + 0.8} width={spot.w - 1.6} height={spot.h - 1.6} rx={spot.r} fill="none" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.2} /> : <Circle cx={spot.cx} cy={spot.cy} r={spot.r - 0.8} fill="none" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.2} />}
        </G>
      </Svg>
    </Animated.View>
  );
});

/** Light sweeping across the ticket every few seconds (only while there is foil left). */
function Sheen({ w, h, on }: { w: number; h: number; on: boolean }) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (on) x.set(withRepeat(withDelay(1400, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) })), -1, false));
    else x.set(0);
  }, [on, x]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -120 + x.value * (w + 240) }, { rotate: '18deg' }] }));
  if (!on) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 18 * (w / TW) }]}>
      <Animated.View style={[styles.abs, { top: -h * 0.2, width: 60, height: h * 1.4 }, st]}>
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

/** Distance from point to segment, squared. */
function d2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l)) : 0;
  const x = ax + t * dx - px, y = ay + t * dy - py;
  return x * x + y * y;
}

interface Props {
  card: ScratchCardId;
  width: number;
  layout?: ScratchLayout | null;
  /** The player can scratch it. */
  live?: boolean;
  /** Bump to uncover every spot at once. */
  revealAll?: number;
  /** Changing it starts a fresh ticket. */
  ticketKey?: string;
  serial?: string;
  howTo: string;
  onDone?: () => void;
  /** Light the winning spots (after everything is uncovered). */
  showWins?: boolean;
}

/** A scratch ticket: the printed card, what's under the foil and the foil you scratch with a finger (or the mouse). */
export function Ticket({ card, width, layout, live, revealAll, ticketKey, serial = '00-000000', howTo, onDone, showWins }: Props) {
  const p = usePrefix();
  const scale = width / TW;
  const spots = SPOTS[card];
  const [paths, setPaths] = useState<string[]>(() => spots.map(() => ''));
  const [cleared, setCleared] = useState<boolean[]>(() => spots.map(() => false));
  // coverage grid per spot (cell centres inside the spot); a new ticket remounts this component (key)
  const cover = useRef(
    spots.map((s) => {
      const b = spotBox(s);
      const cells: { x: number; y: number; hit: boolean }[] = [];
      for (let y = b.y + CELL / 2; y < b.y + b.h; y += CELL)
        for (let x = b.x + CELL / 2; x < b.x + b.w; x += CELL) {
          const inside = s.kind === 'circle' ? (x - s.cx) ** 2 + (y - s.cy) ** 2 <= (s.r - 2) ** 2 : x > s.x + 3 && x < s.x + s.w - 3 && y > s.y + 3 && y < s.y + s.h - 3;
          if (inside) cells.push({ x, y, hit: false });
        }
      return cells;
    }),
  );
  const pathRef = useRef<string[]>(spots.map(() => ''));
  const ends = useRef<(string | null)[]>(spots.map(() => null));
  const last = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef<number | null>(null);
  const clearedRef = useRef<boolean[]>(spots.map(() => false));
  const doneRef = useRef(false);
  const liveRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const scratchRef = useRef<(x: number, y: number, start: boolean) => void>(() => undefined);
  useEffect(() => {
    liveRef.current = !!live && !!layout;
    onDoneRef.current = onDone;
  });

  const clearSpots = (idx: number[]) => {
    let any = false;
    for (const i of idx) if (!clearedRef.current[i]) { clearedRef.current[i] = true; any = true; }
    if (!any) return;
    setCleared([...clearedRef.current]);
    if (!doneRef.current && clearedRef.current.every(Boolean)) {
      doneRef.current = true;
      setTimeout(() => onDoneRef.current?.(), 420);
    }
  };

  useEffect(() => {
    if (revealAll && layout) clearSpots(spots.map((_, i) => i));
  }, [revealAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const scratch = (x: number, y: number, start: boolean) => {
    const from = start || !last.current ? { x, y } : last.current;
    last.current = { x, y };
    const fresh: number[] = [];
    spots.forEach((s, i) => {
      if (clearedRef.current[i]) return;
      const b = spotBox(s);
      const minX = Math.min(from.x, x) - BRUSH, maxX = Math.max(from.x, x) + BRUSH, minY = Math.min(from.y, y) - BRUSH, maxY = Math.max(from.y, y) + BRUSH;
      if (maxX < b.x || minX > b.x + b.w || maxY < b.y || minY > b.y + b.h) return;
      const a = `${from.x.toFixed(1)} ${from.y.toFixed(1)}`;
      pathRef.current[i] += ends.current[i] === a ? ` L${x.toFixed(1)} ${y.toFixed(1)}` : ` M${a} L${(x + 0.1).toFixed(1)} ${y.toFixed(1)}`;
      ends.current[i] = `${x.toFixed(1)} ${y.toFixed(1)}`;
      const cells = cover.current[i];
      let hit = 0;
      for (const c of cells) {
        if (!c.hit && d2(c.x, c.y, from.x, from.y, x, y) <= BRUSH * BRUSH) c.hit = true;
        if (c.hit) hit++;
      }
      if (cells.length && hit / cells.length >= DONE_AT) fresh.push(i);
    });
    sfx('tick', 0.18);
    if (fresh.length) {
      sfx('reveal', 0.7);
      haptic.select();
      clearSpots(fresh);
    }
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setPaths([...pathRef.current]);
      });
    }
  };

  useEffect(() => {
    scratchRef.current = (x, y, start) => scratch(x / scale, y / scale, start);
  });
  // the handlers only read refs when a touch happens, never during render
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => liveRef.current,
      onMoveShouldSetPanResponder: () => liveRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => scratchRef.current(e.nativeEvent.locationX, e.nativeEvent.locationY, true),
      onPanResponderMove: (e) => scratchRef.current(e.nativeEvent.locationX, e.nativeEvent.locationY, false),
      onPanResponderRelease: () => {
        last.current = null;
      },
    }),
  );

  const wins = useMemo(() => (layout && showWins ? winningSpots(card, layout) : []), [layout, showWins, card]);
  const height = width * (TH / TW);
  const foilLeft = cleared.some((c) => !c);
  return (
    <View style={[{ width, height, borderRadius: 18 * scale }, width > 200 && styles.shadow]}>
      <Svg width={width} height={height} viewBox={`0 0 ${TW} ${TH}`}>
        <Paints p={p} />
        <TicketPrint p={p} card={card} serial={serial} howTo={howTo} />
        {layout ? <TicketContent p={p} card={card} layout={layout} wins={wins} /> : null}
      </Svg>
      {spots.map((s, i) => (
        <FoilSpot key={`${ticketKey}-${i}`} p={p} i={i} spot={s} card={card} scale={scale} d={paths[i] ?? ''} cleared={!!cleared[i]} label={width > 200 && spotBox(s).w >= 46} />
      ))}
      <Sheen w={width} h={height} on={foilLeft && width > 200} />
      <View {...pan.panHandlers} style={[StyleSheet.absoluteFill, Platform.OS === 'web' ? ({ touchAction: 'none', cursor: live && layout ? 'crosshair' : 'default' } as object) : null]} />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  shadow: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
});
