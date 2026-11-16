/**
 * `shop` Edge Function — cosmetic shop for accounts. Prices come from the shared engine catalog;
 * the purchase (ownership + coin debit) is atomic in `shop_buy`.
 * Body: { action: 'state' } | { action: 'buy', item } | { action: 'equip', slot, id | null }
 */
import { admin, handler, HttpError, json, requireUser, rpcError } from '../_shared/http.ts';
import { FREE_ITEMS, SHOP_PRICES, SHOP_SLOTS, type ShopSlot } from '../_shared/engine/meta/shop.ts';

Deno.serve(
  handler(async (req, body) => {
    const userId = await requireUser(req);
    const db = admin();
    const action = String(body.action ?? 'state');
    const state = async () => {
      const [{ data: owned }, { data: profile }, { data: wallet }] = await Promise.all([
        db.from('cosmetics_owned').select('item').eq('user_id', userId),
        db.from('profiles').select('cosmetics').eq('id', userId).single(),
        db.from('wallets').select('balance').eq('user_id', userId).single(),
      ]);
      return { owned: [...FREE_ITEMS, ...(owned ?? []).map((o) => o.item as string)], equipped: profile?.cosmetics ?? {}, balance: wallet?.balance ?? 0 };
    };
    if (action === 'state') return json(await state());
    if (action === 'buy') {
      const item = String(body.item ?? '');
      const price = SHOP_PRICES[item];
      if (price === undefined || FREE_ITEMS.includes(item)) throw new HttpError('unknown_item');
      const { error } = await db.rpc('shop_buy', { p_user: userId, p_item: item, p_price: price });
      if (error?.message.includes('already_owned')) throw new HttpError('already_owned', 409);
      rpcError(error);
      // equip what you just bought
      const [slot, id] = item.split(':');
      const { data: p } = await db.from('profiles').select('cosmetics').eq('id', userId).single();
      await db.from('profiles').update({ cosmetics: { ...(p?.cosmetics ?? {}), [slot]: id } }).eq('id', userId);
      return json(await state());
    }
    if (action === 'equip') {
      const slot = String(body.slot ?? '') as ShopSlot;
      if (!SHOP_SLOTS.includes(slot)) throw new HttpError('invalid_slot');
      const id = body.id === null ? null : String(body.id ?? '');
      if (id !== null) {
        const key = `${slot}:${id}`;
        if (!FREE_ITEMS.includes(key)) {
          const { data } = await db.from('cosmetics_owned').select('item').eq('user_id', userId).eq('item', key).maybeSingle();
          if (!data) throw new HttpError('not_owned', 403);
        }
      }
      const { data: p } = await db.from('profiles').select('cosmetics').eq('id', userId).single();
      await db.from('profiles').update({ cosmetics: { ...(p?.cosmetics ?? {}), [slot]: id } }).eq('id', userId);
      return json(await state());
    }
    throw new HttpError('invalid_action');
  }),
);
