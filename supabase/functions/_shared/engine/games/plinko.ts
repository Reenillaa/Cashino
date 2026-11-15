import { type Rng } from '../rng/rng.ts';
import { choose, settle, type Settled } from './types.ts';

export type PlinkoRisk = 'low' | 'medium' | 'high';
export const PLINKO_MIN_ROWS = 8;
export const PLINKO_MAX_ROWS = 16;

/**
 * Pay tables (multiplier per bin, left → right). Designed by scripts/design-paytables.mjs for an RTP
 * between 98.5 % and 99.2 % (verified exactly by tests using the binomial distribution).
 */
export const PLINKO_TABLES: Record<PlinkoRisk, Record<number, number[]>> = 
{
  low: {
    8: [5.6, 2.7, 1.3, 0.8, 0.52, 0.8, 1.3, 2.7, 5.6],
    9: [6.4, 3.4, 1.9, 1, 0.5, 0.5, 1, 1.9, 3.4, 6.4],
    10: [7.3, 3.9, 2.2, 1.2, 0.7, 0.56, 0.7, 1.2, 2.2, 3.9, 7.3],
    11: [8.3, 4.7, 2.7, 1.6, 0.9, 0.52, 0.52, 0.9, 1.6, 2.7, 4.7, 8.3],
    12: [9.5, 5.4, 3.1, 1.9, 1.1, 0.7, 0.5, 0.7, 1.1, 1.9, 3.1, 5.4, 9.5],
    13: [11, 6.5, 3.8, 2.3, 1.4, 0.9, 0.49, 0.49, 0.9, 1.4, 2.3, 3.8, 6.5, 11],
    14: [12, 7.1, 4.3, 2.6, 1.6, 1, 0.7, 0.55, 0.7, 1, 1.6, 2.6, 4.3, 7.1, 12],
    15: [14, 8.5, 5.2, 3.2, 2, 1.3, 0.8, 0.53, 0.53, 0.8, 1.3, 2, 3.2, 5.2, 8.5, 14],
    16: [16, 9.6, 5.8, 3.6, 2.2, 1.4, 1, 0.7, 0.53, 0.7, 1, 1.4, 2.2, 3.6, 5.8, 9.6, 16],
  },
  medium: {
    8: [13, 3.7, 1.3, 0.6, 0.4, 0.6, 1.3, 3.7, 13],
    9: [17, 5.3, 1.9, 0.8, 0.42, 0.42, 0.8, 1.9, 5.3, 17],
    10: [22, 6.9, 2.5, 1.1, 0.6, 0.36, 0.6, 1.1, 2.5, 6.9, 22],
    11: [29, 9.6, 3.6, 1.5, 0.7, 0.43, 0.43, 0.7, 1.5, 3.6, 9.6, 29],
    12: [38, 13, 4.8, 2, 1, 0.5, 0.4, 0.5, 1, 2, 4.8, 13, 38],
    13: [49, 17, 6.3, 2.7, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 2.7, 6.3, 17, 49],
    14: [64, 22, 8.6, 3.6, 1.7, 0.9, 0.5, 0.37, 0.5, 0.9, 1.7, 3.6, 8.6, 22, 64],
    15: [84, 30, 12, 4.9, 2.2, 1.1, 0.7, 0.37, 0.37, 0.7, 1.1, 2.2, 4.9, 12, 30, 84],
    16: [110, 40, 15, 6.4, 2.9, 1.4, 0.8, 0.5, 0.43, 0.5, 0.8, 1.4, 2.9, 6.4, 15, 40, 110],
  },
  high: {
    8: [29, 4.7, 1.1, 0.4, 0.19, 0.4, 1.1, 4.7, 29],
    9: [45, 8, 1.8, 0.5, 0.23, 0.23, 0.5, 1.8, 8, 45],
    10: [70, 13, 2.8, 0.8, 0.3, 0.17, 0.3, 0.8, 2.8, 13, 70],
    11: [109, 20, 4.4, 1.2, 0.5, 0.17, 0.17, 0.5, 1.2, 4.4, 20, 109],
    12: [170, 31, 6.8, 1.9, 0.6, 0.3, 0.18, 0.3, 0.6, 1.9, 6.8, 31, 170],
    13: [265, 48, 11, 2.8, 0.9, 0.4, 0.2, 0.2, 0.4, 0.9, 2.8, 11, 48, 265],
    14: [413, 75, 16, 4.3, 1.4, 0.5, 0.3, 0.18, 0.3, 0.5, 1.4, 4.3, 16, 75, 413],
    15: [642, 118, 25, 6.5, 2, 0.7, 0.4, 0.21, 0.21, 0.4, 0.7, 2, 6.5, 25, 118, 642],
    16: [1000, 182, 39, 9.7, 2.9, 1, 0.5, 0.3, 0.2, 0.3, 0.5, 1, 2.9, 9.7, 39, 182, 1000],
  },
};

export function plinkoTable(rows: number, risk: PlinkoRisk): number[] {
  const t = PLINKO_TABLES[risk]?.[rows];
  if (!t) throw new Error(`No Plinko table for ${rows} rows / ${risk}`);
  return t;
}

/** Probability of landing in bin i: C(n, i) / 2^n. */
export function binProbability(rows: number, bin: number): number {
  return choose(rows, bin) / 2 ** rows;
}

export function plinkoRtp(rows: number, risk: PlinkoRisk): number {
  return plinkoTable(rows, risk).reduce((s, m, i) => s + m * binProbability(rows, i), 0);
}

/** Ball path: one fair left/right decision per row (true = right). The bin is the number of rights. */
export function dropBall(rng: Rng, rows: number): { path: boolean[]; bin: number } {
  if (!Number.isInteger(rows) || rows < PLINKO_MIN_ROWS || rows > PLINKO_MAX_ROWS) throw new Error('Invalid rows');
  const path: boolean[] = [];
  for (let i = 0; i < rows; i++) path.push(rng.float() >= 0.5);
  return { path, bin: path.filter(Boolean).length };
}

export function playPlinko(
  rng: Rng,
  bet: number,
  rows: number,
  risk: PlinkoRisk,
): Settled & { path: boolean[]; bin: number; tableMultiplier: number } {
  const { path, bin } = dropBall(rng, rows);
  const m = plinkoTable(rows, risk)[bin];
  return { ...settle(bet, m), path, bin, tableMultiplier: m };
}
