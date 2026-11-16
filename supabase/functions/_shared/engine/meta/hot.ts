import type { Room } from './rooms.ts';

/**
 * "Hot table": after winning a lot in one game on one UTC day, that game's maximum bet drops to about a
 * quarter until the next day. The odds never change; only the stake limit of that one table.
 * Shared by the app (display) and the server (enforcement).
 */
export const HOT_NET = 2000; // net chips won today in one game
export const HOT_STREAK = 8; // or this many wins in a row in that game
export const HOT_CAP = 0.25; // share of the room's max bet still allowed

/** Rounds of one game today, oldest first. */
export function isHotFrom(rounds: { bet: number; payout: number }[]): boolean {
  let net = 0, streak = 0;
  for (const r of rounds) {
    net += r.payout - r.bet;
    streak = r.payout > r.bet ? streak + 1 : r.payout < r.bet ? 0 : streak;
    if (net >= HOT_NET || streak >= HOT_STREAK) return true;
  }
  return false;
}

/** The room while the table is hot: same minimum, about a quarter of the maximum (a multiple of the minimum). */
export function hotRoom(room: Room): Room {
  return { ...room, max: Math.max(room.min, Math.floor((room.max * HOT_CAP) / Math.max(1, room.min)) * room.min) };
}
