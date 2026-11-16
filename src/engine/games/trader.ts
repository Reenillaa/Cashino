import type { Rng } from '../rng/rng.ts';
import { ORIGINALS_EDGE, settle, type Settled } from './types.ts';

/**
 * "Bolsa": guess whether a price ends higher or lower than it starts. The price moves as a symmetric
 * random walk of TRADER_TICKS steps (log-normal moves), so up and down are exactly 50 / 50; a correct
 * call pays (1 − edge) / 0.5 = ×1.98. The whole path is decided before it is shown.
 */
export const TRADER_TICKS = 40;
export const TRADER_START = 100;
export const TRADER_VOL = 0.012;
export type TraderSide = 'up' | 'down';
export const TRADER_MULTIPLIER = (1 - ORIGINALS_EDGE) / 0.5;

/** Standard normal from two uniforms (Box–Muller). */
function normal(rng: Rng): number {
  const u = Math.max(1e-12, rng.float()), v = rng.float();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function tradePath(rng: Rng): number[] {
  const path = [TRADER_START];
  let p = TRADER_START;
  for (let i = 0; i < TRADER_TICKS; i++) {
    p *= Math.exp(TRADER_VOL * normal(rng));
    path.push(p);
  }
  return path;
}

export function playTrader(rng: Rng, bet: number, side: TraderSide): Settled & { path: number[]; side: TraderSide; won: boolean } {
  if (side !== 'up' && side !== 'down') throw new Error('Trader: invalid side');
  const raw = tradePath(rng);
  const end = raw[raw.length - 1];
  const won = side === 'up' ? end > TRADER_START : end < TRADER_START;
  return { ...settle(bet, won ? TRADER_MULTIPLIER : 0), path: raw.map((x) => Math.round(x * 100) / 100), side, won };
}
