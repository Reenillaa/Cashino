import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { ChipToken, chipFor } from '../shared/ChipRack';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { LinearGradient } from 'expo-linear-gradient';
import { TumbleDie } from '../shared/Die';
import { Felt } from '../shared/Felt';
import { BetInput } from '../shared/BetInput';

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


export default function SicBoScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('sicbo');
  const [chip, setChip] = useBet('sicbo', s.room);
  const [more, setMore] = useState(false);
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
    if (total + chip > s.room.max) return onError(new PlayError(`room_max:${s.room.max}`));
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

  const cell = (bet: SicBoBet, opts: { label?: string; sub?: string; flex?: number; children?: React.ReactNode; big?: boolean } = {}) => {
    const k = sicBoKey(bet);
    return <SicBoCell key={k} k={k} {...opts} placed={bets[k]?.amount} win={winKeys.includes(k)} onPress={() => place(bet)} />;
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
          <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16, gap: 8 }} showsVerticalScrollIndicator={false}>
            {/* Three real dice shaken in a bowl */}
            <Felt shape="oval" colors={['#B8325C', '#4A0C26']} style={{ height: 150, marginTop: 4 }}>
              <View style={styles.dice}>
                {dice.map((d, i) => <TumbleDie key={i} face={d} rolling={rolling} size={62} delay={i * 60} glow="#FF6A3D" />)}
              </View>
            </Felt>
            <T variant="footnote" color="text2" align="center">{rolling ? '…' : `${dice[0]} + ${dice[1]} + ${dice[2]} = ${dice[0] + dice[1] + dice[2]}`}</T>
            <TutorialTarget id="sicbo:place" style={{ gap: 8 }}>
            <View style={styles.row}>
              {cell({ kind: 'small' }, { label: t('play.small'), sub: '4–10 · 1:1', big: true })}
              {cell({ kind: 'big' }, { label: t('play.big'), sub: '11–17 · 1:1', big: true })}
            </View>
            <View style={styles.row}>
              {cell({ kind: 'odd' }, { label: t('play.odd'), sub: '1:1' })}
              {cell({ kind: 'anyTriple' }, { label: t('play.anyTriple'), sub: `${SICBO_PAYS.anyTriple}:1` })}
              {cell({ kind: 'even' }, { label: t('play.even'), sub: '1:1' })}
            </View>
            </TutorialTarget>
            <PressableScale onPress={() => setMore((m) => !m)} feedback="select" style={styles.moreBtn} accessibilityLabel={t('play.moreBets')}>
              <T variant="callout" weight="semibold" style={{ color: '#fff' }}>{more ? '−' : '+'} {t('play.moreBets')}</T>
            </PressableScale>
            {more ? (<>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.total')}</T>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {Object.keys(TOTAL_PAYS).map((k) => cell({ kind: 'total', total: Number(k) }, { label: k, sub: `${TOTAL_PAYS[Number(k)]}:1`, flex: 0 }))}
            </View>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.single')} · 1:1 / 2:1 / 3:1</T>
            <View style={styles.row}>{[1, 2, 3, 4, 5, 6].map((f) => cell({ kind: 'single', face: f }, { children: <Die value={f} size={22} /> }))}</View>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.doubleBet')} · {SICBO_PAYS.double}:1</T>
            <View style={styles.row}>{[1, 2, 3, 4, 5, 6].map((f) => cell({ kind: 'double', face: f }, { label: `${f}${f}` }))}</View>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.triple')} · {SICBO_PAYS.triple}:1</T>
            <View style={styles.row}>{[1, 2, 3, 4, 5, 6].map((f) => cell({ kind: 'triple', face: f }, { label: `${f}${f}${f}` }))}</View>
            <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('play.combo')} · {SICBO_PAYS.combo}:1</T>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {[1, 2, 3, 4, 5].flatMap((a) => [2, 3, 4, 5, 6].filter((b) => b > a).map((b) => cell({ kind: 'combo', faces: [a, b] }, { label: `${a}·${b}`, flex: 0 })))}
            </View>
            </>) : null}
          </ScrollView>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <T variant="footnote" color="text2" style={{ flex: 1 }}>{t('play.totalBet')}: <T variant="footnote" weight="semibold" tabular color={total && total < s.room.min ? 'warn' : 'text'}>{formatCoins(total)}</T></T>
            <Button title={t('common.clear')} kind="ghost" size="sm" onPress={() => setBets({})} disabled={!total || rolling} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={chip} onChange={setChip} balance={s.balance} min={s.room.min} max={s.room.max} label={t('play.chipValue')} /></View>
            <Button spot="sicbo:roll" title={t('play.roll')} onPress={roll} loading={rolling} disabled={!total || total > s.balance || total < s.room.min} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

function SicBoCell({ k, label, sub, flex = 1, children, placed, win, big, onPress }: { k: string; label?: string; sub?: string; flex?: number; children?: React.ReactNode; placed?: number; win: boolean; big?: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} feedback="none" scaleTo={0.94} accessibilityLabel={`${label ?? k} ${sub ?? ''}${placed ? `, ${placed}` : ''}`} style={[styles.cell, { flex, minHeight: big ? 62 : 46, backgroundColor: win ? alpha(tint, 0.45) : 'rgba(255,255,255,0.08)', borderColor: win ? '#FFE58A' : 'rgba(255,229,138,0.3)' }]}>
      {big ? <LinearGradient colors={['rgba(255,106,61,0.55)', 'rgba(217,33,127,0.45)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      {children}
      {label ? <T weight={big ? 'displaySemi' : 'semibold'} style={{ color: '#fff', fontSize: big ? 16 : 13 }}>{label}</T> : null}
      {sub ? <T variant="caption" color="text3" style={{ fontSize: 9, letterSpacing: 0.2 }}>{sub}</T> : null}
      {placed ? <View style={styles.placed}><ChipToken value={chipFor(placed)} size={18} /></View> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  dice: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingTop: 14 },
  moreBtn: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', gap: 6 },
  cell: { minWidth: 46, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingHorizontal: 4, paddingVertical: 4, overflow: 'hidden' },
  placed: { position: 'absolute', right: -4, top: -6 },
});
