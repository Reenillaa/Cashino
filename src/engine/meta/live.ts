import { seededRng } from '../rng/rng.ts';
import * as Horses from '../games/horses.ts';
import * as Roulette from '../games/roulette.ts';
import { crashPoint } from '../games/crash.ts';

/**
 * Live (shared) rounds: everybody plays the same timed round. Time is cut into slots; in each slot
 * betting is open until `closesAt`, then the server creates the result with a fresh random seed (so
 * nobody — not even the server code path that took the bets — knows it in advance), and everyone sees
 * the same race / spin. Shared by the app (timeline, odds, display) and the server (validation, payouts).
 */
export type LiveGame = 'horses' | 'roulette' | 'crash';
export const LIVE_GAMES: LiveGame[] = ['horses', 'roulette', 'crash'];
export const LIVE_CONFIG: Record<LiveGame, { period: number; betting: number; show: number; min: number; max: number }> = {
  // a race every 2 minutes: 90 s to study and bet, then the race (~16 s) and the results
  horses: { period: 120_000, betting: 90_000, show: 16_000, min: 10, max: 2000 },
  // a spin every 45 seconds: 30 s to bet, then the wheel
  roulette: { period: 45_000, betting: 30_000, show: 7_000, min: 10, max: 2000 },
  // a rocket every 45 seconds: 12 s to get on board, then everyone flies the same rocket (up to ×50)
  crash: { period: 45_000, betting: 12_000, show: 28_000, min: 10, max: 2000 },
};

/* Live rocket: a faster curve than the solo game (×10 in ~15 s) and a ×50 ceiling so a round fits its slot. */
export const LIVE_CRASH_RATE = 0.15;
export const LIVE_CRASH_CAP = 50;
export const liveCrashMult = (ms: number) => Math.min(LIVE_CRASH_CAP, Math.floor(Math.exp((LIVE_CRASH_RATE * Math.max(0, ms)) / 1000) * 100) / 100);
export const liveCrashTime = (m: number) => (Math.log(Math.max(1, m)) / LIVE_CRASH_RATE) * 1000;
export interface CrashBet { amount: number; auto?: number | null }
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

export type LiveResult = { race: Horses.RaceResult } | { number: number } | { crash: number };
export function liveResult(game: LiveGame, card: Horses.RaceCard | null, seed: number): LiveResult {
  const rng = seededRng(seed);
  if (game === 'crash') return { crash: Math.min(LIVE_CRASH_CAP, crashPoint(rng)) };
  return game === 'horses' ? { race: Horses.runRace(rng, card!) } : { number: Roulette.spinRoulette(rng) };
}

export type LiveBet = Horses.HorseBet | Roulette.PlacedBet | CrashBet;
const ROULETTE_LIVE: Roulette.RouletteBet['kind'][] = ['straight', 'red', 'black', 'odd', 'even', 'low', 'high', 'dozen', 'column'];

/** Validates a bet for a live game and returns its stake (throws on anything invalid). */
export function checkLiveBet(game: LiveGame, bet: LiveBet): number {
  const { min, max } = LIVE_CONFIG[game];
  const amount = (bet as { amount: number }).amount;
  if (!Number.isInteger(amount) || amount < min || amount > max) throw new Error('invalid_amount');
  if (game === 'crash') {
    const auto = (bet as CrashBet).auto;
    if (auto !== undefined && auto !== null && !(Number.isFinite(auto) && auto >= 1.01 && auto <= LIVE_CRASH_CAP)) throw new Error('invalid_bet');
  } else if (game === 'horses') {
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
  if (game === 'crash') {
    // bets still on board at the end: an auto cash-out at or below the crash pays it; a rocket that
    // reaches the ×50 ceiling lands safely and pays everyone still aboard ×50
    const b = bet as CrashBet;
    const crash = (result as { crash: number }).crash;
    const target = b.auto ?? (crash >= LIVE_CRASH_CAP ? LIVE_CRASH_CAP : 0);
    return target && target <= crash ? Math.floor(b.amount * target + 1e-9) : 0;
  }
  return settleOther(game, card, result, bet);
}

/** A manual cash-out at server time `ms` after take-off: the multiplier paid, or null if the rocket already exploded. */
export function liveCashout(crash: number, bet: CrashBet, ms: number): number | null {
  const m = liveCrashMult(ms);
  if (bet.auto && bet.auto <= m && bet.auto <= crash) return Math.floor(bet.amount * bet.auto + 1e-9);
  if (ms < 0 || m >= crash) return null;
  return Math.floor(bet.amount * m + 1e-9);
}

function settleOther(game: LiveGame, card: Horses.RaceCard | null, result: LiveResult, bet: LiveBet): number {
  if (game === 'horses') {
    const r = Horses.settleBets(card!, (result as { race: Horses.RaceResult }).race.finish, [bet as Horses.HorseBet]);
    return r.payout;
  }
  return Roulette.settleRoulette((result as { number: number }).number, [bet as Roulette.PlacedBet]).payout;
}
