/**
 * `game` Edge Function — server-authoritative house games (all except poker).
 * Body: { game, op, params, requestId }. Ops are validated and resolved by the shared engine protocol
 * with the server's provably-fair seed; the result, stake and payout are committed atomically by the
 * `game_commit` SQL function. Clients never send outcomes.
 */
import { admin, handler, HttpError, json, requireUser, rpcError, randomHex } from '../_shared/http.ts';
import { runOp, ProtocolError } from '../_shared/engine/protocol.ts';
import { fairRng, hashServerSeed } from '../_shared/engine/rng/rng.ts';
import { GAME_IDS, type GameId } from '../_shared/engine/games/types.ts';

function countingRng(seed: { serverSeed: string; clientSeed: string; nonce: number }, skip: number) {
  const base = fairRng(seed);
  for (let i = 0; i < skip; i++) base.float();
  return base;
}

Deno.serve(
  handler(async (req, body) => {
    const userId = await requireUser(req);
    const db = admin();
    const game = body.game as GameId;
    const op = String(body.op ?? '');
    const params = (body.params ?? {}) as Record<string, unknown>;
    const requestId = String(body.requestId ?? '').slice(0, 80);

    // Fairness info & seed rotation (no game state involved)
    if (op === 'fairness' || op === 'rotate') {
      const { data: seeds } = await db.from('user_seeds').select('*').eq('user_id', userId).single();
      if (op === 'rotate') {
        const { count } = await db.from('game_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        if (count) throw new HttpError('round_active', 409);
        const next = randomHex();
        const client = typeof params.clientSeed === 'string' && params.clientSeed.trim() ? params.clientSeed.trim().slice(0, 64) : randomHex(8);
        await db.from('user_seeds').update({
          previous_server_seed: seeds.server_seed, previous_server_seed_hash: seeds.server_seed_hash, previous_client_seed: seeds.client_seed,
          previous_last_nonce: seeds.nonce, server_seed: next, server_seed_hash: hashServerSeed(next), client_seed: client, nonce: 0,
        }).eq('user_id', userId);
        return json({ ok: true, serverSeedHash: hashServerSeed(next), clientSeed: client, previous: { serverSeed: seeds.server_seed, hash: seeds.server_seed_hash, clientSeed: seeds.client_seed, lastNonce: seeds.nonce } });
      }
      return json({ serverSeedHash: seeds.server_seed_hash, clientSeed: seeds.client_seed, nonce: seeds.nonce, previous: seeds.previous_server_seed ? { serverSeed: seeds.previous_server_seed, hash: seeds.previous_server_seed_hash, clientSeed: seeds.previous_client_seed, lastNonce: seeds.previous_last_nonce } : null });
    }

    if (!GAME_IDS.includes(game) || game === 'poker') throw new HttpError('unknown_game');
    if (!requestId) throw new HttpError('missing_request_id');
    const key = `${userId}:${requestId}`;

    // Retried request → return the stored response, never replay.
    const { data: done } = await db.from('processed_requests').select('response').eq('key', key).maybeSingle();
    if (done) {
      const { data: w } = await db.from('wallets').select('balance').eq('user_id', userId).single();
      return json({ ...(done.response as Record<string, unknown>), balance: w?.balance, replayed: true });
    }

    const { data: session } = await db.from('game_sessions').select('*').eq('user_id', userId).eq('game', game).maybeSingle();
    if (op === 'resume') return json({ view: session?.view ?? null, done: !session });

    const { data: seeds } = await db.from('user_seeds').select('*').eq('user_id', userId).single();
    let nonce: number;
    let draws = 0;
    if (session) {
      nonce = Number(session.nonce);
      draws = session.draws;
    } else {
      // New round: consume the next nonce atomically.
      nonce = Number(seeds.nonce) + 1;
      const { error } = await db.from('user_seeds').update({ nonce }).eq('user_id', userId).eq('nonce', seeds.nonce);
      if (error) throw new Error(error.message);
    }
    const rng = countingRng({ serverSeed: seeds.server_seed, clientSeed: seeds.client_seed, nonce }, draws);
    let res;
    try {
      res = runOp(game, session?.state ?? null, op, params, { rng, now: Date.now() });
    } catch (e) {
      if (e instanceof ProtocolError) throw new HttpError(e.message);
      throw e;
    }
    const usedDraws = rng.draws(); // includes the skipped draws of previous operations
    const { data: balance, error } = await db.rpc('game_commit', {
      p_user: userId, p_game: game, p_stake: res.stake, p_payout: res.payout, p_done: res.done,
      p_state: res.state, p_view: res.view, p_nonce: nonce, p_draws: usedDraws,
      p_summary: res.summary ?? null, p_seed_hash: seeds.server_seed_hash, p_client_seed: seeds.client_seed,
      p_key: key, p_version: session ? session.version : null,
    });
    rpcError(error);
    return json({ view: res.view, stake: res.stake, payout: res.payout, done: res.done, summary: res.summary ?? null, balance });
  }),
);
