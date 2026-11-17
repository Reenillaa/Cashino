import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeOut, ZoomIn, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useIsFocused } from 'expo-router';
import { Button, PressableScale, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { ANGLER_BAD, ANGLER_FISH, ANGLER_GOOD, anglerBond, anglerMultiplier, type AnglerCatch, type AnglerGood, type AnglerResult } from '@/engine/games/angler.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { useBigWin } from '../lineslot/BigWin';
import { Boat, Seabed, SeaFish } from './SeaArt';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const SURFACE = 0.2; // share of the scene height where the water starts
const BED = 0.9; // where the seabed starts
const rnd = (i: number, salt: number) => ((Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1;
const pct = (p: number) => `${(p * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;

/** A fish of the background, swimming across at its own depth, wiggling its tail. */
function Swimmer({ kind, i, w, h, running }: { kind: AnglerCatch; i: number; w: number; h: number; running: boolean }) {
  const x = useSharedValue(0);
  const wig = useSharedValue(0);
  const right = i % 2 === 0;
  const size = kind === 'sardine' ? 34 : kind === 'goldshark' || kind === 'tuna' ? 74 : kind === 'swordfish' ? 66 : 48;
  const dur = 9000 + rnd(i, 1) * 9000;
  useEffect(() => {
    if (!running) return;
    x.set(withDelay(rnd(i, 2) * 6000, withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false)));
    wig.set(withRepeat(withSequence(withTiming(1, { duration: 260 }), withTiming(-1, { duration: 260 })), -1, true));
  }, [running, x, wig, i, dur]);
  const y = h * (SURFACE + (BED - SURFACE) * ANGLER_FISH[kind].depth) + (rnd(i, 3) - 0.5) * 24;
  const st = useAnimatedStyle(() => {
    const px = right ? -size + x.value * (w + size * 2) : w + size - x.value * (w + size * 2);
    return { transform: [{ translateX: px }, { translateY: y + Math.sin(x.value * 18 + i) * 6 }, { scaleX: right ? -1 : 1 }, { rotate: `${wig.value * 3}deg` }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.abs, { opacity: kind === 'lanternfish' || kind === 'goldshark' ? 0.95 : 0.8 }, st]}><SeaFish kind={kind} size={size} /></Animated.View>;
}

/** Surface waves sliding sideways forever. */
function Waves({ w, y, running }: { w: number; y: number; running: boolean }) {
  const x = useSharedValue(0);
  useEffect(() => {
    if (running) x.set(withRepeat(withTiming(1, { duration: 4200, easing: Easing.linear }), -1, false));
  }, [running, x]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: -x.value * 80 }] }));
  const ww = w + 120;
  let d = 'M0 10';
  for (let k = 0; k * 40 < ww; k++) d += ` Q${k * 40 + 20} ${k % 2 ? 16 : 4} ${k * 40 + 40} 10`;
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { top: y - 10, width: ww }, st]}>
      <Svg width={ww} height={26}>
        <Path d={`${d} L${ww} 26 L0 26 Z`} fill="#3FB8E8" />
        <Path d={d} stroke="#E8FBFF" strokeWidth={2} fill="none" opacity={0.85} />
      </Svg>
    </Animated.View>
  );
}

type Phase = 'idle' | 'cast' | 'sink' | 'bite' | 'reel' | 'done';

export default function AnglerScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const focused = useIsFocused();
  const s = useGameSession('angler');
  const [bet, setBet] = useBet('angler', s.room);
  const [pick, setPick] = useState<AnglerGood>('clownfish');
  const [phase, setPhase] = useState<Phase>('idle');
  const [res, setRes] = useState<AnglerResult | null>(null);
  const [box, setBox] = useState({ w: 360, h: 520 });
  const { result, show } = useResult();
  const big = useBigWin('bubble');
  const onError = usePlayErrors();
  // history shows what bit (fish emoji + name), not the internal codes
  const history = useGameHistory('angler', (d) => {
    const c = d.split('→')[1] as AnglerCatch | undefined;
    return c ? `${(ANGLER_BAD as readonly string[]).includes(c) ? '💀' : '🐟'} ${t(`play.angFish.${c}`)}` : d;
  });
  const busy = phase !== 'idle' && phase !== 'done';
  const running = focused && !reduceMotion;
  const W = box.w, H = box.h;
  const surfaceY = H * SURFACE;
  const boatW = Math.min(150, W * 0.36);
  const tip = { x: W * 0.06 + boatW * 0.98, y: surfaceY - boatW * 0.42 };
  const castX = W * 0.66;
  // hook and the hooked fish
  const hx = useSharedValue(tip.x);
  const hy = useSharedValue(surfaceY);
  const fx = useSharedValue(-200);
  const fy = useSharedValue(0);
  const hang = useSharedValue(0);
  const splash = useSharedValue(0);
  const rod = useSharedValue(0);
  const skip = useRef(false);
  const pause = (ms: number) => (reduceMotion || skip.current ? Promise.resolve() : wait(ms));
  const swimmers = useMemo(() => {
    const kinds: AnglerCatch[] = ['sardine', 'sardine', 'sardine', 'mackerel', 'mackerel', 'bream', 'clownfish', 'puffer', 'swordfish', 'octopus', 'deadfish', 'lanternfish', 'tuna'];
    return kinds.map((k, i) => ({ k, i }));
  }, []);

  useEffect(() => {
    if (phase === 'idle') {
      hx.set(tip.x);
      hy.set(surfaceY + 30);
    }
  }, [phase, tip.x, surfaceY, hx, hy]);

  const cast = async () => {
    if (busy) return;
    try {
      skip.current = false;
      setRes(null);
      haptic.medium();
      const r = await s.op('play', { bet, pick });
      const v = r.view as unknown as AnglerResult;
      setRes(v);
      const targetY = H * (SURFACE + (BED - SURFACE) * ANGLER_FISH[v.catch].depth);
      // 1) the rod whips and the line flies out to the water
      setPhase('cast');
      sfx('roll', 0.35);
      rod.set(withSequence(withTiming(-1, { duration: 180 }), withTiming(0.6, { duration: 220 }), withTiming(0, { duration: 300 })));
      hx.set(withTiming(castX, { duration: reduceMotion ? 0 : 520, easing: Easing.out(Easing.quad) }));
      hy.set(withSequence(withTiming(surfaceY - 60, { duration: reduceMotion ? 0 : 260, easing: Easing.out(Easing.quad) }), withTiming(surfaceY, { duration: reduceMotion ? 0 : 260, easing: Easing.in(Easing.quad) })));
      await pause(540);
      splash.set(0);
      splash.set(withTiming(1, { duration: 700 }));
      sfx('pop', 0.6);
      // 2) the hook sinks to where the fish that bites lives
      setPhase('sink');
      const sinkMs = 900 + ANGLER_FISH[v.catch].depth * 1700;
      hy.set(withTiming(targetY, { duration: reduceMotion ? 0 : sinkMs, easing: Easing.out(Easing.cubic) }));
      await pause(sinkMs * 0.75);
      // 3) a fish swims in and bites
      const fromLeft = rnd(v.bet + ANGLER_FISH[v.catch].depth * 100, 4) > 0.5;
      fy.set(targetY);
      fx.set(fromLeft ? -120 : W + 40);
      hang.set(0);
      fx.set(withTiming(fromLeft ? castX - 92 : castX - 6, { duration: reduceMotion ? 0 : 1100, easing: Easing.out(Easing.quad) }));
      await pause(1150);
      setPhase('bite');
      sfx('tick', 0.8);
      haptic.heavy();
      hy.set(withSequence(withTiming(targetY + 10, { duration: 80 }), withTiming(targetY - 6, { duration: 90 }), withTiming(targetY + 6, { duration: 90 }), withTiming(targetY, { duration: 90 })));
      await pause(700);
      // 4) reel it up, the catch hanging from the hook
      setPhase('reel');
      sfx('roll', 0.3);
      const reelMs = 900 + ANGLER_FISH[v.catch].depth * 900;
      hang.set(withTiming(1, { duration: 300 }));
      fx.set(withTiming(castX - 50, { duration: 300 }));
      hy.set(withTiming(surfaceY - 40, { duration: reduceMotion ? 0 : reelMs, easing: Easing.inOut(Easing.cubic) }));
      fy.set(withTiming(surfaceY - 40, { duration: reduceMotion ? 0 : reelMs, easing: Easing.inOut(Easing.cubic) }));
      await pause(reelMs + 100);
      setPhase('done');
      if (v.won) {
        sfx(v.multiplier >= 10 ? 'bigwin' : 'win');
        haptic.success();
      } else if (v.bad) {
        sfx('lose');
        haptic.error();
      } else sfx('lose', 0.5);
      await pause(1100);
      await big.celebrate(v.won ? v.multiplier : 0, r.payout);
      show({ bet: v.stake, payout: r.payout, multiplier: v.won ? v.multiplier : undefined });
      tutorialEvent('angler', 'angler:cast');
    } catch (e) {
      setPhase('idle');
      onError(e);
    }
  };

  // line from the rod tip to the hook
  const lineSt = useAnimatedStyle(() => {
    const dx = hx.value - tip.x, dy = hy.value - tip.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    return { width: len, transform: [{ translateX: (tip.x + hx.value) / 2 - len / 2 }, { translateY: (tip.y + hy.value) / 2 }, { rotate: `${Math.atan2(dy, dx)}rad` }] };
  });
  const hookSt = useAnimatedStyle(() => ({ transform: [{ translateX: hx.value - 7 }, { translateY: hy.value - 2 }] }));
  const fishSt = useAnimatedStyle(() => ({ transform: [{ translateX: fx.value }, { translateY: fy.value - 24 + hang.value * 34 }, { rotate: `${hang.value * -70}deg` }] }));
  const splashSt = useAnimatedStyle(() => ({ opacity: interpolate(splash.value, [0, 0.1, 1], [0, 1, 0]), transform: [{ translateX: castX - 40 }, { translateY: surfaceY - 12 }, { scale: 0.4 + splash.value * 1.2 }] }));
  const rodSt = useAnimatedStyle(() => ({ transform: [{ rotate: `${rod.value * 14}deg` }] }));
  const catchKind: AnglerCatch | null = res && phase !== 'idle' && phase !== 'cast' && phase !== 'sink' ? res.catch : null;

  return (
    <GameShell
      game="angler"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {/* sky and sea */}
          <LinearGradient colors={['#FFB36B', '#FFD8A0', '#9FDDF8']} locations={[0, 0.6, 1]} style={[styles.abs, { left: 0, top: 0, width: W, height: surfaceY + 4 }]} />
          <View style={[styles.sun, { left: W * 0.72, top: surfaceY * 0.2 }]} />
          <LinearGradient colors={['#2EA8E0', '#0B5E9A', '#06305A', '#020F24']} locations={[0, 0.35, 0.7, 1]} style={[styles.abs, { left: 0, top: surfaceY, width: W, height: H - surfaceY }]} />
          {/* light rays from the surface */}
          <Svg style={[styles.abs, { left: 0, top: surfaceY }]} width={W} height={H * 0.55} pointerEvents="none">
            {[0.12, 0.34, 0.58, 0.8].map((x, k) => <Path key={k} d={`M${W * x} 0 L${W * x + 26} 0 L${W * x + 70} ${H * 0.55} L${W * x + 10} ${H * 0.55} Z`} fill="#CFF6FF" opacity={0.07} />)}
          </Svg>
          {/* depth marks */}
          {[0.25, 0.5, 0.75, 1].map((d) => (
            <View key={d} style={[styles.abs, styles.depth, { left: 6, top: surfaceY + (H * BED - surfaceY) * d - 8 }]}>
              <T style={styles.depthText}>{t('play.angDepth', { m: Math.round(d * 200) })}</T>
            </View>
          ))}
          {/* fish of the sea, each at its depth */}
          {swimmers.map(({ k, i }) => <Swimmer key={i} kind={k} i={i} w={W} h={H} running={running} />)}
          <View style={[styles.abs, { left: 0, top: H * BED - 30, width: W, height: H * (1 - BED) + 30 }]}><Seabed w={W} h={H * (1 - BED) + 30} /></View>
          {/* surface, boat and rod */}
          <Waves w={W} y={surfaceY} running={running} />
          <View style={[styles.abs, { left: W * 0.06, top: surfaceY - boatW * 0.62 }]}><Boat w={boatW} /></View>
          <Animated.View pointerEvents="none" style={[styles.abs, { left: W * 0.06 + boatW * 0.62, top: tip.y, width: boatW * 0.38, height: boatW * 0.32 }, rodSt]}>
            <Svg width={boatW * 0.38} height={boatW * 0.32}><Path d={`M0 ${boatW * 0.3} L${boatW * 0.36} 1`} stroke="#3A1A08" strokeWidth={4} strokeLinecap="round" /><Path d={`M0 ${boatW * 0.3} L${boatW * 0.36} 1`} stroke="#8A4B1E" strokeWidth={2} strokeLinecap="round" /></Svg>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[styles.abs, styles.line, lineSt]} />
          <Animated.View pointerEvents="none" style={[styles.abs, splashSt]}>
            <Svg width={80} height={24}><Path d="M4 20 Q40 -6 76 20" stroke="#FFFFFF" strokeWidth={3} fill="none" /><Path d="M18 20 Q40 4 62 20" stroke="#B8F1FF" strokeWidth={2} fill="none" /></Svg>
          </Animated.View>
          {/* the hooked catch */}
          {catchKind ? (
            <Animated.View pointerEvents="none" style={[styles.abs, fishSt]}>
              <View style={phase === 'done' && res?.won ? styles.glow : undefined}><SeaFish kind={catchKind} size={92} /></View>
            </Animated.View>
          ) : null}
          <Animated.View pointerEvents="none" style={[styles.abs, hookSt]}>
            <Svg width={16} height={22}><Path d="M8 0 L8 13 C8 20 1 20 1 14" stroke="#2A2440" strokeWidth={4} fill="none" strokeLinecap="round" /><Path d="M8 0 L8 13 C8 20 1 20 1 14" stroke="#E8EEF8" strokeWidth={2} fill="none" strokeLinecap="round" /></Svg>
          </Animated.View>
          {phase === 'bite' ? (
            <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} pointerEvents="none" style={[styles.abs, styles.bite, { left: Math.max(8, Math.min(castX - 70, W - 180)), top: surfaceY + 10 }]}>
              <T weight="display" numberOfLines={1} style={{ color: '#231A3A', fontSize: 14 }}>❗ {t('play.angBite')}</T>
            </Animated.View>
          ) : null}
          {phase === 'done' && res ? (
            <Animated.View entering={ZoomIn.springify().damping(11)} exiting={FadeOut} pointerEvents="none" style={[styles.verdict, res.won ? styles.vWin : res.bad ? styles.vBad : styles.vMiss]}>
              <T weight="display" align="center" style={{ color: res.won ? '#231A3A' : '#fff', fontSize: 17 }}>
                {res.won ? t('play.angWin', { fish: t(`play.angFish.${res.catch}`) }) : res.bad ? t('play.angBad', { fish: t(`play.angFish.${res.catch}`) }) : t('play.angMiss', { fish: t(`play.angFish.${res.catch}`) })}
              </T>
              {res.won ? <T weight="display" align="center" style={{ color: '#231A3A', fontSize: 24 }}>×{res.multiplier} · +{formatCoins(res.payout - res.stake)}</T> : <T weight="displaySemi" align="center" style={{ color: '#fff' }}>−{formatCoins(res.stake - res.payout)}</T>}
            </Animated.View>
          ) : null}
          <ResultBanner result={result} compact />
          {big.node}
        </View>
      }
      controls={
        <View style={{ gap: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
            {ANGLER_GOOD.map((f) => {
              const on = f === pick;
              return (
                <PressableScale key={f} onPress={() => !busy && setPick(f)} disabled={busy} scaleTo={0.94} feedback="select" accessibilityLabel={`${t(`play.angFish.${f}`)} ×${anglerMultiplier(f)}`} style={[styles.card, on && styles.cardOn]}>
                  <SeaFish kind={f} size={40} />
                  <T weight="display" style={{ color: '#FFD06B', fontSize: 13 }}>×{anglerMultiplier(f)}</T>
                  <T style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9.5 }}>{pct(ANGLER_FISH[f].p)}</T>
                </PressableScale>
              );
            })}
          </ScrollView>
          <View style={styles.badRow}>
            <T weight="displaySemi" numberOfLines={1} style={{ color: '#FFD06B', fontSize: 12 }}>🎣 {t(`play.angFish.${pick}`)}</T>
            {ANGLER_BAD.map((b) => <SeaFish key={b} kind={b} size={24} />)}
            <T variant="caption" color="text3" style={{ flex: 1 }} numberOfLines={2}>{t('play.angBond', { bond: formatCoins(anglerBond(bet)) })}</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={busy} /></View>
            <Button spot="angler:cast" title={`🎣 ${t('play.angCast')}`} onPress={cast} loading={busy} disabled={bet + anglerBond(bet) > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden', borderRadius: 24, marginHorizontal: 8 },
  abs: { position: 'absolute', left: 0, top: 0 },
  sun: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF3A0', shadowColor: '#FFD06B', shadowOpacity: 1, shadowRadius: 20 },
  depth: { paddingHorizontal: 6, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center' },
  depthText: { color: 'rgba(220,248,255,0.75)', fontSize: 9, fontWeight: '700' },
  line: { height: 1.5, backgroundColor: 'rgba(240,250,255,0.9)' },
  bite: { paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: '#FFE58A', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  glow: { shadowColor: '#FFE58A', shadowOpacity: 1, shadowRadius: 24 },
  verdict: { position: 'absolute', left: 20, right: 20, top: '34%', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, borderWidth: 3, borderColor: '#fff', gap: 2 },
  vWin: { backgroundColor: '#FFD06B' },
  vMiss: { backgroundColor: 'rgba(30,40,70,0.92)' },
  vBad: { backgroundColor: 'rgba(110,130,40,0.95)', borderColor: '#C8E070' },
  card: { width: 62, paddingVertical: 4, borderRadius: 16, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: '#FFD06B', backgroundColor: 'rgba(255,208,107,0.14)' },
  badRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
