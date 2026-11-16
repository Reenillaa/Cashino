import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, PlayingCard, PressableScale, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { parseCard } from '@/engine/cards/cards.ts';
import { DT_TIE_PAYS, dtValue, type DTBet } from '@/engine/games/dragontiger.ts';
import { useGameSession, PlayError } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { ChipToken, chipFor } from '../shared/ChipRack';
import { Felt } from '../shared/Felt';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

interface DView { dragon: string; tiger: string; winner: DTBet }
const SIDE = { dragon: { emoji: '🐉', colors: ['#12C08A', '#0B6E52'] as [string, string] }, tiger: { emoji: '🐯', colors: ['#FFB938', '#B8670A'] as [string, string] } };

export default function DragonTigerScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('dragontiger');
  const [chip, setChip] = useBet('dragontiger', s.room);
  const [bets, setBets] = useState<Partial<Record<DTBet, number>>>({});
  const [coup, setCoup] = useState<DView | null>(null);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('dragontiger', (d) => d);
  const total = Object.values(bets).reduce((a, b) => a + (b ?? 0), 0);
  const clash = useSharedValue(0);

  const place = (k: DTBet) => {
    if (busy) return;
    if (total + chip > s.balance) return onError(new PlayError('insufficient'));
    if (total + chip > s.room.max) return onError(new PlayError(`room_max:${s.room.max}`));
    setCoup(null);
    setShown(0);
    setBets((b) => ({ ...b, [k]: (b[k] ?? 0) + chip }));
    sfx('chip');
    haptic.select();
    tutorialEvent('dragontiger', 'dt:place');
  };
  const deal = async () => {
    try {
      setBusy(true);
      setShown(0);
      const r = await s.op('play', { bets });
      const v = r.view as unknown as DView;
      setCoup(v);
      setShown(1);
      sfx('card');
      if (!reduceMotion) await wait(650);
      setShown(2);
      sfx('card');
      if (!reduceMotion) await wait(700);
      clash.set(withSequence(withTiming(1, { duration: 140 }), withTiming(0, { duration: 260 })));
      const placed = total;
      setBets({});
      const label = v.winner === 'tie' ? t('play.tie') : `${t(`play.${v.winner}`)} ${dtValue(parseCard(v.winner === 'dragon' ? v.dragon : v.tiger))}–${dtValue(parseCard(v.winner === 'dragon' ? v.tiger : v.dragon))}`;
      show({ bet: placed, payout: r.payout, label });
      tutorialEvent('dragontiger', 'dt:deal');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const vsStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + clash.value * 0.5 }] }));
  const done = !!coup && shown === 2 && !busy;
  const side = (k: 'dragon' | 'tiger', idx: number) => {
    const card = coup ? (k === 'dragon' ? coup.dragon : coup.tiger) : null;
    const win = done && coup!.winner === k;
    return (
      <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
        <View style={[styles.badge, { opacity: done && !win && coup!.winner !== 'tie' ? 0.45 : 1 }]}>
          <LinearGradient colors={SIDE[k].colors} style={StyleSheet.absoluteFill} />
          <Text style={{ fontSize: 22 }}>{SIDE[k].emoji}</Text>
          <T weight="display" style={{ color: '#fff', fontSize: 14, letterSpacing: 1 }}>{t(`play.${k}`).toUpperCase()}</T>
        </View>
        <View style={[styles.cardBox, { borderColor: win ? '#FFE58A' : 'rgba(255,229,138,0.35)' }]}>
          {card && shown > idx ? (
            <PlayingCard key={`${card}-${idx}`} card={parseCard(card)} size="md" highlight={win ? '#FFE58A' : undefined} />
          ) : null}
        </View>
        {card && shown > idx ? (
          <Animated.View entering={ZoomIn.springify()} style={[styles.value, { backgroundColor: win ? '#FFD06B' : 'rgba(255,255,255,0.9)' }]}>
            <T weight="display" tabular style={{ color: '#1A1530', fontSize: 18 }}>{dtValue(parseCard(card))}</T>
          </Animated.View>
        ) : <View style={{ height: 34 }} />}
      </View>
    );
  };
  const spot = (k: DTBet, pays: string, colors: [string, string]) => (
    <PressableScale key={k} onPress={() => place(k)} feedback="none" scaleTo={0.96} accessibilityLabel={`${t(`play.${k}`)} ${pays}${bets[k] ? `, ${bets[k]}` : ''}`}
      style={[styles.spot, { flex: k === 'tie' ? 0.8 : 1, borderColor: done && coup!.winner === k ? '#FFE58A' : 'rgba(255,229,138,0.45)' }]}>
      <LinearGradient colors={[`${colors[0]}55`, `${colors[1]}22`]} style={StyleSheet.absoluteFill} />
      <T weight="display" style={{ color: '#fff', fontSize: 16 }}>{t(`play.${k}`)}</T>
      <T variant="caption" style={{ color: 'rgba(255,229,138,0.85)', fontSize: 10 }}>{pays}</T>
      {bets[k] ? (
        <View style={styles.placed}>
          <ChipToken value={chipFor(bets[k]!)} size={26} />
          <T weight="displaySemi" style={styles.amount}>{bets[k]}</T>
        </View>
      ) : null}
    </PressableScale>
  );
  return (
    <GameShell
      game="dragontiger"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={{ flex: 1, paddingHorizontal: 10, paddingBottom: 8 }}>
          <Felt shape="table" themed colors={['#5E1233', '#22050F']} style={{ flex: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 30, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {side('dragon', 0)}
                <Animated.View style={[styles.vs, vsStyle]}>
                  <T weight="display" style={{ color: '#FFE58A', fontSize: 15 }}>VS</T>
                </Animated.View>
                {side('tiger', 1)}
              </View>
              <TutorialTarget id="dt:place" style={{ flexDirection: 'row', gap: 8 }}>
                {spot('dragon', '1:1', SIDE.dragon.colors)}
                {spot('tie', `${DT_TIE_PAYS}:1`, ['#7B5CFF', '#4B2BD6'])}
                {spot('tiger', '1:1', SIDE.tiger.colors)}
              </TutorialTarget>
            </View>
          </Felt>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <T variant="footnote" color="text2" style={{ flex: 1 }}>{t('play.totalBet')}: <T variant="footnote" weight="semibold" tabular>{formatCoins(total)}</T></T>
            <Button title={t('common.clear')} kind="ghost" size="sm" onPress={() => setBets({})} disabled={!total || busy} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={chip} onChange={setChip} balance={s.balance} min={s.room.min} max={s.room.max} label={t('play.chipValue')} /></View>
            <Button spot="dt:deal" title={t('play.deal')} onPress={deal} loading={busy} disabled={!total || total > s.balance || total < s.room.min} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, overflow: 'hidden' },
  cardBox: { width: 70, height: 94, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 40, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  vs: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255,229,138,0.6)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  spot: { height: 72, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  placed: { position: 'absolute', top: -14, right: -4, flexDirection: 'row', alignItems: 'center', gap: 2 },
  amount: { color: '#fff', fontSize: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 4, borderRadius: 6, overflow: 'hidden' },
});
