export const GAME_IDS = [
  'poker',
  'blackjack',
  'crash',
  'dice',
  'mines',
  'plinko',
  'crossing',
  'roulette',
  'limbo',
  'coinflip',
  'baccarat',
  'hilo',
  'keno',
  'sicbo',
  'slots',
  'trader',
  'videopoker',
  'wheel',
  'towers',
  'diamonds',
  'pump',
  'dragontiger',
  'horses',
  'cascade',
  'fishing',
  'jade',
] as const;
export type GameId = (typeof GAME_IDS)[number];

/** House edge used by the "originals" style games (crash, dice, limbo, mines, plinko, keno, coinflip, hilo, crossing). */
export const ORIGINALS_EDGE = 0.01;

/** Coins are integers. A payout includes the stake (0 = lost, bet = push). */
export function payoutFor(bet: number, multiplier: number): number {
  if (!(bet >= 0) || !Number.isFinite(multiplier) || multiplier < 0) throw new Error('payoutFor: invalid input');
  return Math.floor(bet * multiplier + 1e-9);
}

/** Floors a multiplier to `decimals` places (house-favourable rounding, never inflates payouts). */
export function floorTo(x: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.floor(x * f + 1e-9) / f;
}

export function assertBet(bet: number, max = Number.MAX_SAFE_INTEGER): void {
  if (!Number.isInteger(bet) || bet < 0 || bet > max) throw new Error(`Invalid bet ${bet}`);
}

export interface Settled {
  bet: number;
  payout: number;
  /** Effective multiplier = payout / bet (0 when lost). */
  multiplier: number;
}

export function settle(bet: number, multiplier: number): Settled {
  const payout = payoutFor(bet, multiplier);
  return { bet, payout, multiplier: bet > 0 ? payout / bet : multiplier };
}

/** Binomial coefficient (exact for the small n used by the games). */
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}
