import type { Card, Rank } from '../cards/cards.ts';

export enum HandCategory {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  Trips = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  Quads = 7,
  StraightFlush = 8,
}

export const CATEGORY_KEYS: Record<HandCategory, string> = {
  [HandCategory.HighCard]: 'highCard',
  [HandCategory.Pair]: 'pair',
  [HandCategory.TwoPair]: 'twoPair',
  [HandCategory.Trips]: 'trips',
  [HandCategory.Straight]: 'straight',
  [HandCategory.Flush]: 'flush',
  [HandCategory.FullHouse]: 'fullHouse',
  [HandCategory.Quads]: 'quads',
  [HandCategory.StraightFlush]: 'straightFlush',
};

export interface HandRank {
  /** Totally ordered score: higher wins, equal scores split. */
  score: number;
  category: HandCategory;
  /** The five cards that make the hand (for highlighting). */
  best: Card[];
}

const B = 16;
const encode = (cat: HandCategory, ranks: number[]) => {
  let s = cat;
  for (let i = 0; i < 5; i++) s = s * B + (ranks[i] ?? 0);
  return s;
};

/** Highest straight in a set of ranks (5 = wheel A-2-3-4-5), or 0. */
function straightHigh(present: boolean[]): number {
  for (let hi = 14; hi >= 5; hi--) {
    let ok = true;
    for (let k = 0; k < 5; k++) {
      const r = hi - k === 1 ? 14 : hi - k;
      if (!present[r]) {
        ok = false;
        break;
      }
    }
    if (ok) return hi;
  }
  return 0;
}

function straightCards(cards: Card[], hi: number): Card[] {
  const out: Card[] = [];
  for (let k = 0; k < 5; k++) {
    const r = hi - k === 1 ? 14 : hi - k;
    out.push(cards.find((c) => c.rank === r)!);
  }
  return out;
}

/** Evaluates the best 5-card poker hand from 5–7 cards. */
export function evaluate(cards: Card[]): HandRank {
  if (cards.length < 5 || cards.length > 7) throw new Error('evaluate needs 5–7 cards');
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const byRank: Card[][] = Array.from({ length: 15 }, () => []);
  const bySuit: Record<string, Card[]> = { s: [], h: [], d: [], c: [] };
  for (const c of sorted) {
    byRank[c.rank].push(c);
    bySuit[c.suit].push(c);
  }
  // Flush / straight flush
  const flushSuit = (['s', 'h', 'd', 'c'] as const).find((s) => bySuit[s].length >= 5);
  if (flushSuit) {
    const fc = bySuit[flushSuit];
    const present: boolean[] = [];
    fc.forEach((c) => (present[c.rank] = true));
    const hi = straightHigh(present);
    if (hi) return { score: encode(HandCategory.StraightFlush, [hi]), category: HandCategory.StraightFlush, best: straightCards(fc, hi) };
  }
  const groups = [] as { rank: number; cards: Card[] }[];
  for (let r = 14; r >= 2; r--) if (byRank[r].length) groups.push({ rank: r, cards: byRank[r] });
  groups.sort((a, b) => b.cards.length - a.cards.length || b.rank - a.rank);
  const kickers = (exclude: number[], n: number) => sorted.filter((c) => !exclude.includes(c.rank)).slice(0, n);

  if (groups[0].cards.length === 4) {
    const k = kickers([groups[0].rank], 1);
    return { score: encode(HandCategory.Quads, [groups[0].rank, k[0].rank]), category: HandCategory.Quads, best: [...groups[0].cards, ...k] };
  }
  if (groups[0].cards.length === 3) {
    // Best pair part: highest other rank holding ≥ 2 cards (handles trips + trips + pair).
    const pairPart = groups.slice(1).filter((g) => g.cards.length >= 2).sort((a, b) => b.rank - a.rank)[0];
    if (pairPart) {
      return {
        score: encode(HandCategory.FullHouse, [groups[0].rank, pairPart.rank]),
        category: HandCategory.FullHouse,
        best: [...groups[0].cards, ...pairPart.cards.slice(0, 2)],
      };
    }
  }
  if (flushSuit) {
    const best = bySuit[flushSuit].slice(0, 5);
    return { score: encode(HandCategory.Flush, best.map((c) => c.rank)), category: HandCategory.Flush, best };
  }
  const present: boolean[] = [];
  sorted.forEach((c) => (present[c.rank] = true));
  const hi = straightHigh(present);
  if (hi) return { score: encode(HandCategory.Straight, [hi]), category: HandCategory.Straight, best: straightCards(sorted, hi) };
  if (groups[0].cards.length === 3) {
    const k = kickers([groups[0].rank], 2);
    return { score: encode(HandCategory.Trips, [groups[0].rank, ...k.map((c) => c.rank)]), category: HandCategory.Trips, best: [...groups[0].cards, ...k] };
  }
  if (groups[0].cards.length === 2 && groups[1]?.cards.length === 2) {
    const k = kickers([groups[0].rank, groups[1].rank], 1);
    return {
      score: encode(HandCategory.TwoPair, [groups[0].rank, groups[1].rank, k[0].rank]),
      category: HandCategory.TwoPair,
      best: [...groups[0].cards, ...groups[1].cards, ...k],
    };
  }
  if (groups[0].cards.length === 2) {
    const k = kickers([groups[0].rank], 3);
    return { score: encode(HandCategory.Pair, [groups[0].rank, ...k.map((c) => c.rank)]), category: HandCategory.Pair, best: [...groups[0].cards, ...k] };
  }
  const best = sorted.slice(0, 5);
  return { score: encode(HandCategory.HighCard, best.map((c) => c.rank)), category: HandCategory.HighCard, best };
}

export function compareHands(a: Card[], b: Card[]): number {
  return Math.sign(evaluate(a).score - evaluate(b).score);
}

/** Chen formula preflop strength (≈ −1 … 20). Used by bots and Academy. */
export function chenScore(a: Card, b: Card): number {
  const hi = Math.max(a.rank, b.rank) as Rank, lo = Math.min(a.rank, b.rank) as Rank;
  const base: Record<number, number> = { 14: 10, 13: 8, 12: 7, 11: 6 };
  let s = base[hi] ?? hi / 2;
  if (a.rank === b.rank) s = Math.max(5, s * 2);
  if (a.suit === b.suit) s += 2;
  const gap = hi - lo - 1;
  if (a.rank !== b.rank) {
    s -= gap <= 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
    if (gap <= 1 && hi < 12) s += 1;
  }
  return Math.ceil(s);
}
