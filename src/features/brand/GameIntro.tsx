import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { GameLogo, PlayingCard, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { gameVivid } from '@/design/tokens';
import { parseCard } from '@/engine/cards/cards.ts';
import type { GameId } from '@/engine/games/types.ts';
import { SlotSymbolArt } from '@/games/slots/Symbols';
import { IntroWheel } from './Splash';
import { HorseSprite } from '@/games/horses/Art';

/* ------------------------------------------------------------------ */
/* A tiny keyframe helper: moves/turns/scales a piece between two poses */
/* while the intro clock `p` (0→1) goes through the window `at`.        */
/* ------------------------------------------------------------------ */
type Pose = { x?: number; y?: number; s?: number; r?: number; ry?: number; o?: number };
type Ease = 'out' | 'back' | 'linear' | 'in';

function Anim({ p, at, from, to, ease = 'out', style, children }: { p: SharedValue<number>; at: [number, number]; from: Pose; to: Pose; ease?: Ease; style?: ViewStyle; children?: React.ReactNode }) {
  const st = useAnimatedStyle(() => {
    const k = Math.min(1, Math.max(0, (p.value - at[0]) / (at[1] - at[0])));
    const c1 = 1.70158;
    const e = ease === 'linear' ? k : ease === 'in' ? k * k * k : ease === 'back' ? 1 + (c1 + 1) * (k - 1) ** 3 + c1 * (k - 1) ** 2 : 1 - (1 - k) ** 3;
    const v = (a: number | undefined, b: number | undefined, d: number) => {
      const A = a ?? d;
      const B = b ?? d; // a value left out of the target pose goes back to its rest value
      return A + (B - A) * e;
    };
    return {
      opacity: v(from.o, to.o, 1),
      transform: [
        { translateX: v(from.x, to.x, 0) },
        { translateY: v(from.y, to.y, 0) },
        { perspective: 700 },
        { rotateY: `${v(from.ry, to.ry, 0)}deg` },
        { rotate: `${v(from.r, to.r, 0)}deg` },
        { scale: v(from.s, to.s, 1) },
      ],
    };
  });
  return <Animated.View style={[styles.abs, style, st]}>{children}</Animated.View>;
}

const card = (code: string, size: 'md' | 'lg' = 'lg') => <PlayingCard card={parseCard(code)} size={size} />;
const Big = ({ children, color = '#fff', size = 54 }: { children: React.ReactNode; color?: string; size?: number }) => (
  <T weight="display" style={{ color, fontSize: size, lineHeight: size * 1.15, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 12 }}>{children}</T>
);
const Emoji = ({ e, size }: { e: string; size: number }) => <Text style={{ fontSize: size, lineHeight: size * 1.2 }} accessible={false}>{e}</Text>;

function Pips({ n, size }: { n: number; size: number }) {
  const spots: Record<number, [number, number][]> = { 5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]], 6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]] };
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.2, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8 }}>
      {spots[n].map(([x, y], i) => <View key={i} style={{ position: 'absolute', left: x * size - size * 0.08, top: y * size - size * 0.08, width: size * 0.16, height: size * 0.16, borderRadius: size, backgroundColor: n === 6 ? '#E8304F' : '#231A3A' }} />)}
    </View>
  );
}

/* ------------------------------ scenes ------------------------------ */
type Scene = (p: SharedValue<number>, S: number) => React.ReactNode;

