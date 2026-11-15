import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, PlayingCard, T } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { useT } from '@/i18n';
import { parseCard } from '@/engine/cards/cards.ts';
import { basicStrategy, handValue, type BJAction, type BJDecision } from '@/engine/games/blackjack.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { useProgress } from '@/state/progress';
import { useSettings } from '@/state/settings';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';

const tint = META.blackjack.tint;
interface HandV { cards: string[]; bet: number; done: boolean; outcome?: string; payout?: number }
interface BView { dealer: string[]; hands: HandV[]; active: number; phase: string; legal: BJAction[]; totalBet: number; payout: number; holeHidden: boolean; decisions: BJDecision[] }

export default function BlackjackScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c } = useTheme();
  const s = useGameSession('blackjack');
  const [bet, setBet] = useBet('blackjack', s.room);
  const [view, setView] = useState<BView | null>((s.active?.view as unknown as BView) ?? null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);
  // Small phones: smaller cards so the dealer's and your hand never touch.
  const [stageH, setStageH] = useState(400);
  const cardSize = stageH < 330 ? 'sm' : 'md';
  const showOdds = useSettings((st) => st.showOdds);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('blackjack', (d) => d);
  const playing = view?.phase === 'player';

  const settle = (v: BView, payout: number) => {
    const correct = v.decisions.filter((d) => d.action === d.optimal).length;
    if (v.decisions.length && s.mode !== 'practice') useProgress.getState().recordBjDecisions(correct, v.decisions.length);
    const outcome = v.hands.length === 1 ? v.hands[0].outcome : undefined;
    show({ bet: v.totalBet, payout, multiplier: payout > v.totalBet ? payout / v.totalBet : undefined, label: outcome === 'blackjack' ? t('play.blackjack') : `${handValue(v.hands[0].cards.map(parseCard)).total} vs ${handValue(v.dealer.map(parseCard)).total}` });
    tutorialEvent('blackjack', 'bj:end');
  };
  const deal = async () => {
    try {
      setBusy(true);
      const r = await s.op('deal', { bet });
      const v = r.view as unknown as BView;
      setView(v);
      sfx('card');
      tutorialEvent('blackjack', 'bj:deal');
      if (r.done) settle(v, r.payout);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const act = async (a: BJAction) => {
    try {
      setBusy(true);
      const r = await s.op('action', { action: a });
      const v = r.view as unknown as BView;
      setView(v);
      sfx(a === 'stand' ? 'tap' : 'card');
      if (r.done) settle(v, r.payout);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const dealerCards = view ? view.dealer.map(parseCard) : [];
  const dealerTotal = view && !view.holeHidden ? handValue(dealerCards).total : view ? handValue(dealerCards.slice(0, 1)).total : null;
  const activeHand = view && playing ? view.hands[view.active] : null;
  const suggestion = activeHand && view ? basicStrategy(activeHand.cards.map(parseCard), dealerCards[0], view.legal.includes('double'), view.legal.includes('split')) : null;
  const outcomeTint = (o?: string) => (o === 'win' || o === 'blackjack' ? c.win : o === 'push' ? c.text2 : o === 'lose' ? c.loss : c.text3);
  return (
    <GameShell
      game="blackjack"
      mode={s.mode}
      balance={s.balance}
      locked={playing}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setStageH(e.nativeEvent.layout.height)}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <T variant="caption" color="text3">{t('play.dealer')} {dealerTotal !== null ? `· ${dealerTotal}` : ''}</T>
            <View style={{ flexDirection: 'row', minHeight: 84 }}>
              {view ? (
                <>
                  {dealerCards.map((card, i) => <View key={i} style={{ marginLeft: i ? -26 : 0 }}><PlayingCard card={card} size={cardSize} delay={i * 120} /></View>)}
                  {view.holeHidden && <View style={{ marginLeft: -26 }}><PlayingCard card={null} faceDown size={cardSize} delay={120} /></View>}
                </>
              ) : (
                <T variant="footnote" color="text3" align="center">{t('play.bjTableNote')}</T>
              )}
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
            {view?.hands.map((h, hi) => {
              const cards = h.cards.map(parseCard);
              const v = handValue(cards);
              const isActive = playing && hi === view.active;
              return (
                <View key={hi} style={{ alignItems: 'center', gap: 8, opacity: playing && !isActive ? 0.55 : 1 }}>
                  <View style={{ flexDirection: 'row' }}>
                    {cards.map((card, i) => <View key={i} style={{ marginLeft: i ? -26 : 0 }}><PlayingCard card={card} size={view.hands.length > 2 ? 'sm' : cardSize} delay={i < 2 ? i * 120 : 0} highlight={isActive && i === cards.length - 1 ? tint : undefined} /></View>)}
                  </View>
                  <View style={[styles.badge, { backgroundColor: isActive ? alpha(tint, 0.2) : c.surface2 }]}>
                    <T variant="footnote" weight="semibold" tabular style={{ color: h.outcome ? outcomeTint(h.outcome) : c.text }}>
                      {v.soft && v.total < 21 ? `${v.total - 10}/${v.total}` : v.total}{h.outcome ? ` · ${h.outcome === 'blackjack' ? 'BJ' : t(h.outcome === 'win' ? 'common.win' : h.outcome === 'push' ? 'common.push' : 'common.lose')}` : ''}
                    </T>
                  </View>
                </View>
              );
            })}
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View>
          {playing && view ? (
            <>
              {(hint || showOdds) && suggestion ? (
                <T variant="callout" color="text2" align="center" style={{ marginBottom: 10 }}>
                  💡 {t('play.tip')}: <T variant="callout" weight="semibold">{t(`play.${suggestion === 'double' ? 'doubleDown' : suggestion}`)}</T>
                </T>
              ) : null}
              <TutorialTarget id="bj:end">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title={t('play.hit')} kind="secondary" size="md" onPress={() => act('hit')} disabled={busy} style={{ flex: 1 }} />
                <Button title={t('play.stand')} kind="secondary" size="md" onPress={() => act('stand')} disabled={busy} style={{ flex: 1 }} />
              </View>
              </TutorialTarget>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button title={t('play.doubleDown')} kind="tinted" tint={tint} size="md" onPress={() => act('double')} disabled={busy || !view.legal.includes('double') || view.hands[view.active].bet > s.balance} style={{ flex: 1 }} />
                <Button title={t('play.split')} kind="tinted" tint={tint} size="md" onPress={() => act('split')} disabled={busy || !view.legal.includes('split') || view.hands[view.active].bet > s.balance} style={{ flex: 1 }} />
                {!showOdds && <Button title="💡" kind="secondary" size="md" onPress={() => setHint((h) => !h)} accessibilityHint={t('play.showTip')} style={{ width: 56, paddingHorizontal: 0 }} />}
              </View>
            </>
          ) : (
            <>
              <BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} tint={tint} />
              <Button spot="bj:deal" title={t('play.deal')} onPress={deal} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ marginTop: 10 }} />
            </>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, justifyContent: 'space-around', paddingVertical: 8 },
  badge: { minWidth: 44, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
});
