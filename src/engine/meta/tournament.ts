import type { GameId } from '../games/types.ts';

/**
 * Daily tournament: every UTC day one game is the tournament game. Whoever wins the most net chips in it
 * during that day (00:00–24:00 UTC) takes the first prize; 2nd and 3rd get something too. The game is open
 * to everyone that day, even if it is locked. Shared by the app and the server, so both agree on the game.
 */
export const TOURNAMENT_PRIZES = [5000, 2500, 1000] as const;
export const DAY_MS = 86_400_000;

/** Games that can host the tournament (single-player rounds the server records; not poker). */
export const TOURNAMENT_POOL: GameId[] = [
  'roulette', 'slots', 'cascade', 'fishing', 'goldmine', 'jade', 'fruits', 'pirate', 'angler', 'penguin',
  'plinko', 'dice', 'mines', 'crash', 'wheel', 'towers', 'diamonds', 'pump', 'dragontiger', 'baccarat',
  'limbo', 'coinflip', 'hilo', 'crossing', 'videopoker', 'blackjack', 'trader', 'horses',
];

/** A fixed shuffle of the pool for each cycle, so every game gets its day before any repeats. */
function cycleOrder(cycle: number): GameId[] {
  const a = TOURNAMENT_POOL.slice();
  let x = (Math.imul(cycle + 1, 2654435761) ^ 0x9e3779b9) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The tournament game of UTC day `day` (days since 1970-01-01). Never the same game two days running. */
export function tournamentGame(day: number): GameId {
  const n = TOURNAMENT_POOL.length;
  const cycle = Math.floor(day / n);
  const order = cycleOrder(cycle);
  // the first day of a cycle must not repeat the last day of the previous one
  if (order[0] === cycleOrder(cycle - 1)[n - 1]) [order[0], order[1]] = [order[1], order[0]];
  return order[((day % n) + n) % n];
}

export const tournamentDay = (ts: number) => Math.floor(ts / DAY_MS);
/** When the tournament of `day` ends (ms). */
export const tournamentEnds = (day: number) => (day + 1) * DAY_MS;
