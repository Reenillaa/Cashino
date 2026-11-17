import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Marquee, PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { SLOT_SYMBOLS, SLOT_THREE, type SlotSymbol } from '@/engine/games/slots.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { Ambient } from '../lineslot/Ambient';
import { SLOT_THEMES, WinCellFx } from '../lineslot/WinFx';
import { useBigWin } from '../lineslot/BigWin';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { SlotSymbolArt } from './Symbols';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const FILL = 14; // symbols that fly past before the final three
const rand = () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];

/** One reel: a vertical strip [new result, …random…, previous] that rolls down and lands on the top three with a small bounce. */
function Reel({ strip, spinKey, index, cell, onStop }: { strip: SlotSymbol[]; spinKey: number; index: number; cell: number; onStop: () => void }) {
  const { reduceMotion } = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    if (spinKey === 0) return;
    if (reduceMotion) {
      y.set(0);
      onStop();
      return;
    }
    y.set(-(strip.length - 3) * cell);
    const dur = 1000 + index * 380;
    y.set(withSequence(withTiming(cell * 0.16, { duration: dur, easing: Easing.out(Easing.cubic) }), withTiming(0, { duration: 170, easing: Easing.out(Easing.quad) })));
    const id = setTimeout(onStop, dur + 60);
    return () => clearTimeout(id);
  }, [spinKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <View style={[styles.reel, { height: cell * 3, width: cell * 1.02 }]}>
      <LinearGradient colors={['#FFFFFF', '#F1EDF8', '#FFFFFF']} style={StyleSheet.absoluteFill} />
      <Animated.View style={style}>
        {strip.map((sym, i) => (
          <View key={i} style={{ height: cell, alignItems: 'center', justifyContent: 'center' }}>
            <SlotSymbolArt sym={sym} size={cell * 0.78} />
          </View>
        ))}
      </Animated.View>
      {/* curved-glass shading top and bottom */}
      <LinearGradient pointerEvents="none" colors={['rgba(20,6,40,0.55)', 'rgba(20,6,40,0)', 'rgba(20,6,40,0)', 'rgba(20,6,40,0.55)']} locations={[0, 0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/** The pay line as a neon tube: pink glow, white-hot core and a light running along it when you win. */
function NeonLine({ on, top, width }: { on: boolean; top: number; width: number }) {
  const { reduceMotion } = useTheme();
  const run = useSharedValue(0);
  const flick = useSharedValue(0.6);
  useEffect(() => {
    if (!on || reduceMotion) {
      run.set(0);
      flick.set(on ? 1 : 0.6);
      return;
    }
    run.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, false));
    flick.set(withRepeat(withSequence(withTiming(1, { duration: 70 }), withTiming(0.55, { duration: 60 }), withTiming(1, { duration: 90 }), withTiming(0.85, { duration: 400 })), -1, false));
  }, [on, reduceMotion, run, flick]);
  const glowSt = useAnimatedStyle(() => ({ opacity: flick.value }));
  const haloSt = useAnimatedStyle(() => ({ opacity: flick.value * 0.32 }));
  const runSt = useAnimatedStyle(() => ({ opacity: on ? 1 : 0, transform: [{ translateX: run.value * (width - 30) }] }));
  const c = on ? '#FF4FA3' : '#FF3B5C';
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 4, width, top: top - 9, height: 18, justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: on ? 16 : 8, borderRadius: 8, backgroundColor: c, shadowColor: c, shadowOpacity: 1, shadowRadius: 14 }, haloSt]} />
      <Animated.View style={[{ height: on ? 5 : 3, borderRadius: 3, backgroundColor: on ? '#FFE0F0' : c, shadowColor: c, shadowOpacity: 1, shadowRadius: 6 }, glowSt]} />
      <Animated.View style={[{ position: 'absolute', left: 0, width: 30, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF', shadowOpacity: 1, shadowRadius: 10 }, runSt]} />
    </View>
  );
}

export default function SlotsScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('slots');
  const [bet, setBet] = useBet('slots', s.room);
  const [strips, setStrips] = useState<SlotSymbol[][]>([['seven', 'cherry', 'bell'], ['bar', 'seven', 'lemon'], ['diamond', 'seven', 'cherry']]);
  const [spinKey, setSpinKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [win, setWin] = useState(false);
  const [box, setBox] = useState({ w: 360, h: 420 });
  const { result, show } = useResult();
  const big = useBigWin('star');
  const onError = usePlayErrors();
  const history = useGameHistory('slots', (d) => d);
  const lever = useSharedValue(0);
  const cell = Math.max(58, Math.min((box.w - 120) / 3.2, (box.h - 150) / 3, 96));

  const spin = async () => {
    if (busy) return;
    try {
      setBusy(true);
      setWin(false);
      lever.set(withSequence(withTiming(1, { duration: 180 }), withTiming(0, { duration: 420, easing: Easing.out(Easing.back(2)) })));
      sfx('roll', 0.45);
      haptic.medium();
      const r = await s.op('play', { bet });
      const v = r.view as { line: SlotSymbol[]; multiplier: number };
      // only the centre symbol was decided by the game; the rest of the strip is decoration
      setStrips((old) => v.line.map((center, i) => [rand(), center, rand(), ...Array.from({ length: FILL }, rand), ...old[i].slice(0, 3)]));
      setSpinKey((k) => k + 1);
      await wait(reduceMotion ? 0 : 1000 + 2 * 380 + 220);
      const won = r.payout > bet;
      setWin(won);
      if (won) {
        if (v.multiplier >= 20) sfx('bigwin');
      }
      await big.celebrate(r.payout > 0 ? v.multiplier : 0, r.payout);
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined });
      tutorialEvent('slots', 'slots:spin');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const leverStyle = useAnimatedStyle(() => ({ transform: [{ translateY: lever.value * 46 }] }));
  return (
    <GameShell
      game="slots"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Ambient kind="vegas" />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Marquee colors={['#4A0C26', '#1A0624']}>
              <T weight="display" align="center" style={styles.title}>CASHINO 777</T>
              <View style={styles.window}>
                {strips.map((l, i) => (
                  <Reel key={i} index={i} strip={l} spinKey={spinKey} cell={cell} onStop={() => sfx('land', 0.6)} />
                ))}
                {/* pay line */}
                <NeonLine on={win} top={6 + cell * 1.5} width={cell * 3 + 12 + 4} />
                {win ? [0, 1, 2].map((i) => (
                  <View key={`${spinKey}-${i}`} pointerEvents="none" style={{ position: 'absolute', left: 6 + i * (cell + 6), top: 6 + cell, width: cell, height: cell }}>
                    <WinCellFx x={0} y={0} cell={cell} theme={SLOT_THEMES.vegas} order={i} />
                  </View>
                )) : null}
                <View pointerEvents="none" style={[styles.arrow, { left: -2, top: cell * 1.5 - 8, borderLeftColor: '#FF3B5C', borderLeftWidth: 10 }]} />
                <View pointerEvents="none" style={[styles.arrow, { right: -2, top: cell * 1.5 - 8, borderRightColor: '#FF3B5C', borderRightWidth: 10 }]} />
              </View>
            </Marquee>
            {/* lever: tap it (or the button) to spin */}
            <PressableScale onPress={spin} disabled={busy} feedback="medium" scaleTo={0.95} accessibilityLabel={t('play.spin')} style={styles.leverWrap}>
              <View style={styles.leverRail} />
              <Animated.View style={[styles.leverArm, leverStyle]}>
                <View style={styles.leverStick} />
                <View style={styles.leverBall} />
              </Animated.View>
            </PressableScale>
          </View>
          {/* pay table */}
          <View style={styles.pays}>
            {(['diamond', 'seven', 'bar', 'cherry', 'bell', 'lemon'] as SlotSymbol[]).map((sym) => (
              <View key={sym} style={styles.pay}>
                <SlotSymbolArt sym={sym} size={20} />
                <T weight="displaySemi" style={{ color: '#FFE58A', fontSize: 11 }}>×{SLOT_THREE[sym]}</T>
              </View>
            ))}
          </View>
          <T variant="footnote" color="text3" align="center" style={{ marginTop: 4 }}>{t('play.slotsCherries')}</T>
          <ResultBanner result={result} compact />
          {big.node}
        </View>
      }
      controls={
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={busy} /></View>
          <Button spot="slots:spin" title={t('play.spin')} onPress={spin} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  title: { color: '#FFE58A', fontSize: 18, letterSpacing: 3, marginBottom: 10, textShadowColor: 'rgba(255,185,56,0.8)', textShadowRadius: 12 },
  window: { flexDirection: 'row', gap: 6, padding: 6, borderRadius: 14, backgroundColor: '#120818', borderWidth: 3, borderColor: '#C98B12' },
  reel: { borderRadius: 10, overflow: 'hidden' },
  arrow: { position: 'absolute', width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  leverWrap: { width: 30, height: 150, marginLeft: 6, alignItems: 'center' },
  leverRail: { position: 'absolute', top: 30, width: 10, height: 100, borderRadius: 5, backgroundColor: '#5E5A6E' },
  leverArm: { alignItems: 'center' },
  leverStick: { position: 'absolute', top: 18, width: 6, height: 70, borderRadius: 3, backgroundColor: '#C9C4DA' },
  leverBall: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FF3B5C', borderWidth: 3, borderColor: '#FFD0DA', shadowColor: '#FF3B5C', shadowOpacity: 0.8, shadowRadius: 8 },
  pays: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 14 },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)' },
});
