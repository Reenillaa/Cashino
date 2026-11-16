import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { ECONOMY, applyRefill, canRefill, claimDaily, canClaimDaily, utcDay, type DailyState, type RefillState } from '@/engine/meta/economy.ts';

export interface LedgerEntry {
  id: string;
  ts: number;
  kind: 'bet' | 'payout' | 'daily' | 'refill' | 'mission' | 'level' | 'achievement' | 'migration' | 'adjust' | 'shop' | 'pass' | 'unlock' | 'weekly';
  amount: number; // signed
  game?: string;
  balance: number;
}

interface WalletState {
  /** Guest/offline balance (account balance lives on the server). */
  balance: number;
  /** Most chips ever held at once (unlock prices look at it). */
  peak: number;
  practice: number;
  daily: DailyState;
  refill: RefillState;
  ledger: LedgerEntry[];
  migratedToAccount: string | null;
  debit: (amount: number, kind: LedgerEntry['kind'], game?: string) => boolean;
  credit: (amount: number, kind: LedgerEntry['kind'], game?: string) => void;
  practiceDebit: (amount: number) => boolean;
  practiceCredit: (amount: number) => void;
  resetPractice: () => void;
  claimDaily: (now?: number) => number;
  canClaimDaily: (now?: number) => boolean;
  canRefill: (now?: number) => boolean;
  refillNow: (now?: number) => number;
  markMigrated: (userId: string) => void;
  resetAll: () => void;
}

let seq = 0;
const entry = (kind: LedgerEntry['kind'], amount: number, balance: number, game?: string): LedgerEntry => ({
  id: `${Date.now().toString(36)}-${(seq++).toString(36)}`,
  ts: Date.now(),
  kind,
  amount,
  game,
  balance,
});

const initial = () => ({
  balance: ECONOMY.startingBalance,
  peak: ECONOMY.startingBalance,
  practice: ECONOMY.practiceBalance,
  daily: { lastClaimDay: null, streak: 0 } as DailyState,
  refill: { day: 0, used: 0 } as RefillState,
  ledger: [] as LedgerEntry[],
  migratedToAccount: null as string | null,
});

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      ...initial(),
      debit: (amount, kind, game) => {
        if (!Number.isInteger(amount) || amount < 0) return false;
        const { balance } = get();
        if (amount > balance) return false;
        const nb = balance - amount;
        set((s) => ({ balance: nb, ledger: [entry(kind, -amount, nb, game), ...s.ledger].slice(0, 300) }));
        return true;
      },
      credit: (amount, kind, game) => {
        if (!Number.isInteger(amount) || amount <= 0) return;
        set((s) => {
          const nb = s.balance + amount;
          return { balance: nb, peak: Math.max(s.peak ?? 0, nb, ...s.ledger.slice(0, 300).map((e) => e.balance)), ledger: [entry(kind, amount, nb, game), ...s.ledger].slice(0, 300) };
        });
      },
      practiceDebit: (amount) => {
        if (amount > get().practice) return false;
        set((s) => ({ practice: s.practice - amount }));
        return true;
      },
      practiceCredit: (amount) => set((s) => ({ practice: s.practice + Math.max(0, Math.floor(amount)) })),
      resetPractice: () => set({ practice: ECONOMY.practiceBalance }),
      canClaimDaily: (now = Date.now()) => canClaimDaily(get().daily, utcDay(now)),
      claimDaily: (now = Date.now()) => {
        const r = claimDaily(get().daily, utcDay(now));
        set({ daily: r.state });
        get().credit(r.amount, 'daily');
        return r.amount;
      },
      canRefill: (now = Date.now()) => canRefill(get().balance, get().refill, utcDay(now)),
      refillNow: (now = Date.now()) => {
        const r = applyRefill(get().balance, get().refill, utcDay(now));
        set({ refill: r.refill });
        get().credit(r.amount, 'refill');
        return r.amount;
      },
      markMigrated: (userId) => set({ migratedToAccount: userId }),
      resetAll: () => set(initial()),
    }),
    { name: `${STORAGE_PREFIX}wallet`, storage: persistStorage, version: 1 },
  ),
);
