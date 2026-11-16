import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import type { RaceCard, RaceResult } from '@/engine/games/horses.ts';
import { HorseSprite, Saddle } from './Art';
import { sfx } from '@/services/audio';

const CHECK = 12;
const SCREENS = 5; // the whole race spans this many screen widths
const NOSE = 46; // where a horse at the start has its nose, in px

/** Position (0..1 of the race) of horse i at race time t (0..1), from its checkpoints. */
function posAt(splits: number[][], i: number, t: number): number {
  'worklet';
  if (t <= 0) return 0;
  const s = splits[i];
  const x = Math.min(t, 1) * CHECK;
  const k = Math.floor(x);
  if (k >= CHECK) return s[CHECK - 1];
  const a = k === 0 ? 0 : s[k - 1];
  const b = s[k];
  const f = x - k;
  return a + (b - a) * (f * f * (3 - 2 * f));
}
function cameraAt(splits: number[][], t: number, view: number): number {
  'worklet';
  let lead = 0;
  for (let i = 0; i < splits.length; i++) lead = Math.max(lead, posAt(splits, i, t));
  return Math.max(0, Math.min(lead - view * 0.66, 1 - view + 0.06));
}

/**
 * Broadcast camera: the turf is a flat plane tilted away from the viewer (real CSS/native 3D: perspective +
 * rotateX), so far lanes are smaller and higher. The horses are 2D sprites placed with the same projection,
 * so they stand on the 3D turf at the right size for their lane.
 */
const TILT = 52; // degrees
const PERSP = 760;
const SIN = Math.sin((TILT * Math.PI) / 180);
const COS = Math.cos((TILT * Math.PI) / 180);
/** Screen scale and vertical offset (from the plane centre) of a point at plane-y `yy` (negative = far). */
const project = (yy: number) => {
  const k = PERSP / (PERSP - yy * SIN);
  return { k, y: yy * COS * k };
};

/** One runner in its lane: moves with the race clock, swaps gallop frames, scaled for its depth. */
const Runner = React.memo(function Runner({ i, n, silks, splits, clock, track, view, footY, k, cx, size, duration }: { i: number; n: number; silks: [string, string]; splits: number[][]; clock: SharedValue<number>; track: number; view: number; footY: number; k: number; cx: number; size: number; duration: number }) {
  const sz = size * k;
  const move = useAnimatedStyle(() => {
    const t = clock.value;
    const nose = (posAt(splits, i, t) - cameraAt(splits, t, view)) * track + NOSE;
    const x = cx + (nose - cx) * k - sz * 0.92;
    const bob = t > 0 && t < 1 ? Math.sin((t * duration) / 55 + i) * 2 * k : 0;
    return { transform: [{ translateX: x }, { translateY: footY - sz * 0.72 + bob }] };
  });
  return (
    <Animated.View style={[styles.runner, move]}>
      {[0, 1, 2, 3].map((f) => <GallopFrame key={f} f={f} i={i} n={n} silks={silks} clock={clock} size={sz} duration={duration} />)}
    </Animated.View>
  );
});

/** One of the four gallop frames; only the current one is visible. */
function GallopFrame({ f, i, n, silks, clock, size, duration }: { f: number; i: number; n: number; silks: [string, string]; clock: SharedValue<number>; size: number; duration: number }) {
  const st = useAnimatedStyle(() => {
    const t = clock.value;
    const cur = t > 0 && t < 1.02 ? Math.floor((t * duration) / 95 + i * 1.3) % 4 : 0;
    return { opacity: cur === f ? 1 : 0 };
  });
  return (
    <Animated.View style={[f ? StyleSheet.absoluteFill : null, st]}>
      <HorseSprite n={n} silks={silks} frame={f} size={size} />
    </Animated.View>
  );
}

/** Something lying on the turf at race position p (distance boards, the finish line), inside the 3D plane. */
const TrackThing = React.memo(function TrackThing({ p, splits, clock, track, view, offset, children, style }: { p: number; splits: number[][]; clock: SharedValue<number>; track: number; view: number; offset: number; children: React.ReactNode; style?: object }) {
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: (p - cameraAt(splits, clock.value, view)) * track + NOSE + offset } as const] }));
  return <Animated.View style={[styles.thing, style, st]}>{children}</Animated.View>;
});

