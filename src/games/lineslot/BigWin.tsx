import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { AnimatedNumber, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

/** Win tiers (× total bet) for the celebration. Below BIG there is no overlay. */
export const WIN_TIERS = [
  { min: 50, key: 'epic', colors: ['#FF4FA3', '#7B1FA2'] as [string, string] },
  { min: 25, key: 'mega', colors: ['#A996FF', '#3D2BC9'] as [string, string] },
  { min: 10, key: 'big', colors: ['#FFD06B', '#E07A10'] as [string, string] },
];
export const winTier = (mult: number) => WIN_TIERS.find((w) => mult >= w.min) ?? null;

const COINS = 26;
type Particle = 'bubble' | 'leaf' | 'spark' | 'ember' | 'coin' | 'star' | 'candy';
/** The slot's own confetti next to the coins: bubbles, leaves, gold sparks or embers. */
function Glyph({ kind, size }: { kind: Particle; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {kind === 'bubble' ? (
        <>
          <Circle cx={10} cy={10} r={8.5} fill="rgba(127,230,255,0.25)" stroke="#E8FBFF" strokeWidth={1.4} />
          <Circle cx={7} cy={7} r={2} fill="#FFFFFF" opacity={0.8} />
        </>
      ) : kind === 'leaf' ? (
        <Path d="M2 10 C6 2 14 2 18 10 C14 18 6 18 2 10 Z M3 10 L17 10" fill="#3BE39A" stroke="#0B4E32" strokeWidth={1.2} />
      ) : kind === 'star' ? (
        <Path d="M10 1 L12.5 7 L19 7.5 L14 11.8 L15.6 18.5 L10 15 L4.4 18.5 L6 11.8 L1 7.5 L7.5 7 Z" fill="#FF7AC0" stroke="#FFFFFF" strokeWidth={1} />
      ) : kind === 'candy' ? (
        <>
          <Path d="M1 6 L5 10 L1 14 Z M19 6 L15 10 L19 14 Z" fill="#FF4FA3" />
          <Circle cx={10} cy={10} r={5.5} fill="#FFE070" stroke="#FF4FA3" strokeWidth={1.6} />
          <Path d="M7 8 Q10 12 13 8" stroke="#FF4FA3" strokeWidth={1.2} fill="none" />
        </>
      ) : kind === 'spark' ? (
        <Path d="M10 1 L12 8 L19 10 L12 12 L10 19 L8 12 L1 10 L8 8 Z" fill="#FFF3C4" stroke="#FFB938" strokeWidth={0.8} />
      ) : (
        <Path d="M10 2 C13 6 16 8 16 12 C16 16 13 18 10 18 C7 18 4 16 4 12 C4 9 7 7 8 4 C9 7 10 7 10 2 Z" fill="#FF8A1C" stroke="#FFE58A" strokeWidth={1} />
      )}
    </Svg>
  );
}
/** One falling coin; its lane, delay and spin come from its index (no randomness during render). */
function Coin({ i, h, kind }: { i: number; h: number; kind: Particle }) {
  const y = useSharedValue(-60);
  const lane = ((i * 37) % 100) / 100;
  const delay = (i * 113) % 900;
  const dur = 1300 + ((i * 71) % 700);
  const size = 18 + ((i * 13) % 14);
  useEffect(() => {
    y.set(withDelay(delay, withRepeat(withTiming(h + 60, { duration: dur, easing: Easing.in(Easing.quad) }), -1, false)));
  }, [y, delay, dur, h]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotateY: `${(y.value * 3 + i * 40) % 360}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: `${lane * 94}%`, width: size, height: size }, st]}>
      {i % 2 && kind !== 'coin' ? <Glyph kind={kind} size={size} /> : <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx={10} cy={10} r={9.5} fill="#C98B12" />
        <Circle cx={10} cy={10} r={8} fill="#FFD06B" />
        <Circle cx={10} cy={10} r={5.5} fill="none" stroke="#C98B12" strokeWidth={1.2} />
        <SvgText x={10} y={13.2} fontSize={8} fontWeight="900" fill="#9A5A00" textAnchor="middle">C</SvgText>
      </Svg>}
    </Animated.View>
  );
}

/** Slowly turning light rays behind the title. */
function Rays({ colors }: { colors: [string, string] }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.set(withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1, false));
  }, [r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.rays, st]}>
      <Svg width={420} height={420} viewBox="-210 -210 420 420">
        <Defs>
          <RadialGradient id="bwr" cx="0" cy="0" r="210" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors[0]} stopOpacity={0.9} />
            <Stop offset="1" stopColor={colors[1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {Array.from({ length: 14 }, (_, k) => (
          <Path key={k} d="M0 0 L-18 -210 L18 -210 Z" fill="url(#bwr)" transform={`rotate(${(k * 360) / 14})`} />
        ))}
      </Svg>
    </Animated.View>
  );
}

/**
 * Big win celebration over the reels: rays, the tier title, the amount counting up and a coin shower.
 * Tap to close; it also closes itself.
 */
export function BigWin({ mult, amount, onDone, kind = 'coin' }: { mult: number; amount: number; onDone: () => void; kind?: Particle }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const tier = winTier(mult);
  const [shown, setShown] = React.useState(0);
  const [h, setH] = React.useState(500);
  useEffect(() => {
    if (!tier) {
      onDone();
      return;
    }
    sfx('bigwin');
    haptic.win(mult);
    const a = setTimeout(() => setShown(amount), 60);
    const b = setTimeout(onDone, reduceMotion ? 1400 : 3400);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!tier) return null;
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(250)} style={styles.wrap} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone} accessibilityRole="button" accessibilityLabel={t(`play.win_${tier.key}`)} />
      {reduceMotion ? null : <Rays colors={tier.colors} />}
      {reduceMotion ? null : Array.from({ length: COINS }, (_, i) => <Coin key={i} i={i} h={h} kind={kind} />)}
      <Animated.View entering={ZoomIn.springify().damping(9)} pointerEvents="none" style={{ alignItems: 'center' }}>
        <T weight="display" align="center" style={[styles.title, { textShadowColor: tier.colors[0] }]}>{t(`play.win_${tier.key}`)}</T>
        <View style={[styles.amount, { borderColor: tier.colors[0] }]}>
          <AnimatedNumber value={shown} duration={reduceMotion ? 0 : 2200} weight="display" style={{ color: '#FFFFFF', fontSize: 34 }} />
        </View>
        <T weight="display" style={{ color: '#FFE58A', fontSize: 16, marginTop: 6 }}>×{Math.round(mult * 100) / 100}</T>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(6,3,14,0.72)', overflow: 'hidden', zIndex: 20 },
  rays: { position: 'absolute', width: 420, height: 420, alignSelf: 'center', top: '50%', marginTop: -210 },
  title: { color: '#FFFFFF', fontSize: 38, lineHeight: 46, letterSpacing: 1, textShadowRadius: 18, paddingHorizontal: 16 },
  amount: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 6, borderRadius: 22, borderWidth: 3, backgroundColor: 'rgba(0,0,0,0.55)' },
});

/** `celebrate(mult, amount)` shows the overlay when the win is big enough and resolves when it closes. */
export function useBigWin(kind: Particle = 'coin') {
  const [win, setWin] = React.useState<{ mult: number; amount: number } | null>(null);
  const done = React.useRef<() => void>(() => undefined);
  const celebrate = (mult: number, amount: number) =>
    winTier(mult)
      ? new Promise<void>((res) => {
          done.current = res;
          setWin({ mult, amount });
        })
      : Promise.resolve();
  const close = () => {
    setWin(null);
    done.current();
  };
  const node = win ? <BigWin mult={win.mult} amount={win.amount} onDone={close} kind={kind} /> : null;
  return { node, celebrate };
}
