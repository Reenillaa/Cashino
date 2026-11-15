import { sampleDistinct, type Rng } from '../rng/rng.ts';
import { choose, settle, type Settled } from './types.ts';

export type KenoRisk = 'low' | 'medium' | 'high';
export const KENO_NUMBERS = 40;
export const KENO_DRAWN = 10;
export const KENO_MAX_PICKS = 10;

/**
 * KENO_TABLES[risk][picks][hits] = multiplier. Designed by scripts/design-paytables.mjs with an
 * RTP between 98.5 % and 99.3 % (verified exactly by tests with the hypergeometric distribution).
 */
export const KENO_TABLES: Record<KenoRisk, Record<number, number[]>> = 
{
  low: {
    1: [0, 3.96],
    2: [0, 1.22, 9],
    3: [0, 0.46, 3.45, 26],
    4: [0, 0, 2.17, 10.4, 50],
    5: [0, 0, 1.17, 5.16, 22.7, 100],
    6: [0, 0, 0.71, 2.92, 11.9, 48.9, 200],
    7: [0, 0, 0, 2.25, 8.23, 30, 110, 400],
    8: [0, 0, 0, 1.42, 4.92, 17, 58.7, 203, 700],
    9: [0, 0, 0, 1.01, 3.2, 10.1, 31.9, 100, 317, 1000],
    10: [0, 0, 0, 0, 2.82, 8.41, 25.1, 75.1, 224, 670, 2000],
  },
  medium: {
    1: [0, 3.96],
    2: [0, 0.5, 13.8],
    3: [0, 0, 2.8, 50],
    4: [0, 0, 1.15, 11.8, 120],
    5: [0, 0, 0, 5.94, 42.2, 300],
    6: [0, 0, 0, 2.82, 16.8, 101, 600],
    7: [0, 0, 0, 1.68, 8.27, 40.9, 202, 1000],
    8: [0, 0, 0, 0, 6.06, 27.3, 123, 555, 2500],
    9: [0, 0, 0, 0, 3.38, 14.5, 62.6, 270, 1161, 5000],
    10: [0, 0, 0, 0, 0, 12.7, 48.3, 183, 695, 2636, 10000],
  },
  high: {
    1: [0, 3.96],
    2: [0, 0, 17.1],
    3: [0, 0, 0, 81.5],
    4: [0, 0, 0, 10.5, 250],
    5: [0, 0, 0, 2.85, 47.8, 800],
    6: [0, 0, 0, 0, 22.8, 185, 1500],
    7: [0, 0, 0, 0, 9.59, 65.1, 442, 3000],
    8: [0, 0, 0, 0, 0, 48.4, 241, 1203, 6000],
    9: [0, 0, 0, 0, 0, 22.4, 103, 474, 2177, 10000],
    10: [0, 0, 0, 0, 0, 0, 107, 396, 1463, 5410, 20000],
  },
};

/** P(exactly h hits | s picks) — hypergeometric: C(s,h)·C(40−s,10−h) / C(40,10). */
export function kenoHitProbability(picks: number, hits: number): number {
  return (choose(picks, hits) * choose(KENO_NUMBERS - picks, KENO_DRAWN - hits)) / choose(KENO_NUMBERS, KENO_DRAWN);
}

export function kenoRtp(picks: number, risk: KenoRisk): number {
  return KENO_TABLES[risk][picks].reduce((s, m, h) => s + m * kenoHitProbability(picks, h), 0);
}

export function validatePicks(picks: number[]): number[] {
  const set = new Set(picks);
  if (set.size !== picks.length || picks.length < 1 || picks.length > KENO_MAX_PICKS) throw new Error('Pick 1–10 distinct numbers');
  for (const p of picks) if (!Number.isInteger(p) || p < 1 || p > KENO_NUMBERS) throw new Error('Numbers are 1–40');
  return [...picks].sort((a, b) => a - b);
}

/** Draws 10 distinct numbers 1..40 (in draw order, for the animation). */
export function drawKeno(rng: Rng): number[] {
  return sampleDistinct(rng, KENO_NUMBERS, KENO_DRAWN).map((n) => n + 1);
}

export function playKeno(
  rng: Rng,
  bet: number,
  picks: number[],
  risk: KenoRisk,
): Settled & { drawn: number[]; hits: number[]; picks: number[] } {
  const p = validatePicks(picks);
  const drawn = drawKeno(rng);
  const hits = p.filter((n) => drawn.includes(n));
  return { ...settle(bet, KENO_TABLES[risk][p.length][hits.length]), drawn, hits, picks: p };
}
