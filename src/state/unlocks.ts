import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { FREE_UNLOCK_CREDITS, TRIAL_ROUNDS, isUnlocked, trialLeft, unlockPrice, unlockRequires, UNLOCKABLES, type UnlockId } from '@/engine/meta/unlocks.ts';
import { useAdmin } from '@/features/admin/useAdmin';
import { useWallet } from './wallet';
import { useSession } from './session';

interface AccountUnlocks {
  owned: string[];
  nextPrice: number;
  /** Free unlocks left (any game, no chips). */
  freeUnlocks: number;
  /** Trial rounds already played per locked item. */
  trials: Record<string, number>;
}

interface UnlockState {
  /** Guest purchases (on this device). */
  owned: string[];
  /** Guest: items opened with a free unlock (they do not raise the price of the next purchase). */
  freeUsed: string[];
  /** Guest: free unlocks left. */
  freeUnlocks: number;
  /** Guest: trial rounds played per locked item. */
  trials: Record<string, number>;
  /** Signed in: what the server says the account owns, its next price, free unlocks and trials. */
  account: AccountUnlocks | null;
  /** Item the "unlock" sheet is showing (null = closed). */
  prompt: UnlockId | null;
  applyServer: (owned: string[], nextPrice: number, freeUnlocks?: number, trials?: Record<string, number>) => void;
  /** Signed in: the server reported how many trial rounds are left in a game. */
  setAccountTrialLeft: (id: UnlockId, left: number) => void;
  leaveAccount: () => void;
  /** Guest purchase with the local wallet. */
  buyLocal: (id: UnlockId) => 'ok' | 'insufficient' | 'owned' | 'needs';
  /** Guest: opens a game with a free unlock. */
  freeLocal: (id: UnlockId) => 'ok' | 'none' | 'owned' | 'games_only';
  /** Guest: counts one trial round; false when the trial is used up. */
  takeTrialLocal: (id: UnlockId) => boolean;
  open: (id: UnlockId | null) => void;
}

export const useUnlocks = create<UnlockState>()(
  persist(
    (set, get) => ({
      owned: [],
      freeUsed: [],
      freeUnlocks: FREE_UNLOCK_CREDITS,
      trials: {},
      account: null,
      prompt: null,
      applyServer: (owned, nextPrice, freeUnlocks, trials) =>
        set((s) => ({ account: { owned, nextPrice, freeUnlocks: freeUnlocks ?? s.account?.freeUnlocks ?? 0, trials: trials ?? s.account?.trials ?? {} } })),
      setAccountTrialLeft: (id, left) =>
        set((s) => (s.account ? { account: { ...s.account, trials: { ...s.account.trials, [id]: TRIAL_ROUNDS - left } } } : {})),
      leaveAccount: () => set({ account: null }),
      buyLocal: (id) => {
        const { owned, freeUsed } = get();
        if (isUnlocked(owned, id)) return 'owned';
        const req = unlockRequires(id);
        if (req && !owned.includes(req)) return 'needs';
        const w = useWallet.getState();
        const price = unlockPrice(owned.length - freeUsed.length, w.peak ?? w.balance);
        if (!w.debit(price, 'unlock', id)) return 'insufficient';
        set({ owned: [...owned, id] });
        return 'ok';
      },
      freeLocal: (id) => {
        const { owned, freeUsed, freeUnlocks } = get();
        if (!id.startsWith('game:')) return 'games_only';
        if (isUnlocked(owned, id)) return 'owned';
        if (freeUnlocks <= 0) return 'none';
        set({ owned: [...owned, id], freeUsed: [...freeUsed, id], freeUnlocks: freeUnlocks - 1 });
        return 'ok';
      },
      takeTrialLocal: (id) => {
        const used = get().trials[id] ?? 0;
        if (used >= TRIAL_ROUNDS) return false;
        set((s) => ({ trials: { ...s.trials, [id]: used + 1 } }));
        return true;
      },
      open: (id) => set({ prompt: id }),
    }),
    {
      name: `${STORAGE_PREFIX}unlocks`,
      storage: persistStorage,
      version: 2,
      migrate: (state, version) => {
        const s = (state ?? {}) as Partial<UnlockState>;
        // v0 → 1: free unlocks and trials appear; v1 → 2: one free unlock instead of two (one used = none left)
        if (version < 1) return { ...s, freeUsed: [], freeUnlocks: FREE_UNLOCK_CREDITS, trials: {} } as never;
        return { ...s, freeUnlocks: Math.max(0, (s.freeUnlocks ?? FREE_UNLOCK_CREDITS) - 1) } as never;
      },
      partialize: ({ owned, freeUsed, freeUnlocks, trials }) => ({ owned, freeUsed, freeUnlocks, trials }),
    },
  ),
);

/** Owned list that applies right now (account when signed in, else this device). */
export function useOwnedUnlocks(): string[] {
  const signedIn = useSession((s) => !!s.userId);
  const admin = useAdmin((s) => s.admin);
  const account = useUnlocks((s) => s.account);
  const owned = useUnlocks((s) => s.owned);
  // developer accounts always have everything, even items newer than the server's list
  if (signedIn && admin) return UNLOCKABLES;
  return signedIn && account ? account.owned : owned;
}
export function useIsUnlocked(id: UnlockId): boolean {
  return isUnlocked(useOwnedUnlocks(), id);
}
/** Price of the next purchase for whoever is playing (free unlocks never raise it). */
export function useNextUnlockPrice(): number {
  const signedIn = useSession((s) => !!s.userId);
  const account = useUnlocks((s) => s.account);
  const owned = useUnlocks((s) => s.owned);
  const freeUsed = useUnlocks((s) => s.freeUsed);
  const peak = useWallet((s) => s.peak ?? s.balance);
  return signedIn && account ? account.nextPrice : unlockPrice(owned.length - freeUsed.length, peak);
}
/** Free unlocks left for whoever is playing. */
export function useFreeUnlocks(): number {
  const signedIn = useSession((s) => !!s.userId);
  const account = useUnlocks((s) => s.account);
  const local = useUnlocks((s) => s.freeUnlocks);
  return signedIn ? account?.freeUnlocks ?? 0 : local;
}
/** Trial rounds left in a locked item for whoever is playing. */
export function useTrialLeft(id: UnlockId): number {
  const signedIn = useSession((s) => !!s.userId);
  const account = useUnlocks((s) => s.account?.trials[id]);
  const local = useUnlocks((s) => s.trials[id]);
  return trialLeft(signedIn ? account : local);
}

/** Owned list right now, outside React (same rules as `useOwnedUnlocks`). */
export function currentOwnedUnlocks(): readonly string[] {
  const signedIn = !!useSession.getState().userId;
  if (signedIn && useAdmin.getState().admin) return UNLOCKABLES;
  const st = useUnlocks.getState();
  return signedIn && st.account ? st.account.owned : st.owned;
}

/**
 * A new round is about to start in `id`: fine if it is unlocked, otherwise it uses one trial round.
 * Returns false when the game is locked and its trial is used up. (The server enforces this for accounts.)
 */
export function takeTrialRound(id: UnlockId): boolean {
  if (isUnlocked(currentOwnedUnlocks(), id)) return true;
  const st = useUnlocks.getState();
  if (useSession.getState().userId) {
    const used = st.account?.trials[id] ?? 0;
    if (used >= TRIAL_ROUNDS) return false;
    st.setAccountTrialLeft(id, TRIAL_ROUNDS - used - 1);
    return true;
  }
  return st.takeTrialLocal(id);
}