const SCENES: Partial<Record<GameId, Scene>> = {
  horses: (p, S) => (
    <>
      <Anim p={p} at={[0, 0.7]} from={{ x: S * 0.42 }} to={{ x: S * 0.42 }}>
        <View style={{ width: 10, height: S * 0.8, flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
          {Array.from({ length: 16 }, (_, k) => <View key={k} style={{ flex: 1, backgroundColor: k % 2 ? '#fff' : '#111' }} />)}
        </View>
      </Anim>
      <Anim p={p} at={[0, 0.62]} from={{ x: -S * 1.1, y: -S * 0.16 }} to={{ x: S * 0.55, y: -S * 0.16 }} ease="linear"><HorseSprite n={3} silks={['#7B5CFF', '#FFD06B']} frame={1} size={S * 0.5} /></Anim>
      <Anim p={p} at={[0, 0.62]} from={{ x: -S * 1.3, y: S * 0.16 }} to={{ x: S * 0.4, y: S * 0.16 }} ease="linear"><HorseSprite n={7} silks={['#FF4FA3', '#FFFFFF']} frame={3} size={S * 0.5} /></Anim>
      <Anim p={p} at={[0.5, 0.64]} from={{ s: 0, o: 0 }} to={{ s: 1, o: 1, y: S * 0.42 }} ease="back"><Big color="#FFD06B" size={S * 0.12}>🏆 FOTO FINISH</Big></Anim>
    </>
  ),
  roulette: (p, S) => (
    <>
      <Anim p={p} at={[0, 0.75]} from={{ r: 0, s: 0.5, o: 0 }} to={{ r: 640, s: 1, o: 1 }}><IntroWheel size={S} /></Anim>
      <Anim p={p} at={[0, 0.7]} from={{ r: 0 }} to={{ r: -900 }} style={{ width: S, height: S }}>
        <View style={{ position: 'absolute', left: S / 2 - S * 0.035, top: S * 0.11, width: S * 0.07, height: S * 0.07, borderRadius: S, backgroundColor: '#fff', shadowColor: '#fff', shadowOpacity: 0.9, shadowRadius: 8 }} />
      </Anim>
    </>
  ),
  slots: (p, S) => (
    <Anim p={p} at={[0, 0.7]} from={{ s: 0.7 }} to={{ s: 1.15 }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, borderRadius: 22, backgroundColor: '#120818', borderWidth: 4, borderColor: '#FFD06B' }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: S * 0.24, height: S * 0.32, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            {/* each reel scrolls fruit and slams onto a 7, one after another */}
            <Anim p={p} at={[0, 0.25 + i * 0.12]} from={{ y: -S * 1.4 }} to={{ y: 0 }} ease="back">
              <View style={{ alignItems: 'center' }}>
                {(['cherry', 'bell', 'seven', 'lemon', 'bar'] as const).map((sym, k) => (
                  <View key={k} style={{ height: S * 0.28, justifyContent: 'center' }}><SlotSymbolArt sym={sym} size={S * 0.2} /></View>
                ))}
              </View>
            </Anim>
          </View>
        ))}
      </View>
      <Anim p={p} at={[0.5, 0.62]} from={{ s: 0, o: 0 }} to={{ s: 1, o: 1 }} ease="back" style={{ top: -S * 0.2 }}>
        <Big color="#FFD06B" size={S * 0.16}>777</Big>
      </Anim>
    </Anim>
  ),
  blackjack: (p, S) => (
    <>
      <Anim p={p} at={[0.02, 0.3]} from={{ y: -S, r: -40 }} to={{ x: -S * 0.13, r: -10 }}>{card('As')}</Anim>
      <Anim p={p} at={[0.14, 0.42]} from={{ y: -S, r: 40 }} to={{ x: S * 0.13, r: 10 }}>{card('Kh')}</Anim>
      <Anim p={p} at={[0.42, 0.56]} from={{ s: 0, o: 0 }} to={{ s: 1, o: 1, y: S * 0.32 }} ease="back"><Big color="#FFD06B">21</Big></Anim>
    </>
  ),
  videopoker: (p, S) => (
    <>
      {['Ts', 'Js', 'Qs', 'Ks', 'As'].map((c, i) => (
        <Anim key={c} p={p} at={[0.05 + i * 0.07, 0.3 + i * 0.07]} from={{ y: S * 0.6, o: 0 }} to={{ x: (i - 2) * S * 0.15, y: Math.abs(i - 2) * 8, r: (i - 2) * 9, o: 1 }}>{card(c, 'md')}</Anim>
      ))}
      <Anim p={p} at={[0.55, 0.66]} from={{ s: 0, o: 0 }} to={{ s: 1, o: 1, y: S * 0.32 }} ease="back"><Big color="#FFD06B" size={S * 0.1}>ROYAL FLUSH</Big></Anim>
    </>
  ),
  poker: (p, S) => (
    <>
      {[0, 1, 2].map((i) => (
        <Anim key={i} p={p} at={[0.25 + i * 0.06, 0.45 + i * 0.06]} from={{ y: -S, o: 0 }} to={{ y: S * 0.28 - i * 8, o: 1 }} ease="back">
          <View style={{ width: S * 0.3, height: S * 0.1, borderRadius: S, backgroundColor: ['#7B5CFF', '#FF4FA3', '#FFB938'][i], borderWidth: 3, borderColor: '#fff', borderStyle: 'dashed' }} />
        </Anim>
      ))}
      <Anim p={p} at={[0, 0.3]} from={{ x: -S, r: -60 }} to={{ x: -S * 0.12, y: -S * 0.05, r: -8 }}>{card('Ah')}</Anim>
      <Anim p={p} at={[0.08, 0.38]} from={{ x: S, r: 60 }} to={{ x: S * 0.12, y: -S * 0.05, r: 8 }}>{card('As')}</Anim>
    </>
  ),
  baccarat: (p, S) => (
    <>
      <Anim p={p} at={[0, 0.3]} from={{ y: -S, ry: 180 }} to={{ x: -S * 0.13, ry: 0 }}>{card('9h')}</Anim>
      <Anim p={p} at={[0.12, 0.42]} from={{ y: -S, ry: 180 }} to={{ x: S * 0.13, ry: 0 }}>{card('Kc')}</Anim>
      <Anim p={p} at={[0.45, 0.58]} from={{ s: 0, o: 0 }} to={{ s: 1, o: 1, y: S * 0.32 }} ease="back"><Big color="#FFD06B">9</Big></Anim>
    </>
  ),
  dragontiger: (p, S) => (
    <>
      <Anim p={p} at={[0, 0.32]} from={{ x: -S * 1.2, r: -30 }} to={{ x: -S * 0.2, r: 0 }} ease="back"><Emoji e="🐉" size={S * 0.36} /></Anim>
      <Anim p={p} at={[0, 0.32]} from={{ x: S * 1.2, r: 30 }} to={{ x: S * 0.2, r: 0 }} ease="back"><Emoji e="🐯" size={S * 0.36} /></Anim>
      <Anim p={p} at={[0.32, 0.46]} from={{ s: 3, o: 0 }} to={{ s: 1, o: 1, y: S * 0.3 }}><Big color="#FFD06B">VS</Big></Anim>
    </>
  ),
  hilo: (p, S) => (
    <>
      <Anim p={p} at={[0, 0.45]} from={{ ry: 180, s: 0.6 }} to={{ ry: 0, s: 1 }}>{card('7d')}</Anim>
      <Anim p={p} at={[0.35, 0.55]} from={{ y: 0, o: 0 }} to={{ y: -S * 0.36, o: 1 }} ease="back"><Big color="#5BE3B0">▲</Big></Anim>
      <Anim p={p} at={[0.4, 0.6]} from={{ y: 0, o: 0 }} to={{ y: S * 0.36, o: 1 }} ease="back"><Big color="#FF5C7A">▼</Big></Anim>
    </>
  ),
  dice: (p, S) => (
    <>
      <Anim p={p} at={[0, 0.5]} from={{ x: -S, y: -S * 0.6, r: -720 }} to={{ x: -S * 0.17, r: -12 }}><Pips n={6} size={S * 0.3} /></Anim>
      <Anim p={p} at={[0.08, 0.58]} from={{ x: S, y: -S * 0.6, r: 720 }} to={{ x: S * 0.17, r: 10 }}><Pips n={6} size={S * 0.3} /></Anim>
      <Anim p={p} at={[0.55, 0.66]} from={{ s: 0, o: 0 }} to={{ s: 1, o: 1, y: S * 0.3 }} ease="back"><Big color="#FFD06B">12</Big></Anim>
    </>
  ),
  crash: (p, S) => (
    <>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Anim key={i} p={p} at={[i * 0.06, 0.6 + i * 0.04]} from={{ x: -S * 0.6, y: S * 0.6, s: 0.3, o: 0.8 }} to={{ x: -S * 0.6 + (S * 1.1 * (5 - i)) / 6, y: S * 0.6 - (S * 1.1 * (5 - i)) / 6, s: 1.4, o: 0 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' }} />
        </Anim>
      ))}
      <Anim p={p} at={[0, 0.7]} from={{ x: -S * 0.6, y: S * 0.6, s: 0.6 }} to={{ x: S * 0.55, y: -S * 0.55, s: 1.3 }} ease="in"><Emoji e="🚀" size={S * 0.3} /></Anim>
      <Anim p={p} at={[0.15, 0.5]} from={{ s: 0.4, o: 0 }} to={{ s: 1, o: 1 }} ease="back"><Big>×10</Big></Anim>
    </>
  ),
  limbo: (p, S) => (
    <>
      <Svg width={S} height={S * 0.6} style={{ position: 'absolute' }}>
        <Path d={`M${S * 0.1} ${S * 0.55} A${S * 0.4} ${S * 0.4} 0 0 1 ${S * 0.9} ${S * 0.55}`} stroke="rgba(255,255,255,0.9)" strokeWidth={14} fill="none" strokeLinecap="round" />
      </Svg>
      <Anim p={p} at={[0.05, 0.6]} from={{ r: -90 }} to={{ r: 70 }} ease="back" style={{ width: S * 0.8, height: S * 0.8 }}>
        <View style={{ position: 'absolute', left: S * 0.4 - 4, top: S * 0.06, width: 8, height: S * 0.34, borderRadius: 4, backgroundColor: '#FFD06B' }} />
      </Anim>
      <Anim p={p} at={[0.4, 0.6]} from={{ o: 0, s: 0.5 }} to={{ o: 1, s: 1, y: S * 0.3 }} ease="back"><Big>×100</Big></Anim>
    </>
  ),
  mines: (p, S) => (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const x = ((i % 3) - 1) * S * 0.26, y = (Math.floor(i / 3) - 1) * S * 0.26;
        return (
          <Anim key={i} p={p} at={[0.05 + i * 0.05, 0.25 + i * 0.05]} from={{ x, y, ry: 0, s: 0.4, o: 0 }} to={{ x, y, ry: 360, s: 1, o: 1 }}>
            <View style={{ width: S * 0.22, height: S * 0.22, borderRadius: 14, backgroundColor: 'rgba(91,227,176,0.3)', borderWidth: 2, borderColor: '#5BE3B0', alignItems: 'center', justifyContent: 'center' }}>
              <Emoji e={i === 4 ? '💣' : '💎'} size={S * 0.12} />
            </View>
          </Anim>
        );
      })}
    </>
  ),
  plinko: (p, S) => (
    <>
      <Svg width={S} height={S} style={{ position: 'absolute' }}>
        {Array.from({ length: 6 }, (_, r) => Array.from({ length: r + 3 }, (_, k) => (
          <Circle key={`${r}-${k}`} cx={S / 2 + (k - (r + 2) / 2) * S * 0.12} cy={S * 0.18 + r * S * 0.12} r={4} fill="#FFFFFF" opacity={0.9} />
        )))}
      </Svg>
      {[0, 1, 2].map((b) => (
        <Anim key={b} p={p} at={[b * 0.12, 0.55 + b * 0.12]} from={{ x: 0, y: -S * 0.45 }} to={{ x: (b - 1) * S * 0.24, y: S * 0.42 }} ease="linear">
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF4FA3', borderWidth: 2, borderColor: '#fff' }} />
        </Anim>
      ))}
    </>
  ),
  coinflip: (p, S) => (
    <Anim p={p} at={[0, 0.65]} from={{ ry: 0, s: 0.4, y: S * 0.3 }} to={{ ry: 1440, s: 1.05, y: 0 }}>
      <View style={{ width: S * 0.6, height: S * 0.6, borderRadius: S, backgroundColor: '#F2C14E', borderWidth: 8, borderColor: '#A86A08', alignItems: 'center', justifyContent: 'center' }}>
        <Big color="#8A5300" size={S * 0.28}>C</Big>
      </View>
    </Anim>
  ),
  crossing: (p, S) => (
    <>
      {[0, 1, 2].map((l) => (
        <Anim key={l} p={p} at={[0, 0.7]} from={{ x: (l - 1) * S * 0.3, y: -S * 0.7 }} to={{ x: (l - 1) * S * 0.3, y: S * 0.7 }} ease="linear"><Emoji e={['🚗', '🚕', '🚙'][l]} size={S * 0.16} /></Anim>
      ))}
      <Anim p={p} at={[0.1, 0.62]} from={{ x: -S * 0.5 }} to={{ x: S * 0.42 }} ease="linear"><Emoji e="🐔" size={S * 0.22} /></Anim>
    </>
  ),
  trader: (p, S) => (
    <>
      {[0.3, 0.45, 0.35, 0.6, 0.55, 0.8].map((h, i) => (
        <Anim key={i} p={p} at={[0.05 + i * 0.07, 0.2 + i * 0.07]} from={{ x: (i - 2.5) * S * 0.14, y: S * 0.3, s: 0.2, o: 0 }} to={{ x: (i - 2.5) * S * 0.14, y: S * 0.3 - (h * S * 0.6) / 2, s: 1, o: 1 }}>
          <View style={{ width: S * 0.09, height: h * S * 0.6, borderRadius: 6, backgroundColor: i === 2 || i === 4 ? '#FF5C7A' : '#5BE3B0' }} />
        </Anim>
      ))}
      <Anim p={p} at={[0.5, 0.65]} from={{ s: 0, o: 0 }} to={{ s: 1, o: 1, y: -S * 0.36 }} ease="back"><Big color="#5BE3B0">▲ +12%</Big></Anim>
    </>
  ),
  wheel: (p, S) => (
    <Anim p={p} at={[0, 0.75]} from={{ r: 0, s: 0.5 }} to={{ r: 1080, s: 1.1 }}><GameLogo game="wheel" size={S} /></Anim>
  ),
  towers: (p, S) => (
    <>
      {[0, 1, 2, 3, 4].map((f) => (
        <Anim key={f} p={p} at={[f * 0.08, 0.2 + f * 0.08]} from={{ y: -S, o: 0 }} to={{ y: S * 0.38 - f * S * 0.15, o: 1 }} ease="back">
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[0, 1, 2].map((k) => <View key={k} style={{ width: S * 0.18, height: S * 0.12, borderRadius: 8, backgroundColor: k === f % 3 ? '#FFD06B' : 'rgba(255,255,255,0.85)' }} />)}
          </View>
        </Anim>
      ))}
      <Anim p={p} at={[0.45, 0.6]} from={{ s: 0, o: 0, y: -S * 0.5 }} to={{ s: 1, o: 1, y: -S * 0.42 }} ease="back"><Emoji e="🐉" size={S * 0.26} /></Anim>
    </>
  ),
  diamonds: (p, S) => (
    <>
      {['💎', '💎', '💎', '💎', '💎'].map((g, i) => (
        <Anim key={i} p={p} at={[i * 0.08, 0.25 + i * 0.08]} from={{ x: (i - 2) * S * 0.2, y: -S, r: 180 }} to={{ x: (i - 2) * S * 0.2, y: 0, r: 0 }} ease="back"><Emoji e={g} size={S * 0.16} /></Anim>
      ))}
      <Anim p={p} at={[0.5, 0.62]} from={{ s: 0, o: 0 }} to={{ s: 1, o: 1, y: S * 0.28 }} ease="back"><Big color="#5BE3B0">×67</Big></Anim>
    </>
  ),
  pump: (p, S) => (
    <>
      <Anim p={p} at={[0, 0.62]} from={{ s: 0.2 }} to={{ s: 1.2 }} ease="back"><Emoji e="🎈" size={S * 0.5} /></Anim>
      <Anim p={p} at={[0.35, 0.55]} from={{ s: 0, o: 0 }} to={{ s: 1, o: 1, y: S * 0.38 }} ease="back"><Big>×8,14</Big></Anim>
    </>
  ),
};

