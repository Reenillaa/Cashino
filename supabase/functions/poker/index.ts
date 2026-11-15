/**
 * `poker` Edge Function — authoritative online No-Limit Hold'em (cash tables and Sit & Go).
 * The full table state (deck, hole cards) lives in `poker_private` (service role only); clients get
 * `public_state` (no hidden cards) through Realtime and their own hole cards via RLS-protected rows.
 * Every mutation uses optimistic concurrency on `poker_tables.version`.
 */
import { admin, handler, HttpError, json, requireUser, rpcError } from '../_shared/http.ts';
import * as P from '../_shared/engine/poker/table.ts';
import { botDecide, type BotProfile } from '../_shared/engine/poker/bots.ts';
import { cryptoRng } from '../_shared/engine/rng/rng.ts';
import { cardCode } from '../_shared/engine/cards/cards.ts';
import { eloUpdate } from '../_shared/engine/meta/ranking.ts';
import { roomById, type Room } from '../_shared/engine/meta/rooms.ts';

const rng = cryptoRng((b) => crypto.getRandomValues(b));
const ACTION_MS = 25_000;
const NEXT_HAND_MS = 2_500;

const BOT_STYLES = ['shark', 'rock', 'maniac', 'station', 'shark'] as const;
type Db = ReturnType<typeof admin>;
interface Extra { leaving: string[]; botProfiles: Record<string, BotProfile>; kind: 'cash' | 'sng'; buyIn: number; minBuyIn: number; maxBuyIn: number; tournamentId?: string; handEndedAt?: number }
interface Stored { table: P.TableState; extra: Extra }

const code6 = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

async function load(db: Db, tableId: string) {
  const [{ data: row }, { data: priv }] = await Promise.all([
    db.from('poker_tables').select('*').eq('id', tableId).single(),
    db.from('poker_private').select('state').eq('table_id', tableId).single(),
  ]);
  if (!row || !priv) throw new HttpError('table_not_found', 404);
  return { row, stored: priv.state as Stored };
}

/** Runs bots and auto-actions until a human must act or the hand ends. */
function advance(s: Stored, now: number): Stored {
  let t = s.table;
  for (let guard = 0; guard < 200 && t.hand && !t.hand.complete; guard++) {
    const seat = t.hand.toAct;
    if (seat === null) break;
    const info = t.seats[seat]!;
    if (info.isBot) {
      t = P.act(t, seat, botDecide(t, s.extra.botProfiles[info.id], rng));
    } else if (info.sittingOut || s.extra.leaving.includes(info.id)) {
      const legal = P.legalActions(t)!;
      t = P.act(t, seat, legal.canCheck ? { type: 'check' } : { type: 'fold' });
    } else break;
  }
  if (t.hand?.complete && !s.extra.handEndedAt) s.extra.handEndedAt = now;
  return { ...s, table: t };
}

async function persist(db: Db, tableId: string, prevVersion: number, s: Stored, prevHand: number | null) {
  const t = s.table;
  const h = t.hand;
  const humanToAct = h && !h.complete && h.toAct !== null && !t.seats[h.toAct]!.isBot;
  const status = t.config.tournament && P.tournamentWinner(t) ? 'finished' : h ? 'running' : 'open';
  const { data, error } = await db
    .from('poker_tables')
    .update({
      public_state: P.viewFor(t, null),
      version: prevVersion + 1,
      status,
      action_deadline: humanToAct ? new Date(Date.now() + ACTION_MS).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tableId)
    .eq('version', prevVersion)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data?.length) throw new HttpError('conflict', 409);
  await db.from('poker_private').update({ state: s }).eq('table_id', tableId);
  // New hand → publish each human's hole cards privately.
  if (h && h.number !== prevHand) {
    const rows = h.players.filter((p) => !t.seats[p.seat]!.isBot).map((p) => ({ table_id: tableId, user_id: p.id, hand_no: h.number, cards: p.hole.map(cardCode) }));
    if (rows.length) await db.from('poker_hole_cards').upsert(rows);
  }
}

async function settleHand(db: Db, s: Stored, tableId: string) {
  const h = s.table.hand!;
  for (const p of h.players) {
    if (s.table.seats[p.seat]!.isBot) continue;
    const won = h.winnings?.[p.seat] ?? 0;
    await db.from('game_rounds').insert({ user_id: p.id, game: 'poker', bet: p.committed, payout: won, detail: `${tableId.slice(0, 8)}#${h.number}` });
    await db.rpc('award_progress', { p_user: p.id, p_xp: 14, p_sp: 2, p_round: true });
  }
}

