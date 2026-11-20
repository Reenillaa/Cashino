import { HttpError } from './http.ts';
import { isUnlocked, unlockPrice, TRIAL_ROUNDS, UNLOCKABLES, type UnlockId } from './engine/meta/unlocks.ts';
import { tournamentDay, tournamentGame } from './engine/meta/tournament.ts';

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

/** Next price for this player (shared formula) and the count it was computed for: only PAID unlocks count. */
export async function nextUnlockPrice(db: DB, userId: string): Promise<{ price: number; count: number; peak: number }> {
  const [{ count }, { data: peak }] = await Promise.all([
    db.from('unlocks').select('item', { count: 'exact', head: true }).eq('user_id', userId).gt('price', 0),
    db.rpc('peak_balance', { p_user: userId }),
  ]);
  const paid = Number(count ?? 0);
  return { price: unlockPrice(paid, Number(peak ?? 0)), count: paid, peak: Number(peak ?? 0) };
}

/** Trial rounds already played per locked item. */
export async function trialsUsed(db: DB, userId: string): Promise<Record<string, number>> {
  const { data } = await db.from('unlock_trials').select('item, used').eq('user_id', userId);
  return Object.fromEntries((data ?? []).map((r: { item: string; used: number }) => [r.item, Number(r.used)]));
}

/**
 * Access to a game: `owned` (free, bought or admin) or `trial` with the trial rounds already used.
 * Throws `locked` when a NEW round is about to start and the trial is used up.
 */
export async function gameAccess(db: DB, userId: string, id: UnlockId, startsRound: boolean): Promise<{ owned: true } | { owned: false; used: number }> {
  // the game of today's tournament is open to everybody until the day ends
  if (isUnlocked([], id) || id === `game:${tournamentGame(tournamentDay(Date.now()))}` || (await isAdmin(db, userId))) return { owned: true };
  const { data } = await db.from('unlocks').select('item').eq('user_id', userId).eq('item', id).maybeSingle();
  if (data) return { owned: true };
  const { data: t } = await db.from('unlock_trials').select('used').eq('user_id', userId).eq('item', id).maybeSingle();
  const used = Number(t?.used ?? 0);
  if (startsRound && used >= TRIAL_ROUNDS) throw new HttpError(`locked:${id}`, 403);
  return { owned: false, used };
}
