import type { Rng } from '../rng/rng.ts';
import { shuffledDeck, type Card } from '../cards/cards.ts';

/**
 * Blackjack — 6 decks shuffled every round (continuous-shuffle equivalent).
 * Dealer stands on soft 17 (S17) · Blackjack pays 3:2 · Dealer peeks with A/10 up (European no-hole-card
 * losses are avoided: if the dealer has blackjack you only lose the original bet) · Double on any first two
 * cards · Double after split allowed · Split up to 4 hands · Split aces receive one card each and cannot be
 * re-split · 21 after a split is not a blackjack · No insurance, no surrender.
 */
export const BJ_RULES = { decks: 6, blackjackPays: 1.5, dealerHitsSoft17: false, doubleAfterSplit: true, maxHands: 4 } as const;

export type BJAction = 'hit' | 'stand' | 'double' | 'split';
export type BJOutcome = 'blackjack' | 'win' | 'push' | 'lose';

export function cardValue(c: Card): number {
  return c.rank === 14 ? 11 : c.rank >= 10 ? 10 : c.rank;
}

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 14) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards: Card[]) => cards.length === 2 && handValue(cards).total === 21;

export interface BJHand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  done: boolean;
  outcome?: BJOutcome;
  payout?: number;
}

export interface BJDecision {
  action: BJAction;
  optimal: BJAction;
  total: number;
  soft: boolean;
  pair: boolean;
  dealerUp: number;
}

export interface BJState {
  shoe: Card[];
  cursor: number;
  dealer: Card[];
  hands: BJHand[];
  active: number;
  phase: 'player' | 'settled';
  baseBet: number;
  decisions: BJDecision[];
  totalBet: number;
  payout: number;
}

function draw(s: BJState): Card {
  const c = s.shoe[s.cursor];
  if (!c) throw new Error('Shoe exhausted');
  s.cursor++;
  return c;
}

const clone = (s: BJState): BJState => ({
  ...s,
  dealer: [...s.dealer],
  hands: s.hands.map((h) => ({ ...h, cards: [...h.cards] })),
  decisions: [...s.decisions],
});

export function dealBlackjack(rng: Rng, bet: number): BJState {
  return dealFromShoe(shuffledDeck(rng, BJ_RULES.decks), bet);
}

export function dealFromShoe(shoe: Card[], bet: number): BJState {
  if (!Number.isInteger(bet) || bet < 0) throw new Error('Invalid bet');
  const s: BJState = { shoe, cursor: 0, dealer: [], hands: [], active: 0, phase: 'player', baseBet: bet, decisions: [], totalBet: bet, payout: 0 };
  const p1 = draw(s), d1 = draw(s), p2 = draw(s), d2 = draw(s);
  s.hands = [{ cards: [p1, p2], bet, doubled: false, fromSplit: false, splitAces: false, done: false }];
  s.dealer = [d1, d2];
  const dealerBJ = isBlackjack(s.dealer);
  const playerBJ = isBlackjack(s.hands[0].cards);
  // Peek: an up-card of A or ten-value means the dealer checks for blackjack immediately.
  if (dealerBJ || playerBJ) return settleState(s);
  return s;
}

export function dealerUpCard(s: BJState): Card {
  return s.dealer[0];
}

export function legalActions(s: BJState): BJAction[] {
  if (s.phase !== 'player') return [];
  const h = s.hands[s.active];
  if (!h || h.done) return [];
  const acts: BJAction[] = ['hit', 'stand'];
  if (h.cards.length === 2 && (!h.fromSplit || BJ_RULES.doubleAfterSplit)) acts.push('double');
  if (h.cards.length === 2 && cardValue(h.cards[0]) === cardValue(h.cards[1]) && s.hands.length < BJ_RULES.maxHands && !h.splitAces) acts.push('split');
  return acts;
}

/** Extra stake required by an action (double/split need another bet equal to the hand bet). */
export function extraStake(s: BJState, action: BJAction): number {
  return action === 'double' || action === 'split' ? s.hands[s.active].bet : 0;
}

function advanceHand(s: BJState): BJState {
  while (s.active < s.hands.length && s.hands[s.active].done) s.active++;
  if (s.active >= s.hands.length) return dealerPlay(s);
  return s;
}

function finishIfDone(h: BJHand) {
  if (handValue(h.cards).total >= 21) h.done = true;
}

export function act(state: BJState, action: BJAction): BJState {
  if (!legalActions(state).includes(action)) throw new Error(`Illegal action ${action}`);
  const s = clone(state);
  const h = s.hands[s.active];
  const v = handValue(h.cards);
  const up = cardValue(s.dealer[0]);
  const optimal = basicStrategy(h.cards, s.dealer[0], legalActions(state).includes('double'), legalActions(state).includes('split'));
  s.decisions.push({ action, optimal, total: v.total, soft: v.soft, pair: h.cards.length === 2 && cardValue(h.cards[0]) === cardValue(h.cards[1]), dealerUp: up });
  switch (action) {
    case 'hit':
      h.cards.push(draw(s));
      finishIfDone(h);
      break;
    case 'stand':
      h.done = true;
      break;
    case 'double':
      s.totalBet += h.bet;
      h.bet *= 2;
      h.doubled = true;
      h.cards.push(draw(s));
      h.done = true;
      break;
    case 'split': {
      const aces = h.cards[0].rank === 14;
      const second = h.cards.pop()!;
      s.totalBet += h.bet;
      const nh: BJHand = { cards: [second], bet: h.bet, doubled: false, fromSplit: true, splitAces: aces, done: false };
      h.fromSplit = true;
      h.splitAces = aces;
      h.cards.push(draw(s));
      nh.cards.push(draw(s));
      s.hands.splice(s.active + 1, 0, nh);
      if (aces) {
        h.done = true;
        nh.done = true;
      } else {
        finishIfDone(h);
        finishIfDone(nh);
      }
      break;
    }
  }
  return advanceHand(s);
}

