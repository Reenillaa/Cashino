import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeOut, ZoomIn, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { useIsFocused } from 'expo-router';
import { Button, Segmented, T, formatCoins, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { PENGUIN_CONFIG, penguinMultiplier, type PenguinDifficulty, type PenguinState } from '@/engine/games/penguin.ts';
import { payoutFor } from '@/engine/games/types.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { Stat, StatRow } from '../shared/Stat';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { useBigWin } from '../lineslot/BigWin';
import { FloeArt, PenguinArt } from './Art';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

type PView = Omit<PenguinState, 'crackAt'> & { crackAt: number | null | undefined; multiplier: number; next: number };
const rnd = (i: number, salt: number) => ((Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1;

/**
 * Camera behind the penguin: a floe `z` steps ahead is drawn smaller and higher, towards the horizon.
 * HOR = horizon line, BASE = centre of the floe under the penguin (z = 0), as shares of the stage height.
 */
const HOR = 0.34, BASE = 0.8, DEPTH = 0.62;
function project(z: number, w: number, h: number, i: number) {
  'worklet';
  const s = 1 / (1 + DEPTH * Math.max(-0.92, z));
  return { s, y: h * (HOR + (BASE - HOR) * s), x: w / 2 + Math.sin(i * 1.7) * w * 0.13 * Math.min(1, s) };
}

/** One floe on the path, moving with the camera; the cracked one splits in two and sinks. */
function Floe({ i, pos, w, h, label, goal, broken, brk }: { i: number; pos: SharedValue<number>; w: number; h: number; label: string; goal: boolean; broken: boolean; brk: SharedValue<number> }) {
  const FW = w * 0.5, FH = FW * 0.6;
  const st = useAnimatedStyle(() => {
    const z = i - pos.value;
    const p = project(z, w, h, i);
    const o = z < -0.55 ? Math.max(0, (z + 0.92) / 0.37) : z > 7 ? Math.max(0, 8 - z) : 1;
    return { opacity: o, transform: [{ translateX: p.x - FW / 2 }, { translateY: p.y - FH * 0.42 }, { scale: p.s }] };
  });
  const left = useAnimatedStyle(() => ({ opacity: 1 - brk.value * 0.7, transform: [{ translateX: -brk.value * FW * 0.12 }, { translateY: brk.value * FH * 0.7 }, { rotate: `${-brk.value * 22}deg` }] }));
  const right = useAnimatedStyle(() => ({ opacity: 1 - brk.value * 0.7, transform: [{ translateX: brk.value * FW * 0.12 }, { translateY: brk.value * FH * 0.8 }, { rotate: `${brk.value * 26}deg` }] }));
  const ring = useAnimatedStyle(() => ({ opacity: interpolate(brk.value, [0, 0.15, 1], [0, 1, 0]), transform: [{ scale: 0.4 + brk.value * 1.4 }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { width: FW, height: FH }, st]}>
      {broken ? (
        <>
          <Animated.View style={[styles.abs, ring, { left: FW * 0.1, top: FH * 0.35, width: FW * 0.8, height: FH * 0.5, borderRadius: FW, borderWidth: 3, borderColor: '#E8FBFF' }]} />
          <Animated.View style={[styles.abs, { width: FW / 2, height: FH, overflow: 'hidden' }, left]}><FloeArt w={FW} crack /></Animated.View>
          <Animated.View style={[styles.abs, { left: FW / 2, width: FW / 2, height: FH, overflow: 'hidden' }, right]}><View style={{ marginLeft: -FW / 2 }}><FloeArt w={FW} crack /></View></Animated.View>
        </>
      ) : (
        <FloeArt w={FW} goal={goal} />
      )}
      {i > 0 && !broken && label ? (
        <View style={[styles.mult, { left: FW / 2 - 34, top: FH * 0.1 }]}>
          <T weight="display" style={{ color: '#0A2A5A', fontSize: 15 }}>{label}</T>
        </View>
      ) : null}
    </Animated.View>
  );
}

/** Falling snow, drifting a little. */
function Snow({ i, h, running }: { i: number; h: number; running: boolean }) {
  const t = useSharedValue(0);
  const dur = 5000 + rnd(i, 1) * 6000;
  useEffect(() => {
    if (running) t.set(withDelay(rnd(i, 2) * 5000, withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false)));
  }, [running, t, i, dur]);
  const st = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 0.1, 0.9, 1], [0, 0.9, 0.9, 0]), transform: [{ translateY: t.value * (h + 20) - 10 }, { translateX: Math.sin(t.value * 9 + i) * 14 }] }));
  const s = 2 + rnd(i, 3) * 3;
  return <Animated.View pointerEvents="none" style={[styles.abs, { left: `${rnd(i, 4) * 100}%`, width: s, height: s, borderRadius: s, backgroundColor: '#FFFFFF' }, st]} />;
}

