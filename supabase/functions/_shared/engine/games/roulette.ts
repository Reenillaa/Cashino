import { randomInt, sampleDistinct, type Rng } from '../rng/rng.ts';

/**
 * Ruleta Llamarada: European single-zero roulette (37 pockets) with fire numbers. After betting closes, 1–5
 * random numbers catch fire with a multiplier (×50…×500). A straight bet on a fire number pays that
 * multiplier; any other straight pays 29:1. Every other bet pays as usual (edge 1/37 ≈ 2.70 %); straights
 * return ≈ 97.1 % on average (see `rouletteExpectedReturn`).
 */
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
  | { kind: 'trio'; numbers: [number, number, number] } // 0-1-2 or 0-2-3
  | { kind: 'street'; row: number } // row 1..12 → 3r−2, 3r−1, 3r
  | { kind: 'corner'; numbers: [number, number, number, number] }
  | { kind: 'line'; row: number } // rows r and r+1 (r 1..11)
  | { kind: 'column'; column: 1 | 2 | 3 }
  | { kind: 'dozen'; dozen: 1 | 2 | 3 }
  | { kind: 'red' } | { kind: 'black' } | { kind: 'odd' } | { kind: 'even' } | { kind: 'low' } | { kind: 'high' };

/** Payout ratio "x to 1". */
export const ROULETTE_PAYS: Record<RouletteBet['kind'], number> = {
  straight: 29, split: 17, trio: 11, street: 11, corner: 8, line: 5, column: 2, dozen: 2, red: 1, black: 1, odd: 1, even: 1, low: 1, high: 1,
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
    case 'trio': {
      const k = [...bet.numbers].sort((x, y) => x - y).join('-');
      if (k !== '0-1-2' && k !== '0-2-3') throw new Error('Invalid trio');
      return k.split('-').map(Number);
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

/* ------------------------------------------------------------------ fire numbers */

/** Multiplier of a fire number and its chance ("m" means it pays m:1). */
export const FIRE_MULTS: [number, number][] = [[50, 0.58], [100, 0.24], [200, 0.11], [300, 0.04], [500, 0.03]];
/** 1 to 5 fire numbers each spin, equally likely. */
export const FIRE_MAX = 5;
export interface FireNumber { n: number; m: number }

export function drawFire(rng: Rng): FireNumber[] {
  const k = 1 + randomInt(rng, FIRE_MAX);
  return sampleDistinct(rng, 37, k).map((n) => {
    let x = rng.float();
    let m = FIRE_MULTS[FIRE_MULTS.length - 1][0];
    for (const [v, p] of FIRE_MULTS) if ((x -= p) < 0) { m = v; break; }
    return { n, m };
  });
}
/** Average multiplier of a fire number and the chance that the winning number is on fire. */
export const FIRE_MEAN = FIRE_MULTS.reduce((a, [m, p]) => a + m * p, 0);
export const FIRE_HIT = (FIRE_MAX + 1) / 2 / 37;

/* ------------------------------------------------------------------ call bets (racetrack) */

export type CallBet = 'voisins' | 'tiers' | 'orphelins' | 'zero';
/** The standard French call bets, as the chips they put on the layout (`x2` = two chips on that spot). */
export const CALL_BETS: Record<CallBet, { bet: RouletteBet; chips: number }[]> = {
  // Voisins du zéro: the 17 numbers around zero (9 chips)
  voisins: [
    { bet: { kind: 'trio', numbers: [0, 2, 3] }, chips: 2 },
    { bet: { kind: 'split', numbers: [4, 7] }, chips: 1 },
    { bet: { kind: 'split', numbers: [12, 15] }, chips: 1 },
    { bet: { kind: 'split', numbers: [18, 21] }, chips: 1 },
    { bet: { kind: 'split', numbers: [19, 22] }, chips: 1 },
    { bet: { kind: 'corner', numbers: [25, 26, 28, 29] }, chips: 2 },
    { bet: { kind: 'split', numbers: [32, 35] }, chips: 1 },
  ],
  // Tiers du cylindre: the 12 numbers opposite zero (6 chips)
  tiers: [5, 10, 13, 23, 27, 33].map((a) => ({ bet: { kind: 'split', numbers: [a, a === 10 || a === 23 ? a + 1 : a + 3] } as RouletteBet, chips: 1 })),
  // Orphelins: the 8 numbers left over (5 chips)
  orphelins: [
    { bet: { kind: 'straight', numbers: [1] }, chips: 1 },
    { bet: { kind: 'split', numbers: [6, 9] }, chips: 1 },
    { bet: { kind: 'split', numbers: [14, 17] }, chips: 1 },
    { bet: { kind: 'split', numbers: [17, 20] }, chips: 1 },
    { bet: { kind: 'split', numbers: [31, 34] }, chips: 1 },
  ],
  // Jeu zéro: the 7 numbers closest to zero (4 chips)
  zero: [
    { bet: { kind: 'split', numbers: [0, 3] }, chips: 1 },
    { bet: { kind: 'split', numbers: [12, 15] }, chips: 1 },
    { bet: { kind: 'straight', numbers: [26] }, chips: 1 },
    { bet: { kind: 'split', numbers: [32, 35] }, chips: 1 },
  ],
};
export const callChips = (c: CallBet) => CALL_BETS[c].reduce((a, x) => a + x.chips, 0);
/** Numbers a call bet covers (in wheel order). */
export function callNumbers(c: CallBet): number[] {
  const set = new Set(CALL_BETS[c].flatMap((x) => coveredNumbers(x.bet)));
  return WHEEL_ORDER.filter((n) => set.has(n));
}
/** A number and its `k` neighbours on each side of the wheel ("vecinos"). */
export function neighbours(n: number, k = 2): number[] {
  const i = (WHEEL_ORDER as readonly number[]).indexOf(n);
  if (i < 0) throw new Error('Invalid number');
  return Array.from({ length: 2 * k + 1 }, (_, j) => WHEEL_ORDER[(i - k + j + 37) % 37]);
}
/** The chips a call bet (or a neighbours bet) puts down, each worth `chip`. */
export function expandCall(c: CallBet | { neighbours: number; k: number }, chip: number): PlacedBet[] {
  if (typeof c === 'object') return neighbours(c.neighbours, c.k).map((n) => ({ bet: { kind: 'straight', numbers: [n] }, amount: chip }));
  return CALL_BETS[c].map((x) => ({ bet: x.bet, amount: chip * x.chips }));
}

/* ------------------------------------------------------------------ settlement */

export interface PlacedBet { bet: RouletteBet; amount: number }
export interface RouletteOutcome { number: number; color: PocketColor; fire: FireNumber[]; totalBet: number; payout: number; winning: PlacedBet[]; fireHit: number | null }

/** What one bet pays back (stake included) for this result and these fire numbers. */
export function betReturn(b: PlacedBet, result: number, fire: FireNumber[]): number {
  if (!coveredNumbers(b.bet).includes(result)) return 0;
  if (b.bet.kind === 'straight') {
    const f = fire.find((x) => x.n === result);
    if (f) return b.amount * (f.m + 1);
  }
  return b.amount * (ROULETTE_PAYS[b.bet.kind] + 1);
}

export function settleRoulette(result: number, bets: PlacedBet[], fire: FireNumber[] = []): RouletteOutcome {
  let totalBet = 0, payout = 0;
  const winning: PlacedBet[] = [];
  for (const b of bets) {
    if (!Number.isInteger(b.amount) || b.amount <= 0) throw new Error('Invalid amount');
    totalBet += b.amount;
    const r = betReturn(b, result, fire);
    if (r > 0) {
      payout += r;
      winning.push(b);
    }
  }
  const f = fire.find((x) => x.n === result);
  return { number: result, color: pocketColor(result), fire, totalBet, payout, winning, fireHit: f ? f.m : null };
}

/** One spin: the number first, then the fire numbers (both from the same provably fair stream). */
export function playRoulette(rng: Rng, bets: PlacedBet[]): RouletteOutcome {
  bets.forEach((b) => coveredNumbers(b.bet));
  const n = spinRoulette(rng);
  return settleRoulette(n, bets, drawFire(rng));
}

/** Expected return of any single bet. Straights include the fire numbers: (30 + P(fire)·(E[m] − 29)) / 37. */
export function rouletteExpectedReturn(bet: RouletteBet): number {
  if (bet.kind === 'straight') {
    coveredNumbers(bet);
    return (ROULETTE_PAYS.straight + 1 + FIRE_HIT * (FIRE_MEAN - ROULETTE_PAYS.straight)) / 37;
  }
  return ((ROULETTE_PAYS[bet.kind] + 1) * coveredNumbers(bet).length) / 37;
}
