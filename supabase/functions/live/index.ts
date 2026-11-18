/**
 * `live` Edge Function — shared, timed multiplayer rounds (live horse racing, live roulette).
 *   { action: 'state', game }                     → creates the current round if needed, resolves and pays closed rounds
 *   { action: 'bet', game, slot, bet, requestId } → places a bet while betting is open
 *   { action: 'bets', game, slot, bets, requestId } → places several bets at once (a layout, a call bet such as voisins)
 *   { action: 'cashout', game: 'crash', slot }     → cashes out the caller's bets on the flying rocket
 * The result of a round is drawn with a fresh crypto seed only after its betting has closed. For the rocket
 * the crash point stays in live_secrets (never readable by players) until the rocket has exploded.
 */
import { admin, handler, HttpError, json, requireUser, rpcError } from '../_shared/http.ts';
import { LIVE_BATCH, LIVE_GAMES, LIVE_LEAD, LIVE_CRASH_CAP, slotAt, liveCard, liveResult, checkLiveBet, livePayout, liveCashout, liveCrashMult, liveCrashTime, type LiveGame, type LiveBet, type CrashBet } from '../_shared/engine/meta/live.ts';
import type { RaceCard } from '../_shared/engine/games/horses.ts';
import { requireUnlocked } from '../_shared/unlocks.ts';

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

/** The rocket's hidden crash point for a closed round (drawn once, first caller wins). */
async function crashSecret(db: ReturnType<typeof admin>, slot: number): Promise<number> {
  const { data: have } = await db.from('live_secrets').select('result').eq('game', 'crash').eq('slot', slot).maybeSingle();
  if (have?.result) return (have.result as { crash: number }).crash;
  const seed = seed31();
  await db.from('live_secrets').upsert({ game: 'crash', slot, seed: String(seed), result: liveResult('crash', null, seed) }, { onConflict: 'game,slot', ignoreDuplicates: true });
  const { data } = await db.from('live_secrets').select('result').eq('game', 'crash').eq('slot', slot).single();
  return (data!.result as { crash: number }).crash;
}

/** Rocket rounds: pays auto cash-outs as the rocket passes them, reveals and settles once it has exploded. */
async function resolveCrash(db: ReturnType<typeof admin>, now: number) {
  const { data: open } = await db.from('live_rounds').select('*').eq('game', 'crash').eq('settled', false).lte('closes_at', new Date(now).toISOString()).order('slot', { ascending: true }).limit(5);
  for (const round of open ?? []) {
    const crash = await crashSecret(db, round.slot);
    const startsAt = new Date(round.closes_at).getTime() + LIVE_LEAD;
    const flown = now - startsAt;
    const over = flown >= liveCrashTime(Math.min(crash, LIVE_CRASH_CAP)) + 300;
    const { data: bets } = await db.from('live_bets').select('id, bet').eq('game', 'crash').eq('slot', round.slot).is('payout', null);
    for (const b of bets ?? []) {
      const bet = b.bet as CrashBet;
      if (over) {
        rpcError((await db.rpc('live_pay_bet', { p_bet: b.id, p_payout: livePayout('crash', null, { crash }, bet) })).error);
      } else if (bet.auto && bet.auto <= crash && bet.auto <= liveCrashMult(flown)) {
        rpcError((await db.rpc('live_pay_bet', { p_bet: b.id, p_payout: Math.floor(bet.amount * bet.auto + 1e-9) })).error);
      }
    }
    if (over) await db.from('live_rounds').update({ result: { crash }, settled: true }).eq('game', 'crash').eq('slot', round.slot);
  }
}

/** Draws the result of closed rounds (once) and pays every bet (idempotent). */
async function resolveClosed(db: ReturnType<typeof admin>, game: LiveGame, now: number) {
  if (game === 'crash') return resolveCrash(db, now);
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
      await requireUnlocked(db, userId, [`live:${game}`]);
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
    if (action === 'bets') {
      await requireUnlocked(db, userId, [`live:${game}`]);
      const slot = Number(body.slot);
      const s = slotAt(game, now);
      if (slot !== s.slot || now >= s.closesAt) throw new HttpError('betting_closed', 409);
      const list = body.bets as LiveBet[];
      if (!Array.isArray(list) || !list.length || list.length > LIVE_BATCH) throw new HttpError('invalid_bet');
      let total = 0;
      try {
        for (const b of list) total += checkLiveBet(game, b);
      } catch (e) {
        throw new HttpError((e as Error).message);
      }
      // check the whole batch fits in the wallet before placing any of it
      const { data: w0 } = await db.from('wallets').select('balance').eq('user_id', userId).single();
      if (Number(w0?.balance ?? 0) < total) throw new HttpError('insufficient', 409);
      await ensureRound(db, game, now);
      const requestId = String(body.requestId ?? '').slice(0, 70);
      if (!requestId) throw new HttpError('missing_request_id');
      let balance: unknown = w0?.balance;
      for (let i = 0; i < list.length; i++) {
        const { data, error } = await db.rpc('live_place_bet', { p_user: userId, p_game: game, p_slot: slot, p_bet: list[i], p_amount: checkLiveBet(game, list[i]), p_key: `live:${userId}:${requestId}:${i}` });
        if (error?.message.includes('betting_closed')) throw new HttpError('betting_closed', 409);
        rpcError(error);
        balance = data;
      }
      return json({ ok: true, balance });
    }
    if (action === 'cashout' && game === 'crash') {
      const slot = Number(body.slot);
      const { data: round } = await db.from('live_rounds').select('closes_at, settled').eq('game', 'crash').eq('slot', slot).maybeSingle();
      if (!round) throw new HttpError('no_round', 404);
      const startsAt = new Date(round.closes_at).getTime() + LIVE_LEAD;
      if (now < startsAt) throw new HttpError('not_started', 409);
      const crash = await crashSecret(db, slot);
      const { data: mine } = await db.from('live_bets').select('id, bet').eq('game', 'crash').eq('slot', slot).eq('user_id', userId).is('payout', null);
      if (!mine?.length) throw new HttpError('nothing_to_cash', 409);
      let paid = 0;
      for (const b of mine) {
        const payout = liveCashout(crash, b.bet as CrashBet, now - startsAt);
        if (payout === null) throw new HttpError('crashed', 409);
        rpcError((await db.rpc('live_pay_bet', { p_bet: b.id, p_payout: payout })).error);
        paid += payout;
      }
      const { data: w } = await db.from('wallets').select('balance').eq('user_id', userId).single();
      return json({ ok: true, paid, multiplier: liveCrashMult(now - startsAt), balance: w?.balance ?? 0 });
    }
    throw new HttpError('invalid_action');
  }),
);