async function finishTournament(db: Db, s: Stored, tableId: string) {
  const t = s.table;
  const winner = P.tournamentWinner(t);
  if (!winner || !s.extra.tournamentId) return;
  const order = [winner.id, ...[...t.eliminated].reverse()];
  const humans = order.filter((id) => !id.startsWith('bot-'));
  const pool = s.extra.buyIn * t.seats.filter(Boolean).length;
  const prizes = [Math.floor(pool * 0.65), Math.floor(pool * 0.35)];
  for (const [i, id] of order.entries()) {
    if (id.startsWith('bot-')) continue;
    const prize = prizes[i] ?? 0;
    await db.from('tournament_entries').upsert({ tournament_id: s.extra.tournamentId, user_id: id, place: i + 1, prize });
    if (prize > 0) await db.rpc('wallet_apply', { p_user: id, p_amount: prize, p_kind: 'tournament', p_ref: s.extra.tournamentId, p_key: `sng:${s.extra.tournamentId}:${id}` });
    await db.rpc('award_progress', { p_user: id, p_xp: 100, p_sp: i === 0 ? 120 : i < 3 ? 50 : 0, p_round: false });
    if (i === 0) await db.from('activity').insert({ user_id: id, kind: 'tournament', payload: { place: 1, table: tableId } });
  }
  // Ratings only move between humans (bots never inflate or deflate ratings).
  if (humans.length >= 2) {
    const { data: rs } = await db.from('poker_ratings').select('user_id, rating, games').in('user_id', humans);
    const current = Object.fromEntries((rs ?? []).map((r) => [r.user_id, r.rating]));
    const next = eloUpdate(current, humans);
    for (const id of humans) {
      const games = (rs ?? []).find((r) => r.user_id === id)?.games ?? 0;
      await db.from('poker_ratings').upsert({ user_id: id, rating: next[id], games: games + 1 });
    }
  }
  await db.from('tournaments').update({ status: 'finished' }).eq('id', s.extra.tournamentId);
}

