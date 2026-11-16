/**
 * `sports` Edge Function — real fixtures from ESPN's public scoreboards, our prices, bets and settlement.
 *   { action: 'refresh' }  → (throttled) pulls fixtures/scores, stores events, settles finished bets
 *   { action: 'bet', mode: 'single' | 'combo', stake, legs: [{ eventId, market, sel, odds }], requestId }
 * Prices are always recomputed here from the stored event; if they moved, the bet is refused with the new odds.
 */
import { admin, handler, HttpError, json, requireUser, rpcError } from '../_shared/http.ts';
import { LEAGUES, parseF1, parseStandings, parseTeamScoreboard, parseTennis, type Table } from '../_shared/engine/sports/espn.ts';
import { findSelection, settleSelection, settleSlip, SLIP, type SlipSel, type SportEvent } from '../_shared/engine/sports/sports.ts';

const ESPN = 'https://site.api.espn.com/apis';
const REFRESH_MS = 90_000;
const STANDINGS_MS = 6 * 3600_000;
type DB = ReturnType<typeof admin>;

async function get(url: string) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Cashino/1.0 (play-money app)' } });
  if (!r.ok) return null;
  return await r.json();
}
const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

async function standings(db: DB, key: string, path: string): Promise<Table | undefined> {
  const { data } = await db.from('sports_meta').select('value, updated_at').eq('key', `table:${key}`).maybeSingle();
  if (data && Date.now() - new Date(data.updated_at).getTime() < STANDINGS_MS) return data.value as Table;
  const j = await get(`${ESPN}/v2/sports/${path}/standings`);
  if (!j) return data?.value as Table | undefined;
  const t = parseStandings(j);
  await db.from('sports_meta').upsert({ key: `table:${key}`, value: t, updated_at: new Date().toISOString() });
  return t;
}

async function refresh(db: DB, extraDates: Record<string, string[]>) {
  const now = new Date();
  const days = [-1, 0, 1, 2, 3, 4, 5, 6].map((k) => ymd(new Date(now.getTime() + k * 86400_000)));
  const events: SportEvent[] = [];
  const jobs: Promise<void>[] = [];
  for (const lg of LEAGUES) {
    if (lg.sport === 'tennis') {
      jobs.push(get(`${ESPN}/site/v2/sports/${lg.path}/scoreboard`).then((j) => { if (j) events.push(...parseTennis(j, lg)); }));
    } else if (lg.sport === 'f1') {
      jobs.push(Promise.all([get(`${ESPN}/site/v2/sports/${lg.path}/scoreboard`), get(`${ESPN}/v2/sports/racing/f1/standings`)]).then(([j, s]) => { if (j && s) events.push(...parseF1(j, s)); }));
    } else {
      const dates = [...new Set([...days, ...(extraDates[lg.key] ?? [])])];
      jobs.push((async () => {
        const table = lg.standings ? await standings(db, lg.key, lg.path) : undefined;
        const boards = await Promise.all(dates.map((d) => get(`${ESPN}/site/v2/sports/${lg.path}/scoreboard?dates=${d}`)));
        for (const j of boards) if (j) events.push(...parseTeamScoreboard(j, lg, table));
      })());
    }
  }
  await Promise.all(jobs);
  const seen = new Map(events.map((e) => [e.id, e]));
  const rows = [...seen.values()].map((e) => ({ id: e.id, sport: e.sport, league: e.league, starts_at: e.startsAt, status: e.status, data: e, updated_at: new Date().toISOString() }));
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await db.from('sports_events').upsert(rows.slice(i, i + 200));
    if (error) throw new Error(error.message);
  }
  return rows.length;
}

async function settle(db: DB) {
  const { data: bets } = await db.from('sports_bets').select('id, stake, legs').eq('status', 'pending').limit(500);
  if (!bets?.length) return 0;
  const ids = [...new Set(bets.flatMap((b) => (b.legs as SlipSel[]).map((l) => l.eventId)))];
  const { data: evRows } = await db.from('sports_events').select('id, data').in('id', ids);
  const evs = new Map((evRows ?? []).map((r) => [r.id, r.data as SportEvent]));
  let n = 0;
  for (const b of bets) {
    const legs = (b.legs as SlipSel[]).map((l) => {
      const ev = evs.get(l.eventId);
      return { ...l, status: ev ? settleSelection(ev, l.market, l.sel) : 'pending' as const };
    });
    const r = settleSlip(Number(b.stake), legs);
    if (r.status === 'pending') continue;
    const { error } = await db.rpc('sports_settle', { p_bet: b.id, p_status: r.status, p_payout: r.payout, p_legs: legs });
    rpcError(error);
    n++;
  }
  return n;
}

