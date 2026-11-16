import type { Rng } from '../rng/rng.ts';
import { payoutFor } from './types.ts';

/**
 * Dulce Cascada ("Sweet Cascade"): a 6×5 tumbling slot with scatter pays.
 * - No paylines: 8 or more of the same sweet ANYWHERE on the grid pay (more pay more).
 * - Winning sweets pop, everything above falls down and new sweets drop in from the top ("tumble");
 *   it repeats while there are wins, so one spin can pay several times.
 * - Multiplier bombs (×2…×100) can drop in. When a spin's tumbles end, if it won anything, all the bombs
 *   on the grid are added up and multiply that spin's win.
 * - 4+ lollipops (scatter) pay and give 10 free spins, where bombs fall much more often; 3+ during the
 *   free spins add 5 more. The whole bonus is played out within the same round.
 * Every cell is drawn independently with the weights below. The return is ≈ 96.5 % (measured over 10 million
 * simulated rounds: 96.3–96.8 % by seed; see `cascadeStats` and the tests). Like every tumbling slot it
 * cannot be enumerated exactly. Hit rate ≈ 30 %, free spins ≈ 1 round in 440.
 */
export const COLS = 6;
export const ROWS = 5;
export const CASCADE_SYMBOLS = ['heart', 'star', 'drop', 'cube', 'plum', 'apple', 'melon', 'grape', 'banana'] as const;
export type CascadeSymbol = (typeof CASCADE_SYMBOLS)[number];
/** Cell codes: 0..8 = sweets (CASCADE_SYMBOLS order), 9 = lollipop (scatter), 1000 + n = ×n bomb. */
export const SCATTER = 9;
export const BOMB = 1000;
export const isBomb = (c: number) => c >= BOMB;
export const bombValue = (c: number) => c - BOMB;

/** Draw weights of the sweets (cheap fruit is common, hearts are rare). */
export const SYMBOL_WEIGHTS = [5, 7, 8, 9, 11, 12, 14, 16, 18];
/** Pays (× bet) for 8–9, 10–11 and 12+ of a kind. */
export const CASCADE_PAYS: [number, number, number][] = [
  [25, 65, 130], // heart
  [6.5, 26, 65], // star
  [5, 13, 40], // drop
  [4, 5, 30], // cube
  [2.6, 4, 26], // plum
  [2, 3, 20], // apple
  [1.3, 2.6, 13], // melon
  [1, 2.4, 10], // grape
  [0.65, 2, 5], // banana
];
/** Lollipops: chance per cell, prize (× bet) for 4 / 5 / 6+, free spins awarded and retriggered. */
export const SCATTER_CHANCE = 0.0165;
export const SCATTER_PAYS: Record<number, number> = { 4: 3, 5: 5, 6: 100 };
export const FREE_SPINS = 10;
export const FREE_RETRIGGER = 5;
export const FREE_MAX = 50;
/** Bombs: chance per newly dropped cell in the base game / in the free spins, and their values. */
export const BOMB_CHANCE = { base: 0.0021, free: 0.019 };
export const BOMB_VALUES: [number, number][] = [[2, 30], [3, 24], [4, 14], [5, 12], [8, 8], [10, 6], [15, 3], [25, 1.8], [50, 0.8], [100, 0.4]];
/** Biggest possible round, as a multiple of the bet. */
export const CASCADE_MAX_WIN = 5000;

const W_TOTAL = SYMBOL_WEIGHTS.reduce((a, b) => a + b, 0);
const B_TOTAL = BOMB_VALUES.reduce((a, [, w]) => a + w, 0);

function drawCell(rng: Rng, free: boolean): number {
  const u = rng.float();
  if (u < SCATTER_CHANCE) return SCATTER;
  if (u < SCATTER_CHANCE + BOMB_CHANCE[free ? 'free' : 'base']) {
    let x = rng.float() * B_TOTAL;
    for (const [v, w] of BOMB_VALUES) if ((x -= w) < 0) return BOMB + v;
    return BOMB + 2;
  }
  let x = rng.float() * W_TOTAL;
  for (let s = 0; s < SYMBOL_WEIGHTS.length; s++) if ((x -= SYMBOL_WEIGHTS[s]) < 0) return s;
  return SYMBOL_WEIGHTS.length - 1;
}

