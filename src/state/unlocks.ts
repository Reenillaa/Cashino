import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { isUnlocked, unlockPrice, unlockRequires, UNLOCKABLES, type UnlockId } from '@/engine/meta/unlocks.ts';
import { useAdmin } from '@/features/admin/useAdmin';
import { useWallet } from './wallet';
import { useSession } from './session';

interface UnlockState {
  /** Guest purchases (on this device). */
  owned: string[];
  /** Signed in: what the server says the account owns, and its next price. */
  account: { owned: string[]; nextPrice: number } | null;
  /** Item the "unlock" sheet is showing (null = closed). */
  prompt: UnlockId | null;
  applyServer: (owned: string[], nextPrice: number) => void;
  leaveAccount: () => void;
  /** Guest purchase with the local wallet. Returns false when it cannot be bought. */
  buyLocal: (id: UnlockId) => 'ok' | 'insufficient' | 'owned' | 'needs';
  open: (id: UnlockId | null) => void;
}

export const useUnlocks = create<UnlockState>()(
  persist(
    (set, get) => ({
      owned: [],
      account: null,
      prompt: null,
      applyServer: (owned, nextPrice) => set({ account: { owned, nextPrice } }),
      leaveAccount: () => set({ account: null }),
      buyLocal: (id) => {
        const { owned } = get();
        if (isUnlocked(owned, id)) return 'owned';
        const req = unlockRequires(id);
        if (req && !owned.includes(req)) return 'needs';
        const w = useWallet.getState();
        const price = unlockPrice(owned.length, w.peak ?? w.balance);
        if (!w.debit(price, 'unlock', id)) return 'insufficient';
        set({ owned: [...owned, id] });
        return 'ok';
      },
      open: (id) => set({ prompt: id }),
    }),
    { name: `${STORAGE_PREFIX}unlocks`, storage: persistStorage, partialize: ({ owned }) => ({ owned }) },
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
/** Price of the next purchase for whoever is playing. */
export function useNextUnlockPrice(): number {
  const signedIn = useSession((s) => !!s.userId);
  const account = useUnlocks((s) => s.account);
  const owned = useUnlocks((s) => s.owned);
  const peak = useWallet((s) => s.peak ?? s.balance);
  return signedIn && account ? account.nextPrice : unlockPrice(owned.length, peak);
}
