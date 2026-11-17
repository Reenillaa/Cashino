import { useSession } from '@/state/session';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { TableState, PokerAction } from '@/engine/poker/table.ts';
import { legalActions, potTotal } from '@/engine/poker/table.ts';
import { evaluate, CATEGORY_KEYS } from '@/engine/poker/evaluator.ts';
import { cardCode } from '@/engine/cards/cards.ts';
import { Avatar, useMyAvatar, useMyFrame, Glass, Icon, PlayingCard, PressableScale, T, Tag, formatCoins } from '@/design/components';
import { LinearGradient } from 'expo-linear-gradient';
import { BetInput } from '../shared/BetInput';
import { Felt } from '../shared/Felt';
import { SwipeFold } from './SwipeFold';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';

/** Shared table view for offline (bots) and online play. `heroSeat` is the viewer's seat. */
export function PokerTableView({
  table,
  heroSeat,
  equity,
  onAction,
  names,
  reactions,
}: {
  table: TableState;
  heroSeat: number;
  equity?: number | null;
  onAction: (a: PokerAction) => void;
  names?: Record<number, string>;
  reactions?: Record<number, string>;
}) {
  const { t } = useT();
  const myFrame = useMyFrame();
  const myAvatar = useMyAvatar(useSession((st) => st.profile?.avatar));
  const { c } = useTheme();
  const h = table.hand;
  const legal = h && !h.complete && h.toAct === heroSeat ? legalActions(table) : null;
  const [raiseTo, setRaiseTo] = useState<number | null>(null);
  const [raising, setRaising] = useState(false);
  const hero = h?.players.find((p) => p.seat === heroSeat);
  const heroRank = hero && hero.hole.length === 2 && h && h.board.length >= 3 ? evaluate([...hero.hole, ...h.board]) : null;
  const winners = new Set(h?.complete ? Object.keys(h.winnings ?? {}).map(Number) : []);
  const bestCodes = new Set(
    h?.complete && h.showdown ? h.showdown.filter((sd) => winners.has(sd.seat)).flatMap((sd) => sd.best.map(cardCode)) : [],
  );
  const pot = h ? potTotal(h) : 0;
  const others = table.seats.map((s, i) => ({ s, i })).filter((x) => x.s && x.i !== heroSeat);
  const r = legal ? Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, raiseTo ?? legal.minRaiseTo)) : 0;
  return (
    <View style={{ flex: 1 }}>
      {/* Opponents */}
      <View style={styles.opps}>
        {others.map(({ s, i }) => {
          const p = h?.players.find((x) => x.seat === i);
          const turn = h?.toAct === i;
          const sd = h?.complete ? h.showdown?.find((x) => x.seat === i) : undefined;
          return (
            <View key={i} style={[styles.opp, { opacity: p?.folded || (s!.stack === 0 && !p) ? 0.4 : 1 }]} accessibilityLabel={`${names?.[i] ?? s!.name}${s!.isBot ? ' (bot)' : ''}, ${s!.stack}`}>
              <View>
                <Avatar id={s!.avatar ?? `a${i}`} bot={s!.isBot} botStyle={s!.isBot ? s!.name : undefined} size={48} ring={turn ? c.text : winners.has(i) ? c.win : undefined} />
                {h?.button === i && <View style={[styles.dealer, { backgroundColor: c.text }]}><T style={{ fontSize: 9, fontFamily: 'Geist_600SemiBold', color: c.bg }}>D</T></View>}
                {reactions?.[i] ? <Animated.View entering={FadeIn} style={styles.reaction}><T style={{ fontSize: 22 }}>{reactions[i]}</T></Animated.View> : null}
              </View>
              <T variant="caption" color="text2" numberOfLines={1} style={{ fontSize: 10, letterSpacing: 0.2, textTransform: 'none', marginTop: 4, maxWidth: 64 }}>
                {s!.isBot ? t(`poker.styles.${s!.name}`, { defaultValue: s!.name }) : names?.[i] ?? s!.name}
              </T>
              {s!.isBot && <Tag label={t('common.bot')} />}
              <T variant="footnote" weight="semibold" tabular style={{ marginTop: 2 }}>{formatCoins(s!.stack)}</T>
              {p && p.bet > 0 && <T variant="caption" style={{ color: c.warn, letterSpacing: 0.2 }} tabular>{formatCoins(p.bet)}</T>}
              {sd && (
                <View style={{ flexDirection: 'row', marginTop: 4 }}>
                  {sd.hole.map((card, k) => <View key={k} style={{ marginLeft: k ? -12 : 0 }}><PlayingCard card={card} size="xs" highlight={bestCodes.has(cardCode(card)) ? c.win : undefined} /></View>)}
                </View>
              )}
            </View>
          );
        })}
      </View>
      {/* Board on an oval felt */}
      <View style={styles.board}>
        <Felt shape="oval" themed colors={['#2E7D5B', '#0E3B2C']} style={styles.felt} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: 5 }, (_, k) => {
            const card = h?.board[k];
            return card ? (
              <PlayingCard key={`${h!.number}-${k}`} card={card} size="sm" delay={k < 3 ? k * 90 : 0} highlight={bestCodes.has(cardCode(card)) ? c.win : undefined} />
            ) : (
              <View key={k} style={[styles.slot, { borderColor: c.hairline }]} />
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <T variant="caption" color="text3">{t('poker.pot')}</T>
          <T variant="headline" tabular>{formatCoins(pot)}</T>
        </View>
        {h?.complete && h.winnings && (
          <Animated.View entering={FadeIn} style={{ marginTop: 6 }}>
            <T variant="footnote" color="win" align="center">
              {Object.entries(h.winnings).map(([seat, amt]) => {
                const sd = h.showdown?.find((x) => x.seat === Number(seat));
                const nm = Number(seat) === heroSeat ? t('common.you') : names?.[Number(seat)] ?? table.seats[Number(seat)]?.name ?? '';
                return `${t('poker.wins', { name: table.seats[Number(seat)]?.isBot ? t(`poker.styles.${nm}`, { defaultValue: nm }) : nm, amount: formatCoins(amt) })}${sd ? ` · ${t(`poker.hands.${CATEGORY_KEYS[sd.category]}`)}` : ''}`;
              }).join('\n')}
            </T>
          </Animated.View>
        )}
      </View>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={{ alignItems: 'center' }}>
          <SwipeFold key={h?.number} enabled={!!legal?.canFold} onFold={() => { setRaising(false); onAction({ type: 'fold' }); }} style={{ flexDirection: 'row' }}>
            <View style={{ flexDirection: 'row' }}>
              {(hero?.hole ?? []).map((card, k) => (
                <View key={`${h?.number}-${k}`} style={{ marginLeft: k ? -18 : 0, transform: [{ rotate: k ? '6deg' : '-4deg' }] }}>
                  <PlayingCard card={card} size="lg" delay={k * 140} dim={hero?.folded} highlight={bestCodes.has(cardCode(card)) ? c.win : undefined} />
                </View>
              ))}
            </View>
          </SwipeFold>
          {legal?.canFold ? <T variant="caption" color="text3" style={{ marginTop: 6 }}>{t('poker.swipeFold')}</T> : null}
        </View>
        <Glass radius={20} style={styles.heroCard}>
          <Avatar id={myAvatar} frame={myFrame} size={34} ring={h?.toAct === heroSeat ? c.text : undefined} />
          {h?.button === heroSeat && <Tag label="D" />}
          <T variant="footnote" color="text3">{heroRank ? t(`poker.hands.${CATEGORY_KEYS[heroRank.category]}`) : t('common.you')}</T>
          <T variant="callout" weight="semibold" tabular>{formatCoins(table.seats[heroSeat]?.stack ?? 0)}</T>
          {equity != null && !hero?.folded && !h?.complete ? (
            <View style={{ alignItems: 'center' }}>
              <T variant="caption" color="text3" style={{ fontSize: 9 }}>{t('poker.equity')}</T>
              <T variant="callout" weight="semibold" tabular style={{ color: equity >= 0.5 ? c.win : c.text }}>{Math.round(equity * 100)}%</T>
            </View>
          ) : null}
        </Glass>
      </View>
      {/* Actions: three clearly different buttons; the raise amount is chosen on the chip wheel only when you want to raise. */}
      <TutorialTarget id="poker:act">
      <View style={styles.actions}>
        {legal ? (
          <>
            {raising && (legal.canBet || legal.canRaise) ? (
              <Animated.View entering={FadeIn} style={{ marginBottom: 10 }}>
                <BetInput value={r} onChange={setRaiseTo} balance={legal.maxRaiseTo} min={legal.minRaiseTo} max={legal.maxRaiseTo} label={legal.canBet ? t('poker.bet') : t('poker.raise')} />
              </Animated.View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {legal.canFold && <ActionButton icon="close" label={t('poker.fold')} colors={['#5A2A3A', '#3A1A26']} onPress={() => { setRaising(false); onAction({ type: 'fold' }); }} />}
              {legal.canCheck ? (
                <ActionButton icon="check" label={t('poker.check')} colors={['#12C08A', '#0B6E6E']} onPress={() => { setRaising(false); onAction({ type: 'check' }); }} />
              ) : (
                <ActionButton icon="check" label={t('poker.call', { amount: formatCoins(legal.callAmount) })} colors={['#12C08A', '#0B6E6E']} onPress={() => { setRaising(false); onAction({ type: 'call' }); }} />
              )}
              {(legal.canBet || legal.canRaise) && (
                <ActionButton
                  icon="arrowUp"
                  label={raising ? `${r >= legal.maxRaiseTo ? t('poker.allIn') : legal.canBet ? t('poker.bet') : t('poker.raise')} ${formatCoins(r)}` : legal.canBet ? t('poker.bet') : t('poker.raise')}
                  colors={['#FFB938', '#F2672E']}
                  onPress={() => {
                    if (!raising) return setRaising(true);
                    onAction({ type: legal.canBet ? 'bet' : 'raise', amount: r });
                    setRaiseTo(null);
                    setRaising(false);
                  }}
                />
              )}
            </View>
          </>
        ) : (
          <T variant="footnote" color="text3" align="center" style={{ paddingVertical: 14 }}>
            {h?.complete ? t('poker.newHand') + '…' : h?.toAct !== null && h?.toAct !== undefined ? `${table.seats[h.toAct]?.isBot ? '🤖' : '⏳'} …` : t('poker.waiting')}
          </T>
        )}
      </View>
      </TutorialTarget>
    </View>
  );
}

const styles = StyleSheet.create({
  opps: { flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 8, paddingTop: 4 },
  opp: { alignItems: 'center', minWidth: 60 },
  dealer: { position: 'absolute', right: -4, bottom: -2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  reaction: { position: 'absolute', top: -14, right: -14 },
  board: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 14 },
  slot: { width: 46, height: 64, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
  hero: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 16, paddingHorizontal: 16 },
  heroCard: { padding: 12, alignItems: 'center', gap: 4, minWidth: 96 },
  actions: { paddingHorizontal: 12, paddingTop: 12 },
  felt: { position: 'absolute', left: -6, right: -6, top: '12%', bottom: '12%' },
  action: { flex: 1, height: 70, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
  actionIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});

/** Big round-cornered action with its own colour and icon, so fold / call / raise never look alike. */
function ActionButton({ icon, label, colors, onPress }: { icon: 'close' | 'check' | 'arrowUp'; label: string; colors: [string, string]; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} feedback="medium" accessibilityLabel={label} style={styles.action}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.actionIcon}>
        <Icon name={icon} size={20} color="#fff" strokeWidth={2.6} />
      </View>
      <T weight="displaySemi" numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontSize: 12.5 }}>{label}</T>
    </PressableScale>
  );
}