export function symbolPay(sym: number, count: number): number {
  if (count < 8) return 0;
  const p = CASCADE_PAYS[sym];
  return (count >= 12 ? p[2] : count >= 10 ? p[1] : p[0]);
}
export const scatterPay = (n: number) => (n >= 6 ? SCATTER_PAYS[6] : SCATTER_PAYS[n] ?? 0);

/** One tumble step: the grid as it is (columns, top to bottom) and what pays on it. */
export interface CascadeStep { grid: number[][]; wins: { sym: number; count: number; pay: number }[] }
export interface CascadeSpin { steps: CascadeStep[]; win: number; bombs: number; total: number; scatters: number; free: boolean }
export interface CascadeResult { spins: CascadeSpin[]; freeSpins: number; scatterWin: number; multiplier: number; payout: number; capped: boolean }

function playSpin(rng: Rng, free: boolean): CascadeSpin {
  let grid = Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => drawCell(rng, free)));
  const steps: CascadeStep[] = [];
  let win = 0;
  for (let guard = 0; guard < 60; guard++) {
    const counts = new Array<number>(CASCADE_SYMBOLS.length).fill(0);
    for (const col of grid) for (const c of col) if (c < SCATTER) counts[c]++;
    const wins = counts.map((count, sym) => ({ sym, count, pay: symbolPay(sym, count) })).filter((w) => w.pay > 0);
    steps.push({ grid: grid.map((c) => [...c]), wins });
    if (!wins.length) break;
    win += wins.reduce((a, w) => a + w.pay, 0);
    const popped = new Set(wins.map((w) => w.sym));
    // remaining cells fall to the bottom of their column, new cells drop in on top
    grid = grid.map((col) => {
      const keep = col.filter((c) => !popped.has(c));
      return [...Array.from({ length: ROWS - keep.length }, () => drawCell(rng, free)), ...keep];
    });
  }
  const last = steps[steps.length - 1].grid;
  let bombs = 0;
  let scatters = 0;
  for (const col of last) for (const c of col) {
    if (isBomb(c)) bombs += bombValue(c);
    else if (c === SCATTER) scatters++;
  }
  const total = win > 0 && bombs > 0 ? win * bombs : win;
  return { steps, win, bombs, total, scatters, free };
}

export function playCascade(rng: Rng, bet: number): CascadeResult & { bet: number } {
  const spins: CascadeSpin[] = [playSpin(rng, false)];
  const base = spins[0];
  const scatterWin = base.scatters >= 4 ? scatterPay(base.scatters) : 0;
  let freeSpins = base.scatters >= 4 ? FREE_SPINS : 0;
  let mult = base.total + scatterWin;
  for (let k = 0; k < freeSpins && k < FREE_MAX; k++) {
    const s = playSpin(rng, true);
    spins.push(s);
    mult += s.total;
    if (s.scatters >= 3) freeSpins = Math.min(FREE_MAX, freeSpins + FREE_RETRIGGER);
    if (mult >= CASCADE_MAX_WIN) break;
  }
  const capped = mult >= CASCADE_MAX_WIN;
  const multiplier = Math.min(CASCADE_MAX_WIN, Math.round(mult * 100) / 100);
  return { spins, freeSpins, scatterWin, multiplier, payout: payoutFor(bet, multiplier), capped, bet };
}

/** Simulated return, hit rate and bonus frequency over `n` rounds (used by the tests and the Academy). */
export function cascadeStats(rng: Rng, n: number) {
  let paid = 0, hits = 0, bonus = 0, big = 0;
  for (let i = 0; i < n; i++) {
    const r = playCascade(rng, 100);
    paid += r.multiplier;
    if (r.multiplier > 0) hits++;
    if (r.freeSpins) bonus++;
    if (r.multiplier >= 100) big++;
  }
  return { rtp: paid / n, hit: hits / n, bonus: bonus / n, big: big / n };
}
