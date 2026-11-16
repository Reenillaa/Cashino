import { HttpError } from './http.ts';
import { isUnlocked, unlockPrice, type UnlockId } from './engine/meta/unlocks.ts';

// deno-lint-ignore no-explicit-any
type DB = any;

/** Items the player owns. */
export async function ownedUnlocks(db: DB, userId: string): Promise<string[]> {
  const { data } = await db.from('unlocks').select('item').eq('user_id', userId);
  return (data ?? []).map((r: { item: string }) => r.item);
}

/** Throws `locked` (403) unless every item is free or bought. */
export async function requireUnlocked(db: DB, userId: string, ids: UnlockId[]): Promise<void> {
  const need = ids.filter((id) => !isUnlocked([], id));
  if (!need.length) return;
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