export function RaceView({ card, race, width, height, duration = 16000, startedAt, onEnd }: { card: RaceCard; race: RaceResult; width: number; height: number; duration?: number; startedAt?: number; onEnd: () => void }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const clock = useSharedValue(0);
  const track = width * SCREENS;
  const view = width / track;
  const splits = race.splits;
  const [order, setOrder] = useState<number[]>(card.horses.map((h) => h.n));
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const elapsed = startedAt ? Math.max(0, Date.now() - startedAt) : 0;
    const left = Math.max(0, duration - elapsed);
    clock.set(Math.min(1, elapsed / duration));
    if (reduceMotion || left === 0) {
      clock.set(1);
      onEnd();
      return;
    }
    sfx('roll', 0.5);
    clock.set(withTiming(1, { duration: left, easing: Easing.linear }, (f) => {
      if (f) runOnJS(onEnd)();
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // live order and race phase for the board and the commentary (a few times per second)
  useAnimatedReaction(
    () => Math.floor(clock.value * 40),
    (step, prev) => {
      if (step === prev) return;
      const t = clock.value;
      const idx = splits.map((_, i) => i).sort((a, b) => posAt(splits, b, t) - posAt(splits, a, t));
      runOnJS(setOrder)(t >= 1 ? race.finish : idx.map((i) => i + 1));
      runOnJS(setPhase)(t < 0.08 ? 0 : t < 0.45 ? 1 : t < 0.8 ? 2 : t < 1 ? 3 : 4);
    },
  );

  const H = height;
  const n = card.horses.length;
  const standsH = Math.max(52, H * 0.2);
  // fit the tilted plane between the stands and the bottom edge: find its height by bisection
  const y0 = standsH - 4, y1 = H + 6;
  let lo = 50, hi = (1.6 * PERSP) / SIN; // stay well in front of the camera (no singular projection)
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    const span = project(mid / 2).y - project(-mid / 2).y;
    if (span > y1 - y0) hi = mid;
    else lo = mid;
  }
  const planeH = lo;
  const cy = y0 - project(-planeH / 2).y;
  const cx = width / 2;
  const planeW = (width / project(-planeH / 2).k) * 1.08;
  const offset = (planeW - width) / 2; // plane-x = screen-x + offset along the centre line
  const laneYY = (i: number) => -planeH / 2 + planeH * (0.16 + (0.74 * (i + 0.5)) / n);
  const size = Math.min(92, Math.max(54, ((y1 - y0) / n) * 2.5));
  const name = (k: number) => card.horses[k - 1].name;
  const text = [
    t('play.raceOff'),
    t('play.raceLeads', { name: name(order[0]) }),
    t('play.raceStraight', { a: name(order[0]), b: name(order[1]) }),
    t('play.raceLine', { name: name(order[0]) }),
    t('play.raceWinner', { name: name(race.finish[0]) }),
  ][phase];

  const grass = useAnimatedStyle(() => ({ transform: [{ translateX: -((cameraAt(splits, clock.value, view) * track) % 120) }] }));
  const crowd = useAnimatedStyle(() => ({ transform: [{ translateX: -((cameraAt(splits, clock.value, view) * track * 0.3) % 96) }] }));
  const rail = useAnimatedStyle(() => ({ transform: [{ translateX: -((cameraAt(splits, clock.value, view) * track) % 80) }] }));
  const cols = Math.ceil((width + 200) / 12);
  const crowdDots = useMemo(() => Array.from({ length: cols * 4 }, (_, k) => k), [cols]);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {/* sky and stands with the crowd (far away, flat) */}
      <LinearGradient colors={['#1A1240', '#3A2A7A']} style={[StyleSheet.absoluteFill, { height: standsH + 20 }]} />
      <View style={[styles.stands, { height: standsH }]}>
        <Animated.View style={[styles.crowd, crowd]}>
          {crowdDots.map((k) => (
            <View key={k} style={[styles.fan, { left: (k % cols) * 12 + (Math.floor(k / cols) % 2) * 6, top: 8 + Math.floor(k / cols) * 9, backgroundColor: ['#FF4FA3', '#FFD06B', '#5BE3B0', '#A996FF', '#FFFFFF'][(k * 7) % 5] }]} />
          ))}
        </Animated.View>
        <View style={styles.roof} />
      </View>
      {/* the turf: a real 3D plane tilted away from the camera (in its own flat layer, so it never covers the horses) */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.layer, { top: standsH - 4 }]}>
      <View style={[styles.plane, { left: cx - planeW / 2, top: cy - planeH / 2 - (standsH - 4), width: planeW, height: planeH, transform: [{ perspective: PERSP }, { rotateX: `${TILT}deg` }] }]}>
        <LinearGradient colors={['#137A47', '#1F9A5C', '#22A863']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.stripes, grass]}>
          {Array.from({ length: Math.ceil(planeW / 120) + 3 }, (_, k) => <View key={k} style={[styles.stripe, { left: k * 120 }]} />)}
        </Animated.View>
        {/* dirt-coloured inner rail line and lane chalk */}
        {Array.from({ length: n + 1 }, (_, k) => <View key={k} style={[styles.chalk, { top: planeH / 2 + laneYY(0) - planeH * (0.37 / n) + (planeH * 0.74 * k) / n }]} />)}
        {[planeH * 0.1, planeH * 0.93].map((y, r) => (
          <View key={r} style={[styles.railWrap, { top: y }]}>
            <View style={styles.railBar} />
            <Animated.View style={[styles.posts, rail]}>
              {Array.from({ length: Math.ceil(planeW / 80) + 3 }, (_, k) => <View key={k} style={[styles.post, { left: k * 80 }]} />)}
            </Animated.View>
          </View>
        ))}
        {[0.25, 0.5, 0.75].map((p) => (
          <TrackThing key={p} p={p} splits={splits} clock={clock} track={track} view={view} offset={offset} style={{ top: planeH * 0.02 }}>
            <View style={styles.marker}><T weight="display" style={{ color: '#231A3A', fontSize: 14 }}>{Math.round((1 - p) * card.distance)}m</T></View>
          </TrackThing>
        ))}
        <TrackThing p={1} splits={splits} clock={clock} track={track} view={view} offset={offset} style={{ top: planeH * 0.1, height: planeH * 0.84 }}>
          <View style={styles.finish}>
            {Array.from({ length: 40 }, (_, k) => <View key={k} style={{ flex: 1, flexDirection: 'row' }}><View style={{ flex: 1, backgroundColor: k % 2 ? '#fff' : '#111' }} /><View style={{ flex: 1, backgroundColor: k % 2 ? '#111' : '#fff' }} /></View>)}
          </View>
        </TrackThing>
      </View>
      </View>
      {/* soft haze where the turf meets the stands */}
      <LinearGradient pointerEvents="none" colors={['rgba(26,18,64,0.85)', 'rgba(26,18,64,0)']} style={{ position: 'absolute', left: 0, right: 0, top: standsH - 6, height: 26 }} />
      {/* runners, far lane first, standing on the plane */}
      {card.horses.map((h, i) => {
        const pr = project(laneYY(i));
        return <Runner key={h.n} i={i} n={h.n} silks={h.silks} splits={splits} clock={clock} track={track} view={view} footY={cy + pr.y} k={pr.k} cx={cx} size={size} duration={duration} />;
      })}
      {/* TV graphics: live bug, positions and commentary */}
      <View style={styles.bug}><View style={styles.bugDot} /><T weight="display" style={{ color: '#fff', fontSize: 10 }}>CASHINO TV</T></View>
      <View style={styles.board}>
        {order.slice(0, 8).map((k, j) => (
          <View key={k} style={{ alignItems: 'center' }}>
            <Saddle n={k} silks={card.horses[k - 1].silks} size={j < 3 ? 26 : 20} />
          </View>
        ))}
      </View>
      <View style={styles.comment}>
        <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff', fontSize: 13 }}>🎙️ {text}</T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 22, backgroundColor: '#137A47' },
  stands: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  crowd: { position: 'absolute', left: 0, top: 4, right: -200, bottom: 0 },
  fan: { position: 'absolute', width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
  layer: { overflow: 'hidden', zIndex: 0 },
  plane: { position: 'absolute', overflow: 'hidden' },
  chalk: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.13)' },
  bug: { zIndex: 3, position: 'absolute', left: 8, top: 6, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: 'rgba(10,6,24,0.75)' },
  bugDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF3B5C' },
  roof: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, backgroundColor: '#FFD06B' },
  stripes: { position: 'absolute', top: 0, bottom: 0, left: 0, right: -240 },
  stripe: { position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: 'rgba(255,255,255,0.07)' },
  railWrap: { position: 'absolute', left: 0, right: 0, height: 14 },
  railBar: { position: 'absolute', left: 0, right: 0, top: 0, height: 6, backgroundColor: '#FFFFFF', borderRadius: 3 },
  posts: { position: 'absolute', top: 0, left: 0, right: -160, height: 14 },
  post: { position: 'absolute', top: 0, width: 5, height: 14, backgroundColor: '#E8E8EE' },
  thing: { position: 'absolute', left: 0 },
  marker: { backgroundColor: '#FFD06B', paddingHorizontal: 8, height: 24, borderRadius: 5, justifyContent: 'center' },
  finish: { width: 16, height: '100%' },
  runner: { position: 'absolute', left: 0, top: 0, zIndex: 2 },
  board: { zIndex: 3, position: 'absolute', right: 8, top: 4, flexDirection: 'row', alignItems: 'center', gap: 2, padding: 4, borderRadius: 16, backgroundColor: 'rgba(10,6,24,0.7)' },
  comment: { zIndex: 3, position: 'absolute', left: 10, right: 10, bottom: 10, paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: 'rgba(10,6,24,0.72)' },
});
