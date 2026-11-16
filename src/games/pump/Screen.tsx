import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Button, Chip, PressableScale, T, formatCoins, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { PUMP_MAX, PUMP_POP, pumpMultiplier, type PumpLevel } from '@/engine/games/pump.ts';
import { payoutFor } from '@/engine/games/types.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell, ControlRow } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { Stat, StatRow } from '../shared/Stat';
import { MoreOptions } from '../shared/MoreOptions';
import { useBet, useGameHistory, usePlayErrors, useResult } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

interface PView { level: PumpLevel; pumps: number; status: 'active' | 'popped' | 'cashed'; bet: number; multiplier: number; next: number; max: number }
const LEVELS: PumpLevel[] = ['easy', 'medium', 'hard', 'expert'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function Balloon({ size }: { size: number }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 100 125">
      <Defs>
        <RadialGradient id="bal" cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#FFC2DF" />
          <Stop offset="0.45" stopColor="#FF4FA3" />
          <Stop offset="1" stopColor="#8A0D52" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={50} cy={50} rx={44} ry={48} fill="url(#bal)" />
      <Ellipse cx={34} cy={30} rx={10} ry={15} fill="rgba(255,255,255,0.5)" transform="rotate(-20 34 30)" />
      <Path d="M44 97 L56 97 L50 104 Z" fill="#8A0D52" />
      <Path d="M50 104 Q42 112 52 124" stroke="rgba(255,255,255,0.7)" strokeWidth={2} fill="none" />
    </Svg>
  );
}

