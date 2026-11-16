import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Button, Chip, PressableScale, T, formatCoins } from '@/design/components';
import { useT } from '@/i18n';
import { BET_SHAPE, BET_TYPES, oddsFor, type BetType, type HorseBet, type RaceCard, type RaceResult, type SettledLine } from '@/engine/games/horses.ts';
import { useGameSession, PlayError } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult } from '../shared/hooks';
import { RaceCardView } from './RaceCardView';
import { RaceView } from './RaceView';
import { Saddle } from './Art';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

type Phase = 'loading' | 'card' | 'race' | 'done';
const fmtOdds = (x: number) => `×${x.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;

export default function HorsesScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const s = useGameSession('horses');
  const resumed = s.active?.view as { card?: RaceCard } | undefined;
  const [bet, setBet] = useBet('horses', s.room);
  const [card, setCard] = useState<RaceCard | null>(resumed?.card ?? null);
  const [phase, setPhase] = useState<Phase>(resumed?.card ? 'card' : 'loading');
  const [type, setType] = useState<BetType>('win');
  const [picks, setPicks] = useState<number[]>([]);
  const [slip, setSlip] = useState<HorseBet[]>([]);
  const [race, setRace] = useState<RaceResult | null>(null);
  const [lines, setLines] = useState<SettledLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState({ w: 360, h: 420 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('horses', (d) => d);
  const need = BET_SHAPE[type].picks;

  const newCard = async () => {
    try {
      setBusy(true);
      setPhase('loading');
      const r = await s.op('start', {});
      setCard((r.view as { card: RaceCard }).card);
      setPicks([]);
      setSlip([]);
      setRace(null);
      setPhase('card');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (card) return;
    const id = setTimeout(() => void newCard(), 0); // first race card as soon as the room is chosen
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (n: number) => {
    if (phase !== 'card') return;
    haptic.select();
    sfx('chip', 0.5);
    tutorialEvent('horses', 'horses:pick');
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < need ? [...p, n] : [...p.slice(0, need - 1), n]));
  };
  const changeType = (k: BetType) => {
    setType(k);
    setPicks((p) => p.slice(0, BET_SHAPE[k].picks));
  };
  const current: HorseBet | null = picks.length === need ? { type, horses: picks, amount: bet } : null;
  const slipTotal = slip.reduce((a, b) => a + b.amount, 0);
  const addToSlip = () => {
    if (!current) return;
    if (slipTotal + current.amount > s.room.max) return onError(new PlayError(`room_max:${s.room.max}`));
    setSlip((x) => [...x, current]);
    setPicks([]);
    sfx('chip');
  };
  const run = async () => {
    const bets = slip.length ? slip : current ? [current] : [];
    if (!bets.length || !card) return;
    try {
      setBusy(true);
      const r = await s.op('run', { bets });
      const v = r.view as { race: RaceResult; lines: SettledLine[]; payout: number; totalBet: number };
      setRace(v.race);
      setLines(v.lines);
      setPhase('race');
      tutorialEvent('horses', 'horses:run');
      haptic.medium();
      setPending({ payout: v.payout, totalBet: v.totalBet, winner: v.race.finish[0] });
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const [pending, setPending] = useState<{ payout: number; totalBet: number; winner: number } | null>(null);
  const finished = () => {
    setPhase('done');
    if (pending && card) {
      const best = Math.max(0, ...lines.filter((l) => l.won).map((l) => l.odds));
      show({ bet: pending.totalBet, payout: pending.payout, multiplier: pending.payout > 0 ? best : undefined, label: `🏆 ${card.horses[pending.winner - 1].name}` });
    }
  };

  const name = (n: number) => card?.horses[n - 1].name ?? '';
  return (
    <GameShell
      game="horses"
      mode={s.mode}
      balance={s.balance}
      locked={phase === 'race' || busy || slip.length > 0}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {card && phase === 'card' ? <RaceCardView card={card} betType={type} picks={picks} onPick={pick} /> : null}
          {card && race && (phase === 'race' || phase === 'done') ? (
            <View>
              <RaceView card={card} race={race} width={box.w} height={Math.min(box.h, 430)} onEnd={finished} />
              {phase === 'done' ? (
                <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.podium}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                  {[1, 0, 2].map((k) => {
                    const n = race.finish[k];
                    return (
                      <View key={k} style={{ alignItems: 'center', gap: 4 }}>
                        <Saddle n={n} silks={card.horses[n - 1].silks} size={k === 0 ? 46 : 36} />
                        <T weight="displaySemi" numberOfLines={1} style={{ color: '#fff', fontSize: 11, maxWidth: 90 }}>{name(n)}</T>
                        <View style={[styles.step, { height: k === 0 ? 46 : k === 1 ? 32 : 22, backgroundColor: k === 0 ? '#FFD06B' : k === 1 ? '#D9D9E3' : '#D9741C' }]}>
                          <T weight="display" style={{ color: '#231A3A', fontSize: 16 }}>{k + 1}</T>
                        </View>
                      </View>
                    );
                  })}
                  </View>
                  {lines.length ? (
                    <View style={styles.lines}>
                      {lines.map((l, i) => (
                        <T key={i} variant="caption" numberOfLines={1} style={{ color: l.won ? '#5BE3B0' : 'rgba(255,255,255,0.6)' }}>
                          {l.won ? '✓' : '✗'} {t(`play.betTypes.${l.bet.type}`)} {l.bet.horses.join('-')} · {formatCoins(l.bet.amount)} {fmtOdds(l.odds)}{l.won ? ` → ${formatCoins(l.returned)}` : ''}
                        </T>
                      ))}
                    </View>
                  ) : null}
                </Animated.View>
              ) : null}
            </View>
          ) : null}
          <ResultBanner result={result} />
        </View>
      }
      controls={
        phase === 'card' && card ? (
          <View style={{ gap: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {BET_TYPES.map((k) => <Chip key={k} label={t(`play.betTypes.${k}`)} selected={type === k} onPress={() => changeType(k)} />)}
            </ScrollView>
            <View style={styles.summary}>
              <T variant="footnote" color="text2" numberOfLines={2} style={{ flex: 1 }}>
                {current
                  ? `${t(`play.betHelp.${type}`)} · ${picks.map((n) => `${n} ${name(n)}`).join(BET_SHAPE[type].ordered && need > 1 ? ' → ' : ' + ')}`
                  : t('play.pickHorses', { count: need - picks.length })}
              </T>
              {current ? <T weight="display" tabular style={{ color: '#FFD06B', fontSize: 20 }}>{fmtOdds(oddsFor(card, type, picks))}</T> : null}
            </View>
            {slip.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {slip.map((b, i) => (
                  <PressableScale key={i} onPress={() => setSlip((x) => x.filter((_, k) => k !== i))} feedback="select" accessibilityLabel={t('common.remove')} style={styles.slipItem}>
                    <T variant="caption" style={{ color: '#fff' }}>{t(`play.betTypes.${b.type}`)} {b.horses.join('-')} · {formatCoins(b.amount)} ✕</T>
                  </PressableScale>
                ))}
              </ScrollView>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flex: 1.1 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} /></View>
              <Button title={`＋ ${t('play.addBet')}`} kind="secondary" size="sm" onPress={addToSlip} disabled={!current} style={{ flex: 0.8 }} />
            </View>
            <Button spot="horses:run" title={`🏇 ${t('play.race')}${slip.length ? ` · ${formatCoins(slipTotal)}` : ''}`} onPress={run} loading={busy} disabled={(!slip.length && !current) || (slip.length ? slipTotal : bet) > s.balance || (slip.length ? slipTotal : bet) < s.room.min} />
          </View>
        ) : phase === 'done' ? (
          <Button title={`🐎 ${t('play.newRace')}`} onPress={newCard} loading={busy} />
        ) : (
          <View style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}>
            <T variant="footnote" color="text2">{phase === 'race' ? t('play.raceOn') : '…'}</T>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, paddingHorizontal: 12 },
  podium: { position: 'absolute', left: 0, right: 0, top: '16%', alignItems: 'center', gap: 6, paddingVertical: 12, marginHorizontal: 40, borderRadius: 22, backgroundColor: 'rgba(10,6,24,0.82)' },
  step: { width: 64, borderTopLeftRadius: 8, borderTopRightRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lines: { marginTop: 4, gap: 2, paddingHorizontal: 12, alignSelf: 'stretch' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 34 },
  slipItem: { paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: 'rgba(123,92,255,0.35)' },
});
