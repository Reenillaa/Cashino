import type { Rng } from '../rng/rng.ts';
import { payoutFor, settle } from './types.ts';

/**
 * Pump: inflate a balloon one pump at a time; every pump may pop it. Cash out before it bursts.
 * The pump that pops it is decided at the start. Return 99 %.
 */
export type PumpLevel = 'easy' | 'medium' | 'hard' | 'expert';
export const PUMP_POP: Record<PumpLevel, number> = { easy: 0.04, medium: 0.1, hard: 0.2, expert: 0.33 };
export const PUMP_MAX: Record<PumpLevel, number> = { easy: 24, medium: 20, hard: 15, expert: 10 };

export function pumpMultiplier(level: PumpLevel, pumps: number): number {
  if (pumps <= 0) return 1;
  return Math.floor((0.99 / (1 - PUMP_POP[level]) ** pumps) * 100) / 100;
}

export interface PumpState {
  bet: number;
  level: PumpLevel;
  /** The pump number that pops the balloon (hidden); PUMP_MAX + 1 means it never pops. */
  popAt: number;
  pumps: number;
  status: 'active' | 'popped' | 'cashed';
}

export function startPump(rng: Rng, bet: number, level: PumpLevel): PumpState {
  let popAt = PUMP_MAX[level] + 1;
  for (let k = 1; k <= PUMP_MAX[level]; k++) {
    if (rng.float() < PUMP_POP[level]) {
      popAt = k;
      break;
    }
  }
  return { bet, level, popAt, pumps: 0, status: 'active' };
}

export function pump(st: PumpState): PumpState {
  if (st.status !== 'active') throw new Error('not_active');
  if (st.pumps >= PUMP_MAX[st.level]) throw new Error('max_pumps');
  const pumps = st.pumps + 1;
  return { ...st, pumps, status: pumps === st.popAt ? 'popped' : 'active' };
}

export function pumpPayout(st: PumpState): number {
  return st.status === 'popped' ? 0 : payoutFor(st.bet, pumpMultiplier(st.level, st.pumps));
}

export function cashoutPump(st: PumpState) {
  if (st.status !== 'active') throw new Error('not_active');
  if (st.pumps === 0) throw new Error('nothing_to_cash');
  return { ...st, status: 'cashed' as const, ...settle(st.bet, pumpMultiplier(st.level, st.pumps)) };
}