/** Aurora curtains swaying slowly in the polar sky. */
function Aurora({ w, h, running }: { w: number; h: number; running: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (running) t.set(withRepeat(withSequence(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 5200, easing: Easing.inOut(Easing.sin) })), -1, false));
  }, [running, t]);
  const st = useAnimatedStyle(() => ({ opacity: 0.45 + t.value * 0.4, transform: [{ translateX: (t.value - 0.5) * 40 }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.abs, { width: w + 60, left: -30 }, st]}>
      <Svg width={w + 60} height={h * HOR}>
        <Path d={`M0 ${h * 0.12} Q${w * 0.3} ${h * 0.02} ${w * 0.55} ${h * 0.1} T${w + 60} ${h * 0.06} L${w + 60} ${h * 0.16} Q${w * 0.6} ${h * 0.2} ${w * 0.3} ${h * 0.14} T0 ${h * 0.2} Z`} fill="#5BE3B0" opacity={0.35} />
        <Path d={`M0 ${h * 0.2} Q${w * 0.4} ${h * 0.12} ${w * 0.7} ${h * 0.18} T${w + 60} ${h * 0.14}`} stroke="#A996FF" strokeWidth={10} fill="none" opacity={0.25} />
        <Path d={`M0 ${h * 0.16} Q${w * 0.35} ${h * 0.08} ${w * 0.62} ${h * 0.14} T${w + 60} ${h * 0.1}`} stroke="#7FFFD0" strokeWidth={4} fill="none" opacity={0.4} />
      </Svg>
    </Animated.View>
  );
}

/** Wave lines rolling towards the camera across the icy water. */
function Wave({ k, w, h, running }: { k: number; w: number; h: number; running: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (running) t.set(withRepeat(withTiming(1, { duration: 3600, easing: Easing.linear }), -1, false));
  }, [running, t]);
  const st = useAnimatedStyle(() => {
    const z = 7 - ((k + t.value) % 8);
    const s = 1 / (1 + DEPTH * Math.max(-0.9, z));
    return { opacity: Math.min(0.35, s * 0.4), transform: [{ translateY: h * (HOR + (BASE + 0.15 - HOR) * s) }, { scaleX: 0.4 + s }] };
  });
  return <Animated.View pointerEvents="none" style={[styles.abs, { left: w * 0.05, width: w * 0.9, height: 2, borderRadius: 1, backgroundColor: '#CFF6FF' }, st]} />;
}

