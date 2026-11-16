import { callFn, onlineConfigured } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useCosmetics, type Slot } from '@/state/cosmetics';

interface ShopState { owned: string[]; equipped: Record<string, string | null>; balance: number }

const apply = (s: ShopState) => {
  useCosmetics.getState().applyServer(s.owned, s.equipped as never);
  useSession.getState().setBalance(Number(s.balance));
};

/** With an account, the shop runs on the server and spends the account balance. */
export const accountShop = {
  active: () => onlineConfigured && !!useSession.getState().userId,
  sync: async () => apply(await callFn<ShopState>('shop', { action: 'state' })),
  buy: async (slot: Slot, id: string) => apply(await callFn<ShopState>('shop', { action: 'buy', item: `${slot}:${id}` })),
  equip: async (slot: Slot, id: string | null) => apply(await callFn<ShopState>('shop', { action: 'equip', slot, id })),
};
