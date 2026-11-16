import { seededRng } from '../rng/rng.ts';
import * as Horses from '../games/horses.ts';
import * as Roulette from '../games/roulette.ts';

/**
 * Live (shared) rounds: everybody plays the same timed round. Time is cut into slots; in each slot
 * betting is open until `closesAt`, then the server creates the result with a fresh random seed (so
 * nobody — not even the server code path that took the bets — knows it in advance), and everyone sees
 * the same race / spin. Shared by the app (timeline, odds, display) and the server (validation, payouts).
 */
export type LiveGame = 'horses' | 'roulette';
export const LIVE_GAMES: LiveGame[] = ['horses', 'roulette'];
export const LIVE_CONFIG: Record<LiveGame, { period: number; betting: number; show: number; min: number; max: number }> = {
  // a race every 2 minutes: 90 s to study and bet, then the race (~16 s) and the results
  horses: { period: 120_000, betting: 90_000, show: 16_000, min: 10, max: 2000 },
  // a spin every 45 seconds: 30 s to bet, then the wheel
  roulette: { period: 45_000, betting: 30_000, show: 7_000, min: 10, max: 2000 },
};
/** Seconds after betting closes before the show starts (time for the server to draw the result). */
export const LIVE_LEAD = 2_500;

export function slotAt(game: LiveGame, now: number) {
  const c = LIVE_CONFIG[game];
  const slot = Math.floor(now / c.period);
  const opensAt = slot * c.period;
  return { slot, opensAt, closesAt: opensAt + c.betting, startsAt: opensAt + c.betting + LIVE_LEAD, endsAt: opensAt + c.period };
}

/** The public part of a round, shown while betting is open. */
export function liveCard(game: LiveGame, seed: number): Horses.RaceCard | null {
  return game === 'horses' ? Horses.makeCard(seededRng(seed)) : null;
}

export type LiveResult = { race: Horses.RaceResult } | { number: number };
export function liveResult(game: LiveGame, card: Horses.RaceCard | null, seed: number): LiveResult {
  const rng = seededRng(seed);
  return game === 'horses' ? { race: Horses.runRace(rng, card!) } : { number: Roulette.spinRoulette(rng) };
}

export type LiveBet = Horses.HorseBet | Roulette.PlacedBet;
const ROULETTE_LIVE: Roulette.RouletteBet['kind'][] = ['straight', 'red', 'black', 'odd', 'even', 'low', 'high', 'dozen', 'column'];

/** Validates a bet for a live game and returns its stake (throws on anything invalid). */
export function checkLiveBet(game: LiveGame, bet: LiveBet): number {
  const { min, max } = LIVE_CONFIG[game];
  const amount = (bet as { amount: number }).amount;
  if (!Number.isInteger(amount) || amount < min || amount > max) throw new Error('invalid_amount');
  if (game === 'horses') {
    const b = bet as Horses.HorseBet;
    if (!Horses.BET_TYPES.includes(b.type) || !Horses.validBet(b)) throw new Error('invalid_bet');
  } else {
    const b = bet as Roulette.PlacedBet;
    if (!b.bet || !ROULETTE_LIVE.includes(b.bet.kind)) throw new Error('invalid_bet');
    Roulette.coveredNumbers(b.bet); // throws on bad geometry
  }
  return amount;
}

/** What a bet pays back (stake included) once the result is known. */
export function livePayout(game: LiveGame, card: Horses.RaceCard | null, result: LiveResult, bet: LiveBet): number {
  if (game === 'horses') {
    const r = Horses.settleBets(card!, (result as { race: Horses.RaceResult }).race.finish, [bet as Horses.HorseBet]);
    return r.payout;
  }
  return Roulette.settleRoulette((result as { number: number }).number, [bet as Roulette.PlacedBet]).payout;
}
