import type { GameId } from '../games/types.ts';

/**
 * Unlocks: everything except Blackjack and Poker is bought with play chips — each game, each live table,
 * the sportsbook itself and every sport inside it. One price ladder for all of them:
 *  - 1st purchase 2 500, 2nd 5 000;
 *  - from the 3rd on it grows ×1.5 per purchase AND never drops below 40 % of the most chips you have
 *    ever had at once (so a player with a big bankroll pays more). Rounded to a "nice" number.
 * Shared by the app (guests, display) and the server (accounts), so the price is the same everywhere.
 */
export type UnlockId = `game:${GameId}` | `live:${'horses' | 'roulette' | 'crash'}` | 'sports' | `sport:${string}`;

/** Blackjack and poker are free; the scratch cards are sold in the shop, so they never need an unlock. */
export const FREE_UNLOCKS: UnlockId[] = ['game:blackjack', 'game:poker', 'game:scratch'];
export const UNLOCK_FIRST = 2500;
export const UNLOCK_SECOND = 5000;
export const UNLOCK_GROWTH = 1.5;
export const UNLOCK_PEAK_SHARE = 0.4;
/** Every player can open one game of their choice for free (their "main" game); it never raises prices. */
export const FREE_UNLOCK_CREDITS = 1;
/** Rounds anyone can play in a locked game before buying it. */
export const TRIAL_ROUNDS = 3;
export const LOCKABLE_GAMES: GameId[] = ['fishing', 'jade', 'goldmine', 'fruits', 'pirate', 'angler', 'penguin', 'cascade', 'horses', 'slots', 'roulette', 'videopoker', 'crash', 'wheel', 'towers', 'pump', 'diamonds', 'dragontiger', 'trader', 'dice', 'mines', 'plinko', 'baccarat', 'coinflip', 'hilo', 'limbo', 'crossing', 'keno', 'sicbo'];
export const LIVE_UNLOCKS = ['live:horses', 'live:roulette', 'live:crash'] as const;
export const SPORT_UNLOCKS = ['soccer', 'nba', 'nfl', 'nhl', 'tennis', 'ufc', 'f1'] as const;

/** Everything that can be bought. */
export const UNLOCKABLES: UnlockId[] = [
  ...LOCKABLE_GAMES.map((g) => `game:${g}` as UnlockId),
  ...LIVE_UNLOCKS,
  'sports',
  ...SPORT_UNLOCKS.map((s) => `sport:${s}` as UnlockId),
];

export const isUnlockId = (x: string): x is UnlockId => UNLOCKABLES.includes(x as UnlockId);

/** Rounds up to two significant figures (12 345 → 13 000). */
export function nicePrice(x: number): number {
  if (x <= 0) return 0;
  const p = 10 ** Math.max(0, Math.floor(Math.log10(x)) - 1);
  return Math.ceil(x / p - 1e-9) * p;
}

/** Price of the next purchase given how many things were already bought and the highest balance ever held. */
export function unlockPrice(bought: number, peakBalance: number): number {
  if (bought <= 0) return UNLOCK_FIRST;
  if (bought === 1) return UNLOCK_SECOND;
  return nicePrice(Math.max(UNLOCK_SECOND * UNLOCK_GROWTH ** (bought - 1), UNLOCK_PEAK_SHARE * peakBalance));
}

/** What has to be owned before buying `id` (a sport needs the sportsbook). */
export function unlockRequires(id: UnlockId): UnlockId | null {
  return id.startsWith('sport:') ? 'sports' : null;
}

export function isUnlocked(owned: readonly string[], id: UnlockId): boolean {
  return FREE_UNLOCKS.includes(id) || owned.includes(id);
}

/** Trial rounds left in a locked game (`used` = trial rounds already played). */
export function trialLeft(used: number | undefined): number {
  return Math.max(0, TRIAL_ROUNDS - (used ?? 0));
}