function dealerPlay(s: BJState): BJState {
  const anyLive = s.hands.some((h) => handValue(h.cards).total <= 21);
  if (anyLive) {
    for (;;) {
      const v = handValue(s.dealer);
      if (v.total < 17 || (v.total === 17 && v.soft && BJ_RULES.dealerHitsSoft17)) s.dealer.push(draw(s));
      else break;
    }
  }
  return settleState(s);
}

function settleState(s: BJState): BJState {
  const d = handValue(s.dealer).total;
  const dealerBJ = isBlackjack(s.dealer);
  let payout = 0;
  for (const h of s.hands) {
    const p = handValue(h.cards).total;
    const natural = !h.fromSplit && isBlackjack(h.cards);
    let outcome: BJOutcome;
    if (natural && dealerBJ) outcome = 'push';
    else if (natural) outcome = 'blackjack';
    else if (dealerBJ) outcome = 'lose';
    else if (p > 21) outcome = 'lose';
    else if (d > 21 || p > d) outcome = 'win';
    else if (p === d) outcome = 'push';
    else outcome = 'lose';
    h.outcome = outcome;
    h.done = true;
    h.payout =
      outcome === 'blackjack' ? h.bet + Math.floor(h.bet * BJ_RULES.blackjackPays + 1e-9) : outcome === 'win' ? h.bet * 2 : outcome === 'push' ? h.bet : 0;
    payout += h.payout;
  }
  s.payout = payout;
  s.phase = 'settled';
  s.active = s.hands.length;
  return s;
}

/** Public view: hides the hole card and the rest of the shoe while the player is acting. */
export function publicBlackjack(s: BJState) {
  const { shoe: _shoe, ...rest } = s;
  return { ...rest, dealer: s.phase === 'player' ? [s.dealer[0]] : s.dealer, holeHidden: s.phase === 'player' };
}

// ───────────────────────────── Basic strategy (6D · S17 · DAS · no surrender) ─────────────────────────────
type Code = 'H' | 'S' | 'D' | 'Ds' | 'P';
const UP = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const row = (s: string): Code[] => s.split(' ') as Code[];
//                     2  3  4  5  6  7  8  9  T  A
const HARD: Record<number, Code[]> = {
  8: row('H H H H H H H H H H'),
  9: row('H D D D D H H H H H'),
  10: row('D D D D D D D D H H'),
  11: row('D D D D D D D D D H'),
  12: row('H H S S S H H H H H'),
  13: row('S S S S S H H H H H'),
  14: row('S S S S S H H H H H'),
  15: row('S S S S S H H H H H'),
  16: row('S S S S S H H H H H'),
};
const SOFT: Record<number, Code[]> = {
  13: row('H H H D D H H H H H'),
  14: row('H H H D D H H H H H'),
  15: row('H H D D D H H H H H'),
  16: row('H H D D D H H H H H'),
  17: row('H D D D D H H H H H'),
  18: row('S Ds Ds Ds Ds S S H H H'),
  19: row('S S S S S S S S S S'),
  20: row('S S S S S S S S S S'),
};
const PAIRS: Record<number, Code[]> = {
  2: row('P P P P P P H H H H'),
  3: row('P P P P P P H H H H'),
  4: row('H H H P P H H H H H'),
  6: row('P P P P P H H H H H'),
  7: row('P P P P P P H H H H'),
  8: row('P P P P P P P P P P'),
  9: row('P P P P P S P P S S'),
  11: row('P P P P P P P P P P'),
};

export function strategyCode(cards: Card[], dealerUp: Card, canSplit = true): Code {
  const col = UP.indexOf(cardValue(dealerUp) as (typeof UP)[number]);
  if (canSplit && cards.length === 2 && cardValue(cards[0]) === cardValue(cards[1])) {
    const pv = cardValue(cards[0]);
    if (PAIRS[pv]) return PAIRS[pv][col];
  }
  const { total, soft } = handValue(cards);
  if (soft && total === 12) return 'H'; // A-A that can no longer be split
  if (soft && total <= 20 && total >= 13) return SOFT[total][col];
  if (soft && total >= 21) return 'S';
  if (total <= 8) return 'H';
  if (total >= 17) return 'S';
  return HARD[total][col];
}

export function basicStrategy(cards: Card[], dealerUp: Card, canDouble: boolean, canSplit: boolean): BJAction {
  const code = strategyCode(cards, dealerUp, canSplit);
  switch (code) {
    case 'P': return 'split';
    case 'D': return canDouble ? 'double' : 'hit';
    case 'Ds': return canDouble ? 'double' : 'stand';
    case 'S': return 'stand';
    default: return 'hit';
  }
}

/** Accuracy against basic strategy (skill metric used by rankings and Academy). */
export function decisionAccuracy(decisions: BJDecision[]): number {
  if (decisions.length === 0) return 0;
  return decisions.filter((d) => d.action === d.optimal).length / decisions.length;
}

export { UP as DEALER_UPCARDS, HARD as HARD_TABLE, SOFT as SOFT_TABLE, PAIRS as PAIR_TABLE };
