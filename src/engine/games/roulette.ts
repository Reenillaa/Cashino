import { randomInt, type Rng } from '../rng/rng.ts';

/** European single-zero roulette (37 pockets). House edge on every bet: 1/37 ≈ 2.70 %. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;
export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export type PocketColor = 'red' | 'black' | 'green';
export function pocketColor(n: number): PocketColor {
  return n === 0 ? 'green' : RED_NUMBERS.has(n) ? 'red' : 'black';
}

export type RouletteBet =
  | { kind: 'straight'; numbers: [number] }
  | { kind: 'split'; numbers: [number, number] }
  | { kind: 'street'; row: number } // row 1..12 → 3r−2, 3r−1, 3r
  | { kind: 'corner'; numbers: [number, number, number, number] }
  | { kind: 'line'; row: number } // rows r and r+1 (r 1..11)
  | { kind: 'column'; column: 1 | 2 | 3 }
  | { kind: 'dozen'; dozen: 1 | 2 | 3 }
  | { kind: 'red' } | { kind: 'black' } | { kind: 'odd' } | { kind: 'even' } | { kind: 'low' } | { kind: 'high' };

/** Payout ratio "x to 1". */
export const ROULETTE_PAYS: Record<RouletteBet['kind'], number> = {
  straight: 35, split: 17, street: 11, corner: 8, line: 5, column: 2, dozen: 2, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1,
};

const isAdjacent = (a: number, b: number) => {
  const [x, y] = [Math.min(a, b), Math.max(a, b)];
  if (x === 0) return y >= 1 && y <= 3; // 0 splits with 1, 2, 3
  return (y - x === 3) || (y - x === 1 && x % 3 !== 0);
};

/** Returns the covered numbers, validating the bet's geometry on the layout. */
export function coveredNumbers(bet: RouletteBet): number[] {
  switch (bet.kind) {
    case 'straight': {
      const [n] = bet.numbers;
      if (!Number.isInteger(n) || n < 0 || n > 36) throw new Error('Invalid number');
      return [n];
    }
    case 'split': {
      const [a, b] = bet.numbers;
      if (!isAdjacent(a, b)) throw new Error('Split numbers must be adjacent');
      return [a, b].sort((x, y) => x - y);
    }
    case 'street':
      if (!Number.isInteger(bet.row) || bet.row < 1 || bet.row > 12) throw new Error('Invalid street');
      return [3 * bet.row - 2, 3 * bet.row - 1, 3 * bet.row];
    case 'corner': {
      const s = [...bet.numbers].sort((x, y) => x - y);
      const a = s[0];
      if (a < 1 || a % 3 === 0 || s[1] !== a + 1 || s[2] !== a + 3 || s[3] !== a + 4 || s[3] > 36) throw new Error('Invalid corner');
      return s;
    }
    case 'line':
      if (!Number.isInteger(bet.row) || bet.row < 1 || bet.row > 11) throw new Error('Invalid line');
      return Array.from({ length: 6 }, (_, i) => 3 * bet.row - 2 + i);
    case 'column':
      return Array.from({ length: 12 }, (_, i) => 3 * i + bet.column);
    case 'dozen':
      return Array.from({ length: 12 }, (_, i) => 12 * (bet.dozen - 1) + i + 1);
    case 'red': return [...RED_NUMBERS].sort((a, b) => a - b);
    case 'black': return Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => !RED_NUMBERS.has(n));
    case 'odd': return Array.from({ length: 18 }, (_, i) => 2 * i + 1);
    case 'even': return Array.from({ length: 18 }, (_, i) => 2 * i + 2);
    case 'low': return Array.from({ length: 18 }, (_, i) => i + 1);
    case 'high': return Array.from({ length: 18 }, (_, i) => i + 19);
  }
}

export function betKey(bet: RouletteBet): string {
  return `${bet.kind}:${coveredNumbers(bet).join('-')}`;
}

export function spinRoulette(rng: Rng): number {
  return randomInt(rng, 37);
}

export interface PlacedBet { bet: RouletteBet; amount: number }
export interface RouletteOutcome { number: number; color: PocketColor; totalBet: number; payout: number; winning: PlacedBet[] }

export function settleRoulette(result: number, bets: PlacedBet[]): RouletteOutcome {
  let totalBet = 0, payout = 0;
  const winning: PlacedBet[] = [];
  for (const b of bets) {
    if (!Number.isInteger(b.amount) || b.amount <= 0) throw new Error('Invalid amount');
    totalBet += b.amount;
    if (coveredNumbers(b.bet).includes(result)) {
      payout += b.amount * (ROULETTE_PAYS[b.bet.kind] + 1);
      winning.push(b);
    }
  }
  return { number: result, color: pocketColor(result), totalBet, payout, winning };
}

export function playRoulette(rng: Rng, bets: PlacedBet[]): RouletteOutcome {
  bets.forEach((b) => coveredNumbers(b.bet));
  return settleRoulette(spinRoulette(rng), bets);
}

/** Expected return of any single bet: (pays+1)·covered/37. */
export function rouletteExpectedReturn(bet: RouletteBet): number {
  return ((ROULETTE_PAYS[bet.kind] + 1) * coveredNumbers(bet).length) / 37;
}
