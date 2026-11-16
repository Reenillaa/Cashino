import { fitPoisson, impliedFromAmerican, setProbFromMatch, type Entrant, type EventStatus, type Side, type SportEvent } from './sports.ts';

/**
 * Turns ESPN's public scoreboard JSON into events with a pricing model. Pure functions (no network),
 * so the server and the tests run exactly the same code.
 */
type Json = any;

export const LEAGUES: { sport: 'soccer' | 'nfl' | 'nba' | 'nhl' | 'tennis' | 'ufc' | 'f1'; path: string; key: string; name: string; standings?: boolean }[] = [
  { sport: 'soccer', path: 'soccer/esp.1', key: 'esp.1', name: 'LaLiga', standings: true },
  { sport: 'soccer', path: 'soccer/eng.1', key: 'eng.1', name: 'Premier League', standings: true },
  { sport: 'soccer', path: 'soccer/ita.1', key: 'ita.1', name: 'Serie A', standings: true },
  { sport: 'soccer', path: 'soccer/ger.1', key: 'ger.1', name: 'Bundesliga', standings: true },
  { sport: 'soccer', path: 'soccer/fra.1', key: 'fra.1', name: 'Ligue 1', standings: true },
  { sport: 'soccer', path: 'soccer/uefa.champions', key: 'uefa.champions', name: 'Champions League' },
  { sport: 'soccer', path: 'soccer/uefa.europa', key: 'uefa.europa', name: 'Europa League' },
  { sport: 'soccer', path: 'soccer/uefa.nations', key: 'uefa.nations', name: 'UEFA Nations League' },
  { sport: 'soccer', path: 'soccer/uefa.euro', key: 'uefa.euro', name: 'Eurocopa' },
  { sport: 'soccer', path: 'soccer/fifa.world', key: 'fifa.world', name: 'Mundial' },
  { sport: 'nfl', path: 'football/nfl', key: 'nfl', name: 'NFL' },
  { sport: 'nba', path: 'basketball/nba', key: 'nba', name: 'NBA' },
  { sport: 'nhl', path: 'hockey/nhl', key: 'nhl', name: 'NHL' },
  { sport: 'ufc', path: 'mma/ufc', key: 'ufc', name: 'UFC' },
  { sport: 'tennis', path: 'tennis/atp', key: 'atp', name: 'ATP' },
  { sport: 'tennis', path: 'tennis/wta', key: 'wta', name: 'WTA' },
  { sport: 'f1', path: 'racing/f1', key: 'f1', name: 'Fórmula 1' },
];

export function statusOf(st: Json): EventStatus {
  const name = String(st?.type?.name ?? '');
  if (/POSTPONED|CANCELED|CANCELLED|ABANDONED|SUSPENDED|FORFEIT/.test(name)) return 'void';
  const state = st?.type?.state;
  if (state === 'post' && st?.type?.completed) return 'final';
  if (state === 'in' || (state === 'post' && !st?.type?.completed)) return 'live';
  return 'pre';
}

/** Standings of a football league → goals for/against per game by team id (for matches without market odds). */
export type Table = Record<string, { gf: number; ga: number; gp: number; rank: number; pts: number }>;
export function parseStandings(json: Json): Table {
  const out: Table = {};
  const entries = json?.children?.[0]?.standings?.entries ?? [];
  for (const e of entries) {
    const st = (n: string) => Number(e.stats?.find((x: Json) => x.name === n)?.value ?? e.stats?.find((x: Json) => x.name === n)?.displayValue ?? 0);
    out[String(e.team?.id)] = { gf: st('pointsFor'), ga: st('pointsAgainst'), gp: st('gamesPlayed'), rank: st('rank'), pts: st('points') };
  }
  return out;
}

const side = (c: Json): Side => ({
  id: String(c.team?.id ?? c.id),
  name: c.team?.displayName ?? c.athlete?.displayName ?? '?',
  short: c.team?.shortDisplayName ?? c.team?.abbreviation ?? c.athlete?.shortName ?? c.athlete?.displayName ?? '?',
  logo: c.team?.logo ?? c.athlete?.flag?.href,
  record: c.records?.[0]?.summary,
  form: c.form,
  rank: c.curatedRank?.current,
});
const two = (p: number | null, q: number | null) => (p !== null && q !== null ? [p / (p + q), q / (p + q)] : null);

