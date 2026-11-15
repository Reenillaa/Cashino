import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';
import { Button, PressableScale, T, formatCoins } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { useT } from '@/i18n';
import { sicBoKey, TOTAL_PAYS, SICBO_PAYS, type SicBoBet } from '@/engine/games/sicbo.ts';
import { useGameSession, PlayError } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { ChipRack, ChipToken } from '../shared/ChipRack';
import { useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const tint = META.sicbo.tint;
const PIPS: Record<number, [number, number][]> = {
  1: [[2, 2]], 2: [[1, 1], [3, 3]], 3: [[1, 1], [2, 2], [3, 3]], 4: [[1, 1], [3, 1], [1, 3], [3, 3]],
  5: [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]], 6: [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]],
};

export function Die({ value, size = 56, color = '#F6F7F9', pip = '#111317' }: { value: number; size?: number; color?: string; pip?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel={`${value}`}>
      <Rect x="1" y="1" width="38" height="38" rx="9" fill={color} />
      {PIPS[value].map(([x, y], i) => <Circle key={i} cx={x * 10} cy={y * 10} r={3.4} fill={value === 1 ? '#C8323A' : pip} />)}
    </Svg>
  );
}

function RollingDie({ value, rolling, delay }: { value: number; rolling: boolean; delay: number }) {
  const rot = useSharedValue(0);
  const [face, setFace] = useState(value);
  React.useEffect(() => {
    if (!rolling) {
      setFace(value);
      rot.value = withTiming(0, { duration: 200 });
      return;
    }
    rot.value = withRepeat(withSequence(withTiming(18, { duration: 70 }), withTiming(-18, { duration: 70 })), -1, true);
    const id = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 90 + delay);
    return () => clearInterval(id);
  }, [rolling, value]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return <Animated.View style={st}><Die value={face} size={64} /></Animated.View>;
}

