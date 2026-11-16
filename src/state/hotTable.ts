import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { utcDay } from '@/engine/meta/economy.ts';
import type { GameId } from '@/engine/games/types.ts';

import { HOT_NET, HOT_STREAK } from '@/engine/meta/hot.ts';

export { HOT_NET, HOT_STREAK, HOT_CAP, hotRoom } from '@/engine/meta/hot.ts';

/** Per-device record of today's results per game, to show the hot-table limit (the server enforces it for accounts). */
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
