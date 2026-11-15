import type { Rng } from '../rng/rng.ts';
import { ORIGINALS_EDGE, floorTo, settle, type Settled } from './types.ts';

/**
 * "Cruce" (chicken-crossing style): the character advances lane by lane. Each lane has an independent
 * hit probability p. Multiplier after k safe lanes = (1 − e) / (1 − p)^k, so the expected return of
 * cashing out after any k lanes is exactly (1 − e).
 */
export type CrossingDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';
export const CROSSING_CONFIG: Record<CrossingDifficulty, { hitChance: number; lanes: number }> = {
  easy: { hitChance: 0.04, lanes: 24 },
  medium: { hitChance: 0.1, lanes: 20 },
  hard: { hitChance: 0.18, lanes: 16 },
  extreme: { hitChance: 0.3, lanes: 12 },
};

export function crossingMultiplier(difficulty: CrossingDifficulty, lanes: number, edge = ORIGINALS_EDGE): number {
  if (lanes <= 0) return 1;
  const { hitChance } = CROSSING_CONFIG[difficulty];
  return floorTo((1 - edge) / (1 - hitChance) ** lanes, 4);
}

export function crossingSurvival(difficulty: CrossingDifficulty, lanes: number): number {
  return (1 - CROSSING_CONFIG[difficulty].hitChance) ** lanes;
}

export interface CrossingState {
  bet: number;
  difficulty: CrossingDifficulty;
  /** Index of the lane where the character gets hit (hidden), or null if it survives every lane. */
  hitLane: number | null;
  lane: number;
  status: 'active' | 'lost' | 'cashed';
}

export function startCrossing(rng: Rng, bet: number, difficulty: CrossingDifficulty): CrossingState {
  const { hitChance, lanes } = CROSSING_CONFIG[difficulty];
  let hitLane: number | null = null;
  for (let i = 1; i <= lanes; i++) {
    if (rng.float() < hitChance) {
      hitLane = i;
      break;
    }
  }
  return { bet, difficulty, hitLane, lane: 0, status: 'active' };
}

export function advance(state: CrossingState): CrossingState {
  if (state.status !== 'active') throw new Error('Round finished');
  const lane = state.lane + 1;
  if (state.hitLane === lane) return { ...state, lane, status: 'lost' };
  if (lane >= CROSSING_CONFIG[state.difficulty].lanes) return { ...state, lane, status: 'cashed' };
  return { ...state, lane };
}

export function cashoutCrossing(state: CrossingState): CrossingState & Settled {
  if (state.status === 'lost') throw new Error('Round lost');
  if (state.lane === 0) throw new Error('Cross at least one lane');
  return { ...state, status: 'cashed', ...settle(state.bet, crossingMultiplier(state.difficulty, state.lane)) };
}

export function publicCrossing(state: CrossingState): Omit<CrossingState, 'hitLane'> & { hitLane: number | null | undefined } {
  return { ...state, hitLane: state.status === 'active' ? undefined : state.hitLane };
}