Deno.serve(
  handler(async (req, body) => {
    const userId = await requireUser(req);
    const db = admin();
    const action = String(body.action ?? '');
    const now = Date.now();

    if (action === 'create') {
      const kind = body.kind === 'sng' ? 'sng' : 'cash';
      const room = roomById(body.room) as Room | undefined;
      if (!room || room.practice) throw new HttpError('invalid_room');
      const stakes = { sb: room.poker.sb, bb: room.poker.bb, buyIn: room.max };
      const maxSeats = Math.max(2, Math.min(6, Number(body.maxSeats ?? 6)));
      const isPrivate = !!body.private;
      const bots = Math.max(0, Math.min(maxSeats - 1, Number(body.bots ?? 0)));
      const table = P.createTable({ maxSeats, smallBlind: stakes.sb, bigBlind: stakes.bb, tournament: kind === 'sng' ? { levels: P.DEFAULT_SNG_LEVELS, handsPerLevel: 8 } : undefined });
      // Cash: buy-in anywhere in the room range. Sit & Go: entry = room minimum, 1,500 tournament chips each.
      const extra: Extra = { leaving: [], botProfiles: {}, kind, buyIn: kind === 'sng' ? room.min : room.max, minBuyIn: room.min, maxBuyIn: room.max };
      let t = table;
      for (let i = 0; i < bots; i++) {
        const style = BOT_STYLES[i % BOT_STYLES.length];
        const id = `bot-${style}-${i + 1}`;
        extra.botProfiles[id] = { id, style, difficulty: (['easy', 'medium', 'advanced'] as const)[Math.max(0, Math.min(2, Number(body.botDifficulty ?? 1)))] };
        t = P.sitDown(t, maxSeats - 1 - i, { id, name: style, isBot: true, botProfile: id, stack: kind === 'sng' ? 1500 : stakes.buyIn, sittingOut: false, avatar: `a${(i * 5) % 24}` });
      }
      let tournamentId: string | undefined;
      if (kind === 'sng') {
        const { data: tour, error } = await db.from('tournaments').insert({ name: String(body.name ?? 'Sit & Go').slice(0, 40), created_by: userId, is_private: isPrivate, max_players: maxSeats, entry_fee: extra.buyIn }).select('id').single();
        if (error) throw new Error(error.message);
        tournamentId = tour.id;
        extra.tournamentId = tournamentId;
      }
      const { data: row, error } = await db
        .from('poker_tables')
        .insert({ name: String(body.name ?? 'Table').slice(0, 40), is_private: isPrivate, code: isPrivate ? code6() : null, owner: userId, kind, tournament_id: tournamentId ?? null, config: { ...table.config, buyIn: extra.buyIn, minBuyIn: extra.minBuyIn, maxBuyIn: extra.maxBuyIn, room: room.id }, public_state: P.viewFor(t, null) })
        .select('id, code')
        .single();
      if (error) throw new Error(error.message);
      await db.from('poker_private').insert({ table_id: row.id, state: { table: t, extra } });
      for (const [i, id] of Object.keys(extra.botProfiles).entries()) await db.from('poker_seats').insert({ table_id: row.id, seat: maxSeats - 1 - i, is_bot: true, bot_profile: id });
      if (tournamentId) await db.from('tournaments').update({ table_id: row.id }).eq('id', tournamentId);
      return json({ tableId: row.id, code: row.code });
    }

    let tableId = String(body.tableId ?? '');
    if (action === 'join' && body.code) {
      const { data } = await db.from('poker_tables').select('id').eq('code', String(body.code).toUpperCase()).maybeSingle();
      if (!data) throw new HttpError('table_not_found', 404);
      tableId = data.id;
    }
    if (!tableId) throw new HttpError('missing_table');
    const { row, stored } = await load(db, tableId);
    const version = Number(row.version);
    const prevHand = stored.table.hand?.number ?? null;
    let s = stored;
    const seatOf = (id: string) => s.table.seats.findIndex((x) => x?.id === id);

    if (action === 'join') {
      if (seatOf(userId) >= 0) return json({ tableId, seat: seatOf(userId) });
      if (s.extra.kind === 'sng' && row.status !== 'open') throw new HttpError('tournament_started', 409);
      const free = s.table.seats.findIndex((x) => !x);
      if (free < 0) throw new HttpError('table_full', 409);
      const { data: profile } = await db.from('profiles').select('username, avatar').eq('id', userId).single();
      const amount = s.extra.kind === 'sng' ? s.extra.buyIn : Math.max(s.extra.minBuyIn, Math.min(s.extra.maxBuyIn, Math.floor(Number(body.buyIn ?? s.extra.maxBuyIn))));
      const { error } = await db.rpc('wallet_apply', { p_user: userId, p_amount: -amount, p_kind: 'buyin', p_ref: tableId, p_key: `buyin:${tableId}:${userId}:${String(body.requestId ?? now)}` });
      rpcError(error);
      s = { ...s, table: P.sitDown(s.table, free, { id: userId, name: profile?.username ?? 'player', isBot: false, stack: s.extra.kind === 'sng' ? 1500 : amount, sittingOut: false, avatar: profile?.avatar }) };
      await db.from('poker_seats').insert({ table_id: tableId, seat: free, user_id: userId, buy_in: amount });
      if (s.extra.tournamentId) await db.from('tournament_entries').upsert({ tournament_id: s.extra.tournamentId, user_id: userId });
      await db.from('table_invites').update({ status: 'accepted' }).eq('table_id', tableId).eq('to_user', userId);
      // Cash tables start automatically; Sit & Go starts when full or when the owner presses start.
      const full = s.table.seats.every(Boolean);
      if (P.canStartHand(s.table) && (s.extra.kind === 'cash' || full) && (!s.table.hand || s.table.hand.complete)) s = advance({ ...s, table: P.startHand(s.table, rng), extra: { ...s.extra, handEndedAt: undefined } }, now);
      await persist(db, tableId, version, s, prevHand);
      return json({ tableId, seat: free });
    }

    const me = seatOf(userId);
    if (me < 0) throw new HttpError('not_seated', 403);

    if (action === 'start') {
      if (row.owner !== userId) throw new HttpError('forbidden', 403);
      if (s.table.hand && !s.table.hand.complete) throw new HttpError('hand_running', 409);
      if (!P.canStartHand(s.table)) throw new HttpError('not_enough_players', 409);
      s = advance({ ...s, table: P.startHand(s.table, rng), extra: { ...s.extra, handEndedAt: undefined } }, now);
    } else if (action === 'act') {
      const a = body.move as P.PokerAction;
      if (!a || !['fold', 'check', 'call', 'bet', 'raise'].includes(a.type)) throw new HttpError('invalid_action');
      if (Number(body.version) !== version) throw new HttpError('conflict', 409);
      try {
        s = { ...s, table: P.act(s.table, me, { type: a.type, amount: a.amount === undefined ? undefined : Number(a.amount) }) };
      } catch (e) {
        throw new HttpError((e as Error).message.replace(/\s+/g, '_').toLowerCase().slice(0, 40));
      }
      await db.from('poker_seats').update({ timeouts: 0, connected: true }).eq('table_id', tableId).eq('user_id', userId);
      s = advance(s, now);
    } else if (action === 'tick') {
      const h = s.table.hand;
      if (h && !h.complete && h.toAct !== null && !s.table.seats[h.toAct]!.isBot && row.action_deadline && Date.parse(row.action_deadline) <= now) {
        // Timeout: check if possible, otherwise fold; two timeouts in a row → sitting out.
        const seat = h.toAct;
        const legal = P.legalActions(s.table)!;
        s = { ...s, table: P.act(s.table, seat, legal.canCheck ? { type: 'check' } : { type: 'fold' }) };
        const uid = s.table.seats[seat]!.id;
        const { data: seatRow } = await db.from('poker_seats').select('timeouts').eq('table_id', tableId).eq('user_id', uid).single();
        const timeouts = (seatRow?.timeouts ?? 0) + 1;
        await db.from('poker_seats').update({ timeouts, connected: timeouts < 2 }).eq('table_id', tableId).eq('user_id', uid);
        if (timeouts >= 2) s.table.seats[seat] = { ...s.table.seats[seat]!, sittingOut: true };
        s = advance(s, now);
      } else if (h?.complete && now - (s.extra.handEndedAt ?? 0) >= NEXT_HAND_MS) {
        if (s.extra.handEndedAt) await settleHand(db, s, tableId);
        // Departures and busted cash players are processed between hands.
        for (const id of [...s.extra.leaving]) {
          const i = s.table.seats.findIndex((x) => x?.id === id);
          if (i >= 0) {
            const stack = s.table.seats[i]!.stack;
            if (s.extra.kind === 'cash' && stack > 0) await db.rpc('wallet_apply', { p_user: id, p_amount: stack, p_kind: 'cashout', p_ref: tableId, p_key: `cashout:${tableId}:${id}:${h.number}` });
            s = { ...s, table: P.standUp(s.table, i) };
            await db.from('poker_seats').delete().eq('table_id', tableId).eq('user_id', id);
          }
        }
        s.extra.leaving = [];
        if (s.extra.kind === 'cash') s.table.seats = s.table.seats.map((x) => (x?.isBot && x.stack === 0 ? { ...x, stack: s.extra.maxBuyIn } : x));
        if (P.tournamentWinner(s.table)) await finishTournament(db, s, tableId);
        else if (P.canStartHand(s.table)) s = advance({ ...s, table: P.startHand(s.table, rng), extra: { ...s.extra, handEndedAt: undefined } }, now);
        else s.extra.handEndedAt = undefined;
      } else {
        return json({ ok: true, idle: true });
      }
    } else if (action === 'leave') {
      const h = s.table.hand;
      const live = h && !h.complete && h.players.some((p) => p.seat === me && !p.folded);
      if (live) {
        s.extra.leaving = [...new Set([...s.extra.leaving, userId])];
        s = advance(s, now); // folds immediately if it is their turn
      } else {
        const stack = s.table.seats[me]!.stack;
        if (s.extra.kind === 'cash' && stack > 0) await db.rpc('wallet_apply', { p_user: userId, p_amount: stack, p_kind: 'cashout', p_ref: tableId, p_key: `cashout:${tableId}:${userId}:${now}` });
        s = { ...s, table: P.standUp(s.table, me) };
        await db.from('poker_seats').delete().eq('table_id', tableId).eq('user_id', userId);
      }
    } else if (action === 'invite') {
      const to = String(body.userId ?? '');
      const { data: ok } = await db.rpc('are_friends', { a: userId, b: to });
      if (!ok) throw new HttpError('not_friends', 403);
      await db.from('table_invites').upsert({ table_id: tableId, from_user: userId, to_user: to, status: 'pending' });
      await db.from('notifications').insert({ user_id: to, kind: 'table_invite', payload: { table: tableId, from: userId, code: row.code } });
      return json({ ok: true });
    } else {
      throw new HttpError('unknown_action');
    }
    await persist(db, tableId, version, s, prevHand);
    return json({ ok: true, version: version + 1 });
  }),
);
