import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { useWallet } from './wallet';

export type Slot = 'back' | 'felt' | 'avatar' | 'frame' | 'title';
interface CosmeticsState {
  /** Owned items as `${slot}:${id}`. */
  owned: string[];
  equipped: { back: string; felt: string; avatar: string | null; frame: string | null; title: string | null };
  /** Spends chips from the local wallet. Returns false if already owned or not enough chips. */
  buy: (slot: Slot, id: string, price: number) => boolean;
  equip: (slot: Slot, id: string | null) => void;
  reset: () => void;
  /** Signed in: owned/equipped come from the server; the guest collection is kept aside. */
  account: boolean;
  guest: { owned: string[]; equipped: CosmeticsState['equipped'] } | null;
  applyServer: (owned: string[], equipped: Partial<CosmeticsState['equipped']>) => void;
  leaveAccount: () => void;
}

const initial = () => ({ owned: ['back:classic', 'felt:green'], equipped: { back: 'classic', felt: 'green', avatar: null as string | null, frame: null as string | null, title: null as string | null } });

export const useCosmetics = create<CosmeticsState>()(
  persist(
    (set, get) => ({
      ...initial(),
      buy: (slot, id, price) => {
        const key = `${slot}:${id}`;
        if (get().owned.includes(key)) return false;
        if (price > 0 && !useWallet.getState().debit(price, 'shop')) return false;
        set((s) => ({ owned: [...s.owned, key], equipped: { ...s.equipped, [slot]: id } }));
        return true;
      },
      equip: (slot, id) => {
        if (id !== null && !get().owned.includes(`${slot}:${id}`)) return;
        set((s) => ({ equipped: { ...s.equipped, [slot]: id } }));
      },
      reset: () => set({ ...initial(), account: false, guest: null }),
      account: false,
      guest: null,
      applyServer: (owned, equipped) =>
        set((s) => ({
          account: true,
          guest: s.account ? s.guest : { owned: s.owned, equipped: s.equipped },
          owned,
          equipped: { ...initial().equipped, ...equipped },
        })),
      leaveAccount: () => set((s) => (s.account ? { account: false, owned: s.guest?.owned ?? initial().owned, equipped: s.guest?.equipped ?? initial().equipped, guest: null } : {})),
    }),
    {
      name: `${STORAGE_PREFIX}cosmetics`,
      storage: persistStorage,
      version: 1,
      // v0 had no frame/title slots
      migrate: (old) => {
        const o = old as { owned?: string[]; equipped?: Record<string, unknown> };
        return { owned: o.owned ?? initial().owned, equipped: { ...initial().equipped, ...(o.equipped ?? {}) }, account: false, guest: null } as unknown as CosmeticsState;
      },
    },
  ),
);
