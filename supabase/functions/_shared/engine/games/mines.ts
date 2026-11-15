import { sampleDistinct, type Rng } from '../rng/rng.ts';
import { ORIGINALS_EDGE, choose, floorTo, settle, type Settled } from './types.ts';

export const MINES_TILES = 25;

/** Multiplier after k safe reveals with m mines: (1 − e) · C(25,k) / C(25−m,k). */
export function minesMultiplier(mines: number, k: number, edge = ORIGINALS_EDGE): number {
  if (k === 0) return 1;
  return floorTo(((1 - edge) * choose(MINES_TILES, k)) / choose(MINES_TILES - mines, k), 4);
}

/** Probability that the next pick is safe after k safe reveals. */
export function nextSafeChance(mines: number, k: number): number {
  return (MINES_TILES - mines - k) / (MINES_TILES - k);
}

/** Probability of surviving k consecutive picks from the start. */
export function surviveChance(mines: number, k: number): number {
  return choose(MINES_TILES - mines, k) / choose(MINES_TILES, k);
}

export interface MinesState {
  bet: number;
  mines: number;
  /** Hidden until the round ends (server keeps it private online). */
  minePositions: number[];
  revealed: number[];
  status: 'active' | 'lost' | 'cashed';
  hitMine?: number;
}

export function startMines(rng: Rng, bet: number, mines: number): MinesState {
  if (!Number.isInteger(mines) || mines < 1 || mines > 24) throw new Error('Mines must be 1–24');
  return { bet, mines, minePositions: sampleDistinct(rng, MINES_TILES, mines).sort((a, b) => a - b), revealed: [], status: 'active' };
}

export function revealTile(state: MinesState, tile: number): MinesState {
  if (state.status !== 'active') throw new Error('Round finished');
  if (!Number.isInteger(tile) || tile < 0 || tile >= MINES_TILES) throw new Error('Invalid tile');
  if (state.revealed.includes(tile)) throw new Error('Tile already revealed');
  if (state.minePositions.includes(tile)) return { ...state, status: 'lost', hitMine: tile };
  const revealed = [...state.revealed, tile];
  const next: MinesState = { ...state, revealed };
  // All safe tiles found → automatic cash out.
  if (revealed.length === MINES_TILES - state.mines) return { ...next, status: 'cashed' };
  return next;
}

export function currentMultiplier(state: MinesState): number {
  return minesMultiplier(state.mines, state.revealed.length);
}

export function cashoutMines(state: MinesState): MinesState & Settled {
  if (state.revealed.length === 0) throw new Error('Reveal at least one tile');
  if (state.status === 'lost') throw new Error('Round lost');
  return { ...state, status: 'cashed', ...settle(state.bet, currentMultiplier(state)) };
}

/** Public view (hides mines while active). */
export function publicMines(state: MinesState): Omit<MinesState, 'minePositions'> & { minePositions: number[] | null } {
  return { ...state, minePositions: state.status === 'active' ? null : state.minePositions };
}
