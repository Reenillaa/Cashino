import { HttpError } from './http.ts';
import { isUnlocked, unlockPrice, UNLOCKABLES, type UnlockId } from './engine/meta/unlocks.ts';

// deno-lint-ignore no-explicit-any
type DB = any;

/** Developer accounts have everything. */
export async function isAdmin(db: DB, userId: string): Promise<boolean> {
  const { data } = await db.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

/** Items the player owns (admins: all of them). */
export async function ownedUnlocks(db: DB, userId: string): Promise<string[]> {
  if (await isAdmin(db, userId)) return [...UNLOCKABLES];
  const { data } = await db.from('unlocks').select('item').eq('user_id', userId);
  return (data ?? []).map((r: { item: string }) => r.item);
}

/** Throws `locked` (403) unless every item is free or bought. */
export async function requireUnlocked(db: DB, userId: string, ids: UnlockId[]): Promise<void> {
  const need = ids.filter((id) => !isUnlocked([], id));
  if (!need.length || (await isAdmin(db, userId))) return;
  const { data } = await db.from('unlocks').select('item').eq('user_id', userId).in('item', need);
  const have = new Set((data ?? []).map((r: { item: string }) => r.item));
  const missing = need.find((id) => !have.has(id));
  if (missing) throw new HttpError(`locked:${missing}`, 403);
}

/** Next price for this player (shared formula) and the count it was computed for. */
export async function nextUnlockPrice(db: DB, userId: string, owned?: string[]): Promise<{ price: number; count: number; peak: number }> {
  const list = owned ?? (await ownedUnlocks(db, userId));
  const { data: peak } = await db.rpc('peak_balance', { p_user: userId });
  return { price: unlockPrice(list.length, Number(peak ?? 0)), count: list.length, peak: Number(peak ?? 0) };
}