/** Football, NFL and NBA scoreboards. */
export function parseTeamScoreboard(json: Json, league: (typeof LEAGUES)[number], table?: Table): SportEvent[] {
  const out: SportEvent[] = [];
  for (const e of json?.events ?? []) {
    const c = e.competitions?.[0];
    if (!c) continue;
    const H = c.competitors?.find((x: Json) => x.homeAway === 'home');
    const A = c.competitors?.find((x: Json) => x.homeAway === 'away');
    if (!H || !A) continue;
    const status = statusOf(e.status ?? c.status);
    const o = c.odds?.[0];
    const ml = (k: 'home' | 'away' | 'draw') => impliedFromAmerican(o?.moneyline?.[k]?.close?.odds ?? (k === 'draw' ? o?.drawOdds?.moneyLine : o?.[`${k}TeamOdds`]?.moneyLine));
    const ev: SportEvent = {
      id: `${league.key}:${e.id}`,
      sport: league.sport,
      league: league.key,
      leagueName: league.name,
      name: `${side(H).name} - ${side(A).name}`,
      startsAt: e.date,
      status,
      clock: status === 'live' ? e.status?.type?.shortDetail ?? e.status?.displayClock : undefined,
      home: side(H),
      away: side(A),
      score: status === 'pre' ? undefined : { home: Number(H.score ?? 0), away: Number(A.score ?? 0) },
      model: { kind: 'poisson', lh: 1.35, la: 1.1, source: 'default' },
    };
    if (league.sport === 'soccer') {
      const ph = ml('home'), pa = ml('away'), pd = ml('draw');
      if (ph !== null && pa !== null && pd !== null) {
        const z = ph + pa + pd;
        const ov = two(impliedFromAmerican(o?.total?.over?.close?.odds), impliedFromAmerican(o?.total?.under?.close?.odds));
        const line = Number(o?.overUnder);
        const fit = fitPoisson(ph / z, pa / z, ov && line === 2.5 ? ov[0] : null);
        ev.model = { kind: 'poisson', ...fit, source: 'market' };
      } else if (table && table[ev.home!.id] && table[ev.away!.id]) {
        const h = table[ev.home!.id], a = table[ev.away!.id];
        const all = Object.values(table);
        const gp = all.reduce((s, t) => s + t.gp, 0) || 1;
        const avg = all.reduce((s, t) => s + t.gf, 0) / gp || 1.35;
        const att = (t: typeof h) => (t.gp ? t.gf / t.gp / avg : 1);
        const def = (t: typeof h) => (t.gp ? t.ga / t.gp / avg : 1);
        ev.model = { kind: 'poisson', lh: Math.max(0.2, avg * att(h) * def(a) * 1.12), la: Math.max(0.2, avg * att(a) * def(h) * 0.9), source: 'table' };
      }
    } else if (league.sport === 'nhl') {
      // hockey: the moneyline (overtime included) sets the expected goal margin; the puck line is always ±1.5
      const sd = 2.3;
      const ph = two(ml('home'), ml('away'));
      const total = Number(o?.overUnder);
      const mu = ph ? sd * Math.SQRT2 * erfInv(Math.max(-0.98, Math.min(0.98, 2 * ph[0] - 1))) : 0.2;
      const t = Number.isFinite(total) && total > 0 ? total : 6;
      ev.model = { kind: 'normal', mu, sd, total: t, sdTotal: 2.3, line: mu >= 0 ? -1.5 : 1.5, ouLine: t, source: ph ? 'market' : 'default' };
    } else {
      const sd = league.sport === 'nfl' ? 13.5 : 12;
      const sdTotal = league.sport === 'nfl' ? 10 : 16;
      const spread = Number(o?.spread);
      const total = Number(o?.overUnder);
      if (Number.isFinite(spread) && Number.isFinite(total) && total > 0) {
        ev.model = { kind: 'normal', mu: -spread, sd, total, sdTotal, line: spread, ouLine: total, source: 'market' };
      } else {
        const ph = two(ml('home'), ml('away'));
        // no spread: turn the moneyline into an expected margin (normal model), with a typical total
        const mu = ph ? sd * Math.SQRT2 * erfInv(2 * ph[0] - 1) : 0;
        ev.model = { kind: 'normal', mu, sd, total: league.sport === 'nfl' ? 44 : 228, sdTotal, source: ph ? 'market' : 'default' };
      }
    }
    out.push(ev);
  }
  return out;
}

/** Tennis: every singles match of the tournaments on the board. */
export function parseTennis(json: Json, league: (typeof LEAGUES)[number]): SportEvent[] {
  const out: SportEvent[] = [];
  for (const t of json?.events ?? []) {
    for (const g of t.groupings ?? []) {
      if (!/Singles/i.test(g.grouping?.displayName ?? '')) continue;
      for (const m of g.competitions ?? []) {
        const [P, Q] = m.competitors ?? [];
        if (!P?.athlete || !Q?.athlete) continue;
        const status = statusOf(m.status);
        const setsWon = (me: Json, other: Json) => (me.linescores ?? []).filter((l: Json, i: number) => Number(l.value) > Number(other.linescores?.[i]?.value ?? -1)).length;
        const rp = P.curatedRank?.current, rq = Q.curatedRank?.current;
        // ranking → match probability (a top-ranked player beats a lower-ranked one more often)
        const pMatch = rp && rq ? 1 / (1 + (rp / rq) ** 0.9) : 0.5;
        out.push({
          id: `${league.key}:${m.id}`,
          sport: 'tennis',
          league: league.key,
          leagueName: `${league.name} · ${t.shortName ?? t.name}`,
          name: `${P.athlete.displayName} - ${Q.athlete.displayName}`,
          startsAt: m.date,
          status,
          clock: status === 'live' ? m.status?.type?.shortDetail : undefined,
          home: side(P),
          away: side(Q),
          sets: status === 'pre' ? undefined : { home: setsWon(P, Q), away: setsWon(Q, P) },
          score: status === 'final' ? { home: P.winner ? 1 : 0, away: Q.winner ? 1 : 0 } : undefined,
          model: { kind: 'sets', pSet: setProbFromMatch(pMatch), bestOf: 3, source: rp && rq ? 'ranking' : 'default' },
        });
      }
    }
  }
  return out;
}