/** Dates of pending events that left the normal window, so their results still get picked up. */
async function pendingDates(db: DB): Promise<Record<string, string[]>> {
  const { data: bets } = await db.from('sports_bets').select('legs').eq('status', 'pending').limit(500);
  const ids = [...new Set((bets ?? []).flatMap((b) => (b.legs as SlipSel[]).map((l) => l.eventId)))];
  if (!ids.length) return {};
  const { data } = await db.from('sports_events').select('league, starts_at').in('id', ids).neq('status', 'final');
  const out: Record<string, string[]> = {};
  for (const r of data ?? []) (out[r.league] ??= []).push(ymd(new Date(r.starts_at)));
  return out;
}

Deno.serve(
  handler(async (req, body) => {
    const userId = await requireUser(req);
    const db = admin();
    const action = String(body.action ?? 'refresh');

    if (action === 'refresh') {
      const { data: meta } = await db.from('sports_meta').select('updated_at').eq('key', 'refreshed').maybeSingle();
      if (meta && Date.now() - new Date(meta.updated_at).getTime() < REFRESH_MS && !body.force) return json({ ok: true, fresh: true });
      await db.from('sports_meta').upsert({ key: 'refreshed', value: null, updated_at: new Date().toISOString() });
      const count = await refresh(db, await pendingDates(db));
      const settled = await settle(db);
      return json({ ok: true, events: count, settled });
    }

    if (action === 'bet') {
      const mode = body.mode === 'combo' ? 'combo' : 'single';
      const stake = Number(body.stake);
      if (!Number.isInteger(stake) || stake < SLIP.minStake || stake > SLIP.maxStake) throw new HttpError('invalid_stake');
      const legsIn = Array.isArray(body.legs) ? (body.legs as { eventId: string; market: string; sel: string; odds: number }[]) : [];
      if (!legsIn.length || legsIn.length > SLIP.maxSelections) throw new HttpError('invalid_legs');
      if (mode === 'combo' && new Set(legsIn.map((l) => l.eventId)).size !== legsIn.length) throw new HttpError('same_event_in_combo');
      const { data: evRows } = await db.from('sports_events').select('id, data, starts_at, status').in('id', legsIn.map((l) => String(l.eventId)));
      const evs = new Map((evRows ?? []).map((r) => [r.id, r]));
      const changed: { eventId: string; market: string; sel: string; odds: number }[] = [];
      const legs: SlipSel[] = legsIn.map((l) => {
        const row = evs.get(String(l.eventId));
        if (!row) throw new HttpError('unknown_event');
        if (row.status !== 'pre' || new Date(row.starts_at).getTime() <= Date.now()) throw new HttpError('event_started', 409);
        const ev = row.data as SportEvent;
        const s = findSelection(ev, String(l.market), String(l.sel));
        if (!s) throw new HttpError('unknown_selection');
        if (Math.abs(s.odds - Number(l.odds)) > 1e-9) changed.push({ eventId: ev.id, market: l.market, sel: l.sel, odds: s.odds });
        return { eventId: ev.id, market: String(l.market), sel: String(l.sel), odds: s.odds, label: s.label, marketName: s.marketName, eventName: ev.name, status: 'pending' };
      });
      if (changed.length) return json({ error: 'odds_changed', changed }, 409);
      const requestId = String(body.requestId ?? '').slice(0, 80);
      if (!requestId) throw new HttpError('missing_request_id');
      const slips = mode === 'combo' ? [legs] : legs.map((l) => [l]);
      let balance = 0;
      for (const [i, s] of slips.entries()) {
        const odds = Math.min(SLIP.maxOdds, s.reduce((o, l) => o * l.odds, 1));
        const { data, error } = await db.rpc('sports_place', { p_user: userId, p_stake: stake, p_odds: Math.round(odds * 100) / 100, p_legs: s, p_key: `${userId}:${requestId}:${i}` });
        rpcError(error);
        balance = Number(data);
      }
      return json({ ok: true, balance });
    }
    throw new HttpError('invalid_action');
  }),
);
