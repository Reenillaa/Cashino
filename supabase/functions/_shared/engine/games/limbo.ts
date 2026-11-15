import type { Rng } from '../rng/rng.ts';
import { ORIGINALS_EDGE, floorTo, settle, type Settled } from './types.ts';

export const LIMBO_MIN_TARGET = 1.01;
export const LIMBO_MAX_TARGET = 1_000_000;

/** Same distribution as crash: result = floor2((1−e)/(1−u)), P(result ≥ t) = (1−e)/t. */
export function limboResult(rng: Rng, edge = ORIGINALS_EDGE): number {
  const u = rng.float();
  return Math.min(LIMBO_MAX_TARGET, Math.max(1, floorTo((1 - edge) / (1 - u), 2)));
}

export function limboWinChance(target: number, edge = ORIGINALS_EDGE): number {
  return Math.min(1, (1 - edge) / target);
}

export function validateTarget(target: number): number {
  if (!Number.isFinite(target) || target < LIMBO_MIN_TARGET || target > LIMBO_MAX_TARGET) {
    throw new Error(`Limbo target out of range: ${target}`);
  }
  return floorTo(target, 2);
}

export function playLimbo(rng: Rng, bet: number, target: number): Settled & { result: number; won: boolean; target: number } {
  const t = validateTarget(target);
  const result = limboResult(rng);
  const won = result >= t;
  return { ...settle(bet, won ? t : 0), result, won, target: t };
}
