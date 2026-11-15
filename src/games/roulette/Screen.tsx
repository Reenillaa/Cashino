import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { Button, PressableScale, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { WHEEL_ORDER, pocketColor, betKey, type RouletteBet } from '@/engine/games/roulette.ts';
import { useGameSession, PlayError } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { ChipRack, ChipToken, chipFor } from '../shared/ChipRack';
import { useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';

const RED = '#C8323A';
const BLACK = '#1C1F24';
const GREEN = '#1E8E5A';
const SEG = 360 / 37;

function Wheel({ size }: { size: number }) {
  const r = size / 2;
  const wedge = (i: number) => {
    const a0 = ((i * SEG - SEG / 2 - 90) * Math.PI) / 180;
    const a1 = ((i * SEG + SEG / 2 - 90) * Math.PI) / 180;
    const ro = r - 4, ri = r * 0.62;
    return `M${r + ro * Math.cos(a0)},${r + ro * Math.sin(a0)} A${ro},${ro} 0 0 1 ${r + ro * Math.cos(a1)},${r + ro * Math.sin(a1)} L${r + ri * Math.cos(a1)},${r + ri * Math.sin(a1)} A${ri},${ri} 0 0 0 ${r + ri * Math.cos(a0)},${r + ri * Math.sin(a0)} Z`;
  };
  return (
    <Svg width={size} height={size}>
      <Circle cx={r} cy={r} r={r - 1} fill="#2A2E35" />
      {WHEEL_ORDER.map((n, i) => {
        const col = pocketColor(n);
        return (
          <G key={n}>
            <Path d={wedge(i)} fill={col === 'red' ? RED : col === 'black' ? BLACK : GREEN} stroke="#8E959F" strokeWidth={0.6} />
            <SvgText
              x={r}
              y={r - (r - 4) * 0.82}
              fontSize={size * 0.045}
              fontWeight="600"
              fill="#F3F4F6"
              textAnchor="middle"
              rotation={i * SEG}
              origin={`${r},${r}`}
            >
              {n}
            </SvgText>
          </G>
        );
      })}
      <Circle cx={r} cy={r} r={r * 0.6} fill="#15171B" stroke="#8E959F" strokeWidth={1} />
      <Circle cx={r} cy={r} r={r * 0.18} fill="#C5CAD1" />
      {[0, 90, 180, 270].map((a) => (
        <Path key={a} d={`M${r} ${r - r * 0.18} L${r} ${r - r * 0.5}`} stroke="#C5CAD1" strokeWidth={4} strokeLinecap="round" rotation={a} origin={`${r},${r}`} />
      ))}
    </Svg>
  );
}

const OUTSIDE: { bet: RouletteBet; labelKey: string }[] = [
  { bet: { kind: 'low' }, labelKey: '1–18' },
  { bet: { kind: 'even' }, labelKey: 'play.even' },
  { bet: { kind: 'red' }, labelKey: 'play.red' },
  { bet: { kind: 'black' }, labelKey: 'play.black' },
  { bet: { kind: 'odd' }, labelKey: 'play.odd' },
  { bet: { kind: 'high' }, labelKey: '19–36' },
];

export default function RouletteScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('roulette');
  const [chipPick, setChip] = useState<number | null>(null);
  const chip = chipPick !== null && s.room.chips.includes(chipPick) ? chipPick : s.room.chips[1];
  const [bets, setBets] = useState<Record<string, { bet: RouletteBet; amount: number }>>({});
  const [stack, setStack] = useState<string[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [last, setLast] = useState<{ number: number; winning: string[] } | null>(null);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('roulette', (d) => d);
  const wheelRot = useSharedValue(0);
  const ballRot = useSharedValue(0);
  const ballR = useSharedValue(0);
  const lastBets = useRef<typeof bets>({});
  const total = Object.values(bets).reduce((a, b) => a + b.amount, 0);
  const size = 220;

  const place = (bet: RouletteBet) => {
    if (spinning) return;
    if (total + chip > s.balance) return onError(new PlayError('insufficient'));
    if (total + chip > s.room.max) return onError(new PlayError(`room_max:${s.room.max}`));
    const k = betKey(bet);
    setLast(null);
    setBets((b) => ({ ...b, [k]: { bet, amount: (b[k]?.amount ?? 0) + chip } }));
    setStack((st) => [...st, k]);
    sfx('chip');
    haptic.select();
    tutorialEvent('roulette', 'roulette:place');
  };
  const undo = () => {
    const k = stack[stack.length - 1];
    if (!k) return;
    setStack((st) => st.slice(0, -1));
    setBets((b) => {
      const cur = b[k];
      if (!cur) return b;
      const amount = cur.amount - chip;
      const nb = { ...b };
      if (amount <= 0) delete nb[k];
      else nb[k] = { ...cur, amount };
      return nb;
    });
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
    const radius = size / 2 - 10 - ballR.value * (size * 0.12);
    const a = ((ballRot.value - 90) * Math.PI) / 180;
    return { transform: [{ translateX: size / 2 - 6 + radius * Math.cos(a) }, { translateY: size / 2 - 6 + radius * Math.sin(a) }] };
  });

  /** Render helper (not a component): returns a module-level BetCell element. */
  const cell = (bet: RouletteBet, label: string, color?: string) => {
    const k = betKey(bet);
    const win = !!last && (last.winning.includes(k) || (bet.kind === 'straight' && last.number === bet.numbers[0]));
    return <BetCell key={k} label={label} color={color} placed={bets[k]?.amount} win={win} onPress={() => place(bet)} />;
  };
  const numColor = (n: number) => (pocketColor(n) === 'red' ? RED : pocketColor(n) === 'black' ? BLACK : GREEN);
  return (
    <GameShell
      game="roulette"
      mode={s.mode}
      balance={s.balance}
      locked={spinning}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            <View style={{ width: size, height: size }} accessibilityLabel={last ? `${last.number}` : t('play.spin')}>
              <Animated.View style={[StyleSheet.absoluteFill, wheelStyle]}>
                <Wheel size={size} />
              </Animated.View>
              <Animated.View style={[styles.ball, ballStyle]} />
            </View>
            {last && <T variant="headline" style={{ marginTop: 8, color: numColor(last.number) === BLACK ? c.text : numColor(last.number) }}>{last.number}</T>}
            <TutorialTarget id="roulette:place">
            <View style={[styles.board, { borderColor: c.hairline }]}>
              <View style={styles.row}>{cell({ kind: 'straight', numbers: [0] }, '0', GREEN)}</View>
              {Array.from({ length: 12 }, (_, r) => (
                <View key={r} style={styles.row}>
                  {[3 * r + 1, 3 * r + 2, 3 * r + 3].map((n) => cell({ kind: 'straight', numbers: [n] }, `${n}`, numColor(n)))}
                </View>
              ))}
              <View style={styles.row}>{([1, 2, 3] as const).map((col) => cell({ kind: 'column', column: col }, '2:1'))}</View>
              <View style={styles.row}>{([1, 2, 3] as const).map((d) => cell({ kind: 'dozen', dozen: d }, `${12 * (d - 1) + 1}–${12 * d}`))}</View>
              <View style={styles.row}>{OUTSIDE.slice(0, 3).map((o) => cell(o.bet, o.labelKey.startsWith('play.') ? t(o.labelKey) : o.labelKey, o.bet.kind === 'red' ? RED : undefined))}</View>
              <View style={styles.row}>{OUTSIDE.slice(3).map((o) => cell(o.bet, o.labelKey.startsWith('play.') ? t(o.labelKey) : o.labelKey, o.bet.kind === 'black' ? BLACK : undefined))}</View>
            </View>
            </TutorialTarget>
          </ScrollView>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <ChipRack value={chip} onChange={setChip} balance={s.balance} values={s.room.chips} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
            <T variant="footnote" color="text3" style={{ flex: 1 }}>{t('play.totalBet')}: <T variant="footnote" weight="semibold" tabular color={total && total < s.room.min ? 'warn' : 'text'}>{formatCoins(total)}</T> / {formatCoins(s.room.min)}–{formatCoins(s.room.max)}</T>
            <Button title={t('play.undo')} kind="ghost" size="sm" onPress={undo} disabled={!stack.length || spinning} />
            <Button title={t('common.clear')} kind="ghost" size="sm" onPress={() => { setBets({}); setStack([]); }} disabled={!total || spinning} />
            <Button title="↻" kind="ghost" size="sm" accessibilityHint="Repeat" onPress={() => { const lb = lastBets.current; const sum = Object.values(lb).reduce((a, b) => a + b.amount, 0); if (sum <= s.balance && sum >= s.room.min && sum <= s.room.max) setBets(lb); }} disabled={spinning} />
          </View>
          <Button spot="roulette:spin" title={t('play.spin')} onPress={spin} loading={spinning} disabled={!total || total > s.balance || total < s.room.min} />
        </View>
      }
    />
  );
}

function BetCell({ label, flex = 1, color, placed, win, onPress }: { label: string; flex?: number; color?: string; placed?: number; win: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale onPress={onPress} feedback="none" scaleTo={0.94} accessibilityLabel={`${label}${placed ? `, ${placed}` : ''}`} style={[styles.cell, { flex, height: 34, backgroundColor: color ?? c.surface2, borderColor: win ? c.text : c.hairline, borderWidth: win ? 2 : StyleSheet.hairlineWidth }]}>
      <T variant="footnote" weight="semibold" style={{ color: '#F3F4F6' }}>{label}</T>
      {placed ? (
        <View style={styles.placed}>
          <ChipToken value={chipFor(placed)} size={20} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  ball: { position: 'absolute', left: 0, top: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 3 },
  board: { marginTop: 16, width: 300, gap: 3 },
  row: { flexDirection: 'row', gap: 3 },
  cell: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  placed: { position: 'absolute', right: -4, top: -6 },
});
