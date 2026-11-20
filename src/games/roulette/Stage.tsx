import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn, useAnimatedStyle, useFrameCallback, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinear, Path, RadialGradient, Stop } from 'react-native-svg';
import { T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { WHEEL_ORDER, pocketColor, type FireNumber } from '@/engine/games/roulette.ts';
import { RouletteWheelArt } from './WheelArt';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

/** One spin: when the ball is launched (device clock, ms), where it lands and which numbers are on fire. */
export interface SpinInfo { at: number; number: number; fire: FireNumber[]; key: string }

const SEG = 360 / 37;
/** Timeline of a spin (ms after the ball is launched). */
export const SPIN = { fireFrom: 350, fireEvery: 420, drop: 4300, land: 6400, reveal: 7000, back: 8400, total: 9000 };
const OMEGA = 360 / 10000; // the wheel turns once every 10 s, all the time
const TILT_UP = 0.56; // camera high (betting)
const TILT_LOW = 0.42; // camera low (spinning)
export const numColor = (n: number) => (pocketColor(n) === 'red' ? '#E8304F' : pocketColor(n) === 'black' ? '#17111F' : '#16C47F');

const clamp01 = (x: number) => {
  'worklet';
  return x < 0 ? 0 : x > 1 ? 1 : x;
};
const smooth = (x: number) => {
  'worklet';
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
/** Camera at time t of the spin (t < 0: no spin running): tilt, zoom and how much it follows the ball. */
const camera = (t: number, still: boolean) => {
  'worklet';
  if (t < 0 || t > SPIN.back + 200) return { k: TILT_UP, z: 1, f: 0 };
  const into = smooth(t / 1200);
  const close = still ? 0 : smooth((t - 3600) / 1200);
  const out = smooth((t - SPIN.reveal) / (SPIN.back - SPIN.reveal));
  const k = TILT_UP + (TILT_LOW - TILT_UP) * into * (1 - out);
  const z = (1 + (still ? 0 : 0.1 * into) + 0.75 * close) * (1 - out) + out;
  return { k, z, f: close * (1 - out) };
};
/** Ball: angle relative to the wheel (deg) and how far it is between the pocket ring (0) and the rim track (1). */
const ballPath = (t: number, idx: number, k0: number) => {
  'worklet';
  const end = idx * SEG;
  if (t >= SPIN.land) return { phi: end, g: 0 };
  const u = clamp01(t / SPIN.land);
  let phi = end + k0 * Math.pow(1 - u, 2.4);
  let g = 1;
  if (t > SPIN.drop) {
    const v = (t - SPIN.drop) / (SPIN.land - SPIN.drop);
    g = Math.pow(1 - v, 1.6) * Math.abs(Math.cos(2.5 * Math.PI * v));
    phi += Math.pow(1 - v, 2) * 9 * Math.sin(5 * Math.PI * v);
  }
  return { phi, g };
};

/** Rising embers and flickering flames along the bottom: the hot studio around the wheel. */
const Ember = React.memo(function Ember({ i, w, h, run }: { i: number; w: number; h: number; run: boolean }) {
  const p = useSharedValue(0);
  const seed = (Math.sin(i * 91.7) + 1) / 2;
  useEffect(() => {
    if (!run) return;
    p.set(withDelay(seed * 3000, withRepeat(withTiming(1, { duration: 3200 + seed * 2600, easing: Easing.linear }), -1, false)));
  }, [run, p, seed]);
  const st = useAnimatedStyle(() => ({
    opacity: Math.sin(p.value * Math.PI) * 0.9,
    transform: [{ translateX: w * ((i * 0.137 + seed * 0.5) % 1) + Math.sin(p.value * 9 + i) * 14 }, { translateY: h - p.value * h * (0.55 + seed * 0.4) }, { scale: 0.6 + seed * 0.8 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ember, { backgroundColor: i % 3 ? '#FFB938' : '#FF5A2A' }, st]} />;
});

function Flames({ w, run }: { w: number; run: boolean }) {
  const a = useSharedValue(0);
  useEffect(() => {
    if (run) a.set(withRepeat(withSequence(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 680, easing: Easing.inOut(Easing.sin) })), -1, false));
  }, [run, a]);
  const back = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.86 + a.value * 0.22 }] }));
  const front = useAnimatedStyle(() => ({ transform: [{ scaleY: 1.08 - a.value * 0.2 }, { translateX: (a.value - 0.5) * 8 }] }));
  const tongues = (n: number, hgt: number, seed: number) => {
    let d = `M0 ${hgt}`;
    for (let k = 0; k < n; k++) {
      const x0 = (k / n) * w, x1 = ((k + 1) / n) * w, top = hgt * (0.15 + ((Math.sin(k * 7.3 + seed) + 1) / 2) * 0.55);
      d += ` C${x0 + (x1 - x0) * 0.1} ${hgt * 0.7} ${x0 + (x1 - x0) * 0.3} ${top + 12} ${x0 + (x1 - x0) * 0.5} ${top} C${x0 + (x1 - x0) * 0.62} ${top + 16} ${x0 + (x1 - x0) * 0.9} ${hgt * 0.65} ${x1} ${hgt}`;
    }
    return `${d} Z`;
  };
  const H = 90;
  return (
    <View pointerEvents="none" style={[styles.flames, { width: w, height: H }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: 'bottom' }, back]}>
        <Svg width={w} height={H}>
          <Defs>
            <SvgLinear id="rfb" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FF3B1F" stopOpacity="0" /><Stop offset="0.45" stopColor="#FF4A1A" stopOpacity="0.55" /><Stop offset="1" stopColor="#B8100A" stopOpacity="0.9" /></SvgLinear>
          </Defs>
          <Path d={tongues(Math.max(6, Math.round(w / 60)), H, 1)} fill="url(#rfb)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: 'bottom' }, front]}>
        <Svg width={w} height={H}>
          <Defs>
            <SvgLinear id="rff" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFE58A" stopOpacity="0" /><Stop offset="0.5" stopColor="#FFB938" stopOpacity="0.55" /><Stop offset="1" stopColor="#FF6A1F" stopOpacity="0.85" /></SvgLinear>
          </Defs>
          <Path d={tongues(Math.max(8, Math.round(w / 44)), H, 4)} fill="url(#rff)" transform={`translate(0 ${H * 0.25}) scale(1 0.75)`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** A small flame marker for fire pockets on the wheel. */
const flame = (x: number, y: number, r: number) => `M${x} ${y - r * 1.5} C${x + r * 0.9} ${y - r * 0.6} ${x + r} ${y + r * 0.2} ${x} ${y + r} C${x - r} ${y + r * 0.2} ${x - r * 0.9} ${y - r * 0.6} ${x} ${y - r * 1.5} Z`;

/** The wheel art with the fire pockets marked (memoised on the fire numbers, so placing chips never redraws it). */
const FireWheel = React.memo(function FireWheel({ size, fireKey }: { size: number; fireKey: string }) {
  const set = new Set(fireKey ? fireKey.split(',').map((x) => Number(x.split(':')[0])) : []);
  const overlay = set.size ? (n: number, x: number, y: number) => (set.has(n) ? <G><Circle cx={x} cy={y} r={size * 0.036} fill="#FF6A1F" opacity={0.85} /><Path d={flame(x, y, size * 0.02)} fill="#FFE58A" /></G> : null) : undefined;
  return <RouletteWheelArt size={size} id="rl3" overlay={overlay} />;
});

/** The ball: a glossy ivory sphere with its contact shadow. */
const Ball = React.memo(function Ball({ d }: { d: number }) {
  return (
    <Svg width={d * 1.6} height={d * 1.6} viewBox="0 0 32 32">
      <Defs>
        <RadialGradient id="rbal" cx="0.36" cy="0.32" r="0.72"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.55" stopColor="#ECE8F2" /><Stop offset="1" stopColor="#8E8AA0" /></RadialGradient>
      </Defs>
      <Ellipse cx={18} cy={25} rx={9} ry={3.4} fill="#000000" opacity={0.45} />
      <Circle cx={16} cy={16} r={10} fill="url(#rbal)" />
      <Circle cx={12.4} cy={12} r={3} fill="#FFFFFF" opacity={0.95} />
    </Svg>
  );
});

/** The upright spindle in the middle: what makes the flat wheel read as a solid object. */
const Turret = React.memo(function Turret({ s }: { s: number }) {
  return (
    <Svg width={s} height={s * 1.2} viewBox="0 0 50 60">
      <Defs>
        <SvgLinear id="rtg" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#8A5600" /><Stop offset="0.35" stopColor="#FFF3B0" /><Stop offset="0.6" stopColor="#F2C14A" /><Stop offset="1" stopColor="#7A4A00" /></SvgLinear>
        <RadialGradient id="rtd" cx="0.35" cy="0.3" r="0.75"><Stop offset="0" stopColor="#FFFBE0" /><Stop offset="0.5" stopColor="#F2C14A" /><Stop offset="1" stopColor="#7A4A00" /></RadialGradient>
      </Defs>
      <Ellipse cx={25} cy={52} rx={16} ry={5} fill="#000000" opacity={0.35} />
      <Path d="M17 50 C17 40 21 30 23 16 L27 16 C29 30 33 40 33 50 Z" fill="url(#rtg)" stroke="#5A3400" strokeWidth={0.8} />
      <Ellipse cx={25} cy={50} rx={9} ry={3} fill="url(#rtg)" stroke="#5A3400" strokeWidth={0.8} />
      <Circle cx={25} cy={12} r={6.5} fill="url(#rtd)" stroke="#5A3400" strokeWidth={0.8} />
      <Circle cx={22.6} cy={9.6} r={2} fill="#FFFFFF" opacity={0.9} />
    </Svg>
  );
});

/**
 * The live wheel on its table, seen in perspective. It turns all the time; when a spin comes in the ball is
 * launched against it, slows down, drops onto the cone, bounces between frets and settles, while the camera
 * goes low, closes in on the ball and pulls back for the result. Everything is a function of one clock, so a
 * player who joins late sees the spin from the moment it is at.
 */
export function RouletteStage({ w, h, spin, prev, active, compact, now: nowFn }: { w: number; h: number; spin: SpinInfo | null; prev: number | null; active: boolean; compact?: boolean; /** The clock `spin.at` is measured on (live tables use server time). */ now?: () => number }) {
  const { t } = useT();
  const { reduceMotion, reduceEffects } = useTheme();
  const S = Math.max(160, Math.min(w * (compact ? 0.98 : 0.86), h * (compact ? 1.32 : 1.18), 920));
  const R = S / 2;
  const clock = useSharedValue(0);
  const start = useSharedValue(-1e9); // clock time when the ball was launched
  const idx = useSharedValue(-1);
  const restIdx = useSharedValue(prev === null ? -1 : (WHEEL_ORDER as readonly number[]).indexOf(prev));
  const launch = useSharedValue(1440); // relative travel of the ball (makes it start from the right-hand side)
  const still = useSharedValue(reduceMotion ? 1 : 0);
  useFrameCallback((f) => {
    clock.value += f.timeSincePreviousFrame ?? 16;
  }, active);

  // what has been revealed so far, tagged with the spin it belongs to (a new spin starts from nothing)
  const [fireState, setFireState] = useState({ key: '', n: 0 });
  const [shownState, setShownState] = useState<SpinInfo | null>(null);
  const fireOn = spin && fireState.key === spin.key ? fireState.n : 0;
  const shown = shownState && spin && shownState.key === spin.key ? shownState : null;
  // a new spin: place it on the clock, schedule the fire numbers, the bounces and the reveal
  useEffect(() => {
    if (!spin) return;
    const now = nowFn ?? Date.now;
    const i = (WHEEL_ORDER as readonly number[]).indexOf(spin.number);
    const t0 = clock.get() + (spin.at - now());
    const wheelAt = t0 * OMEGA;
    const want = 90 - (wheelAt + i * SEG); // launch from the right-hand side of the wheel
    launch.set(360 * 4 + ((want % 360) + 360) % 360);
    idx.set(i);
    start.set(t0);
    const since = now() - spin.at;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => {
      if (ms - since > -150) timers.push(setTimeout(fn, Math.max(0, ms - since)));
      else fn();
    };
    if (since < 200) at(0, () => sfx('roll', 0.55));
    spin.fire.forEach((_, k) =>
      at(SPIN.fireFrom + k * SPIN.fireEvery, () => {
        setFireState({ key: spin.key, n: k + 1 });
        if (now() - spin.at < SPIN.drop) {
          sfx('reveal', 0.6);
          haptic.light();
        }
      }),
    );
    const v = SPIN.land - SPIN.drop;
    [0.2, 0.6].forEach((x) => at(SPIN.drop + v * x, () => (now() - spin.at < SPIN.land + 300 ? (sfx('tick', 0.8), haptic.light()) : undefined)));
    at(SPIN.land, () => (now() - spin.at < SPIN.land + 500 ? (sfx('balldrop'), haptic.medium()) : undefined));
    at(SPIN.reveal, () => setShownState(spin));
    at(SPIN.reveal + 5200, () => setShownState(null));
    return () => timers.forEach(clearTimeout);
  }, [spin?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    // after the spin, the ball keeps riding in its pocket until the next launch
    if (prev !== null && !spin) restIdx.set((WHEEL_ORDER as readonly number[]).indexOf(prev));
  }, [prev, spin, restIdx]);

  const trackR = R * 0.84, pocketR = R * 0.585, ballD = Math.max(11, S * 0.034);
  const cam = useAnimatedStyle(() => {
    const tt = clock.value - start.value;
    const c = camera(tt, still.value === 1);
    let bx = 0, by = 0;
    if (c.f > 0) {
      const p = ballPath(tt, idx.value, launch.value);
      const B = ((clock.value * OMEGA + p.phi) * Math.PI) / 180;
      const r = pocketR + (trackR - pocketR) * p.g;
      bx = r * Math.sin(B);
      by = -r * Math.cos(B) * c.k;
    }
    return { transform: [{ translateX: -bx * c.z * c.f }, { translateY: -by * c.z * c.f + (1 - c.f) * (c.z - 1) * S * 0.06 }, { scale: c.z }, { rotate: `${-4 * c.f}deg` }] };
  });
  const tiltSt = useAnimatedStyle(() => ({ transform: [{ scaleY: camera(clock.value - start.value, still.value === 1).k }] }));
  const spinSt = useAnimatedStyle(() => ({ transform: [{ rotate: `${(clock.value * OMEGA) % 360}deg` }] }));
  const wallSt = useAnimatedStyle(() => {
    const k = camera(clock.value - start.value, still.value === 1).k;
    return { transform: [{ translateY: S * 0.085 * Math.sqrt(1 - k * k) }, { scaleY: k }] };
  });
  const tableSt = useAnimatedStyle(() => {
    const k = camera(clock.value - start.value, still.value === 1).k;
    return { transform: [{ translateY: S * 0.11 * Math.sqrt(1 - k * k) }, { scaleY: k }] };
  });
  const turretSt = useAnimatedStyle(() => {
    const k = camera(clock.value - start.value, still.value === 1).k;
    return { transform: [{ translateY: -S * 0.035 * Math.sqrt(1 - k * k) }] };
  });
  const ballSt = useAnimatedStyle(() => {
    const tt = clock.value - start.value;
    const c = camera(tt, still.value === 1);
    let phi: number, g: number;
    if (tt >= 0) ({ phi, g } = ballPath(tt, idx.value, launch.value));
    else if (restIdx.value >= 0) ({ phi, g } = { phi: restIdx.value * SEG, g: 0 });
    else return { opacity: 0 };
    const B = ((clock.value * OMEGA + phi) * Math.PI) / 180;
    const r = pocketR + (trackR - pocketR) * g;
    const depth = -Math.cos(B); // 1 = front (closest to us)
    return {
      opacity: 1,
      transform: [{ translateX: R + r * Math.sin(B) - ballD * 0.8 }, { translateY: R - r * Math.cos(B) * c.k - ballD * 0.8 - (1 - c.k) * S * 0.012 * g }, { scale: 1 + 0.14 * depth * (1 - c.k) }],
    };
  });

  const fireShown = spin ? spin.fire.slice(0, fireOn) : [];
  const fireKey = fireShown.map((f) => `${f.n}:${f.m}`).join(',');

  const run = active && !reduceMotion;
  const fx = run && !reduceEffects; // flames and embers are the first thing the battery saver turns off
  const hit = shown ? shown.fire.find((f) => f.n === shown.number) : undefined;
  const cy = h * (compact ? 0.47 : 0.5);
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {/* studio: deep red glow, spotlights, flames and embers */}
      <LinearGradient colors={['#1A0508', '#3A0A0E', '#12040A']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[styles.glow, { width: S * 1.5, height: S * 1.5, borderRadius: S * 0.75, left: w / 2 - S * 0.75, top: cy - S * 0.75 }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(255,214,140,0.22)', 'rgba(255,214,140,0)']} style={[styles.beam, { left: w * 0.18, height: h, transform: [{ rotate: '-14deg' }] }]} />
      <LinearGradient pointerEvents="none" colors={['rgba(255,214,140,0.18)', 'rgba(255,214,140,0)']} style={[styles.beam, { left: w * 0.7, height: h, transform: [{ rotate: '14deg' }] }]} />
      <Flames w={w} run={fx} />
      {fx ? Array.from({ length: compact ? 10 : 16 }, (_, i) => <Ember key={i} i={i} w={w} h={h} run={fx} />) : null}
      {/* the wheel, the table and the ball, under one camera */}
      <Animated.View pointerEvents="none" style={[styles.abs, { left: w / 2 - R, top: cy - R, width: S, height: S }, cam]}>
        <Animated.View style={[StyleSheet.absoluteFill, tableSt]}>
          <Svg width={S} height={S} style={{ transform: [{ scale: 1.22 }] }}>
            <Defs>
              <RadialGradient id="rtbl" cx="0.5" cy="0.5" r="0.5"><Stop offset="0.7" stopColor="#3A0A12" /><Stop offset="0.93" stopColor="#1A0508" /><Stop offset="1" stopColor="#000000" stopOpacity="0" /></RadialGradient>
            </Defs>
            <Circle cx={R} cy={R} r={R} fill="url(#rtbl)" />
            <Circle cx={R} cy={R} r={R * 0.88} fill="none" stroke="#C98B12" strokeWidth={R * 0.012} strokeDasharray={`${R * 0.05} ${R * 0.03}`} opacity={0.7} />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, wallSt]}>
          <Svg width={S} height={S}>
            <Defs>
              <SvgLinear id="rwal" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#2A1206" /><Stop offset="0.3" stopColor="#7A4420" /><Stop offset="0.5" stopColor="#A86A34" /><Stop offset="0.7" stopColor="#7A4420" /><Stop offset="1" stopColor="#2A1206" /></SvgLinear>
            </Defs>
            <Circle cx={R} cy={R} r={R} fill="url(#rwal)" />
            <Circle cx={R} cy={R} r={R * 0.985} fill="none" stroke="#E0A21C" strokeWidth={R * 0.02} />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, tiltSt]}>
          <Animated.View style={[StyleSheet.absoluteFill, spinSt]}>
            <FireWheel size={S} fireKey={fireKey} />
          </Animated.View>
          {/* fixed studio light on the spinning wheel */}
          <Svg width={S} height={S} style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="rspec" cx="0.38" cy="0.3" r="0.55"><Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.32" /><Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></RadialGradient>
              <RadialGradient id="rvig" cx="0.5" cy="0.5" r="0.5"><Stop offset="0.75" stopColor="#000000" stopOpacity="0" /><Stop offset="1" stopColor="#000000" stopOpacity="0.45" /></RadialGradient>
            </Defs>
            <Circle cx={R} cy={R} r={R} fill="url(#rvig)" />
            <Circle cx={R} cy={R} r={R} fill="url(#rspec)" />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.abs, { left: R - S * 0.06, top: R - S * 0.11, width: S * 0.12, height: S * 0.144 }, turretSt]}>
          <Turret s={S * 0.12} />
        </Animated.View>
        <Animated.View style={[styles.abs, { width: ballD * 1.6, height: ballD * 1.6 }, ballSt]}>
          <Ball d={ballD} />
        </Animated.View>
      </Animated.View>
      {/* fire numbers lighting up, one after another */}
      {fireShown.length ? (
        <View pointerEvents="none" style={[styles.fireRow, { top: compact ? 44 : 64, opacity: shown && compact ? 0 : 1 }]}>
          {fireShown.map((f) => (
            <Animated.View key={`${spin?.key}-${f.n}`} entering={reduceMotion ? undefined : ZoomIn.springify().damping(9)} style={styles.fireCard}>
              <LinearGradient colors={['#FFE58A', '#FF8A1C', '#B8100A']} style={StyleSheet.absoluteFill} />
              <View style={[styles.fireNum, { backgroundColor: numColor(f.n) }]}>
                <T weight="display" tabular style={{ color: '#fff', fontSize: compact ? 15 : 20 }}>{f.n}</T>
              </View>
              <T weight="display" style={{ color: '#3A0A00', fontSize: compact ? 13 : 17 }}>×{f.m}</T>
            </Animated.View>
          ))}
        </View>
      ) : null}
      {/* the result */}
      {shown ? (
        <Animated.View key={shown.key} entering={reduceMotion ? FadeIn : ZoomIn.springify().damping(10)} exiting={FadeOut} pointerEvents="none" style={[styles.result, { top: cy - (compact ? 150 : 190) }]}>
          <View style={[styles.medal, { width: compact ? 96 : 132, height: compact ? 96 : 132, borderRadius: compact ? 48 : 66, backgroundColor: numColor(shown.number) }, hit && styles.medalFire]}>
            <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={[StyleSheet.absoluteFill, { borderRadius: 66 }]} />
            <T weight="display" tabular style={{ color: '#fff', fontSize: compact ? 44 : 62, lineHeight: compact ? 50 : 70 }}>{shown.number}</T>
          </View>
          <View style={[styles.tag, hit ? { backgroundColor: '#FF6A1F' } : null]}>
            <T weight="display" style={{ color: '#fff', fontSize: compact ? 12 : 15, letterSpacing: 1 }}>
              {hit ? `🔥 ${t('play.rl.onFire')} ×${hit.m}` : t(`play.rl.${pocketColor(shown.number) === 'green' ? 'zero' : pocketColor(shown.number)}`)}
            </T>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Countdown of the betting window: a bar that empties and turns red at the end. */
export function Countdown({ closesAt, opensAt, label, closed, compact, clock, tiny }: { closesAt: number; opensAt: number; label: string; closed: string | null; compact?: boolean; clock?: () => number; /** Just the seconds (inside the betting panel on phones). */ tiny?: boolean }) {
  const [now, setNow] = useState(() => (clock ? clock() : Date.now()));
  useEffect(() => {
    const id = setInterval(() => setNow(clock ? clock() : Date.now()), 200);
    return () => clearInterval(id);
  }, [clock]);
  const left = Math.max(0, closesAt - now);
  const share = Math.max(0, Math.min(1, left / Math.max(1, closesAt - opensAt)));
  const urgent = !closed && left < 5000;
  useEffect(() => {
    if (urgent && left > 0) sfx('tick', 0.35);
  }, [Math.ceil(left / 1000)]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[styles.clock, compact && { height: 30 }, tiny && { minWidth: 58, paddingHorizontal: 10 }]} accessibilityLiveRegion="polite">
      <View style={[StyleSheet.absoluteFill, { width: `${(closed ? 0 : share) * 100}%`, backgroundColor: urgent ? '#FF3B5C' : '#12C08A', opacity: 0.9 }]} />
      <LinearGradient colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFill} />
      <T weight="display" tabular style={{ color: '#fff', fontSize: compact ? 12.5 : 15, letterSpacing: 0.6 }}>{closed ?? (label ? `${label} · ${Math.ceil(left / 1000)} s` : `${Math.ceil(left / 1000)} s`)}</T>
    </View>
  );
}

