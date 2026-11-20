import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { useSettings } from './settings';

/**
 * Responsible play, kept on this device: how long you played each day, how many rounds, how much you bet and
 * how much came back. It feeds your own limits (a daily time limit and a loss warning) and the honest weekly
 * summary on your profile. Raising a limit only counts from the next day; lowering it counts at once.
 */
export interface DayAgg { ms: number; rounds: number; bet: number; payout: number }
interface WellbeingState {
  days: Record<string, DayAgg>;
  lossAlertDay: number | null;
  /** A raised (or removed) time limit waits until `from`; until then `prev` still applies. */
  pendingLimit: { prev: number; from: number } | null;
  addTime: (ms: number, now?: number) => void;
  addRound: (bet: number, payout: number, now?: number) => void;
  markLossAlert: (day: number) => void;
  setPending: (p: WellbeingState['pendingLimit']) => void;
}

export const dayOf = (ts: number) => Math.floor((ts - new Date(ts).getTimezoneOffset() * 60_000) / 86_400_000); // local calendar day
const empty = (): DayAgg => ({ ms: 0, rounds: 0, bet: 0, payout: 0 });
const keep = (days: Record<string, DayAgg>, today: number) => Object.fromEntries(Object.entries(days).filter(([d]) => Number(d) > today - 35));

export const useWellbeing = create<WellbeingState>()(
  persist(
    (set) => ({
      days: {},
      lossAlertDay: null,
      pendingLimit: null,
      addTime: (ms, now = Date.now()) =>
        set((s) => {
          const d = dayOf(now);
          const cur = s.days[d] ?? empty();
          return { days: keep({ ...s.days, [d]: { ...cur, ms: cur.ms + ms } }, d) };
        }),
      addRound: (bet, payout, now = Date.now()) =>
        set((s) => {
          const d = dayOf(now);
          const cur = s.days[d] ?? empty();
          return { days: keep({ ...s.days, [d]: { ...cur, rounds: cur.rounds + 1, bet: cur.bet + bet, payout: cur.payout + payout } }, d) };
        }),
      markLossAlert: (day) => set({ lossAlertDay: day }),
      setPending: (pendingLimit) => set({ pendingLimit }),
    }),
    { name: `${STORAGE_PREFIX}wellbeing`, storage: persistStorage, version: 1, partialize: ({ days, lossAlertDay, pendingLimit }) => ({ days, lossAlertDay, pendingLimit }) },
  ),
);

/** The time limit (minutes, 0 = none) that applies today. */
export function effectiveLimit(limit: number, pending: WellbeingState['pendingLimit'], today: number): number {
  if (pending && today < pending.from) return pending.prev;
  return limit;
}

/** Change the daily time limit: lower at once, higher (or off) from tomorrow. */
export function changeTimeLimit(next: number, now = Date.now()) {
  const today = dayOf(now);
  const cur = effectiveLimit(useSettings.getState().dailyTimeLimitMin, useWellbeing.getState().pendingLimit, today);
  const looser = cur > 0 && (next === 0 || next > cur);
  useWellbeing.getState().setPending(looser ? { prev: cur, from: today + 1 } : null);
  useSettings.getState().set({ dailyTimeLimitMin: next });
}

/** Today's limit state for the game screens. */
export function useTimeLimit(now: number) {
  const limit = useSettings((s) => s.dailyTimeLimitMin);
  const pending = useWellbeing((s) => s.pendingLimit);
  const ms = useWellbeing((s) => s.days[dayOf(now)]?.ms ?? 0);
  const eff = effectiveLimit(limit, pending, dayOf(now));
  return { limit: eff, usedMin: Math.floor(ms / 60_000), reached: eff > 0 && ms >= eff * 60_000 };
}

/** Last 7 days (oldest first) and their totals. */
export function weekSummary(days: Record<string, DayAgg>, now = Date.now()) {
  const today = dayOf(now);
  const list = Array.from({ length: 7 }, (_, i) => ({ day: today - 6 + i, ...(days[today - 6 + i] ?? empty()) }));
  const total = list.reduce((a, d) => ({ ms: a.ms + d.ms, rounds: a.rounds + d.rounds, bet: a.bet + d.bet, payout: a.payout + d.payout }), empty());
  return { list, total, net: total.payout - total.bet, back: total.bet ? total.payout / total.bet : 0 };
}