export default function SicBoScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('sicbo');
  const [chip, setChip] = useState(10);
  const [bets, setBets] = useState<Record<string, { bet: SicBoBet; amount: number }>>({});
  const [dice, setDice] = useState<[number, number, number]>([1, 3, 5]);
  const [rolling, setRolling] = useState(false);
  const [winKeys, setWinKeys] = useState<string[]>([]);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('sicbo', (d) => d);
  const total = Object.values(bets).reduce((a, b) => a + b.amount, 0);

  const place = (bet: SicBoBet) => {
    if (rolling) return;
    if (total + chip > s.balance) return onError(new PlayError('insufficient'));
    const k = sicBoKey(bet);
    setWinKeys([]);
    setBets((b) => ({ ...b, [k]: { bet, amount: (b[k]?.amount ?? 0) + chip } }));
    sfx('chip');
    haptic.select();
    tutorialEvent('sicbo', 'sicbo:place');
  };
  const roll = async () => {
    try {
      setRolling(true);
      sfx('dice');
      const placed = Object.values(bets);
      const r = await s.op('play', { bets: placed });
      const v = r.view as { dice: [number, number, number]; lines: { key: string; returned: number }[] };
      if (!reduceMotion) await wait(900);
      setDice(v.dice);
      setRolling(false);
      setWinKeys(v.lines.filter((l) => l.returned > 0).map((l) => l.key));
      setBets({});
      show({ bet: placed.reduce((a, b) => a + b.amount, 0), payout: r.payout, label: `${v.dice.join(' · ')} = ${v.dice[0] + v.dice[1] + v.dice[2]}` });
      tutorialEvent('sicbo', 'sicbo:roll');
    } catch (e) {
      setRolling(false);
      onError(e);
    }
  };

  const Cell = ({ bet, label, sub, flex = 1, children }: { bet: SicBoBet; label?: string; sub?: string; flex?: number; children?: React.ReactNode }) => {
    const k = sicBoKey(bet);
    const placed = bets[k]?.amount;
    const win = winKeys.includes(k);
    return (
      <PressableScale onPress={() => place(bet)} feedback="none" scaleTo={0.94} accessibilityLabel={`${label ?? k} ${sub ?? ''}${placed ? `, ${placed}` : ''}`} style={[styles.cell, { flex, backgroundColor: win ? alpha(tint, 0.35) : c.surface2, borderColor: win ? tint : c.hairline }]}>
        {children}
        {label ? <T variant="footnote" weight="semibold">{label}</T> : null}
        {sub ? <T variant="caption" color="text3" style={{ fontSize: 9, letterSpacing: 0.2 }}>{sub}</T> : null}
        {placed ? <View style={styles.placed}><ChipToken value={[1000, 500, 100, 25, 10, 5, 1].find((x) => x <= placed) ?? 1} size={18} /></View> : null}
      </PressableScale>
    );
  };
  return (
    <GameShell
      game="sicbo"
      mode={s.mode}
      balance={s.balance}
      locked={rolling}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 6 }} showsVerticalScrollIndicator={false}>
            <View style={styles.dice}>
              {dice.map((d, i) => <RollingDie key={i} value={d} rolling={rolling} delay={i * 13} />)}
            </View>
            <View style={styles.row}>
              <Cell bet={{ kind: 'small' }} label={t('play.small')} sub="4–10 · 1:1" />
              <Cell bet={{ kind: 'odd' }} label={t('play.odd')} sub="1:1" />
              <Cell bet={{ kind: 'anyTriple' }} label={t('play.anyTriple')} sub={`${SICBO_PAYS.anyTriple}:1`} />
              <Cell bet={{ kind: 'even' }} label={t('play.even')} sub="1:1" />
              <Cell bet={{ kind: 'big' }} label={t('play.big')} sub="11–17 · 1:1" />
            </View>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.total')}</T>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {Object.keys(TOTAL_PAYS).map((k) => <Cell key={k} bet={{ kind: 'total', total: Number(k) }} label={k} sub={`${TOTAL_PAYS[Number(k)]}:1`} flex={0} />)}
            </View>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.single')} · 1:1 / 2:1 / 3:1</T>
            <View style={styles.row}>{[1, 2, 3, 4, 5, 6].map((f) => <Cell key={f} bet={{ kind: 'single', face: f }}><Die value={f} size={22} /></Cell>)}</View>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.doubleBet')} · {SICBO_PAYS.double}:1</T>
            <View style={styles.row}>{[1, 2, 3, 4, 5, 6].map((f) => <Cell key={f} bet={{ kind: 'double', face: f }} label={`${f}${f}`} />)}</View>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.triple')} · {SICBO_PAYS.triple}:1</T>
            <View style={styles.row}>{[1, 2, 3, 4, 5, 6].map((f) => <Cell key={f} bet={{ kind: 'triple', face: f }} label={`${f}${f}${f}`} />)}</View>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.combo')} · {SICBO_PAYS.combo}:1</T>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {[1, 2, 3, 4, 5].flatMap((a) => [2, 3, 4, 5, 6].filter((b) => b > a).map((b) => <Cell key={`${a}${b}`} bet={{ kind: 'combo', faces: [a, b] }} label={`${a}·${b}`} flex={0} />))}
            </View>
          </ScrollView>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <ChipRack value={chip} onChange={setChip} balance={s.balance} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
            <T variant="footnote" color="text3" style={{ flex: 1 }}>{t('play.totalBet')}: <T variant="footnote" weight="semibold" tabular>{formatCoins(total)}</T></T>
            <Button title={t('common.clear')} kind="ghost" size="sm" onPress={() => setBets({})} disabled={!total || rolling} />
          </View>
          <Button title={t('play.roll')} onPress={roll} loading={rolling} disabled={!total || total > s.balance} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  dice: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: 18 },
  row: { flexDirection: 'row', gap: 6 },
  cell: { minWidth: 46, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingHorizontal: 4, paddingVertical: 4 },
  placed: { position: 'absolute', right: -4, top: -6 },
});
