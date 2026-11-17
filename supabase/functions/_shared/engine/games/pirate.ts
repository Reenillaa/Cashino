import type { Rng } from '../rng/rng.ts';
import { payoutFor } from './types.ts';
import { REELS, ROWS, lineWins, pickWeighted, type LineWin } from './lineslot.ts';

/**
 * Noche Pirata ("Pirate Night"): an original pirate slot with the popular "walking wild" respins.
 * - 5×3, 10 lines, pays × total bet. The parrot is wild and only lands on reels 2–5.
 * - Whenever a parrot is on screen, you get a free respin: every parrot walks one reel to the left and the
 *   other cells spin again (new parrots can land). It keeps going until the last parrot walks off reel 1.
 * - Each respin pays its own lines. Biggest round ×2000 the bet. Return measured by simulation.
 */
export const PIRATE_SYMBOLS = ['anchor', 'compass', 'rum', 'map', 'cannon', 'chest', 'ship', 'captain', 'parrot'] as const;
export const PARROT = 8;
export const PIRATE_PAYS: [number, number, number][] = [
  [0.6, 1.6, 6.3], // anchor
  [0.6, 1.6, 6.3], // compass
  [0.8, 2.4, 7.9], // rum
  [0.8, 2.4, 7.9], // map
  [1.6, 4.7, 19], // cannon
  [1.9, 6.3, 25], // chest
  [3.2, 12.6, 63], // ship
  [6.3, 25, 158], // captain
  [0, 0, 0], // parrot (wild only)
];
/** Weights for the 8 symbols and the parrot (the parrot never lands on reel 1). */
export const PIRATE_WEIGHTS = [22, 22, 19, 19, 11, 9, 5, 3, 1.2];
export const PIRATE_MAX_STEPS = 40;
export const PIRATE_MAX_WIN = 2000;

export interface PirateSpin { grid: number[][]; lines: LineWin[]; parrots: number; total: number }
export interface PirateResult { spins: PirateSpin[]; multiplier: number; payout: number; capped: boolean; bet: number }

function cell(rng: Rng, reel: number): number {
  for (;;) {
    const k = pickWeighted(rng, PIRATE_WEIGHTS);
    if (k !== PARROT || reel > 0) return k;
  }
}
function evaluate(grid: number[][]): PirateSpin {
  const lines = lineWins(grid, (c) => c, PARROT, PIRATE_PAYS);
  let parrots = 0;
  for (const col of grid) for (const c of col) if (c === PARROT) parrots++;
  return { grid, lines, parrots, total: lines.reduce((a, l) => a + l.pay, 0) };
}

export function playPirate(rng: Rng, bet: number): PirateResult {
  let grid = Array.from({ length: REELS }, (_, reel) => Array.from({ length: ROWS }, () => cell(rng, reel)));
  const spins = [evaluate(grid)];
  let mult = spins[0].total;
  while (spins[spins.length - 1].parrots > 0 && spins.length <= PIRATE_MAX_STEPS && mult < PIRATE_MAX_WIN) {
    // parrots walk one reel left (those on reel 1 leave); every other cell spins again
    const next = Array.from({ length: REELS }, (_, reel) => Array.from({ length: ROWS }, () => cell(rng, reel)));
    for (let reel = 1; reel < REELS; reel++) for (let row = 0; row < ROWS; row++) if (grid[reel][row] === PARROT) next[reel - 1][row] = PARROT;
    grid = next;
    const s = evaluate(grid);
    spins.push(s);
    mult += s.total;
  }
  const capped = mult >= PIRATE_MAX_WIN;
  const multiplier = Math.min(PIRATE_MAX_WIN, Math.round(mult * 100) / 100);
  return { spins, multiplier, payout: payoutFor(bet, multiplier), capped, bet };
}

export function pirateStats(rng: Rng, n: number) {
  let paid = 0, hits = 0, bonus = 0, big = 0;
  for (let i = 0; i < n; i++) {
    const r = playPirate(rng, 100);
    paid += r.multiplier;
    if (r.multiplier > 0) hits++;
    if (r.spins.length > 1) bonus++;
    if (r.multiplier >= 100) big++;
  }
  return { rtp: paid / n, hit: hits / n, bonus: bonus / n, big: big / n };
}
