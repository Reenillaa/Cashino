import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { utcDay } from '@/engine/meta/economy.ts';
import type { GameId } from '@/engine/games/types.ts';
import type { Room } from '@/engine/meta/rooms.ts';

/**
 * "Hot table": when you have won a lot in one game today, that game's maximum bet drops until
 * tomorrow (UTC) and the game tells you so. The odds never change — every round stays exactly as
 * random and verifiable as always; only how much you can stake at that one table is limited.
 */
export const HOT_NET = 2000; // net chips won today in one game
export const HOT_STREAK = 8; // or this many wins in a row in that game
export const HOT_CAP = 0.25; // share of the room's max bet you can still stake

interface HotState {
  day: number;
  net: Partial<Record<GameId, number>>;
  streak: Partial<Record<GameId, number>>;
  hot: Partial<Record<GameId, boolean>>;
  record: (game: GameId, bet: number, payout: number, now?: number) => void;
  reset: () => void;
}

export const useHotTable = create<HotState>()(
  persist(
    (set, get) => ({
      day: 0,
      net: {},
      streak: {},
      hot: {},
      record: (game, bet, payout, now = Date.now()) => {
        const today = utcDay(now);
        type M<T> = Partial<Record<GameId, T>>;
        const s: { net: M<number>; streak: M<number>; hot: M<boolean> } = get().day === today ? get() : { net: {}, streak: {}, hot: {} };
        const net = (s.net[game] ?? 0) + payout - bet;
        const streak = payout > bet ? (s.streak[game] ?? 0) + 1 : payout < bet ? 0 : s.streak[game] ?? 0;
        const hot = s.hot[game] || net >= HOT_NET || streak >= HOT_STREAK;
        set({ day: today, net: { ...s.net, [game]: net }, streak: { ...s.streak, [game]: streak }, hot: { ...s.hot, [game]: hot } });
      },
      reset: () => set({ day: 0, net: {}, streak: {}, hot: {} }),
    }),
    { name: `${STORAGE_PREFIX}hot`, storage: persistStorage },
  ),
);

export function isHot(game: GameId, now = Date.now()): boolean {
  const s = useHotTable.getState();
  return s.day === utcDay(now) && !!s.hot[game];
}

/** The room as seen while the table is hot: same minimum, a quarter of the maximum. */
export function hotRoom(room: Room): Room {
  return { ...room, max: Math.max(room.min, Math.floor((room.max * HOT_CAP) / Math.max(1, room.min)) * room.min) };
}
