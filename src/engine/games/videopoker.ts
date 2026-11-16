import type { Rng } from '../rng/rng.ts';
import { shuffledDeck, type Card } from '../cards/cards.ts';
import { settle } from './types.ts';

/**
 * Video Poker "Jacks or Better", full-pay 9/6 table (the classic Las Vegas machine).
 * Deal 5 cards from a fresh 52-card deck, hold any, redraw the rest from the same deck, get paid
 * for the final hand. Pays are bet × value (stake included): a pair of jacks or better gives the bet back.
 * Reference return with perfect strategy: 99.54 % (published analysis of the 9/6 pay table, 800-for-1 royal).
 */
export const VP_HANDS = ['royal', 'straightFlush', 'quads', 'fullHouse', 'flush', 'straight', 'trips', 'twoPair', 'jacks', 'nothing'] as const;
export type VPHand = (typeof VP_HANDS)[number];
export const VP_PAYS: Record<VPHand, number> = { royal: 800, straightFlush: 50, quads: 25, fullHouse: 9, flush: 6, straight: 4, trips: 3, twoPair: 2, jacks: 1, nothing: 0 };
export const VP_REFERENCE_RTP = 0.9954;

export interface VPState {
  bet: number;
  hand: Card[];
  /** Remaining deck, in order: the next cards dealt. Hidden from the player. */
  deck: Card[];
}

const isStraight = (ranks: number[]): boolean => {
  const u = [...new Set(ranks)].sort((a, b) => a - b);
  if (u.length !== 5) return false;
  if (u[4] - u[0] === 4) return true;
  return u.join() === '2,3,4,5,14'; // A-2-3-4-5
};

/** Classifies exactly 5 cards. */
export function classify(cards: Card[]): VPHand {
  if (cards.length !== 5) throw new Error('five_cards');
  const ranks = cards.map((c) => c.rank);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const straight = isStraight(ranks);
  if (flush && straight) return Math.min(...ranks) === 10 ? 'royal' : 'straightFlush';
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.values()].sort((a, b) => b - a);
  if (groups[0] === 4) return 'quads';
  if (groups[0] === 3 && groups[1] === 2) return 'fullHouse';
  if (flush) return 'flush';
  if (straight) return 'straight';
  if (groups[0] === 3) return 'trips';
  if (groups[0] === 2 && groups[1] === 2) return 'twoPair';
  if (groups[0] === 2) {
    const pair = [...counts.entries()].find(([, n]) => n === 2)![0];
    return pair >= 11 ? 'jacks' : 'nothing';
  }
  return 'nothing';
}

export function dealVP(rng: Rng, bet: number): VPState {
  const deck = shuffledDeck(rng);
  return { bet, hand: deck.slice(0, 5), deck: deck.slice(5) };
}

/** Replaces every card not held with the next ones from the deck and settles. */
export function drawVP(st: VPState, hold: boolean[]) {
  if (!Array.isArray(hold) || hold.length !== 5) throw new Error('invalid_hold');
  let k = 0;
  const final = st.hand.map((c, i) => (hold[i] ? c : st.deck[k++]));
  const result = classify(final);
  const multiplier = VP_PAYS[result];
  return { ...settle(st.bet, multiplier), hand: final, held: hold.map(Boolean), result };
}

/**
 * Suggested cards to hold, following the well-known simplified strategy for 9/6 Jacks or Better
 * (close to perfect play; a hint for beginners, not a guarantee).
 */
export function suggestHold(hand: Card[]): boolean[] {
  const idx = [0, 1, 2, 3, 4];
  const pick = (ids: number[]) => idx.map((i) => ids.includes(i));
  const all = pick(idx);
  const made = classify(hand);
  if (made === 'royal' || made === 'straightFlush' || made === 'quads') return all;
  const bySuit = (n: number, pred: (c: Card) => boolean) => {
    for (const s of ['s', 'h', 'd', 'c']) {
      const ids = idx.filter((i) => hand[i].suit === s && pred(hand[i]));
      if (ids.length >= n) return ids.slice(0, n);
    }
    return null;
  };
  const royal = (c: Card) => c.rank >= 10;
  const r4 = bySuit(4, royal);
  if (r4) return pick(r4);
  if (made === 'fullHouse' || made === 'flush' || made === 'straight') return all;
  const counts = new Map<number, number[]>();
  idx.forEach((i) => counts.set(hand[i].rank, [...(counts.get(hand[i].rank) ?? []), i]));
  const groups = [...counts.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);
  if (made === 'trips') return pick(groups[0][1]);
  // 4 to a straight flush
  const sf4 = straightDraw(hand, idx, 4, true);
  if (sf4) return pick(sf4);
  if (made === 'twoPair') return pick([...groups[0][1], ...groups[1][1]]);
  if (made === 'jacks') return pick(groups[0][1]);
  const r3 = bySuit(3, royal);
  if (r3) return pick(r3);
  const f4 = bySuit(4, () => true);
  if (f4) return pick(f4);
  if (groups[0][1].length === 2) return pick(groups[0][1]); // low pair
  const open4 = straightDraw(hand, idx, 4, false, true);
  if (open4) return pick(open4);
  const high = idx.filter((i) => hand[i].rank >= 11);
  const suitedHigh = bySuit(2, (c) => c.rank >= 11);
  if (suitedHigh) return pick(suitedHigh);
  const sf3 = straightDraw(hand, idx, 3, true);
  if (sf3) return pick(sf3);
  if (high.length >= 2) return pick([...high].sort((a, b) => hand[a].rank - hand[b].rank).slice(0, 2));
  const tenSuited = bySuit(2, (c) => c.rank >= 10 && c.rank <= 13);
  if (tenSuited && tenSuited.some((i) => hand[i].rank === 10)) return pick(tenSuited);
  if (high.length === 1) return pick(high);
  return pick([]);
}

/** Finds `n` cards that fit inside one 5-rank straight window (optionally same suit / open-ended). */
function straightDraw(hand: Card[], idx: number[], n: number, suited: boolean, openEnded = false): number[] | null {
  for (let low = 10; low >= 1; low--) {
    const window = Array.from({ length: 5 }, (_, k) => (low + k === 1 ? 14 : low + k));
    const suits = suited ? ['s', 'h', 'd', 'c'] : [null];
    for (const s of suits) {
      const ids: number[] = [];
      const seen = new Set<number>();
      for (const i of idx) {
        const r = hand[i].rank;
        if (window.includes(r) && !seen.has(r) && (s === null || hand[i].suit === s)) {
          seen.add(r);
          ids.push(i);
        }
      }
      if (ids.length < n) continue;
      const pickIds = ids.slice(0, n);
      if (openEnded) {
        const rs = pickIds.map((i) => hand[i].rank).sort((a, b) => a - b);
        if (rs[3] - rs[0] !== 3 || rs[0] === 2 && rs.includes(14) || rs[3] === 14) continue;
      }
      return pickIds;
    }
  }
  return null;
}