export default function PumpScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('pump');
  const [bet, setBet] = useBet('pump', s.room);
  const [level, setLevel] = useState<PumpLevel>('medium');
  const [view, setView] = useState<PView | null>((s.active?.view as unknown as PView) ?? null);
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState({ w: 340, h: 400 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('pump', (d) => d);
  const active = view?.status === 'active';
  const lvl = view?.level ?? level;
  const pumps = view?.pumps ?? 0;
  const grow = useSharedValue(0);
  const wobble = useSharedValue(0);
  const piston = useSharedValue(0);
  const burst = useSharedValue(0);
  const base = Math.min(box.w * 0.42, box.h * 0.36, 170);

  const fill = (n: number, max: number) => Math.min(1, n / Math.max(1, max));
  const start = async () => {
    try {
      const r = await s.op('start', { bet, level });
      setView(r.view as unknown as PView);
      grow.set(withSpring(0, { damping: 12 }));
      burst.set(0);
      sfx('chip');
      tutorialEvent('pump', 'pump:start');
    } catch (e) {
      onError(e);
    }
  };
  const doPump = async () => {
    if (!active || busy) return;
    try {
      setBusy(true);
      piston.set(withSequence(withTiming(1, { duration: 110 }), withTiming(0, { duration: 180 })));
      sfx('tick', 0.6);
      const r = await s.op('pump');
      const v = r.view as unknown as PView;
      tutorialEvent('pump', 'pump:pump');
      if (v.status === 'popped') {
        grow.set(withTiming(fill(v.pumps, v.max) + 0.08, { duration: 120 }));
        burst.set(reduceMotion ? 1 : withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
        setView(v);
        sfx('crash');
        haptic.heavy();
        show({ bet: v.bet, payout: 0, label: t('play.popped') }, { silent: true });
      } else {
        grow.set(reduceMotion ? fill(v.pumps, v.max) : withSpring(fill(v.pumps, v.max), { damping: 9, stiffness: 180 }));
        wobble.set(withSequence(withTiming(1, { duration: 90 }), withTiming(-1, { duration: 120 }), withTiming(0, { duration: 120 })));
        haptic.light();
        setView(v);
        if (r.done) {
          sfx('cashout');
          show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
        }
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const cashout = async () => {
    try {
      const r = await s.op('cashout');
      const v = r.view as unknown as PView;
      setView(v);
      grow.set(withTiming(0, { duration: 500 }));
      sfx('cashout');
      show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
    } catch (e) {
      onError(e);
    }
  };

  const popped = view?.status === 'popped';
  const balloonStyle = useAnimatedStyle(() => ({
    opacity: 1 - burst.value,
    // grows from the nozzle: keep the knot on the pump while the balloon swells
    transform: [{ translateY: ((1 - (0.72 + grow.value * 0.7)) * base * 1.25) / 2 }, { scale: 0.72 + grow.value * 0.7 + burst.value * 0.6 }, { rotate: `${wobble.value * 4}deg` }],
  }));
  const pistonStyle = useAnimatedStyle(() => ({ transform: [{ translateY: piston.value * 18 }] }));
  const shards = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);
  return (
    <GameShell
      game="pump"
      mode={s.mode}
      balance={s.balance}
      locked={active}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <PressableScale onPress={doPump} feedback="none" scaleTo={active ? 0.98 : 1} accessibilityLabel={t('play.pumpIt')} style={{ alignItems: 'center' }}>
            <View style={{ height: base * 1.75, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Animated.View style={balloonStyle}>
                <Balloon size={base} />
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: base * 0.42 }]} pointerEvents="none">
                  <T weight="display" tabular style={{ color: '#fff', fontSize: base * 0.2, textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 6 }}>{formatMult(active || view?.status === 'cashed' ? view!.multiplier : 1)}</T>
                </View>
              </Animated.View>
              {popped ? shards.map((a, i) => <Shard key={i} a={a} burst={burst} base={base} />) : null}
              {popped ? <T weight="display" style={styles.pop}>{t('play.popped')}</T> : null}
            </View>
            {/* the pump */}
            <View style={{ alignItems: 'center', marginTop: -6 }}>
              <Animated.View style={pistonStyle}><View style={styles.handle} /><View style={styles.rod} /></Animated.View>
              <Svg width={72} height={60}>
                <Defs>
                  <LinearGradient id="pumpBody" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#B8670A" />
                    <Stop offset="0.45" stopColor="#FFE58A" />
                    <Stop offset="1" stopColor="#B8670A" />
                  </LinearGradient>
                </Defs>
                <Rect x={12} y={0} width={48} height={54} rx={10} fill="url(#pumpBody)" />
                <Rect x={12} y={12} width={48} height={6} fill="rgba(90,50,0,0.35)" />
                <Rect x={12} y={36} width={48} height={6} fill="rgba(90,50,0,0.35)" />
                <Rect x={0} y={50} width={72} height={10} rx={5} fill="#231A3A" />
              </Svg>
            </View>
          </PressableScale>
          {/* pump counter */}
          <View style={styles.dots}>
            {Array.from({ length: PUMP_MAX[lvl] }, (_, i) => (
              <View key={i} style={[styles.dotPump, { backgroundColor: i < pumps ? (popped && i === pumps - 1 ? c.loss : '#FF4FA3') : 'rgba(255,255,255,0.14)' }]} />
            ))}
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          {active ? (
            <>
              <StatRow>
                <Stat label={t('play.multiplierNow')} value={formatMult(pumps ? view!.multiplier : 1)} tint={c.win} />
                <Stat label={t('play.nextMultiplier')} value={formatMult(view!.next)} />
                <Stat label={t('play.safeChance')} value={`${Math.round((1 - PUMP_POP[lvl]) * 100)} %`} />
              </StatRow>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button spot="pump:pump" title={`🎈 ${t('play.pumpIt')}`} kind="secondary" onPress={doPump} disabled={busy} style={{ flex: 1 }} />
                <Button title={t('common.cashout')} subtitle={pumps ? `${formatCoins(payoutFor(view!.bet, view!.multiplier))} ${t('common.coins')}` : undefined} onPress={cashout} disabled={pumps === 0} style={{ flex: 1.3 }} />
              </View>
            </>
          ) : (
            <>
              <MoreOptions game="pump" summary={`${t('play.level')}: ${t(`play.level${cap(level)}`)} · ${Math.round(PUMP_POP[level] * 100)} %`}>
                <ControlRow>
                  {LEVELS.map((k) => <Chip key={k} label={t(`play.level${cap(k)}`)} selected={level === k} onPress={() => setLevel(k)} />)}
                </ControlRow>
              </MoreOptions>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} /></View>
                <Button spot="pump:start" title={t('play.placeBet')} onPress={start} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
              </View>
            </>
          )}
          {!active ? <T variant="footnote" color="text3" align="center" style={{ marginTop: 6 }}>{`${t('play.nextMultiplier')}: ${formatMult(pumpMultiplier(level, 1))} → ${formatMult(pumpMultiplier(level, 5))} (5) → ${formatMult(pumpMultiplier(level, PUMP_MAX[level]))} (${PUMP_MAX[level]})`}</T> : null}
        </View>
      }
    />
  );
}

/** A piece of rubber flying away when the balloon pops. */
function Shard({ a, burst, base }: { a: number; burst: { value: number }; base: number }) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - burst.value,
    transform: [{ translateX: Math.cos(a) * base * 0.9 * burst.value }, { translateY: -base * 0.6 + Math.sin(a) * base * 0.9 * burst.value }, { rotate: `${a * 90 * burst.value}deg` }],
  }));
  return <Animated.View style={[styles.shard, style]} />;
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pop: { position: 'absolute', top: '30%', color: '#FFD06B', fontSize: 40, letterSpacing: 2, textShadowColor: '#FF4FA3', textShadowRadius: 14 },
  handle: { width: 56, height: 10, borderRadius: 5, backgroundColor: '#231A3A' },
  rod: { width: 8, height: 26, alignSelf: 'center', backgroundColor: '#C9C4DA' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginTop: 14, maxWidth: 300 },
  dotPump: { width: 10, height: 10, borderRadius: 5 },
  shard: { position: 'absolute', bottom: 0, width: 16, height: 10, borderRadius: 4, backgroundColor: '#FF4FA3' },
});
