import { shuffle, type Rng } from '../rng/rng.ts';
import { settle, payoutFor } from './types.ts';

/**
 * Dragon Tower: climb 8 floors. Each floor hides dragon eggs among a few doors; pick a safe door to
 * go up, or cash out. Where the eggs are is decided at the start. Return 99 %: after k safe floors
 * the multiplier is 0.99 ÷ (chance of surviving k floors).
 */
export type TowerLevel = 'easy' | 'medium' | 'hard' | 'expert';
export const TOWER_FLOORS = 8;
export const TOWER_SHAPE: Record<TowerLevel, { tiles: number; bad: number }> = {
  easy: { tiles: 4, bad: 1 },
  medium: { tiles: 3, bad: 1 },
  hard: { tiles: 2, bad: 1 },
  expert: { tiles: 3, bad: 2 },
};

export function towerMultiplier(level: TowerLevel, floors: number): number {
  if (floors <= 0) return 1;
  const { tiles, bad } = TOWER_SHAPE[level];
  const p = (tiles - bad) / tiles;
  return Math.floor((0.99 / p ** floors) * 100) / 100;
}

export interface TowerState {
  bet: number;
  level: TowerLevel;
  /** bad[f] = door indexes with an egg on floor f (hidden). */
  bad: number[][];
  picks: number[];
  status: 'active' | 'lost' | 'cashed';
}

export function startTower(rng: Rng, bet: number, level: TowerLevel): TowerState {
  const { tiles, bad } = TOWER_SHAPE[level];
  const rows = Array.from({ length: TOWER_FLOORS }, () => shuffle(rng, Array.from({ length: tiles }, (_, i) => i)).slice(0, bad).sort());
  return { bet, level, bad: rows, picks: [], status: 'active' };
}

export function pickTower(st: TowerState, door: number): TowerState {
  if (st.status !== 'active') throw new Error('not_active');
  const { tiles } = TOWER_SHAPE[st.level];
  if (!Number.isInteger(door) || door < 0 || door >= tiles) throw new Error('invalid_door');
  const floor = st.picks.length;
  const lost = st.bad[floor].includes(door);
  return { ...st, picks: [...st.picks, door], status: lost ? 'lost' : 'active' };
}

export function towerPayout(st: TowerState): number {
  return st.status === 'lost' ? 0 : payoutFor(st.bet, towerMultiplier(st.level, st.picks.length));
}

export function cashoutTower(st: TowerState) {
  if (st.status !== 'active') throw new Error('not_active');
  if (st.picks.length === 0) throw new Error('nothing_to_cash');
  return { ...st, status: 'cashed' as const, ...settle(st.bet, towerMultiplier(st.level, st.picks.length)) };
}
