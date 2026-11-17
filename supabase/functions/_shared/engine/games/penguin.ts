import type { Rng } from '../rng/rng.ts';
import { ORIGINALS_EDGE, floorTo, settle, type Settled } from './types.ts';

/**
 * Pingüino Saltarín ("Penguin Hop"): a penguin hops from ice floe to ice floe across a frozen sea.
 * Every floe has the same independent chance of cracking under it. Multiplier after k safe hops =
 * (1 − e) / (1 − p)^k, so cashing out after any number of hops returns exactly (1 − e) on average.
 * You can cash out after any safe hop; reaching the last floe cashes out automatically.
 */
export type PenguinDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';
export const PENGUIN_CONFIG: Record<PenguinDifficulty, { crack: number; floes: number }> = {
  easy: { crack: 0.05, floes: 22 },
  medium: { crack: 0.12, floes: 18 },
  hard: { crack: 0.2, floes: 14 },
  extreme: { crack: 0.32, floes: 10 },
};

export function penguinMultiplier(difficulty: PenguinDifficulty, hops: number, edge = ORIGINALS_EDGE): number {
  if (hops <= 0) return 1;
  return floorTo((1 - edge) / (1 - PENGUIN_CONFIG[difficulty].crack) ** hops, 4);
}
export function penguinSurvival(difficulty: PenguinDifficulty, hops: number): number {
  return (1 - PENGUIN_CONFIG[difficulty].crack) ** hops;
}

export interface PenguinState {
  bet: number;
  difficulty: PenguinDifficulty;
  /** Floe that cracks (hidden while playing), or null if every floe holds. */
  crackAt: number | null;
  hop: number;
  status: 'active' | 'lost' | 'cashed';
}

export function startPenguin(rng: Rng, bet: number, difficulty: PenguinDifficulty): PenguinState {
  const { crack, floes } = PENGUIN_CONFIG[difficulty];
  let crackAt: number | null = null;
  for (let i = 1; i <= floes; i++) {
    if (rng.float() < crack) {
      crackAt = i;
      break;
    }
  }
  return { bet, difficulty, crackAt, hop: 0, status: 'active' };
}

export function hop(state: PenguinState): PenguinState {
  if (state.status !== 'active') throw new Error('Round finished');
  const next = state.hop + 1;
  if (state.crackAt === next) return { ...state, hop: next, status: 'lost' };
  if (next >= PENGUIN_CONFIG[state.difficulty].floes) return { ...state, hop: next, status: 'cashed' };
  return { ...state, hop: next };
}

export function cashoutPenguin(state: PenguinState): PenguinState & Settled {
  if (state.status === 'lost') throw new Error('Round lost');
  if (state.hop === 0) throw new Error('Hop at least once');
  return { ...state, status: 'cashed', ...settle(state.bet, penguinMultiplier(state.difficulty, state.hop)) };
}

export function publicPenguin(state: PenguinState): Omit<PenguinState, 'crackAt'> & { crackAt: number | null | undefined } {
  return { ...state, crackAt: state.status === 'active' ? undefined : state.crackAt };
}