export default function PenguinScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const focused = useIsFocused();
  const s = useGameSession('penguin');
  const [bet, setBet] = useBet('penguin', s.room);
  const [difficulty, setDifficulty] = useState<PenguinDifficulty>('medium');
  const [view, setView] = useState<PView | null>((s.active?.view as unknown as PView) ?? null);
  const [moving, setMoving] = useState(false);
  const [broken, setBroken] = useState<number | null>(null);
  const [mood, setMood] = useState<'idle' | 'jump' | 'sad' | 'happy'>('idle');
  const [box, setBox] = useState({ w: 360, h: 460 });
  const { result, show } = useResult();
  const big = useBigWin('spark');
  const onError = usePlayErrors();
  const history = useGameHistory('penguin');
  const running = focused && !reduceMotion;
  const active = view?.status === 'active';
  const diff = view?.difficulty ?? difficulty;
  const floes = PENGUIN_CONFIG[diff].floes;
  const hopN = view?.hop ?? 0;
  const W = box.w, H = box.h;
  const pos = useSharedValue(hopN);
  const jump = useSharedValue(0);
  const fall = useSharedValue(0);
  const brk = useSharedValue(0);
  const bob = useSharedValue(0);
  useEffect(() => {
    if (running) bob.set(withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) })), -1, false));
  }, [running, bob]);

  const reset = () => {
    pos.set(0);
    fall.set(0);
    brk.set(0);
    setBroken(null);
    setMood('idle');
  };
  const start = async () => {
    try {
      reset();
      const r = await s.op('start', { bet, difficulty });
      setView(r.view as unknown as PView);
      sfx('chip');
      tutorialEvent('penguin', 'penguin:start');
    } catch (e) {
      onError(e);
    }
  };
  const doHop = async () => {
    if (moving) return;
    try {
      setMoving(true);
      const r = await s.op('hop');
      const v = r.view as unknown as PView;
      // the jump: crouch, arc through the air to the next floe, squash on landing
      setMood('jump');
      sfx('step');
      haptic.light();
      const ms = reduceMotion ? 0 : 560;
      jump.set(0);
      jump.set(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.quad) }));
      pos.set(withTiming(v.hop, { duration: ms, easing: Easing.inOut(Easing.cubic) }));
      await wait(ms);
      setView(v);
      tutorialEvent('penguin', 'penguin:hop');
      if (v.status === 'lost') {
        // crack! the floe splits and the penguin goes for a swim
        setBroken(v.hop);
        setMood('sad');
        sfx('hit');
        haptic.heavy();
        brk.set(withTiming(1, { duration: reduceMotion ? 0 : 900, easing: Easing.in(Easing.quad) }));
        fall.set(withDelay(reduceMotion ? 0 : 120, withTiming(1, { duration: reduceMotion ? 0 : 800, easing: Easing.in(Easing.quad) })));
        await wait(reduceMotion ? 0 : 900);
        show({ bet: v.bet, payout: 0 }, { silent: true });
      } else {
        setMood('idle');
        sfx('land', 0.6);
        if (r.done) {
          setMood('happy');
          await big.celebrate(v.multiplier, r.payout);
          show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
        }
      }
    } catch (e) {
      onError(e);
    } finally {
      setMoving(false);
    }
  };
  const cashout = async () => {
    try {
      const r = await s.op('cashout');
      const v = r.view as unknown as PView;
      setView(v);
      setMood('happy');
      sfx('cashout');
      haptic.success();
      jump.set(0);
      jump.set(withSequence(withTiming(0.5, { duration: 240 }), withTiming(1, { duration: 240 })));
      await big.celebrate(v.multiplier, r.payout);
      show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
    } catch (e) {
      onError(e);
    }
  };

  const penguinSt = useAnimatedStyle(() => {
    const i0 = Math.floor(pos.value);
    const f = pos.value - i0;
    const xa = W / 2 + Math.sin(i0 * 1.7) * W * 0.13, xb = W / 2 + Math.sin((i0 + 1) * 1.7) * W * 0.13;
    const arc = Math.sin(jump.value * Math.PI) * H * 0.16;
    const squash = jump.value > 0.92 ? 1 - (1 - jump.value) * 2 : 0;
    return {
      opacity: 1 - fall.value * 0.85,
      transform: [
        { translateX: xa + (xb - xa) * f - 40 },
        { translateY: H * BASE - 100 - arc + bob.value * 2 + fall.value * 70 },
        { rotate: `${fall.value * 28}deg` },
        { scaleY: 1 - squash * 0.12 },
        { scaleX: 1 + squash * 0.1 },
      ],
    };
  });
  const lo = Math.max(0, Math.floor(hopN) - 1), hi = Math.min(floes, Math.floor(hopN) + 8);
  const list = Array.from({ length: hi - lo + 1 }, (_, k) => hi - k); // far to near

  return (
    <GameShell
      game="penguin"
      mode={s.mode}
      balance={s.balance}
      locked={active}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {/* polar night sky, aurora, moon and stars */}
          <LinearGradient colors={['#050A24', '#0B1A4A', '#1A4A7A']} style={[styles.abs, { width: W, height: H * HOR + 4 }]} />
          {Array.from({ length: 24 }, (_, i) => <View key={i} style={[styles.abs, { left: rnd(i, 7) * W, top: rnd(i, 8) * H * HOR * 0.9, width: 2, height: 2, borderRadius: 1, backgroundColor: '#FFFFFF', opacity: 0.4 + rnd(i, 9) * 0.6 }]} />)}
          <Aurora w={W} h={H} running={running} />
          <Svg style={[styles.abs, { left: W * 0.78, top: H * 0.04 }]} width={48} height={48}>
            <Defs><RadialGradient id="pgm" cx="0.5" cy="0.5" r="0.5"><Stop offset="0.55" stopColor="#FFF6D6" stopOpacity={0.5} /><Stop offset="1" stopColor="#FFF6D6" stopOpacity={0} /></RadialGradient></Defs>
            <Circle cx={24} cy={24} r={24} fill="url(#pgm)" />
            <Circle cx={24} cy={24} r={11} fill="#FFF6D6" />
          </Svg>
          {/* distant icebergs on the horizon */}
          <Svg style={[styles.abs, { top: H * HOR - 40 }]} width={W} height={44}>
            <Path d={`M0 44 L${W * 0.08} 18 L${W * 0.16} 30 L${W * 0.24} 8 L${W * 0.34} 34 L${W * 0.42} 44 Z`} fill="#CFE8F8" />
            <Path d={`M${W * 0.58} 44 L${W * 0.66} 22 L${W * 0.72} 30 L${W * 0.82} 4 L${W * 0.92} 28 L${W} 20 L${W} 44 Z`} fill="#B8DCF4" />
            <Path d={`M${W * 0.24} 8 L${W * 0.28} 20 L${W * 0.2} 22 Z M${W * 0.82} 4 L${W * 0.86} 18 L${W * 0.78} 16 Z`} fill="#FFFFFF" />
          </Svg>
          {/* icy sea */}
          <LinearGradient colors={['#2A7AB0', '#0E4A7A', '#06284A']} style={[styles.abs, { top: H * HOR, width: W, height: H * (1 - HOR) }]} />
          {Array.from({ length: 8 }, (_, k) => <Wave key={k} k={k} w={W} h={H} running={running} />)}
          {/* the path of floes, far to near */}
          {list.map((i) => (
            <Floe key={i} i={i} pos={pos} w={W} h={H} goal={i === floes} label={i - hopN <= 4 ? formatMult(penguinMultiplier(diff, i)) : ''} broken={broken === i} brk={brk} />
          ))}
          <Animated.View pointerEvents="none" style={[styles.abs, penguinSt]}>
            <PenguinArt size={80} up={mood === 'jump' || mood === 'happy'} sad={mood === 'sad'} />
          </Animated.View>
          {Array.from({ length: 22 }, (_, i) => <Snow key={i} i={i} h={H} running={running} />)}
          {/* the frozen HUD */}
          <View style={styles.hud}>
            <View style={styles.hudPill}><T weight="display" style={{ color: '#0A2A5A', fontSize: 13 }}>🐧 {hopN}/{floes}</T></View>
            {view ? <View style={[styles.hudPill, { backgroundColor: '#FFD06B' }]}><T weight="display" tabular style={{ color: '#231A3A', fontSize: 13 }}>{formatMult(view.multiplier)}</T></View> : null}
          </View>
          {broken !== null ? (
            <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} pointerEvents="none" style={styles.crack}>
              <T weight="display" align="center" style={{ color: '#fff', fontSize: 18 }}>💥 {t('play.pgCracked')}</T>
            </Animated.View>
          ) : null}
          {!active && !view ? (
            <View pointerEvents="none" style={styles.hint}><T variant="caption" align="center" style={{ color: 'rgba(230,246,255,0.85)' }}>{t('play.pgHint')}</T></View>
          ) : null}
          <ResultBanner result={result} compact />
          {big.node}
        </View>
      }
      controls={
        <View style={{ gap: 8 }}>
          {active ? (
            <StatRow>
              <Stat label={t('play.multiplierNow')} value={hopN ? formatMult(view!.multiplier) : '—'} tint="#9CE8FF" />
              <Stat label={t('play.nextMultiplier')} value={formatMult(penguinMultiplier(diff, hopN + 1))} />
              <Stat label={t('play.safeChance')} value={`${((1 - PENGUIN_CONFIG[diff].crack) * 100).toFixed(0)} %`} />
            </StatRow>
          ) : (
            <Segmented
              size="sm"
              value={difficulty}
              onChange={setDifficulty}
              options={(['easy', 'medium', 'hard', 'extreme'] as const).map((d) => ({ value: d, label: t(`play.pgDiff.${d}`) }))}
            />
          )}
          {active ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button spot="penguin:hop" title={`🐧 ${t('play.pgHop')}`} kind="secondary" onPress={doHop} loading={moving} style={{ flex: 1 }} />
              <Button title={t('common.cashout')} subtitle={hopN ? `${formatCoins(payoutFor(view!.bet, view!.multiplier))} ${t('common.coins')}` : undefined} onPress={cashout} disabled={hopN === 0 || moving} style={{ flex: 1.4 }} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} /></View>
              <Button spot="penguin:start" title={t('play.placeBet')} onPress={start} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
            </View>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden', borderRadius: 24, marginHorizontal: 8, backgroundColor: '#06284A' },
  abs: { position: 'absolute', left: 0, top: 0 },
  mult: { position: 'absolute', width: 68, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#7FC8F0' },
  hud: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' },
  hudPill: { paddingHorizontal: 12, height: 28, borderRadius: 14, backgroundColor: 'rgba(232,248,255,0.92)', justifyContent: 'center' },
  crack: { position: 'absolute', left: 30, right: 30, top: '24%', paddingVertical: 12, borderRadius: 18, backgroundColor: 'rgba(10,40,90,0.92)', borderWidth: 3, borderColor: '#9CE8FF' },
  hint: { position: 'absolute', left: 20, right: 20, top: '22%' },
});
