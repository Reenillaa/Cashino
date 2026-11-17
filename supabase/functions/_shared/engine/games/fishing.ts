import type { Rng } from '../rng/rng.ts';
import { payoutFor } from './types.ts';
import { REELS, ROWS, lineWins, pickWeighted, type LineWin } from './lineslot.ts';

/**
 * Lago de Oro ("Golden Lake"): an original fishing slot with the popular "money fish + fisherman" mechanic.
 * - 5×3, 10 lines, pays × total bet. Fish carry a cash value and also pay on lines like any symbol.
 * - 3/4/5 tackle boxes (scatter) start 10/15/20 free spins.
 * - In free spins the fisherman (wild) appears: each one on screen collects the value of every fish on screen.
 *   Every 4 fishermen collected: +10 free spins and the collection multiplier goes ×2 → ×3 → ×10.
 * - Biggest round: ×5000 the bet. Return ≈ 96 % (simulated, see `fishingStats` and the tests).
 */
export const FISH_SYMBOLS = ['float', 'hook', 'lure', 'reel', 'dragonfly', 'frog', 'boat', 'rod', 'fish', 'fisher'] as const;
export type FishSymbol = (typeof FISH_SYMBOLS)[number];
/** Cell codes: 0..7 symbols, FISH + value (×bet, integer) = a money fish, FISHER = wild, BOX = scatter. */
export const FISH = 1000;
export const FISHER = 9;
export const BOX = 10;
const FISH_SYM = 8;
export const isFish = (c: number) => c >= FISH;
export const fishValue = (c: number) => c - FISH;

/** Pays (× total bet) for 3 / 4 / 5 of a kind. */
export const FISHING_PAYS: [number, number, number][] = [
  [1, 2.5, 10], // float
  [1, 2.5, 10], // hook
  [1.2, 3.5, 16], // lure
  [1.2, 3.5, 16], // reel
  [2, 9, 45], // dragonfly
  [2, 9, 45], // frog
  [4, 16, 90], // boat
  [6.5, 33, 220], // rod
  [2, 9, 45], // fish
  [11, 55, 440], // fisherman (wild)
];
/** Weights per cell: symbols 0..7, fish, fisherman, scatter. Base game has no fisherman. */
export const FISHING_WEIGHTS = {
  base: [30, 30, 18, 18, 7, 7, 4, 2.5, 6, 0, 2.9],
  free: [14, 14, 12, 12, 8, 8, 5, 3, 8, 1.45, 1.7],
};
/** Fish values (× total bet) and their weights. */
export const FISH_VALUES: [number, number][] = [[2, 40], [5, 26], [10, 14], [15, 8], [20, 6], [25, 3.5], [50, 1.6], [250, 0.15], [2000, 0.01]];
export const FISHING_FREE = { 3: 10, 4: 15, 5: 20 } as Record<number, number>;
export const FISHING_RETRIGGER = 10;
export const FISHING_LEVELS = [1, 2, 3, 10];
export const FISHING_MAX_WIN = 5000;

const FV_TOTAL = FISH_VALUES.reduce((a, [, w]) => a + w, 0);
function drawCell(rng: Rng, free: boolean): number {
  const w = free ? FISHING_WEIGHTS.free : FISHING_WEIGHTS.base;
  const k = pickWeighted(rng, w);
  if (k === FISH_SYM) {
    let x = rng.float() * FV_TOTAL;
    for (const [v, wt] of FISH_VALUES) if ((x -= wt) < 0) return FISH + v;
    return FISH + 2;
  }
  return k;
}
const symOf = (c: number) => (isFish(c) ? FISH_SYM : c === BOX ? -1 : c);

export interface FishingSpin {
  grid: number[][];
  lines: LineWin[];
  /** Free spins only: fishermen on screen, total fish value on screen, multiplier level, collected win. */
  fishers: number;
  fishTotal: number;
  multiplier: number;
  collect: number;
  scatters: number;
  total: number;
  free: boolean;
}
export interface FishingResult { spins: FishingSpin[]; freeSpins: number; collected: number; multiplier: number; payout: number; capped: boolean; bet: number }

function spin(rng: Rng, free: boolean, multiplier: number): FishingSpin {
  const grid = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => drawCell(rng, free)));
  const lines = lineWins(grid, symOf, FISHER, FISHING_PAYS);
  let fishers = 0, fishTotal = 0, scatters = 0;
  for (const col of grid) for (const c of col) {
    if (c === FISHER) fishers++;
    else if (isFish(c)) fishTotal += fishValue(c);
    else if (c === BOX) scatters++;
  }
  const collect = free && fishers > 0 ? fishers * fishTotal * multiplier : 0;
  const total = lines.reduce((a, l) => a + l.pay, 0) + collect;
  return { grid, lines, fishers, fishTotal, multiplier, collect, scatters, total, free };
}

export function playFishing(rng: Rng, bet: number): FishingResult {
  const first = spin(rng, false, 1);
  const spins = [first];
  let mult = first.total;
  let freeSpins = first.scatters >= 3 ? FISHING_FREE[Math.min(5, first.scatters)] : 0;
  let collected = 0;
  let level = 0;
  for (let k = 0; k < freeSpins && mult < FISHING_MAX_WIN; k++) {
    const s = spin(rng, true, FISHING_LEVELS[level]);
    spins.push(s);
    mult += s.total;
    // fishermen collected unlock more spins and a bigger multiplier (×2, ×3, ×10), up to 3 times
    const before = Math.floor(collected / 4);
    collected += s.fishers;
    const after = Math.min(3, Math.floor(collected / 4));
    if (after > before && level < 3) {
      const steps = after - Math.min(before, 3);
      level = Math.min(3, level + steps);
      freeSpins += FISHING_RETRIGGER * steps;
    }
  }
  const capped = mult >= FISHING_MAX_WIN;
  const multiplier = Math.min(FISHING_MAX_WIN, Math.round(mult * 100) / 100);
  return { spins, freeSpins, collected, multiplier: multiplier, payout: payoutFor(bet, multiplier), capped, bet };
}

export function fishingStats(rng: Rng, n: number) {
  let paid = 0, hits = 0, bonus = 0, big = 0;
  for (let i = 0; i < n; i++) {
    const r = playFishing(rng, 100);
    paid += r.multiplier;
    if (r.multiplier > 0) hits++;
    if (r.freeSpins) bonus++;
    if (r.multiplier >= 100) big++;
  }
  return { rtp: paid / n, hit: hits / n, bonus: bonus / n, big: big / n };
}
