/**
 * `admin` Edge Function — developer accounts (listed in `admins`, set only by the project owner).
 *   { action: 'me' }                                  → { admin: boolean }
 *   { action: 'search', q }                           → players by username (with balance)
 *   { action: 'gift', userId, amount, note, requestId } → credits chips to that player (logged, notified)
 *   { action: 'recent' }                              → your last gifts
 */
import { admin, handler, HttpError, json, requireUser, rpcError } from '../_shared/http.ts';

Deno.serve(
  handler(async (req, body) => {
    const userId = await requireUser(req);
    const db = admin();
    const { data: me } = await db.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
    const action = String(body.action ?? 'me');
    if (action === 'me') return json({ admin: !!me });
    if (!me) throw new HttpError('not_admin', 403);

    if (action === 'search') {
      const q = String(body.q ?? '').trim().replace(/[%_]/g, '').slice(0, 30);
      let query = db.from('profiles').select('id, username, display_name, avatar, level').order('created_at', { ascending: false }).limit(25);
      if (q) query = query.ilike('username', `%${q}%`);
      const { data: people } = await query;
      const ids = (people ?? []).map((p) => p.id);
      const { data: wallets } = ids.length ? await db.from('wallets').select('user_id, balance').in('user_id', ids) : { data: [] };
      const bal = new Map((wallets ?? []).map((w) => [w.user_id, Number(w.balance)]));
      return json({ people: (people ?? []).map((p) => ({ ...p, balance: bal.get(p.id) ?? 0 })) });
    }

    if (action === 'gift') {
      const to = String(body.userId ?? '');
      const amount = Number(body.amount);
      const requestId = String(body.requestId ?? '').slice(0, 80);
      if (!to || !Number.isInteger(amount) || amount <= 0 || amount > 10_000_000) throw new HttpError('invalid_amount');
      if (!requestId) throw new HttpError('missing_request_id');
      const note = body.note ? String(body.note).slice(0, 80) : null;
      const { data: balance, error } = await db.rpc('admin_gift', { p_admin: userId, p_user: to, p_amount: amount, p_note: note, p_key: `${userId}:${requestId}` });
      rpcError(error);
      return json({ ok: true, balance: Number(balance) });
    }

    if (action === 'stats') {
      const { data, error } = await db.rpc('admin_stats');
      if (error) throw new Error(error.message);
      return json({ stats: data });
    }
    if (action === 'recent') {
      const { data } = await db.from('admin_gifts').select('amount, note, created_at, profiles!admin_gifts_user_id_fkey(username)').eq('admin_id', userId).order('created_at', { ascending: false }).limit(20);
      return json({ gifts: data ?? [] });
    }
    throw new HttpError('invalid_action');
  }),
);
