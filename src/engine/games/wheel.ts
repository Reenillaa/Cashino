import { randomInt, type Rng } from '../rng/rng.ts';
import { settle } from './types.ts';

/**
 * Fortune wheel: 30 equal segments, the wheel stops on one at random. Three risk levels with the
 * same 99 % return: low pays small and often, high pays ×29.7 on a single segment.
 */
export type WheelRisk = 'low' | 'medium' | 'high';
export const WHEEL_SEGMENTS = 30;
const COUNTS: Record<WheelRisk, [number, number][]> = {
  // [multiplier, how many segments]
  low: [[0, 9], [1.2, 12], [1.5, 7], [2.4, 2]],
  medium: [[0, 16], [1.5, 6], [2, 5], [3, 2], [4.7, 1]],
  high: [[0, 29], [29.7, 1]],
};

/** Segment multipliers in wheel order, spread out so equal values are not bunched together. */
export function wheelLayout(risk: WheelRisk): number[] {
  const pool = COUNTS[risk].flatMap(([m, n]) => Array.from({ length: n }, () => m));
  const zeros = pool.filter((m) => m === 0);
  const wins = pool.filter((m) => m > 0).sort((a, b) => a - b);
  // interleave: alternate a win and a loss as long as both last, wins spread from small to big
  const out: number[] = [];
  const order: number[] = [];
  for (let i = 0, j = wins.length - 1; i <= j; i++, j--) {
    order.push(wins[i]);
    if (i !== j) order.push(wins[j]);
  }
  while (out.length < WHEEL_SEGMENTS) {
    if (order.length) out.push(order.shift()!);
    if (zeros.length) out.push(zeros.shift()!);
    if (!order.length && !zeros.length) break;
  }
  return out;
}

export function wheelRtp(risk: WheelRisk): number {
  return COUNTS[risk].reduce((a, [m, n]) => a + m * n, 0) / WHEEL_SEGMENTS;
}

export function playWheel(rng: Rng, bet: number, risk: WheelRisk) {
  const layout = wheelLayout(risk);
  const segment = randomInt(rng, WHEEL_SEGMENTS);
  return { ...settle(bet, layout[segment]), segment, risk, layout };
}
