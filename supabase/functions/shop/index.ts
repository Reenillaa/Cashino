/**
 * `shop` Edge Function — cosmetic shop for accounts. Prices come from the shared engine catalog;
 * the purchase (ownership + coin debit) is atomic in `shop_buy`.
 * Body: { action: 'state' } | { action: 'buy', item } | { action: 'equip', slot, id | null } | { action: 'unlock', item, price }
 * Unlocks (games, live tables, sportsbook, sports) are priced with the shared ladder and bought atomically.
 */
import { admin, handler, HttpError, json, requireUser, rpcError } from '../_shared/http.ts';
import { FREE_ITEMS, SHOP_PRICES, SHOP_SLOTS, type ShopSlot } from '../_shared/engine/meta/shop.ts';
import { isUnlockId, unlockRequires } from '../_shared/engine/meta/unlocks.ts';
import { nextUnlockPrice, ownedUnlocks, trialsUsed } from '../_shared/unlocks.ts';

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
      const [unlocks, next, trials, { data: fu }] = await Promise.all([
        ownedUnlocks(db, userId),
        nextUnlockPrice(db, userId),
        trialsUsed(db, userId),
        db.from('profiles').select('free_unlocks').eq('id', userId).single(),
      ]);
      return { owned: [...FREE_ITEMS, ...(owned ?? []).map((o) => o.item as string)], equipped: profile?.cosmetics ?? {}, balance: wallet?.balance ?? 0, unlocks, nextPrice: next.price, peak: next.peak, freeUnlocks: Number(fu?.free_unlocks ?? 0), trials };
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
    if (action === 'unlock') {
      const item = String(body.item ?? '');
      if (!isUnlockId(item)) throw new HttpError('unknown_item');
      const owned = await ownedUnlocks(db, userId);
      const req = unlockRequires(item);
      if (req && !owned.includes(req)) throw new HttpError(`locked:${req}`, 409);
      const { price, count } = await nextUnlockPrice(db, userId);
      // the player confirmed a price: never charge more than what they saw
      if (Number(body.price) !== price) return json({ error: 'price_changed', price }, 409);
      const { error } = await db.rpc('unlock_buy', { p_user: userId, p_item: item, p_price: price, p_count: count });
      if (error?.message.includes('already_owned')) throw new HttpError('already_owned', 409);
      if (error?.message.includes('price_changed')) throw new HttpError('price_changed', 409);
      if (error?.message.includes('insufficient')) throw new HttpError('insufficient', 409);
      rpcError(error);
      return json(await state());
    }
    if (action === 'unlock_free') {
      // one of the player's free unlocks: any game, no chips
      const item = String(body.item ?? '');
      if (!isUnlockId(item) || !item.startsWith('game:')) throw new HttpError('games_only');
      const { error } = await db.rpc('unlock_free', { p_user: userId, p_item: item });
      if (error?.message.includes('already_owned')) throw new HttpError('already_owned', 409);
      if (error?.message.includes('no_free_unlocks')) throw new HttpError('no_free_unlocks', 409);
      rpcError(error);
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
