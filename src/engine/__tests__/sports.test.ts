import { buildMarkets, cashOutValue, settleSelection, settleSlip, findSelection, impliedFromAmerican, oddsFrom, MARGIN, type SportEvent } from '../sports/sports.ts';
import { LEAGUES, parseTeamScoreboard, parseTennis, parseF1, parseStandings, parseUfc } from '../sports/espn.ts';
/* eslint-disable @typescript-eslint/no-require-imports */
const fx = (n: string) => require(`./fixtures/espn_${n}.json`);
const league = (k: string) => LEAGUES.find((l) => l.key === k)!;

describe('sports: real ESPN data → events', () => {
  it('Nations League today: 10 real fixtures priced from the market', () => {
    const evs = parseTeamScoreboard(fx('nations_pre'), league('uefa.nations'));
    expect(evs).toHaveLength(10);
    const e = evs[0];
    expect(e.status).toBe('pre');
    expect(e.model.kind).toBe('poisson');
    expect(e.model.source).toBe('market');
    expect(e.home?.form).toMatch(/^[WDL]+$/);
  });

  it('our 1X2 matches the market once its margin is removed, and keeps our own margin', () => {
    const json = fx('nations_pre');
    const ev = parseTeamScoreboard(json, league('uefa.nations'))[0];
    const o = json.events[0].competitions[0].odds[0];
    const ph = impliedFromAmerican(o.moneyline?.home?.close?.odds ?? o.homeTeamOdds?.moneyLine)!;
    const pa = impliedFromAmerican(o.moneyline?.away?.close?.odds ?? o.awayTeamOdds?.moneyLine)!;
    const pd = impliedFromAmerican(o.moneyline?.draw?.close?.odds ?? o.drawOdds?.moneyLine)!;
    const z = ph + pa + pd;
    const m = buildMarkets(ev).find((x) => x.key === '1x2')!;
    expect(m.sels[0].p).toBeCloseTo(ph / z, 1);
    expect(m.sels[2].p).toBeCloseTo(pa / z, 1);
    const book = m.sels.reduce((s, x) => s + 1 / x.odds, 0);
    expect(book).toBeGreaterThan(1.05);
    expect(book).toBeLessThan(1.09);
  });

  it('exhaustive football markets add up to 1 and have many options', () => {
    const ev = parseTeamScoreboard(fx('nations_pre'), league('uefa.nations'))[1];
    const ms = buildMarkets(ev);
    expect(ms.length).toBeGreaterThan(15);
    for (const k of ['1x2', 'btts', 'tg2.5', 'cs', 'margin', 'goals', 'rb']) {
      const m = ms.find((x) => x.key === k)!;
      expect(m.sels.reduce((s, x) => s + x.p, 0)).toBeCloseTo(1, 3);
    }
  });

  it('settles football selections from the final score', () => {
    const evs = parseTeamScoreboard(fx('nations_final'), league('uefa.nations'));
    const done = evs.find((e) => e.status === 'final')!;
    const { home, away } = done.score!;
    expect(settleSelection(done, '1x2', home > away ? '1' : home === away ? 'X' : '2')).toBe('won');
    expect(settleSelection(done, 'btts', home > 0 && away > 0 ? 'yes' : 'no')).toBe('won');
    expect(settleSelection(done, 'cs', `${Math.min(home, 4)}-${Math.min(away, 4)}`)).toBe(home > 4 || away > 4 ? 'lost' : 'won');
    expect(settleSelection(done, 'tg2.5', home + away > 2.5 ? 'under' : 'over')).toBe('lost');
    const pre = parseTeamScoreboard(fx('nations_pre'), league('uefa.nations'))[0];
    expect(settleSelection(pre, '1x2', '1')).toBe('pending');
  });

  it('NFL and NBA: spread and total from the market; moneyline close to the market', () => {
    const nfl = parseTeamScoreboard(fx('nfl'), league('nfl')).find((e) => e.status === 'pre')!;
    expect(nfl.model.kind).toBe('normal');
    const ml = buildMarkets(nfl).find((m) => m.key === 'ml')!;
    expect(ml.sels[0].p).toBeGreaterThan(0.6); // Baltimore -4.5 at home
    const nba = parseTeamScoreboard(fx('nba'), league('nba'));
    for (const e of nba.filter((x) => x.status === 'pre')) {
      const m = buildMarkets(e);
      const sp = m.find((x) => x.key.startsWith('sp'))!;
      expect(sp.sels[0].p + sp.sels[1].p).toBeCloseTo(1, 2);
    }
    // away favourite (MEM @ WSH, MEM -4.5): the away side must be favoured
    const mem = nba.find((e) => e.away?.short.includes('Memphis') || e.away?.name.includes('Memphis'));
    if (mem) expect(buildMarkets(mem).find((m) => m.key === 'ml')!.sels[1].p).toBeGreaterThan(0.55);
  });

  it('tennis ATP Finals: ranking favourite, set markets, settlement by sets', () => {
    const evs = parseTennis(fx('atp'), league('atp'));
    const m = evs.find((e) => e.name.includes('Alcaraz') && e.status === 'pre')!;
    const ml = buildMarkets(m).find((x) => x.key === 'ml')!;
    const alcaraz = m.home!.name.includes('Alcaraz') ? ml.sels[0] : ml.sels[1];
    expect(alcaraz.p).toBeGreaterThan(0.6);
    const done = evs.find((e) => e.status === 'final')!;
    expect(['won', 'lost']).toContain(settleSelection(done, 'ml', 'h'));
    expect(done.sets!.home + done.sets!.away).toBeGreaterThanOrEqual(2);
  });

  it('F1 Las Vegas: championship order sets the favourites; settles podium and head-to-heads', () => {
    const [gp] = parseF1(fx('f1'), fx('f1_standings'));
    expect(gp.name).toMatch(/Las Vegas/);
    const win = buildMarkets(gp).find((m) => m.key === 'win')!;
    expect(win.sels[0].p).toBeGreaterThan(win.sels[5].p);
    expect(win.sels.reduce((s, x) => s + x.p, 0)).toBeCloseTo(1, 6);
    const podium = buildMarkets(gp).find((m) => m.key === 'podium')!;
    expect(podium.sels.reduce((s, x) => s + x.p, 0)).toBeCloseTo(3, 1);
    const fin: SportEvent = { ...gp, status: 'final', finish: gp.entrants!.map((e) => e.id).reverse() };
    const last = gp.entrants![0].id;
    expect(settleSelection(fin, 'win', last)).toBe('lost');
    expect(settleSelection(fin, 'podium', gp.entrants![gp.entrants!.length - 1].id)).toBe('won');
    const h2h = buildMarkets(gp).find((m) => m.key.startsWith('h2h:'))!;
    expect(settleSelection(fin, h2h.key, h2h.sels[1].key)).toBe('won');
  });

  it('table-based model when there are no market odds', () => {
    const json = JSON.parse(JSON.stringify(fx('laliga')));
    for (const e of json.events) delete e.competitions[0].odds;
    const ev = parseTeamScoreboard(json, league('esp.1'), parseStandings(fx('laliga_standings')))[0];
    expect(ev.model.source).toBe('table');
  });

  it('slips: combos multiply, a lost leg loses, void legs count as 1', () => {
    const leg = (status: 'won' | 'lost' | 'void' | 'pending', odds: number) => ({ eventId: 'e', market: 'm', sel: 's', odds, label: '', marketName: '', eventName: '', status });
    expect(settleSlip(10, [leg('won', 2), leg('won', 1.5)])).toEqual({ status: 'won', payout: 30 });
    expect(settleSlip(10, [leg('won', 2), leg('lost', 1.5)]).status).toBe('lost');
    expect(settleSlip(10, [leg('won', 2), leg('pending', 1.5)]).status).toBe('pending');
    expect(settleSlip(10, [leg('won', 2), leg('void', 1.5)])).toEqual({ status: 'won', payout: 20 });
    expect(settleSlip(10, [leg('void', 2)])).toEqual({ status: 'void', payout: 10 });
    expect(oddsFrom(0.5, MARGIN.main)).toBeLessThan(2);
    const ev = parseTeamScoreboard(fx('nations_pre'), league('uefa.nations'))[0];
    expect(findSelection(ev, '1x2', 'X')?.odds).toBeGreaterThan(1);
    expect(findSelection(ev, '1x2', 'nope')).toBeNull();
  });
});

