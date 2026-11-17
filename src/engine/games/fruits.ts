import type { Rng } from '../rng/rng.ts';
import { payoutFor } from './types.ts';
import { PAYLINES, REELS, ROWS, pickWeighted, type LineWin } from './lineslot.ts';

/**
 * Fuego Frutal ("Fruit Fire"): an original classic-fruit slot with multiplier wilds.
 * - 5×3, 10 lines, pays × total bet. Wild fireballs carry ×2, ×3 or ×5: a winning line multiplies its pay by
 *   the sum of the wild multipliers on it (a line with no wild pays ×1).
 * - 3 / 4 / 5 stars anywhere pay ×1 / ×5 / ×50 and give 8 free spins with more wilds and bigger multipliers
 *   (×2 to ×10). 3 stars in free spins add 5 more.
 * - Biggest round ×5000 the bet. Return measured by simulation (see `fruitsStats` and the tests).
 */
export const FRUIT_SYMBOLS = ['cherry', 'lemon', 'orange', 'plum', 'grapes', 'melon', 'bell', 'seven'] as const;
export const WILD = 100;
export const STAR = 9;
export const isWild = (c: number) => c >= WILD;
export const wildMult = (c: number) => c - WILD;
export const FRUIT_PAYS: [number, number, number][] = [
  [0.5, 1.5, 5], // cherry
  [0.5, 1.5, 5], // lemon
  [0.75, 2, 7.5], // orange
  [0.75, 2, 7.5], // plum
  [1.25, 3.75, 15], // grapes
  [1.25, 3.75, 15], // melon
  [2.5, 10, 37.5], // bell
  [6.25, 25, 125], // seven
];
export const STAR_PAYS = [1, 5, 50];
/** Weights: 8 fruits, wild, star. */
export const FRUIT_WEIGHTS = {
  base: [20, 20, 17, 17, 12, 12, 7, 4, 3.2, 3],
  free: [20, 20, 17, 17, 12, 12, 7, 4, 6, 2.2],
};
export const WILD_MULTS = { base: [[2, 60], [3, 30], [5, 10]] as [number, number][], free: [[2, 40], [3, 30], [5, 20], [10, 10]] as [number, number][] };
export const FRUIT_FREE = 8;
export const FRUIT_RETRIGGER = 5;
export const FRUIT_MAX_FREE = 50;
export const FRUIT_MAX_WIN = 5000;

function wild(rng: Rng, free: boolean): number {
  const t = free ? WILD_MULTS.free : WILD_MULTS.base;
  return WILD + t[pickWeighted(rng, t.map(([, w]) => w))][0];
}
export interface FruitLine extends LineWin { mult: number }

/** Line wins with multiplier wilds: pay = symbol pay × (sum of wild multipliers in the run, or 1). */
export function fruitLines(g: number[][]): FruitLine[] {
  const out: FruitLine[] = [];
  PAYLINES.forEach((rows, line) => {
    const cells = rows.map((r, reel) => g[reel][r]);
    const base = cells.find((c) => !isWild(c));
    if (base === undefined || base === STAR) return; // five wilds never happen often enough to need a pay
    let count = 0, mult = 0;
    for (const c of cells) {
      if (c === base) count++;
      else if (isWild(c)) {
        count++;
        mult += wildMult(c);
      } else break;
    }
    if (count < 3) return;
    const pay = FRUIT_PAYS[base][count - 3] * (mult || 1);
    out.push({ line, sym: base, count, pay, mult: mult || 1 });
  });
  return out;
}

export interface FruitSpin { grid: number[][]; lines: FruitLine[]; stars: number; starPay: number; total: number; free: boolean }
export interface FruitResult { spins: FruitSpin[]; freeSpins: number; multiplier: number; payout: number; capped: boolean; bet: number }

function spin(rng: Rng, free: boolean): FruitSpin {
  const w = free ? FRUIT_WEIGHTS.free : FRUIT_WEIGHTS.base;
  const grid = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => {
    const k = pickWeighted(rng, w);
    return k === 8 ? wild(rng, free) : k === 9 ? STAR : k;
  }));
  const lines = fruitLines(grid);
  let stars = 0;
  for (const col of grid) for (const c of col) if (c === STAR) stars++;
  const starPay = stars >= 3 ? STAR_PAYS[Math.min(5, stars) - 3] : 0;
  const total = lines.reduce((a, l) => a + l.pay, 0) + starPay;
  return { grid, lines, stars, starPay, total, free };
}

export function playFruits(rng: Rng, bet: number): FruitResult {
  const first = spin(rng, false);
  const spins = [first];
  let mult = first.total;
  let freeSpins = first.stars >= 3 ? FRUIT_FREE : 0;
  for (let k = 0; k < freeSpins && mult < FRUIT_MAX_WIN; k++) {
    const s = spin(rng, true);
    spins.push(s);
    mult += s.total;
    if (s.stars >= 3) freeSpins = Math.min(FRUIT_MAX_FREE, freeSpins + FRUIT_RETRIGGER);
  }
  const capped = mult >= FRUIT_MAX_WIN;
  const multiplier = Math.min(FRUIT_MAX_WIN, Math.round(mult * 100) / 100);
  return { spins, freeSpins, multiplier, payout: payoutFor(bet, multiplier), capped, bet };
}

export function fruitsStats(rng: Rng, n: number) {
  let paid = 0, hits = 0, bonus = 0, big = 0;
  for (let i = 0; i < n; i++) {
    const r = playFruits(rng, 100);
    paid += r.multiplier;
    if (r.multiplier > 0) hits++;
    if (r.freeSpins) bonus++;
    if (r.multiplier >= 100) big++;
  }
  return { rtp: paid / n, hit: hits / n, bonus: bonus / n, big: big / n };
}
