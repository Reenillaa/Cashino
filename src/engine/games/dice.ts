import { randomInt, type Rng } from '../rng/rng.ts';
import { ORIGINALS_EDGE, floorTo, settle, type Settled } from './types.ts';

/** Roll is k/100 with k uniform in [0, 9999] → 0.00 … 99.99 (10 000 outcomes). */
export type DiceMode = 'over' | 'under';
export const DICE_MIN_CHANCE = 0.01; // 1 %
export const DICE_MAX_CHANCE = 0.98; // 98 %

export function rollDice(rng: Rng): number {
  return randomInt(rng, 10000) / 100;
}

/** Win chance: "under T" wins if roll < T; "over T" wins if roll ≥ T. */
export function diceWinChance(mode: DiceMode, target: number): number {
  const t = Math.round(target * 100);
  return mode === 'under' ? t / 10000 : (10000 - t) / 10000;
}

export function diceMultiplier(mode: DiceMode, target: number, edge = ORIGINALS_EDGE): number {
  return floorTo((1 - edge) / diceWinChance(mode, target), 4);
}

export function validateDice(mode: DiceMode, target: number): void {
  const p = diceWinChance(mode, target);
  if (!(p >= DICE_MIN_CHANCE - 1e-9 && p <= DICE_MAX_CHANCE + 1e-9)) throw new Error('Dice chance out of range');
}

export function diceWins(mode: DiceMode, target: number, roll: number): boolean {
  return mode === 'under' ? roll < target : roll >= target;
}

export function playDice(
  rng: Rng,
  bet: number,
  mode: DiceMode,
  target: number,
): Settled & { roll: number; won: boolean; chance: number } {
  validateDice(mode, target);
  const roll = rollDice(rng);
  const won = diceWins(mode, target, roll);
  return { ...settle(bet, won ? diceMultiplier(mode, target) : 0), roll, won, chance: diceWinChance(mode, target) };
}
