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

/** One runner in its lane: moves with the race clock and swaps gallop frames. */
const Runner = React.memo(function Runner({ i, n, silks, splits, clock, track, view, laneY, size, duration }: { i: number; n: number; silks: [string, string]; splits: number[][]; clock: SharedValue<number>; track: number; view: number; laneY: number; size: number; duration: number }) {
  const move = useAnimatedStyle(() => {
    const t = clock.value;
    const x = (posAt(splits, i, t) - cameraAt(splits, t, view)) * track + NOSE - size * 0.92;
    const bob = t > 0 && t < 1 ? Math.sin((t * duration) / 55 + i) * 2 : 0;
    return { transform: [{ translateX: x }, { translateY: laneY + bob }] };
  });
  return (
    <Animated.View style={[styles.runner, move]}>
      {[0, 1, 2, 3].map((f) => <GallopFrame key={f} f={f} i={i} n={n} silks={silks} clock={clock} size={size} duration={duration} />)}
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

/** Something that sits on the track at race position p (markers, finish post). */
const TrackThing = React.memo(function TrackThing({ p, splits, clock, track, view, children, style }: { p: number; splits: number[][]; clock: SharedValue<number>; track: number; view: number; children: React.ReactNode; style?: object }) {
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: (p - cameraAt(splits, clock.value, view)) * track + NOSE } as const] }));
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
  const standsH = Math.max(46, H * 0.16);
  const laneTop = standsH + 18;
  const laneH = (H - laneTop - 34) / card.horses.length;
  const size = Math.min(78, Math.max(48, laneH * 2.1));
  const name = (n: number) => card.horses[n - 1].name;
  const text = [
    t('play.raceOff'),
    t('play.raceLeads', { name: name(order[0]) }),
    t('play.raceStraight', { a: name(order[0]), b: name(order[1]) }),
    t('play.raceLine', { name: name(order[0]) }),
    t('play.raceWinner', { name: name(race.finish[0]) }),
  ][phase];

  const grass = useAnimatedStyle(() => ({ transform: [{ translateX: -((cameraAt(splits, clock.value, view) * track) % 120) }] }));
  const crowd = useAnimatedStyle(() => ({ transform: [{ translateX: -((cameraAt(splits, clock.value, view) * track * 0.45) % 96) }] }));
  const rail = useAnimatedStyle(() => ({ transform: [{ translateX: -((cameraAt(splits, clock.value, view) * track) % 80) }] }));
  const crowdDots = useMemo(() => Array.from({ length: Math.ceil((width + 200) / 12) * 3 }, (_, k) => k), [width]);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {/* stands with the crowd */}
      <View style={[styles.stands, { height: standsH }]}>
        <LinearGradient colors={['#2A1A66', '#3A2A7A']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.crowd, crowd]}>
          {crowdDots.map((k) => (
            <View key={k} style={[styles.fan, { left: (k % Math.ceil((width + 200) / 12)) * 12, top: 6 + Math.floor(k / Math.ceil((width + 200) / 12)) * 11, backgroundColor: ['#FF4FA3', '#FFD06B', '#5BE3B0', '#A996FF', '#FFFFFF'][(k * 7) % 5] }]} />
          ))}
        </Animated.View>
        <View style={styles.roof} />
      </View>
      {/* turf with mowing stripes */}
      <View style={[StyleSheet.absoluteFill, { top: standsH, overflow: 'hidden' }]}>
        <LinearGradient colors={['#1F9A5C', '#137A47']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.stripes, grass]}>
          {Array.from({ length: Math.ceil(width / 60) + 3 }, (_, k) => <View key={k} style={[styles.stripe, { left: k * 120 }]} />)}
        </Animated.View>
      </View>
      {/* rails */}
      {[standsH + 6, H - 22].map((y, r) => (
        <View key={r} style={[styles.railWrap, { top: y }]}>
          <View style={styles.railBar} />
          <Animated.View style={[styles.posts, rail]}>
            {Array.from({ length: Math.ceil(width / 80) + 3 }, (_, k) => <View key={k} style={[styles.post, { left: k * 80 }]} />)}
          </Animated.View>
        </View>
      ))}
      {/* distance markers and the finish post */}
      {[0.25, 0.5, 0.75].map((p) => (
        <TrackThing key={p} p={p} splits={splits} clock={clock} track={track} view={view} style={{ top: standsH + 2 }}>
          <View style={styles.marker}><T weight="display" style={{ color: '#231A3A', fontSize: 10 }}>{Math.round((1 - p) * card.distance)}</T></View>
        </TrackThing>
      ))}
      <TrackThing p={1} splits={splits} clock={clock} track={track} view={view} style={{ top: standsH + 4, bottom: 18 }}>
        <View style={styles.finish}>
          {Array.from({ length: 24 }, (_, k) => <View key={k} style={{ height: 12, backgroundColor: k % 2 ? '#FFFFFF' : '#111' }} />)}
        </View>
      </TrackThing>
      {/* runners, far lane first */}
      {card.horses.map((h, i) => (
        <Runner key={h.n} i={i} n={h.n} silks={h.silks} splits={splits} clock={clock} track={track} view={view} laneY={laneTop + i * laneH - size * 0.45} size={size} duration={duration} />
      ))}
      {/* live positions */}
      <View style={styles.board}>
        {order.slice(0, 8).map((n, k) => (
          <View key={n} style={{ alignItems: 'center' }}>
            <Saddle n={n} silks={card.horses[n - 1].silks} size={k < 3 ? 26 : 20} />
          </View>
        ))}
      </View>
      {/* commentary */}
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
  fan: { position: 'absolute', width: 7, height: 7, borderRadius: 4, opacity: 0.85 },
  roof: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, backgroundColor: '#FFD06B' },
  stripes: { position: 'absolute', top: 0, bottom: 0, left: 0, right: -240 },
  stripe: { position: 'absolute', top: 0, bottom: 0, width: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  railWrap: { position: 'absolute', left: 0, right: 0, height: 12 },
  railBar: { position: 'absolute', left: 0, right: 0, top: 0, height: 4, backgroundColor: '#FFFFFF', borderRadius: 2 },
  posts: { position: 'absolute', top: 0, left: 0, right: -160, height: 12 },
  post: { position: 'absolute', top: 0, width: 3, height: 12, backgroundColor: '#E8E8EE' },
  thing: { position: 'absolute', left: 0 },
  marker: { backgroundColor: '#FFD06B', paddingHorizontal: 5, height: 16, borderRadius: 4, justifyContent: 'center' },
  finish: { width: 8, overflow: 'hidden', borderRadius: 2, height: '100%' },
  runner: { position: 'absolute', left: 0, top: 0 },
  board: { position: 'absolute', right: 8, top: 6, flexDirection: 'row', alignItems: 'center', gap: 2, padding: 4, borderRadius: 16, backgroundColor: 'rgba(10,6,24,0.7)' },
  comment: { position: 'absolute', left: 10, right: 10, bottom: 26, paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: 'rgba(10,6,24,0.72)' },
});
