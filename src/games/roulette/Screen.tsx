import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Icon, PressableScale, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { RouletteWheelArt } from './WheelArt';
import { WHEEL_ORDER, pocketColor, betKey, type RouletteBet } from '@/engine/games/roulette.ts';
import { useGameSession, PlayError } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { GameShell } from '../shared/GameShell';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { BetInput } from '../shared/BetInput';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const RED = '#E8304F';
const BLACK = '#17111F';
const GREEN = '#16C47F';
const SEG = 360 / 37;
const numColor = (n: number) => (pocketColor(n) === 'red' ? RED : pocketColor(n) === 'black' ? BLACK : GREEN);

/**
 * The wheel is also the number board: tap a pocket to bet on that number (a chip appears on it).
 * Gold rim, turret in the middle; pockets keep their chips while it spins.
 */
function Wheel({ size, placed, onPick, disabled }: { size: number; placed: Record<number, number>; onPick: (n: number) => void; disabled: boolean }) {
  return (
    <RouletteWheelArt size={size} id="rlw" onPocket={disabled ? undefined : onPick}
      overlay={(n, x, y) => (placed[n] ? <Circle cx={x} cy={y} r={size * 0.03} fill="#FFB938" stroke="#FFFFFF" strokeWidth={1.4} /> : null)} />
  );
}

type Spot = { bet: RouletteBet; label: string; colors?: [string, string] };