/** Last numbers, newest first; fire hits carry a flame. */
export function LastNumbers({ items, compact }: { items: { n: number; fire?: number | null; key: string }[]; compact?: boolean }) {
  return (
    <View style={styles.lastRow}>
      {items.slice(0, compact ? 9 : 14).map((x, i) => (
        <Animated.View key={x.key} entering={i === 0 ? ZoomIn.springify() : undefined} style={[styles.lastChip, { backgroundColor: numColor(x.n), width: compact ? 26 : 32, height: compact ? 26 : 32, opacity: 1 - i * 0.05 }, i === 0 && styles.lastFirst, x.fire ? styles.lastFire : null]}>
          <T weight="display" tabular style={{ color: '#fff', fontSize: compact ? 11.5 : 14 }}>{x.n}</T>
          {x.fire ? <T style={styles.lastFlame}>🔥</T> : null}
        </Animated.View>
      ))}
    </View>
  );
}

export type { SharedValue };

const styles = StyleSheet.create({
  abs: { position: 'absolute', left: 0, top: 0 },
  glow: { position: 'absolute', backgroundColor: 'rgba(255,90,30,0.16)', shadowColor: '#FF5A1F', shadowOpacity: 0.6, shadowRadius: 80 },
  beam: { position: 'absolute', top: -40, width: 90 },
  flames: { position: 'absolute', left: 0, bottom: 0 },
  ember: { position: 'absolute', left: 0, top: 0, width: 4, height: 4, borderRadius: 2 },
  fireRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap', paddingHorizontal: 8 },
  fireCard: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 10, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#FFE58A', shadowColor: '#FF6A1F', shadowOpacity: 0.9, shadowRadius: 12 },
  fireNum: { minWidth: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 4 },
  result: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  medal: { alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: '#FFE58A', shadowColor: '#FFB938', shadowOpacity: 0.9, shadowRadius: 24, overflow: 'hidden' },
  medalFire: { borderColor: '#FF8A1C', shadowColor: '#FF3B1F' },
  tag: { marginTop: -12, paddingHorizontal: 14, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: 'rgba(20,10,20,0.92)', borderWidth: 2, borderColor: '#FFE58A' },
  clock: { alignSelf: 'center', minWidth: 230, height: 34, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: 'rgba(20,10,20,0.85)', borderWidth: 1.5, borderColor: 'rgba(255,229,138,0.5)' },
  lastRow: { flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center' },
  lastChip: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  lastFirst: { borderWidth: 2, borderColor: '#FFE58A', transform: [{ scale: 1.12 }] },
  lastFire: { borderColor: '#FF8A1C', borderWidth: 2 },
  lastFlame: { position: 'absolute', top: -9, right: -6, fontSize: 11 },
});
