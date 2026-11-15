import { randomInt, type Rng } from '../rng/rng.ts';
import type { Card, Rank, Suit } from '../cards/cards.ts';
import { ORIGINALS_EDGE, floorTo, settle, type Settled } from './types.ts';

/**
 * Hi-Lo with an infinite deck: every card is drawn uniformly from 52 (independent draws).
 * Ace is LOW (value 1) and King is HIGH (13).
 * Guesses: for 2..Q → "higher or same" / "lower or same". On A → "higher" or "same". On K → "lower" or "same".
 * Step probability p → fair step factor 1/p. The house edge is applied once, at cash out: (1 − e) · Π 1/p.
 */
export type HiloGuess = 'higher' | 'lower' | 'higherOrSame' | 'lowerOrSame' | 'same';
export const HILO_MAX_STEPS = 40;
export const HILO_MAX_SKIPS = 52;

export function hiloValue(c: Card): number {
  return c.rank === 14 ? 1 : c.rank;
}

export function legalGuesses(c: Card): HiloGuess[] {
  const v = hiloValue(c);
  if (v === 1) return ['higher', 'same'];
  if (v === 13) return ['lower', 'same'];
  return ['higherOrSame', 'lowerOrSame'];
}

export function guessProbability(c: Card, g: HiloGuess): number {
  const v = hiloValue(c);
  switch (g) {
    case 'higher': return (13 - v) / 13;
    case 'lower': return (v - 1) / 13;
    case 'higherOrSame': return (14 - v) / 13;
    case 'lowerOrSame': return v / 13;
    case 'same': return 1 / 13;
  }
}

export function guessWins(prev: Card, next: Card, g: HiloGuess): boolean {
  const a = hiloValue(prev), b = hiloValue(next);
  switch (g) {
    case 'higher': return b > a;
    case 'lower': return b < a;
    case 'higherOrSame': return b >= a;
    case 'lowerOrSame': return b <= a;
    case 'same': return b === a;
  }
}

const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
export function drawCard(rng: Rng): Card {
  const i = randomInt(rng, 52);
  return { rank: ((i % 13) + 2) as Rank, suit: SUITS[Math.floor(i / 13)] };
}

export interface HiloStep { card: Card; guess: HiloGuess | 'skip'; probability: number; correct: boolean }
export interface HiloState {
  bet: number;
  current: Card;
  /** Product of 1/p of correct guesses (before edge). */
  fairFactor: number;
  steps: HiloStep[];
  skips: number;
  status: 'active' | 'lost' | 'cashed';
}

export function startHilo(rng: Rng, bet: number): HiloState {
  return { bet, current: drawCard(rng), fairFactor: 1, steps: [], skips: 0, status: 'active' };
}

export function hiloMultiplier(state: Pick<HiloState, 'fairFactor' | 'steps'>, edge = ORIGINALS_EDGE): number {
  const correct = state.steps.filter((s) => s.guess !== 'skip' && s.correct).length;
  return correct === 0 ? 1 : floorTo((1 - edge) * state.fairFactor, 4);
}

export function guess(state: HiloState, g: HiloGuess, rng: Rng): HiloState {
  if (state.status !== 'active') throw new Error('Round finished');
  if (!legalGuesses(state.current).includes(g)) throw new Error('Illegal guess for this card');
  if (state.steps.length >= HILO_MAX_STEPS) throw new Error('Max steps');
  const p = guessProbability(state.current, g);
  const next = drawCard(rng);
  const correct = guessWins(state.current, next, g);
  const steps = [...state.steps, { card: next, guess: g, probability: p, correct }];
  return {
    ...state,
    current: next,
    steps,
    fairFactor: correct ? state.fairFactor / p : state.fairFactor,
    status: correct ? 'active' : 'lost',
  };
}

export function skip(state: HiloState, rng: Rng): HiloState {
  if (state.status !== 'active') throw new Error('Round finished');
  if (state.skips >= HILO_MAX_SKIPS) throw new Error('Max skips');
  const next = drawCard(rng);
  return { ...state, current: next, skips: state.skips + 1, steps: [...state.steps, { card: next, guess: 'skip', probability: 1, correct: true }] };
}

export function cashoutHilo(state: HiloState): HiloState & Settled {
  if (state.status !== 'active') throw new Error('Round finished');
  if (!state.steps.some((s) => s.guess !== 'skip' && s.correct)) throw new Error('Make at least one correct guess');
  return { ...state, status: 'cashed', ...settle(state.bet, hiloMultiplier(state)) };
}
