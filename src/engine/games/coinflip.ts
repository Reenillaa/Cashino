import type { Rng } from '../rng/rng.ts';
import { ORIGINALS_EDGE, floorTo, settle, type Settled } from './types.ts';

export type Side = 'heads' | 'tails';
export const COINFLIP_MAX_STREAK = 20;

export function flip(rng: Rng): Side {
  return rng.float() < 0.5 ? 'heads' : 'tails';
}

/** Multiplier after k consecutive correct calls: (1 − e) · 2^k. The edge is applied once. */
export function streakMultiplier(k: number, edge = ORIGINALS_EDGE): number {
  return k <= 0 ? 0 : floorTo((1 - edge) * 2 ** k, 4);
}

export interface CoinflipState {
  bet: number;
  wins: number;
  history: { call: Side; result: Side }[];
  status: 'active' | 'lost' | 'cashed';
}

export function startCoinflip(bet: number): CoinflipState {
  return { bet, wins: 0, history: [], status: 'active' };
}

export function callFlip(state: CoinflipState, call: Side, rng: Rng): CoinflipState {
  if (state.status !== 'active') throw new Error('Round finished');
  if (state.wins >= COINFLIP_MAX_STREAK) throw new Error('Max streak reached');
  const result = flip(rng);
  const ok = result === call;
  return {
    ...state,
    wins: ok ? state.wins + 1 : state.wins,
    history: [...state.history, { call, result }],
    status: ok ? 'active' : 'lost',
  };
}

export function cashoutCoinflip(state: CoinflipState): CoinflipState & Settled {
  if (state.status !== 'active' || state.wins === 0) throw new Error('Nothing to cash out');
  return { ...state, status: 'cashed', ...settle(state.bet, streakMultiplier(state.wins)) };
}