/**
 * Entrance of every game. Games with their own scene play it (the roulette spins, 777 slams onto the
 * reels, cards are dealt, the rocket takes off…) over the game's gradient; the rest spin their logo.
 * Then the whole thing zooms towards you and dissolves into the table. Never blocks touches.
 */
export function GameIntro({ game, name }: { game: GameId; name: string }) {
  const { reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const [done, setDone] = useState(reduceMotion);
  const p = useSharedValue(0);
  const scene = SCENES[game];
  const total = scene ? 1700 : 1150;
  useEffect(() => {
    if (reduceMotion) return;
    p.set(withTiming(1, { duration: total, easing: Easing.linear }, (f) => {
      if (f) runOnJS(setDone)(true);
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const fadeAt = scene ? 0.74 : 0.62;
  const wrap = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, fadeAt, 1], [1, 1, 0]),
    transform: [{ scale: interpolate(p.value, [0, fadeAt, 1], [1, 1, 1.7]) }],
  }));
  const logo = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(p.value, [0, 0.38], [-200, 0], 'clamp')}deg` }, { scale: interpolate(p.value, [0, 0.3, 0.42], [0.15, 1.12, 1], 'clamp') }],
  }));
  const label = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0.25, 0.45], [0, 1], 'clamp'), transform: [{ translateY: interpolate(p.value, [0.25, 0.45], [16, 0], 'clamp') }] }));
  const ray = useAnimatedStyle(() => ({ transform: [{ rotate: `${p.value * 80}deg` }], opacity: interpolate(p.value, [0, 0.2], [0, 1], 'clamp') }));
  if (done) return null;
  const R = width * 1.4;
  const S = Math.min(260, width * 0.66);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 60, alignItems: 'center', justifyContent: 'center' }, wrap]}>
      <LinearGradient colors={gameVivid[game]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[{ position: 'absolute', width: R, height: R }, ray]}>
        <Svg width={R} height={R} viewBox="-50 -50 100 100">
          {Array.from({ length: 14 }, (_, i) => (
            <Path key={i} d="M0 0 L-4 -50 L4 -50 Z" fill="#FFFFFF" opacity={0.1} transform={`rotate(${(i * 360) / 14})`} />
          ))}
        </Svg>
      </Animated.View>
      {scene ? (
        <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>{scene(p, S)}</View>
      ) : (
        <Animated.View style={logo}>
          <GameLogo game={game} size={Math.min(190, width * 0.48)} />
        </Animated.View>
      )}
      <Animated.View style={[label, scene ? { marginTop: 36 } : null]}>
        <T style={styles.gameName}>{name}</T>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  gameName: { color: '#fff', fontFamily: 'Unbounded_800ExtraBold', fontSize: 30, lineHeight: 38, letterSpacing: -1, marginTop: 18, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 12 },
});
