/**
 * `account` Edge Function — guest progress migration (one-time, capped), data export and account deletion.
 */
import { admin, handler, HttpError, json, requireUser, rpcError } from '../_shared/http.ts';
import { guestMigrationAmount } from '../_shared/engine/meta/economy.ts';

Deno.serve(
  handler(async (req, body) => {
    const userId = await requireUser(req);
    const db = admin();
    const action = String(body.action ?? '');
    if (action === 'migrate_guest') {
      const device = String(body.deviceId ?? '').slice(0, 64);
      if (!device) throw new HttpError('missing_device');
      const amount = guestMigrationAmount(Number(body.balance ?? 0));
      const { data: balance, error } = await db.rpc('migrate_guest', { p_user: userId, p_device: device, p_amount: amount });
      rpcError(error);
      return json({ amount, balance });
    }
    if (action === 'export') {
      const tables = ['profiles', 'wallets', 'coin_ledger', 'game_rounds', 'game_stats', 'progress', 'season_scores', 'poker_ratings', 'friendships', 'team_members', 'tournament_entries', 'reward_claims'];
      const out: Record<string, unknown> = {};
      for (const t of tables) {
        const col = t === 'profiles' ? 'id' : t === 'friendships' ? 'requester' : 'user_id';
        const { data } = await db.from(t).select('*').eq(col, userId).limit(10000);
        out[t] = data ?? [];
      }
      return json({ exportedAt: new Date().toISOString(), data: out });
    }
    if (action === 'delete') {
      if (body.confirm !== 'DELETE') throw new HttpError('confirmation_required');
      // Leave any poker table first so other players are not blocked.
      await db.from('poker_seats').delete().eq('user_id', userId);
      const { error } = await db.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
      return json({ deleted: true }); // all rows cascade from auth.users
    }
    throw new HttpError('unknown_action');
  }),
);
