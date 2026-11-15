import type { Rng } from '../rng/rng.ts';
import { ORIGINALS_EDGE, floorTo, settle, type Settled } from './types.ts';

/** Exponential growth rate per second: m(t) = e^(RATE·t). 2× at ~9.9 s, 10× at ~33 s. */
export const CRASH_RATE = 0.07;
export const CRASH_MAX = 10000;
export const MIN_CASHOUT = 1.01;

/**
 * Crash point with house edge e: raw = (1 − e) / (1 − u), floored to 2 decimals, min 1.00.
 * P(crash ≥ x) = (1 − e) / x for 1.01 ≤ x ≤ CRASH_MAX.
 */
export function crashPoint(rng: Rng, edge = ORIGINALS_EDGE): number {
  const u = rng.float();
  const raw = (1 - edge) / (1 - u);
  return Math.min(CRASH_MAX, Math.max(1, floorTo(raw, 2)));
}

export function multiplierAt(ms: number): number {
  return Math.exp((CRASH_RATE * Math.max(0, ms)) / 1000);
}

/** Milliseconds until the curve reaches multiplier m. */
export function timeFor(m: number): number {
  return (Math.log(Math.max(1, m)) / CRASH_RATE) * 1000;
}

export function winProbability(target: number, edge = ORIGINALS_EDGE): number {
  if (target < 1) return 1;
  return Math.min(1, (1 - edge) / target);
}

/** Settles a round where the player cashes out at `cashout` (or never, if null). */
export function settleCrash(bet: number, crash: number, cashout: number | null): Settled & { won: boolean } {
  const won = cashout !== null && cashout >= MIN_CASHOUT && cashout <= crash;
  return { ...settle(bet, won ? floorTo(cashout!, 2) : 0), won };
}
