/**
 * `live` Edge Function — shared, timed multiplayer rounds (live horse racing, live roulette).
 *   { action: 'state', game }                     → creates the current round if needed, resolves and pays closed rounds
 *   { action: 'bet', game, slot, bet, requestId } → places a bet while betting is open
 * The result of a round is drawn with a fresh crypto seed only after its betting has closed.
 */
import { admin, handler, HttpError, json, requireUser, rpcError } from '../_shared/http.ts';
import { LIVE_GAMES, slotAt, liveCard, liveResult, checkLiveBet, livePayout, type LiveGame, type LiveBet } from '../_shared/engine/meta/live.ts';
import type { RaceCard } from '../_shared/engine/games/horses.ts';

const seed31 = () => crypto.getRandomValues(new Uint32Array(1))[0] >>> 1;

async function ensureRound(db: ReturnType<typeof admin>, game: LiveGame, now: number) {
  const s = slotAt(game, now);
  const { data: existing } = await db.from('live_rounds').select('*').eq('game', game).eq('slot', s.slot).maybeSingle();
  if (existing) return existing;
  const cardSeed = seed31();
  const card = liveCard(game, cardSeed);
  await db.from('live_rounds').upsert(
    { game, slot: s.slot, opens_at: new Date(s.opensAt).toISOString(), closes_at: new Date(s.closesAt).toISOString(), ends_at: new Date(s.endsAt).toISOString(), card },
    { onConflict: 'game,slot', ignoreDuplicates: true },
  );
  const { data } = await db.from('live_rounds').select('*').eq('game', game).eq('slot', s.slot).single();
  return data;
}

/** Draws the result of closed rounds (once) and pays every bet (idempotent). */
async function resolveClosed(db: ReturnType<typeof admin>, game: LiveGame, now: number) {
  const { data: open } = await db.from('live_rounds').select('*').eq('game', game).eq('settled', false).lte('closes_at', new Date(now).toISOString()).order('slot', { ascending: true }).limit(5);
  for (const round of open ?? []) {
    let result = round.result;
    if (!result) {
      const seed = seed31();
      const drawn = liveResult(game, round.card as RaceCard | null, seed);
      // only the first resolver wins; everyone else reads that result
      const { data: won } = await db.from('live_rounds').update({ result: drawn }).eq('game', game).eq('slot', round.slot).is('result', null).select('result').maybeSingle();
      if (won) await db.from('live_secrets').upsert({ game, slot: round.slot, seed: String(seed) });
      const { data: fresh } = await db.from('live_rounds').select('result').eq('game', game).eq('slot', round.slot).single();
      result = fresh?.result;
    }
    const { data: bets } = await db.from('live_bets').select('id, bet').eq('game', game).eq('slot', round.slot).is('payout', null);
    for (const b of bets ?? []) {
      const payout = livePayout(game, round.card as RaceCard | null, result, b.bet as LiveBet);
      const { error } = await db.rpc('live_pay_bet', { p_bet: b.id, p_payout: payout });
      rpcError(error);
    }
    await db.from('live_rounds').update({ settled: true }).eq('game', game).eq('slot', round.slot);
  }
}

Deno.serve(
  handler(async (req, body) => {
    const userId = await requireUser(req);
    const db = admin();
    const game = String(body.game ?? '') as LiveGame;
    if (!LIVE_GAMES.includes(game)) throw new HttpError('unknown_game');
    const now = Date.now();
    const action = String(body.action ?? 'state');

    if (action === 'state') {
      await resolveClosed(db, game, now);
      const round = await ensureRound(db, game, now);
      const { data: w } = await db.from('wallets').select('balance').eq('user_id', userId).single();
      return json({ now, round, balance: w?.balance ?? 0 });
    }

    if (action === 'bet') {
      const slot = Number(body.slot);
      const s = slotAt(game, now);
      if (slot !== s.slot || now >= s.closesAt) throw new HttpError('betting_closed', 409);
      const bet = body.bet as LiveBet;
      let amount: number;
      try {
        amount = checkLiveBet(game, bet);
      } catch (e) {
        throw new HttpError((e as Error).message);
      }
      await ensureRound(db, game, now);
      const requestId = String(body.requestId ?? '').slice(0, 80);
      if (!requestId) throw new HttpError('missing_request_id');
      const { data: balance, error } = await db.rpc('live_place_bet', { p_user: userId, p_game: game, p_slot: slot, p_bet: bet, p_amount: amount, p_key: `live:${userId}:${requestId}` });
      if (error?.message.includes('betting_closed')) throw new HttpError('betting_closed', 409);
      rpcError(error);
      return json({ ok: true, balance });
    }
    throw new HttpError('invalid_action');
  }),
);
