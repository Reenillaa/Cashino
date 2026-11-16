import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { Button, Marquee, PlayingCard, PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { parseCard, type Card } from '@/engine/cards/cards.ts';
import { VP_HANDS, VP_PAYS, suggestHold, type VPHand } from '@/engine/games/videopoker.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

type Phase = 'idle' | 'dealt' | 'done';
const GOLD = '#FFD06B';
const PAYING = VP_HANDS.filter((h) => h !== 'nothing');

export default function VideoPokerScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const { width } = useWindowDimensions();
  const s = useGameSession('videopoker');
  const resumed = s.active?.view as { hand?: string[]; made?: VPHand } | undefined;
  const [bet, setBet] = useBet('videopoker', s.room);
  const [phase, setPhase] = useState<Phase>(resumed?.hand ? 'dealt' : 'idle');
  const [hand, setHand] = useState<Card[]>(resumed?.hand ? resumed.hand.map(parseCard) : []);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [made, setMade] = useState<VPHand | null>(resumed?.made ?? null);
  const [flipping, setFlipping] = useState<boolean[]>([false, false, false, false, false]);
  const [dealKey, setDealKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('videopoker', (d) => t(`play.vpHands.${d}`));
  const cardW = Math.min(76, (Math.min(width, 440) - 24 - 4 * 8) / 5);

  const deal = async () => {
    try {
      setBusy(true);
      const r = await s.op('deal', { bet });
      const v = r.view as { hand: string[]; made: VPHand };
      setHand(v.hand.map(parseCard));
      setHeld([false, false, false, false, false]);
      setFlipping([false, false, false, false, false]);
      setMade(v.made);
      setDealKey((k) => k + 1);
      setPhase('dealt');
      for (let i = 0; i < 5; i++) setTimeout(() => sfx('card', 0.7), reduceMotion ? 0 : i * 90);
      haptic.light();
      tutorialEvent('videopoker', 'vp:deal');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const toggle = (i: number) => {
    if (phase !== 'dealt' || busy) return;
    setHeld((h) => h.map((x, k) => (k === i ? !x : x)));
    sfx('chip', 0.5);
    haptic.select();
  };
  const hint = () => {
    if (phase !== 'dealt') return;
    setHeld(suggestHold(hand));
    haptic.select();
  };
  const draw = async () => {
    try {
      setBusy(true);
      const r = await s.op('draw', { hold: held });
      const v = r.view as { hand: string[]; result: VPHand; multiplier: number; bet: number };
      // the cards you threw away turn over, then the new ones flip up
      setFlipping(held.map((h) => !h));
      if (!reduceMotion) await wait(320);
      setHand(v.hand.map(parseCard));
      setFlipping([false, false, false, false, false]);
      held.forEach((h, i) => { if (!h) setTimeout(() => sfx('card', 0.7), reduceMotion ? 0 : i * 90); });
      if (!reduceMotion) await wait(520);
      setMade(v.result);
      setPhase('done');
      if (v.multiplier >= 25) sfx('bigwin');
      show({ bet: v.bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined, label: t(`play.vpHands.${v.result}`) });
      tutorialEvent('videopoker', 'vp:draw');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const lit = made && made !== 'nothing' ? made : null;
  return (
    <GameShell
      game="videopoker"
      mode={s.mode}
      balance={s.balance}
      locked={phase === 'dealt' || busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage}>
          <Marquee colors={['#2A1A66', '#120A33']}>
            <T weight="display" align="center" style={styles.title}>JACKS OR BETTER</T>
            {/* pay table: the current hand lights up */}
            <View style={styles.pays} accessibilityLabel={t('play.vpPays')}>
              {PAYING.map((h) => {
                const on = lit === h;
                return (
                  <View key={h} style={[styles.payRow, on && { backgroundColor: GOLD }]}>
                    <T weight="displaySemi" numberOfLines={1} style={{ flex: 1, fontSize: 11.5, color: on ? '#2A1A00' : 'rgba(255,255,255,0.85)' }}>{t(`play.vpShort.${h}`)}</T>
                    <T weight="display" tabular style={{ fontSize: 12, color: on ? '#2A1A00' : GOLD }}>{(VP_PAYS[h] * bet).toLocaleString('es-ES')}</T>
                  </View>
                );
              })}
            </View>
          </Marquee>
          {/* the five cards */}
          <TutorialTarget id="vp:hold" style={styles.cards}>
            {[0, 1, 2, 3, 4].map((i) => (
              <HoldCard
                key={`${dealKey}-${i}`}
                card={hand[i] ?? null}
                faceDown={phase === 'idle' || !hand[i] || flipping[i]}
                held={held[i]}
                width={cardW}
                delay={i * 90}
                win={phase === 'done' && !!lit}
                disabled={phase !== 'dealt'}
                label={t('play.vpHeld')}
                onPress={() => toggle(i)}
              />
            ))}
          </TutorialTarget>
          <View style={{ height: 22, justifyContent: 'center' }}>
            {phase === 'dealt' ? (
              <Animated.View entering={FadeIn}>
                <T variant="footnote" color="text2" align="center">{lit ? `${t(`play.vpHands.${lit}`)} · ` : ''}{t('play.vpTapHold')}</T>
              </Animated.View>
            ) : null}
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        phase === 'dealt' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={`💡 ${t('play.vpHint')}`} kind="secondary" onPress={hint} disabled={busy} style={{ flex: 1 }} />
            <Button spot="vp:draw" title={t('play.vpDraw')} onPress={draw} loading={busy} style={{ flex: 1.6 }} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={busy} /></View>
            <Button spot="vp:deal" title={t('play.deal')} onPress={deal} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
          </View>
        )
      }
    />
  );
}

/** One card: tap to hold (it lifts and gets a gold "HELD" tag). */
function HoldCard({ card, faceDown, held, width, delay, win, disabled, label, onPress }: { card: Card | null; faceDown: boolean; held: boolean; width: number; delay: number; win: boolean; disabled: boolean; label: string; onPress: () => void }) {
  const lift = useSharedValue(0);
  React.useEffect(() => {
    lift.set(withSpring(held ? -14 : 0, { damping: 14, stiffness: 220 }));
  }, [held, lift]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));
  const scale = width / 60; // PlayingCard 'md' is 60 wide
  return (
    <PressableScale onPress={onPress} disabled={disabled} feedback="none" scaleTo={0.94} accessibilityLabel={`${card ? `${card.rank}${card.suit}` : '?'}${held ? `, ${label}` : ''}`} style={{ width, alignItems: 'center' }}>
      <Animated.View style={style}>
        <View style={{ width, height: 84 * scale, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ transform: [{ scale }] }}>
            <PlayingCard card={card} faceDown={faceDown} size="md" delay={delay} highlight={held ? GOLD : win ? GOLD : undefined} />
          </View>
        </View>
      </Animated.View>
      <View style={[styles.tag, { opacity: held ? 1 : 0 }]}>
        <T weight="display" style={{ color: '#2A1A00', fontSize: 9.5, letterSpacing: 0.8 }}>{label}</T>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 14 },
  title: { color: GOLD, fontSize: 16, letterSpacing: 2.5, marginBottom: 8, textShadowColor: 'rgba(255,185,56,0.8)', textShadowRadius: 10 },
  pays: { flexDirection: 'row', flexWrap: 'wrap', width: 304, gap: 3, justifyContent: 'space-between' },
  payRow: { width: 148, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, height: 21, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.06)' },
  cards: { flexDirection: 'row', gap: 8, marginTop: 10 },
  tag: { marginTop: 6, paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: GOLD, justifyContent: 'center' },
});
