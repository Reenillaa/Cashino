import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, PlayingCard, T, formatCoins, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { parseCard, type Card } from '@/engine/cards/cards.ts';
import { guessProbability, legalGuesses, type HiloGuess } from '@/engine/games/hilo.ts';
import { payoutFor } from '@/engine/games/types.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { Stat, StatRow } from '../shared/Stat';
import { useBet, useGameHistory, usePlayErrors, useResult } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';

const tint = META.hilo.tint;
interface HView { bet: number; current: string; status: string; multiplier: number; steps: { card: string; guess: string; probability: number; correct: boolean }[] }

export default function HiloScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c } = useTheme();
  const s = useGameSession('hilo');
  const [bet, setBet] = useBet('hilo', s.room);
  const [view, setView] = useState<HView | null>((s.active?.view as unknown as HView) ?? null);
  const [busy, setBusy] = useState(false);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('hilo');
  const active = view?.status === 'active';
  const current: Card | null = view ? parseCard(view.current) : null;
  const lastStep = view?.steps[view.steps.length - 1];
  const correct = view?.steps.filter((x) => x.guess !== 'skip' && x.correct).length ?? 0;
  const run = async (op: string, params: Record<string, unknown> = {}) => {
    try {
      setBusy(true);
      const r = await s.op(op, params);
      const v = r.view as unknown as HView;
      setView(v);
      if (op === 'start') {
        sfx('card');
        tutorialEvent('hilo', 'hilo:start');
      } else if (op === 'guess') {
        sfx('card');
        tutorialEvent('hilo', 'hilo:guess');
        if (v.status === 'lost') {
          haptic.warning();
          show({ bet: v.bet, payout: 0 });
          tutorialEvent('hilo', 'hilo:end');
        } else sfx('reveal', 0.7);
      } else if (op === 'skip') sfx('flip');
      else if (op === 'cashout') {
        show({ bet: v.bet, payout: r.payout, multiplier: v.multiplier });
        tutorialEvent('hilo', 'hilo:end');
      }
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const labelFor = (g: HiloGuess) => t(`play.${g}`);
  const guesses = current ? legalGuesses(current) : (['higherOrSame', 'lowerOrSame'] as HiloGuess[]);
  return (
    <GameShell
      game="hilo"
      mode={s.mode}
      balance={s.balance}
      locked={active}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage}>
          <View style={styles.table}>
            {/* the deck the next card comes from */}
            <View style={styles.deck}>
              {[0, 1, 2].map((k) => (
                <View key={k} style={{ position: 'absolute', left: k * 3, top: -k * 3 }}>
                  <PlayingCard card={null} faceDown size="lg" />
                </View>
              ))}
            </View>
            <View style={[styles.glowRing, { shadowColor: lastStep && lastStep.guess !== 'skip' ? (lastStep.correct ? '#3BE39A' : '#FF5C7A') : '#AEB6FF' }]}>
              <PlayingCard key={view ? `${view.steps.length}-${view.current}` : 'none'} card={current} faceDown={!current} size="xl" dealFrom={{ x: -110, y: -10 }} />
            </View>
          </View>
          {active && current ? (
            <View style={styles.oddsRow}>
              {guesses.map((g) => (
                <View key={g} style={styles.oddsPill}>
                  <T weight="displaySemi" style={{ color: '#fff', fontSize: 12 }}>{g.startsWith('higher') ? '▲' : g.startsWith('lower') ? '▼' : '='} {(guessProbability(current, g) * 100).toFixed(0)} %</T>
                </View>
              ))}
            </View>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} style={{ flexGrow: 0, marginTop: 24 }}>
            {(view?.steps ?? []).map((st, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                <PlayingCard card={parseCard(st.card)} size="xs" dim={st.guess === 'skip'} highlight={st.guess === 'skip' ? undefined : st.correct ? c.win : c.loss} />
                <T variant="caption" color="text3" style={{ fontSize: 9 }}>{st.guess === 'skip' ? '↷' : st.correct ? '✓' : '✗'}</T>
              </View>
            ))}
          </ScrollView>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          {active && (
            <StatRow>
              <Stat label={t('play.multiplierNow')} value={correct ? formatMult(view!.multiplier) : '—'} tint={tint} />
              <Stat label={t('play.streak')} value={`${correct}`} />
            </StatRow>
          )}
          {active && current ? (
            <>
              <TutorialTarget id="hilo:guess">
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {guesses.map((g) => {
                  const p = guessProbability(current, g);
                  return <Button key={g} kind="secondary" title={labelFor(g)} subtitle={`${(p * 100).toFixed(1)} % · ${formatMult((view!.multiplier || 1) * (correct ? 1 : 0.99) / p)}`} onPress={() => run('guess', { guess: g })} disabled={busy} style={{ flex: 1 }} size="md" />;
                })}
              </View>
              </TutorialTarget>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <Button title={t('play.skipCard')} kind="ghost" size="md" onPress={() => run('skip')} disabled={busy} style={{ flex: 1 }} />
                <Button spot="hilo:end" title={t('common.cashout')} subtitle={correct ? `${formatCoins(payoutFor(view!.bet, view!.multiplier))} ${t('common.coins')}` : undefined} onPress={() => run('cashout')} disabled={!correct || busy} style={{ flex: 1.4 }} />
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} tint={tint} /></View>
                <Button spot="hilo:start" title={t('play.placeBet')} onPress={() => run('start', { bet })} disabled={(bet > s.balance || bet < s.room.min || bet > s.room.max)} style={{ flex: 1 }} />
              </View>
            </>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  table: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26 },
  deck: { width: 92, height: 124 },
  glowRing: { borderRadius: 20, shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } },
  oddsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  oddsPill: { paddingHorizontal: 14, height: 32, borderRadius: 16, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