export default function RouletteScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('roulette');
  const [chip, setChip] = useBet('roulette', s.room);
  const [bets, setBets] = useState<Record<string, { bet: RouletteBet; amount: number }>>({});
  const [stack, setStack] = useState<{ k: string; amount: number }[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<{ number: number; winning: string[] } | null>(null);
  const [box, setBox] = useState({ w: 360, h: 520 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('roulette', (d) => d);
  const wheelRot = useSharedValue(0);
  const ballRot = useSharedValue(0);
  const ballR = useSharedValue(0);
  const lastBets = useRef<typeof bets>({});
  const total = Object.values(bets).reduce((a, b) => a + b.amount, 0);
  // The wheel takes what is left after the three rows of bets (≈ 3 × 53 px + hint).
  const rowH = box.h < 400 ? 36 : 46;
  const size = Math.max(100, Math.min(box.w * 0.66, box.h - (rowH * 3 + 14 + 48), 280));

  const place = (bet: RouletteBet) => {
    if (spinning) return;
    if (total + chip > s.balance) return onError(new PlayError('insufficient'));
    if (total + chip > s.room.max) return onError(new PlayError(`room_max:${s.room.max}`));
    const k = betKey(bet);
    setLast(null);
    setBets((b) => ({ ...b, [k]: { bet, amount: (b[k]?.amount ?? 0) + chip } }));
    setStack((st) => [...st, { k, amount: chip }]);
    sfx('chip');
    haptic.select();
    tutorialEvent('roulette', 'roulette:place');
  };
  const undo = () => {
    const top = stack[stack.length - 1];
    if (!top) return;
    setStack((st) => st.slice(0, -1));
    setBets((b) => {
      const cur = b[top.k];
      if (!cur) return b;
      const amount = cur.amount - top.amount;
      const nb = { ...b };
      if (amount <= 0) delete nb[top.k];
      else nb[top.k] = { ...cur, amount };
      return nb;
    });
  };
  const repeat = () => {
    const lb = lastBets.current;
    const sum = Object.values(lb).reduce((a, b) => a + b.amount, 0);
    if (sum && sum <= s.balance && sum >= s.room.min && sum <= s.room.max) {
      setBets(lb);
      setStack(Object.entries(lb).map(([k, v]) => ({ k, amount: v.amount })));
      sfx('chip');
    }
  };
  const spin = async () => {
    try {
      setSpinning(true);
      const placed = Object.values(bets);
      const r = await s.op('play', { bets: placed });
      const v = r.view as { number: number; winning: string[] };
      const idx = WHEEL_ORDER.indexOf(v.number as (typeof WHEEL_ORDER)[number]);
      const dur = reduceMotion ? 0 : 4200;
      const wEnd = wheelRot.get() + 720 + Math.random() * 360;
      const target = (((wEnd + idx * SEG) % 360) + 360) % 360;
      const bEnd = target - 360 * 4;
      sfx('roll', 0.5);
      wheelRot.set(withTiming(wEnd, { duration: dur, easing: Easing.out(Easing.cubic) }));
      ballRot.set(ballRot.get() % 360);
      ballRot.set(withTiming(bEnd, { duration: dur, easing: Easing.out(Easing.cubic) }));
      ballR.set(0);
      ballR.set(withTiming(1, { duration: dur, easing: Easing.in(Easing.quad) }));
      await wait(dur);
      sfx('balldrop');
      setLast(v);
      lastBets.current = bets;
      setBets({});
      setStack([]);
      show({ bet: placed.reduce((a, b) => a + b.amount, 0), payout: r.payout, label: `${v.number}` });
      tutorialEvent('roulette', 'roulette:spin');
    } catch (e) {
      onError(e);
    } finally {
      setSpinning(false);
    }
  };
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wheelRot.value}deg` }] }));
  const ballStyle = useAnimatedStyle(() => {
    const radius = size / 2 - size * 0.06 - ballR.value * (size * 0.1);
    const a = ((ballRot.value - 90) * Math.PI) / 180;
    return { transform: [{ translateX: size / 2 - 7 + radius * Math.cos(a) }, { translateY: size / 2 - 7 + radius * Math.sin(a) }] };
  });

  const straight: Record<number, number> = {};
  Object.values(bets).forEach((b) => {
    if (b.bet.kind === 'straight') straight[b.bet.numbers[0]] = b.amount;
  });
  const spot = (sp: Spot, flex = 1) => {
    const k = betKey(sp.bet);
    const win = !!last && last.winning.includes(k);
    return <BigSpot key={k} label={sp.label} colors={sp.colors} placed={bets[k]?.amount} win={win} flex={flex} h={rowH} onPress={() => place(sp.bet)} />;
  };
  return (
    <GameShell
      game="roulette"
      mode={s.mode}
      balance={s.balance}
      locked={spinning}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 14 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={{ width: size, height: size, marginTop: 4 }} accessibilityLabel={last ? `${last.number}` : t('play.spin')}>
            <View style={[StyleSheet.absoluteFill, styles.glow, { borderRadius: size / 2 }]} />
            <Animated.View style={[StyleSheet.absoluteFill, wheelStyle]}>
              <Wheel size={size} placed={straight} onPick={(n) => place({ kind: 'straight', numbers: [n] })} disabled={spinning} />
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.ball, ballStyle]} />
            {last ? (
              <Animated.View key={last.number} entering={reduceMotion ? undefined : ZoomIn.springify().damping(12)} pointerEvents="none" style={[styles.landed, { backgroundColor: numColor(last.number), left: size / 2 - 30, top: size / 2 - 30 }]}>
                <T weight="display" style={{ color: '#fff', fontSize: 24 }}>{last.number}</T>
              </Animated.View>
            ) : null}
          </View>
          <T variant="footnote" color="text2" align="center" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 6, marginBottom: 8 }}>{spinning ? t('play.noMoreBets') : t('play.tapNumber')}</T>
          <TutorialTarget id="roulette:place" style={{ alignSelf: 'stretch', gap: 7 }}>
            <View style={styles.row}>
              {spot({ bet: { kind: 'red' }, label: t('play.red'), colors: ['#FF4F6A', '#B3123C'] }, 1.3)}
              {spot({ bet: { kind: 'straight', numbers: [0] }, label: '0', colors: ['#2BE09A', '#0B8A55'] }, 0.6)}
              {spot({ bet: { kind: 'black' }, label: t('play.black'), colors: ['#3A2E50', '#120C1C'] }, 1.3)}
            </View>
            <View style={styles.row}>
              {spot({ bet: { kind: 'even' }, label: t('play.even') })}
              {spot({ bet: { kind: 'odd' }, label: t('play.odd') })}
              {spot({ bet: { kind: 'low' }, label: '1–18' })}
              {spot({ bet: { kind: 'high' }, label: '19–36' })}
            </View>
            <View style={styles.row}>
              {([1, 2, 3] as const).map((d) => spot({ bet: { kind: 'dozen', dozen: d }, label: `${12 * (d - 1) + 1}–${12 * d}` }))}
            </View>
          </TutorialTarget>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <View style={styles.tools}>
            <T variant="footnote" color="text2" style={{ flex: 1 }}>
              {t('play.totalBet')}: <T variant="footnote" weight="semibold" tabular color={total && total < s.room.min ? 'warn' : 'text'}>{formatCoins(total)}</T>
            </T>
            <Tool icon="refresh" label={t('play.repeat')} onPress={repeat} disabled={spinning || total > 0} />
            <Tool icon="arrowDown" label={t('play.undo')} onPress={undo} disabled={!stack.length || spinning} rotate />
            <Tool icon="trash" label={t('common.clear')} onPress={() => { setBets({}); setStack([]); }} disabled={!total || spinning} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={chip} onChange={setChip} balance={s.balance} min={s.room.min} max={s.room.max} label={t('play.chipValue')} /></View>
            <Button spot="roulette:spin" title={t('play.spin')} onPress={spin} loading={spinning} disabled={!total || total > s.balance || total < s.room.min} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

function BigSpot({ label, colors, placed, win, flex, h, onPress }: { label: string; colors?: [string, string]; placed?: number; win: boolean; flex: number; h: number; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} feedback="none" scaleTo={0.93} accessibilityLabel={`${label}${placed ? `, ${placed}` : ''}`} style={[styles.spot, { flex, height: h, borderColor: win ? '#FFE58A' : 'rgba(255,229,138,0.35)', borderWidth: win ? 2.5 : 1 }]}>
      <LinearGradient colors={colors ?? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <T weight="displaySemi" style={{ color: '#fff', fontSize: 13 }}>{label}</T>
      {placed ? (
        <Animated.View entering={FadeIn} style={styles.placed}>
          <T weight="display" style={{ color: '#3A1A00', fontSize: 10 }}>{placed >= 1000 ? `${placed / 1000}k` : placed}</T>
        </Animated.View>
      ) : null}
    </PressableScale>
  );
}

function Tool({ icon, label, onPress, disabled, rotate }: { icon: 'refresh' | 'arrowDown' | 'trash'; label: string; onPress: () => void; disabled?: boolean; rotate?: boolean }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={label} hitSlop={6} style={[styles.tool, { backgroundColor: c.surface2 }]}>
      <View style={rotate ? { transform: [{ rotate: '90deg' }] } : undefined}>
        <Icon name={icon} size={17} color={c.text} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  glow: { shadowColor: '#FFB938', shadowOpacity: 0.45, shadowRadius: 26 },
  ball: { position: 'absolute', left: 0, top: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D8D2E8', shadowColor: '#fff', shadowOpacity: 0.8, shadowRadius: 6 },
  landed: { position: 'absolute', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFE58A' },
  row: { flexDirection: 'row', gap: 7 },
  spot: { height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  placed: { position: 'absolute', right: 4, top: 4, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 4, backgroundColor: '#FFB938', borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tool: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