describe('cash out', () => {
  const leg = (odds: number, status: 'pending' | 'won' | 'void' | 'lost', now: number | null) => ({ eventId: 'e', market: 'ml', sel: 'h', odds, label: '', marketName: '', eventName: '', status, now });
  it('pays stake × taken ÷ now minus 3 %, ignoring void legs and counting won legs as settled', () => {
    expect(cashOutValue(100, [leg(2, 'pending', 2)])).toBe(97);
    expect(cashOutValue(100, [leg(2, 'pending', 1.5)])).toBe(Math.floor(100 * 2 / 1.5 * 0.97));
    expect(cashOutValue(100, [leg(2, 'won', null), leg(3, 'pending', 3)])).toBe(Math.floor(200 * 0.97));
    expect(cashOutValue(100, [leg(2, 'void', null), leg(3, 'pending', 3)])).toBe(97);
    expect(cashOutValue(100, [leg(2, 'lost', null), leg(3, 'pending', 3)])).toBeNull();
    expect(cashOutValue(100, [leg(2, 'pending', null)])).toBeNull();
  });
});

describe('NHL and UFC (real ESPN boards)', () => {
  it('prices NHL games from the moneyline with a ±1.5 puck line and 50/50-free markets', () => {
    const lg = LEAGUES.find((l) => l.key === 'nhl')!;
    const evs = parseTeamScoreboard(fx('nhl'), lg);
    expect(evs.length).toBeGreaterThan(0);
    for (const ev of evs) {
      expect(ev.sport).toBe('nhl');
      const ms = buildMarkets(ev);
      const ml = ms.find((m) => m.key === 'ml')!;
      const book = ml.sels.reduce((a, s) => a + 1 / s.odds, 0);
      expect(book).toBeGreaterThan(1.02); // our margin is on top
      expect(book).toBeLessThan(1.12);
      expect(ms.some((m) => m.key === 'sp-1.5' || m.key === 'sp1.5')).toBe(true);
      expect(ms.every((m) => m.sels.every((s) => s.odds >= 1.01))).toBe(true);
    }
  });
  it('lists every UFC fight with a record-based winner market that settles on the winner flag', () => {
    const lg = LEAGUES.find((l) => l.key === 'ufc')!;
    const evs = parseUfc(fx('ufc'), lg);
    expect(evs.length).toBeGreaterThan(3);
    const ev = evs[0];
    expect(ev.model.kind).toBe('duel');
    const ms = buildMarkets(ev);
    expect(ms).toHaveLength(1);
    expect(ms[0].sels.map((s) => s.key)).toEqual(['h', 'a']);
    const fin = { ...ev, status: 'final' as const, score: { home: 0, away: 1 } };
    expect(settleSelection(fin, 'ml', 'a')).toBe('won');
    expect(settleSelection(fin, 'ml', 'h')).toBe('lost');
    expect(settleSelection({ ...fin, score: { home: 0, away: 0 } }, 'ml', 'h')).toBe('void');
  });
});
