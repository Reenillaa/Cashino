import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { PressableScale, T } from '@/design/components';
import { useT } from '@/i18n';
import { RED_NUMBERS, WHEEL_ORDER, pocketColor, type RouletteBet, type PlacedBet } from '@/engine/games/roulette.ts';
import { LIVE_CONFIG } from '@/engine/meta/live.ts';
import { IntroWheel } from '@/features/brand/Splash';
import { BetInput } from '@/games/shared/BetInput';
import { useSession } from '@/state/session';
import { usePlayErrors } from '@/games/shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { BetsFeed, LiveFrame } from './LiveParts';
import { useLive, type LiveBetRow } from './useLive';

const SEG = 360 / 37;
const colorOf = (n: number) => (n === 0 ? '#16C47F' : RED_NUMBERS.has(n) ? '#E8304F' : '#231A3A');

export default function LiveRoulette() {
  const { t } = useT();
  const { width } = useWindowDimensions();
  const live = useLive('roulette');
  const balance = useSession((s) => s.balance) ?? 0;
  const cfg = LIVE_CONFIG.roulette;
  const [chip, setChip] = useState(20);
  const [busy, setBusy] = useState(false);
  const onError = usePlayErrors();
  const rot = useSharedValue(0);
  const [areaH, setAreaH] = useState(300);
  const size = Math.max(150, Math.min(width - 80, 260, areaH - 56));
  const result = live.round?.result && 'number' in live.round.result ? live.round.result.number : null;
  const spinning = live.phase === 'show';
  const revealed = live.phase === 'results' || (live.phase === 'show' && live.now - live.startsAt > cfg.show - 600);

  // spin to the drawn number, in sync with everybody (late joiners land straight on it)
  useEffect(() => {
    if (result === null || (live.phase !== 'show' && live.phase !== 'results')) return;
    const idx = (WHEEL_ORDER as readonly number[]).indexOf(result);
    const target = 360 * 7 - idx * SEG;
    const left = cfg.show - (Date.now() - live.startsAt);
    if (left <= 300) rot.set(target);
    else {
      rot.set(0);
      sfx('roll', 0.5);
      rot.set(withTiming(target, { duration: left, easing: Easing.out(Easing.cubic) }));
    }
  }, [result, live.round?.slot]); // eslint-disable-line react-hooks/exhaustive-deps
  const wheel = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  const place = async (bet: RouletteBet) => {
    if (busy) return;
    try {
      setBusy(true);
      await live.placeBet({ bet, amount: chip } as PlacedBet);
      sfx('chip');
      haptic.select();
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const describe = (b: LiveBetRow) => {
    const x = (b.bet as PlacedBet).bet;
    return x.kind === 'straight' ? `${t('live.number')} ${x.numbers[0]}` : x.kind === 'dozen' ? `${x.dozen}ª ${t('live.dozen')}` : t(`live.r.${x.kind}`);
  };
  const BTN: { label: string; bet: RouletteBet; bg: string }[] = [
    { label: t('live.r.red'), bet: { kind: 'red' }, bg: '#E8304F' },
    { label: t('live.r.black'), bet: { kind: 'black' }, bg: '#231A3A' },
    { label: '0', bet: { kind: 'straight', numbers: [0] }, bg: '#16C47F' },
    { label: t('live.r.even'), bet: { kind: 'even' }, bg: '#3A2A7A' },
    { label: t('live.r.odd'), bet: { kind: 'odd' }, bg: '#3A2A7A' },
    { label: '1–18', bet: { kind: 'low' }, bg: '#3A2A7A' },
    { label: '19–36', bet: { kind: 'high' }, bg: '#3A2A7A' },
    { label: `1ª ${t('live.dozen')}`, bet: { kind: 'dozen', dozen: 1 }, bg: '#4B2BD6' },
    { label: `2ª ${t('live.dozen')}`, bet: { kind: 'dozen', dozen: 2 }, bg: '#4B2BD6' },
    { label: `3ª ${t('live.dozen')}`, bet: { kind: 'dozen', dozen: 3 }, bg: '#4B2BD6' },
  ];
  const open = live.phase === 'betting';
  return (
    <LiveFrame
      title={t('live.roulette')}
      phase={live.phase}
      closesAt={live.closesAt}
      endsAt={live.endsAt}
      now={live.now}
      footer={
        <>
          <View style={styles.grid}>
            {BTN.map((b) => (
              <PressableScale key={b.label} onPress={() => void place(b.bet)} disabled={!open || busy || chip > balance} feedback="none" scaleTo={0.94} accessibilityLabel={`${b.label} · ${chip}`} style={[styles.btn, { backgroundColor: b.bg, opacity: open ? 1 : 0.4 }]}>
                <T weight="display" style={{ color: '#fff', fontSize: 13 }}>{b.label}</T>
              </PressableScale>
            ))}
          </View>
          <BetInput value={chip} onChange={setChip} balance={balance} min={cfg.min} max={cfg.max} disabled={!open} />
        </>
      }
    >
      {/* last results */}
      <View style={styles.history}>
        {live.history.slice(0, 10).map((r) => {
          const n = r.result && 'number' in r.result ? r.result.number : null;
          return n === null ? null : <View key={r.slot} style={[styles.hist, { backgroundColor: colorOf(n) }]}><T weight="displaySemi" style={{ color: '#fff', fontSize: 11 }}>{n}</T></View>;
        })}
      </View>
      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }} onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}>
        <View style={{ width: size, height: size + 16, alignItems: 'center' }}>
          <Animated.View style={[{ marginTop: 16 }, wheel]}><IntroWheel size={size} /></Animated.View>
          <View style={styles.pointer}><Svg width={30} height={30}><Polygon points="15,28 3,4 27,4" fill="#FFFFFF" stroke="#231A3A" strokeWidth={2} /></Svg></View>
          {revealed && result !== null ? (
            <Animated.View key={live.round?.slot} entering={ZoomIn.springify()} style={[styles.result, { top: 16 + size / 2 - 38, backgroundColor: colorOf(result) }]}>
              <T weight="display" tabular style={{ color: '#fff', fontSize: 34 }}>{result}</T>
              <T variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>{t(`live.r.${pocketColor(result) === 'green' ? 'zero' : pocketColor(result)}`)}</T>
            </Animated.View>
          ) : null}
        </View>
        <View style={{ height: 24, justifyContent: 'center' }}>{spinning ? <T weight="displaySemi" style={{ color: '#fff' }}>{t('live.noMoreBets')}</T> : null}</View>
      </View>
      <T variant="footnote" color="text2" style={{ marginLeft: 12, marginBottom: 6 }}>{t('live.bets')} ({live.bets.length})</T>
      <View style={{ marginBottom: 10 }}><BetsFeed bets={live.bets} myId={live.myId} describe={describe} /></View>
    </LiveFrame>
  );
}

const styles = StyleSheet.create({
  history: { flexDirection: 'row', gap: 4, justifyContent: 'center', minHeight: 22 },
  hist: { width: 24, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  pointer: { position: 'absolute', top: 0 },
  result: { position: 'absolute', width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFD06B' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  btn: { minWidth: '18%', flexGrow: 1, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
});