/** F1: the race of the current Grand Prix, with the drivers of the championship. */
export function parseF1(json: Json, standings: Json): SportEvent[] {
  const drivers: Entrant[] = (standings?.children?.[0]?.standings?.entries ?? []).map((e: Json) => ({
    id: String(e.athlete?.id),
    name: e.athlete?.displayName ?? '?',
    short: e.athlete?.abbreviation ?? e.athlete?.displayName ?? '?',
    points: Number(e.stats?.find((x: Json) => x.name === 'championshipPts')?.value ?? 0),
    rank: Number(e.stats?.find((x: Json) => x.name === 'rank')?.value ?? 99),
  })).sort((a: Entrant, b: Entrant) => a.rank - b.rank);
  const out: SportEvent[] = [];
  for (const e of json?.events ?? []) {
    const race = (e.competitions ?? []).find((c: Json) => /race/i.test(c.type?.abbreviation ?? c.type?.text ?? ''));
    if (!race || !drivers.length) continue;
    const status = statusOf(race.status);
    const finish = status === 'final' ? [...(race.competitors ?? [])].sort((a: Json, b: Json) => Number(a.order) - Number(b.order)).map((c: Json) => String(c.athlete?.id ?? c.id)) : undefined;
    const maxPts = Math.max(1, ...drivers.map((d) => d.points));
    out.push({
      id: `f1:${e.id}`,
      sport: 'f1',
      league: 'f1',
      leagueName: 'Fórmula 1',
      name: e.name,
      startsAt: race.date,
      status,
      entrants: drivers,
      finish,
      // strength grows faster than points: the leader is a clear favourite but anyone can win
      model: { kind: 'race', w: drivers.map((d) => Math.pow(0.05 + d.points / maxPts, 2.4)), source: 'standings' },
    });
  }
  return out;
}

/**
 * UFC: every fight of the cards on the board. ESPN gives no prices for fights, so the model uses the
 * fighters' professional records (wins and losses, shrunk towards 50 %) — shown as such in the app.
 */
export function parseUfc(json: Json, league: (typeof LEAGUES)[number]): SportEvent[] {
  const out: SportEvent[] = [];
  for (const card of json?.events ?? []) {
    for (const f of card.competitions ?? []) {
      const [P, Q] = [...(f.competitors ?? [])].sort((x: Json, y: Json) => Number(x.order ?? 0) - Number(y.order ?? 0));
      if (!P?.athlete || !Q?.athlete) continue;
      const status = statusOf(f.status ?? card.status);
      const rec = (c: Json) => {
        const m = String(c.records?.[0]?.summary ?? '').match(/^(\d+)-(\d+)/);
        return m ? (Number(m[1]) + 2) / (Number(m[1]) + Number(m[2]) + 4) : 0.5;
      };
      const rp = rec(P), rq = rec(Q);
      const p = 0.5 + 0.5 * (rp / (rp + rq) - 0.5) * 2 * 0.6;
      const won = (c: Json) => (c.winner ? 1 : 0);
      out.push({
        id: `${league.key}:${f.id}`,
        sport: 'ufc',
        league: league.key,
        leagueName: `${league.name} · ${String(card.shortName ?? card.name ?? '').replace(/^UFC (Fight Night: )?/, '')}`,
        name: `${P.athlete.displayName} - ${Q.athlete.displayName}`,
        startsAt: f.date ?? card.date,
        status,
        clock: status === 'live' ? f.status?.type?.shortDetail : undefined,
        home: side(P),
        away: side(Q),
        score: status === 'final' ? { home: won(P), away: won(Q) } : undefined,
        model: { kind: 'duel', p: Math.min(0.85, Math.max(0.15, p)), source: rp === 0.5 && rq === 0.5 ? 'default' : 'record' },
      });
    }
  }
  return out;
}

/** Inverse error function (Winitzki approximation), for moneyline → expected margin. */
export function erfInv(x: number): number {
  const a = 0.147;
  const ln = Math.log(1 - x * x);
  const t = 2 / (Math.PI * a) + ln / 2;
  return Math.sign(x) * Math.sqrt(Math.sqrt(t * t - ln / a) - t);
}
