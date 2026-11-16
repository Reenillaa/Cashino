import { randomInt, type Rng } from '../rng/rng.ts';
import { settle } from './types.ts';

/**
 * Diamonds: 5 gems, each one of 7 colours at random. Paid like a poker hand on colours.
 * Exact return 99.0 % (enumerating all 7⁵ = 16 807 outcomes).
 */
export const GEM_COLORS = 7;
export const DIAMOND_HANDS = ['five', 'four', 'full', 'three', 'twoPair', 'pair', 'none'] as const;
export type DiamondHand = (typeof DIAMOND_HANDS)[number];
export const DIAMOND_PAYS: Record<DiamondHand, number> = { five: 67, four: 5, full: 4, three: 3, twoPair: 2, pair: 0.1, none: 0 };

export function diamondHand(gems: number[]): DiamondHand {
  const counts = new Map<number, number>();
  for (const g of gems) counts.set(g, (counts.get(g) ?? 0) + 1);
  const c = [...counts.values()].sort((a, b) => b - a).join('');
  return ({ '5': 'five', '41': 'four', '32': 'full', '311': 'three', '221': 'twoPair', '2111': 'pair', '11111': 'none' } as Record<string, DiamondHand>)[c];
}

export function diamondStats(): { rtp: number; probs: Record<DiamondHand, number> } {
  const probs = Object.fromEntries(DIAMOND_HANDS.map((h) => [h, 0])) as Record<DiamondHand, number>;
  const N = GEM_COLORS ** 5;
  for (let i = 0; i < N; i++) {
    const g = [0, 1, 2, 3, 4].map((k) => Math.floor(i / GEM_COLORS ** k) % GEM_COLORS);
    probs[diamondHand(g)] += 1 / N;
  }
  const rtp = DIAMOND_HANDS.reduce((a, h) => a + probs[h] * DIAMOND_PAYS[h], 0);
  return { rtp, probs };
}

export function playDiamonds(rng: Rng, bet: number) {
  const gems = Array.from({ length: 5 }, () => randomInt(rng, GEM_COLORS));
  const hand = diamondHand(gems);
  return { ...settle(bet, DIAMOND_PAYS[hand]), gems, hand };
}
