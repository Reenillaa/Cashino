import { seededRng } from '../rng/rng.ts';

/**
 * Sports betting with play chips on REAL events (fixtures, live scores and results come from ESPN's public
 * data). Prices: where the market has odds (DraftKings, via ESPN) we remove that bookmaker's margin, fit a
 * model to those probabilities and derive every other market from it, adding our own margin:
 *  - football: Poisson goals (1X2, double chance, both score, totals, handicaps, correct score, …)
 *  - NFL / NBA: normal model for margin and total points (moneyline, spreads, totals, bands)
 *  - tennis: set-by-set model from the ATP ranking (winner, set score, total sets)
 *  - F1: Plackett–Luce from championship points (winner, podium, top 6, head-to-heads)
 * Every selection is a predicate on the final result, so pricing and settlement can never disagree.
 */

export type Sport = 'soccer' | 'nfl' | 'nba' | 'nhl' | 'tennis' | 'ufc' | 'f1';
export type EventStatus = 'pre' | 'live' | 'final' | 'void';

export interface Side { id: string; name: string; short: string; logo?: string; record?: string; form?: string; rank?: number }
export interface Entrant { id: string; name: string; short: string; points: number; rank: number }

export type Model =
  | { kind: 'poisson'; lh: number; la: number; source: 'market' | 'table' | 'default' }
  | { kind: 'normal'; mu: number; sd: number; total: number; sdTotal: number; line?: number; ouLine?: number; source: 'market' | 'default' }
  | { kind: 'sets'; pSet: number; bestOf: 3 | 5; source: 'ranking' | 'default' }
  | { kind: 'race'; w: number[]; source: 'standings' }
  | { kind: 'duel'; p: number; source: 'record' | 'default' };

export interface SportEvent {
  id: string;
  sport: Sport;
  league: string;
  leagueName: string;
  name: string;
  startsAt: string;
  status: EventStatus;
  clock?: string;
  home?: Side;
  away?: Side;
  score?: { home: number; away: number };
  sets?: { home: number; away: number }; // sets won (tennis)
  entrants?: Entrant[];
  finish?: string[]; // entrant ids in finishing order (F1)
  model: Model;
}

export interface Selection { key: string; label: string; p: number; odds: number }
export interface Market { key: string; group: string; name: string; sels: Selection[] }
export type Outcome = 'won' | 'lost' | 'void' | 'pending';
type Lang = 'es' | 'en';
const L = (lang: Lang, es: string, en: string) => (lang === 'es' ? es : en);

/* ─────────────────────────────── odds ─────────────────────────────── */
export const MARGIN = { main: 0.06, exotic: 0.12, outright: 0.15 };
export const MAX_ODDS = 500;
export function oddsFrom(p: number, margin: number): number {
  if (!(p > 0)) return MAX_ODDS;
  const o = 1 / (p * (1 + margin));
  return Math.min(MAX_ODDS, Math.max(1.01, Math.floor(o * 100) / 100));
}
/** American odds ("+125", "-160", "EVEN") → implied probability. */
export function impliedFromAmerican(s: string | number | undefined | null): number | null {
  if (s === undefined || s === null) return null;
  const t = String(s).trim().toUpperCase();
  if (t === 'EVEN' || t === 'EV') return 0.5;
  const v = Number(t);
  if (!Number.isFinite(v) || v === 0) return null;
  return v > 0 ? 100 / (v + 100) : -v / (-v + 100);
}

/* ─────────────────────────────── football (Poisson) ─────────────────────────────── */
const MAXG = 10;
const pois = (k: number, l: number) => {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return (Math.exp(-l) * l ** k) / f;
};
export function scoreMatrix(lh: number, la: number): number[][] {
  const h = Array.from({ length: MAXG + 1 }, (_, i) => pois(i, lh));
  const a = Array.from({ length: MAXG + 1 }, (_, j) => pois(j, la));
  return h.map((x) => a.map((y) => x * y));
}
const sumWhere = (m: number[][], f: (h: number, a: number) => boolean) => {
  let s = 0;
  for (let i = 0; i <= MAXG; i++) for (let j = 0; j <= MAXG; j++) if (f(i, j)) s += m[i][j];
  return s;
};
/** Fits home/away goal rates to market probabilities (home win, away win, and P(over 2.5) if known). */
export function fitPoisson(pH: number, pA: number, pOver25: number | null): { lh: number; la: number } {
  let total = 2.6;
  if (pOver25 !== null) {
    let lo = 0.6, hi = 6;
    for (let k = 0; k < 50; k++) {
      const mid = (lo + hi) / 2;
      const over = 1 - (pois(0, mid) + pois(1, mid) + pois(2, mid));
      if (over < pOver25) lo = mid; else hi = mid;
    }
    total = (lo + hi) / 2;
  }
  const target = pH - pA;
  let lo = 0.03, hi = 0.97;
  for (let k = 0; k < 50; k++) {
    const r = (lo + hi) / 2;
    const m = scoreMatrix(total * r, total * (1 - r));
    const d = sumWhere(m, (h, a) => h > a) - sumWhere(m, (h, a) => h < a);
    if (d < target) lo = r; else hi = r;
  }
  const r = (lo + hi) / 2;
  return { lh: total * r, la: total * (1 - r) };
}

type Pred<T> = (r: T) => boolean | null; // null = void
interface Def<T> { key: string; group: string; name: string; margin: number; sels: { key: string; label: string; win: Pred<T> }[] }

function soccerDefs(ev: SportEvent, lang: Lang): Def<{ h: number; a: number }>[] {
  const H = ev.home?.short ?? '1', A = ev.away?.short ?? '2';
  const g = { main: L(lang, 'Principales', 'Main'), goals: L(lang, 'Goles', 'Goals'), score: L(lang, 'Resultado', 'Score'), hcp: L(lang, 'Hándicap', 'Handicap'), combo: L(lang, 'Combinadas', 'Combos') };
  const ou = (key: string, name: string, f: (r: { h: number; a: number }) => number, lines: number[]) => lines.map((x) => ({
    key: `${key}${x}`, group: g.goals, name: `${name} ${String(x).replace('.', ',')}`, margin: MARGIN.main,
    sels: [{ key: 'over', label: L(lang, `Más de ${String(x).replace('.', ',')}`, `Over ${x}`), win: (r: { h: number; a: number }) => f(r) > x }, { key: 'under', label: L(lang, `Menos de ${String(x).replace('.', ',')}`, `Under ${x}`), win: (r: { h: number; a: number }) => f(r) < x }],
  }));
  const scores: [number, number][] = [];
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) scores.push([i, j]);
  return [
    { key: '1x2', group: g.main, name: L(lang, 'Resultado final', 'Match result'), margin: MARGIN.main, sels: [
      { key: '1', label: H, win: (r) => r.h > r.a }, { key: 'X', label: L(lang, 'Empate', 'Draw'), win: (r) => r.h === r.a }, { key: '2', label: A, win: (r) => r.h < r.a }] },
    { key: 'dc', group: g.main, name: L(lang, 'Doble oportunidad', 'Double chance'), margin: MARGIN.main, sels: [
      { key: '1X', label: `${H} ${L(lang, 'o empate', 'or draw')}`, win: (r) => r.h >= r.a }, { key: '12', label: `${H} ${L(lang, 'o', 'or')} ${A}`, win: (r) => r.h !== r.a }, { key: 'X2', label: `${L(lang, 'Empate o', 'Draw or')} ${A}`, win: (r) => r.h <= r.a }] },
    { key: 'btts', group: g.main, name: L(lang, 'Ambos equipos marcan', 'Both teams to score'), margin: MARGIN.main, sels: [
      { key: 'yes', label: L(lang, 'Sí', 'Yes'), win: (r) => r.h > 0 && r.a > 0 }, { key: 'no', label: 'No', win: (r) => r.h === 0 || r.a === 0 }] },
    ...ou('tg', L(lang, 'Total de goles', 'Total goals'), (r) => r.h + r.a, [0.5, 1.5, 2.5, 3.5, 4.5]),
    ...ou('hg', `${L(lang, 'Goles de', 'Goals')} ${H}`, (r) => r.h, [0.5, 1.5, 2.5]),
    ...ou('ag', `${L(lang, 'Goles de', 'Goals')} ${A}`, (r) => r.a, [0.5, 1.5, 2.5]),
    { key: 'eh-1', group: g.hcp, name: L(lang, `Hándicap ${H} (-1)`, `Handicap ${H} (-1)`), margin: MARGIN.main, sels: [
      { key: '1', label: `${H} -1`, win: (r) => r.h - r.a >= 2 }, { key: 'X', label: L(lang, 'Empate (-1)', 'Draw (-1)'), win: (r) => r.h - r.a === 1 }, { key: '2', label: `${A} +1`, win: (r) => r.h - r.a <= 0 }] },
    { key: 'eh+1', group: g.hcp, name: L(lang, `Hándicap ${A} (-1)`, `Handicap ${A} (-1)`), margin: MARGIN.main, sels: [
      { key: '1', label: `${H} +1`, win: (r) => r.a - r.h <= 0 }, { key: 'X', label: L(lang, 'Empate (-1)', 'Draw (-1)'), win: (r) => r.a - r.h === 1 }, { key: '2', label: `${A} -1`, win: (r) => r.a - r.h >= 2 }] },
    { key: 'margin', group: g.hcp, name: L(lang, 'Margen de victoria', 'Winning margin'), margin: MARGIN.exotic, sels: [
      { key: 'h1', label: `${H} ${L(lang, 'por 1', 'by 1')}`, win: (r) => r.h - r.a === 1 }, { key: 'h2', label: `${H} ${L(lang, 'por 2', 'by 2')}`, win: (r) => r.h - r.a === 2 }, { key: 'h3', label: `${H} ${L(lang, 'por 3+', 'by 3+')}`, win: (r) => r.h - r.a >= 3 },
      { key: 'x', label: L(lang, 'Empate', 'Draw'), win: (r) => r.h === r.a },
      { key: 'a1', label: `${A} ${L(lang, 'por 1', 'by 1')}`, win: (r) => r.a - r.h === 1 }, { key: 'a2', label: `${A} ${L(lang, 'por 2', 'by 2')}`, win: (r) => r.a - r.h === 2 }, { key: 'a3', label: `${A} ${L(lang, 'por 3+', 'by 3+')}`, win: (r) => r.a - r.h >= 3 }] },
    { key: 'cs', group: g.score, name: L(lang, 'Resultado exacto', 'Correct score'), margin: MARGIN.exotic, sels: [
      ...scores.map(([i, j]) => ({ key: `${i}-${j}`, label: `${i}-${j}`, win: (r: { h: number; a: number }) => r.h === i && r.a === j })),
      { key: 'other', label: L(lang, 'Otro', 'Other'), win: (r) => r.h > 4 || r.a > 4 }] },
    { key: 'goals', group: g.goals, name: L(lang, 'Número exacto de goles', 'Exact total goals'), margin: MARGIN.exotic, sels: [
      ...[0, 1, 2, 3, 4].map((k) => ({ key: `${k}`, label: `${k}`, win: (r: { h: number; a: number }) => r.h + r.a === k })),
      { key: '5+', label: '5+', win: (r) => r.h + r.a >= 5 }] },
    { key: 'oe', group: g.goals, name: L(lang, 'Goles par / impar', 'Goals odd / even'), margin: MARGIN.main, sels: [
      { key: 'odd', label: L(lang, 'Impar', 'Odd'), win: (r) => (r.h + r.a) % 2 === 1 }, { key: 'even', label: L(lang, 'Par', 'Even'), win: (r) => (r.h + r.a) % 2 === 0 }] },
    { key: 'wtn', group: g.main, name: L(lang, 'Gana sin encajar', 'Win to nil'), margin: MARGIN.main, sels: [
      { key: 'h', label: H, win: (r) => r.h > 0 && r.a === 0 }, { key: 'a', label: A, win: (r) => r.a > 0 && r.h === 0 }, { key: 'no', label: L(lang, 'Ninguno', 'Neither'), win: (r) => !((r.h > 0 && r.a === 0) || (r.a > 0 && r.h === 0)) }] },
    { key: 'rb', group: g.combo, name: L(lang, 'Resultado y ambos marcan', 'Result & both score'), margin: MARGIN.exotic, sels: ([['1', (r: { h: number; a: number }) => r.h > r.a, H], ['X', (r: { h: number; a: number }) => r.h === r.a, L(lang, 'Empate', 'Draw')], ['2', (r: { h: number; a: number }) => r.h < r.a, A]] as const).flatMap(([k, f, lab]) => [
      { key: `${k}-y`, label: `${lab} ${L(lang, 'y sí', '& yes')}`, win: (r: { h: number; a: number }) => f(r) && r.h > 0 && r.a > 0 },
      { key: `${k}-n`, label: `${lab} ${L(lang, 'y no', '& no')}`, win: (r: { h: number; a: number }) => f(r) && !(r.h > 0 && r.a > 0) }]) },
    { key: 'ro', group: g.combo, name: L(lang, 'Resultado y más/menos 2,5', 'Result & over/under 2.5'), margin: MARGIN.exotic, sels: ([['1', (r: { h: number; a: number }) => r.h > r.a, H], ['X', (r: { h: number; a: number }) => r.h === r.a, L(lang, 'Empate', 'Draw')], ['2', (r: { h: number; a: number }) => r.h < r.a, A]] as const).flatMap(([k, f, lab]) => [
      { key: `${k}-o`, label: `${lab} ${L(lang, 'y +2,5', '& over')}`, win: (r: { h: number; a: number }) => f(r) && r.h + r.a > 2.5 },
      { key: `${k}-u`, label: `${lab} ${L(lang, 'y -2,5', '& under')}`, win: (r: { h: number; a: number }) => f(r) && r.h + r.a < 2.5 }]) },
  ];
}

/* ─────────────────────────────── NFL / NBA (normal) ─────────────────────────────── */
const fmtLine = (x: number) => (x > 0 ? `+${x}` : `${x}`).replace('.', ',');
function pointsDefs(ev: SportEvent, lang: Lang): Def<{ h: number; a: number }>[] {
  const m = ev.model as Extract<Model, { kind: 'normal' }>;
  const H = ev.home?.short ?? 'H', A = ev.away?.short ?? 'A';
  const hockey = ev.sport === 'nhl';
  const g = { main: L(lang, 'Principales', 'Main'), spread: L(lang, 'Hándicap', 'Spread'), total: hockey ? L(lang, 'Goles', 'Goals') : L(lang, 'Puntos', 'Points') };
  const half = (x: number) => Math.floor(x) + 0.5; // lines always end in ,5 (no pushes)
  const line = m.line !== undefined && !Number.isInteger(m.line) ? m.line : half(-m.mu);
  const spreads = (hockey ? [-1, 0, 1] : [-6, -3, 0, 3, 6]).map((d) => half(line + d));
  const tl = half(m.ouLine ?? m.total);
  const totals = (ev.sport === 'nba' ? [-10, -5, 0, 5, 10] : hockey ? [-1, 0, 1] : [-7, -3, 0, 3, 7]).map((d) => half(tl + d));
  const band = ev.sport === 'nba' ? [5, 10, 15] : hockey ? [1, 2, 3] : [3, 7, 14];
  return [
    { key: 'ml', group: g.main, name: L(lang, 'Ganador del partido', 'Moneyline'), margin: MARGIN.main, sels: [
      { key: 'h', label: H, win: (r) => (r.h === r.a ? null : r.h > r.a) }, { key: 'a', label: A, win: (r) => (r.h === r.a ? null : r.a > r.h) }] },
    ...spreads.map((x) => ({ key: `sp${x}`, group: g.spread, name: `${L(lang, 'Hándicap', 'Spread')} ${H} ${fmtLine(x)}`, margin: MARGIN.main, sels: [
      { key: 'h', label: `${H} ${fmtLine(x)}`, win: (r: { h: number; a: number }) => r.h + x > r.a }, { key: 'a', label: `${A} ${fmtLine(-x)}`, win: (r: { h: number; a: number }) => r.a - x > r.h }] })),
    ...totals.map((x) => ({ key: `tp${x}`, group: g.total, name: `${L(lang, 'Total de puntos', 'Total points')} ${String(x).replace('.', ',')}`, margin: MARGIN.main, sels: [
      { key: 'over', label: L(lang, `Más de ${String(x).replace('.', ',')}`, `Over ${x}`), win: (r: { h: number; a: number }) => r.h + r.a > x }, { key: 'under', label: L(lang, `Menos de ${String(x).replace('.', ',')}`, `Under ${x}`), win: (r: { h: number; a: number }) => r.h + r.a < x }] })),
    { key: 'band', group: g.spread, name: L(lang, 'Margen de victoria', 'Winning margin'), margin: MARGIN.exotic, sels: [
      { key: 'h1', label: `${H} 1-${band[0]}`, win: (r) => r.h - r.a >= 1 && r.h - r.a <= band[0] },
      { key: 'h2', label: `${H} ${band[0] + 1}-${band[1]}`, win: (r) => r.h - r.a > band[0] && r.h - r.a <= band[1] },
      { key: 'h3', label: `${H} ${band[1] + 1}+`, win: (r) => r.h - r.a > band[1] },
      { key: 'a1', label: `${A} 1-${band[0]}`, win: (r) => r.a - r.h >= 1 && r.a - r.h <= band[0] },
      { key: 'a2', label: `${A} ${band[0] + 1}-${band[1]}`, win: (r) => r.a - r.h > band[0] && r.a - r.h <= band[1] },
      { key: 'a3', label: `${A} ${band[1] + 1}+`, win: (r) => r.a - r.h > band[1] }] },
    { key: 'ht', group: g.total, name: `${L(lang, 'Puntos de', 'Points')} ${H} ${String(half((m.total + m.mu) / 2)).replace('.', ',')}`, margin: MARGIN.main, sels: [
      { key: 'over', label: L(lang, 'Más', 'Over'), win: (r) => r.h > half((m.total + m.mu) / 2) }, { key: 'under', label: L(lang, 'Menos', 'Under'), win: (r) => r.h < half((m.total + m.mu) / 2) }] },
    { key: 'at', group: g.total, name: `${L(lang, 'Puntos de', 'Points')} ${A} ${String(half((m.total - m.mu) / 2)).replace('.', ',')}`, margin: MARGIN.main, sels: [
      { key: 'over', label: L(lang, 'Más', 'Over'), win: (r) => r.a > half((m.total - m.mu) / 2) }, { key: 'under', label: L(lang, 'Menos', 'Under'), win: (r) => r.a < half((m.total - m.mu) / 2) }] },
  ];
}
/** Probability of a predicate under the normal model (grid over margin and total, integer scores). */
function pointsProb(m: Extract<Model, { kind: 'normal' }>, f: Pred<{ h: number; a: number }>): { p: number; pVoid: number } {
  let p = 0, pv = 0, z = 0;
  const step = 1;
  for (let d = Math.round(m.mu - 4 * m.sd); d <= m.mu + 4 * m.sd; d += step) {
    const wd = Math.exp(-((d - m.mu) ** 2) / (2 * m.sd ** 2));
    for (let t = Math.round(m.total - 4 * m.sdTotal); t <= m.total + 4 * m.sdTotal; t += 2) {
      const tt = (t + d) % 2 === 0 ? t : t + 1; // h + a and h − a have the same parity
      const w = wd * Math.exp(-((tt - m.total) ** 2) / (2 * m.sdTotal ** 2));
      const r = { h: (tt + d) / 2, a: (tt - d) / 2 };
      if (r.h < 0 || r.a < 0) continue;
      z += w;
      const won = f(r);
      if (won === null) pv += w;
      else if (won) p += w;
    }
  }
  return { p: p / z, pVoid: pv / z };
}

/* ─────────────────────────────── tennis (sets) ─────────────────────────────── */
/** Probability the first player wins a set, from the match probability (best of 3: p = s²(3 − 2s)). */
export function setProbFromMatch(p: number): number {
  let lo = 0, hi = 1;
  for (let k = 0; k < 60; k++) {
    const s = (lo + hi) / 2;
    if (s * s * (3 - 2 * s) < p) lo = s; else hi = s;
  }
  return (lo + hi) / 2;
}
function tennisOutcomes(s: number): { h: number; a: number; p: number }[] {
  return [{ h: 2, a: 0, p: s * s }, { h: 2, a: 1, p: 2 * s * s * (1 - s) }, { h: 1, a: 2, p: 2 * s * (1 - s) ** 2 }, { h: 0, a: 2, p: (1 - s) ** 2 }];
}
function tennisDefs(ev: SportEvent, lang: Lang): Def<{ h: number; a: number }>[] {
  const H = ev.home?.short ?? '1', A = ev.away?.short ?? '2';
  const g = { main: L(lang, 'Principales', 'Main'), sets: 'Sets' };
  return [
    { key: 'ml', group: g.main, name: L(lang, 'Ganador del partido', 'Match winner'), margin: MARGIN.main, sels: [{ key: 'h', label: H, win: (r) => r.h > r.a }, { key: 'a', label: A, win: (r) => r.a > r.h }] },
    { key: 'ss', group: g.sets, name: L(lang, 'Resultado en sets', 'Set score'), margin: MARGIN.exotic, sels: [
      { key: '2-0', label: `${H} 2-0`, win: (r) => r.h === 2 && r.a === 0 }, { key: '2-1', label: `${H} 2-1`, win: (r) => r.h === 2 && r.a === 1 },
      { key: '1-2', label: `${A} 2-1`, win: (r) => r.h === 1 && r.a === 2 }, { key: '0-2', label: `${A} 2-0`, win: (r) => r.h === 0 && r.a === 2 }] },
    { key: 'ts', group: g.sets, name: L(lang, 'Número de sets', 'Total sets'), margin: MARGIN.main, sels: [{ key: '2', label: L(lang, '2 sets', '2 sets'), win: (r) => r.h + r.a === 2 }, { key: '3', label: L(lang, '3 sets', '3 sets'), win: (r) => r.h + r.a === 3 }] },
    { key: 'hs', group: g.sets, name: `${H} ${L(lang, 'gana al menos un set', 'wins a set')}`, margin: MARGIN.main, sels: [{ key: 'yes', label: L(lang, 'Sí', 'Yes'), win: (r) => r.h >= 1 }, { key: 'no', label: 'No', win: (r) => r.h === 0 }] },
    { key: 'as', group: g.sets, name: `${A} ${L(lang, 'gana al menos un set', 'wins a set')}`, margin: MARGIN.main, sels: [{ key: 'yes', label: L(lang, 'Sí', 'Yes'), win: (r) => r.a >= 1 }, { key: 'no', label: 'No', win: (r) => r.a === 0 }] },
  ];
}

/* ─────────────────────────────── F1 (Plackett–Luce) ─────────────────────────────── */
const hashId = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
/** Chance of finishing in the top k for each entrant (deterministic simulation per event). */
export function raceTopK(w: number[], k: number, seed: number, sims = 20000): number[] {
  const rng = seededRng(seed);
  const hits = new Array(w.length).fill(0);
  const keys = new Array(w.length).fill(0);
  const idx = w.map((_, i) => i);
  for (let s = 0; s < sims; s++) {
    for (let i = 0; i < w.length; i++) keys[i] = -Math.log(Math.max(1e-12, rng.float())) / w[i];
    idx.sort((x, y) => keys[x] - keys[y]);
    for (let j = 0; j < k; j++) hits[idx[j]]++;
  }
  return hits.map((h) => (h + 0.5) / (sims + 1));
}
const raceCache = new Map<string, number[]>();
function raceMarkets(ev: SportEvent, lang: Lang): Market[] {
  const m = ev.model as Extract<Model, { kind: 'race' }>;
  const ents = ev.entrants ?? [];
  const tot = m.w.reduce((a, b) => a + b, 0);
  const top = (k: number) => {
    const key = `${ev.id}:${k}`;
    if (!raceCache.has(key)) raceCache.set(key, raceTopK(m.w, k, hashId(ev.id) + k));
    return raceCache.get(key)!;
  };
  const p3 = top(3), p6 = top(6);
  const g = { main: L(lang, 'Principales', 'Main'), h2h: L(lang, 'Duelos', 'Head to head') };
  const markets: Market[] = [
    { key: 'win', group: g.main, name: L(lang, 'Ganador de la carrera', 'Race winner'), sels: ents.map((e, i) => ({ key: e.id, label: e.name, p: m.w[i] / tot, odds: oddsFrom(m.w[i] / tot, MARGIN.outright) })) },
    { key: 'podium', group: g.main, name: L(lang, 'Termina en el podio', 'Podium finish'), sels: ents.map((e, i) => ({ key: e.id, label: e.name, p: p3[i], odds: oddsFrom(p3[i], MARGIN.exotic) })) },
    { key: 'top6', group: g.main, name: L(lang, 'Termina entre los 6 primeros', 'Top 6 finish'), sels: ents.map((e, i) => ({ key: e.id, label: e.name, p: p6[i], odds: oddsFrom(p6[i], MARGIN.exotic) })) },
  ];
  for (let i = 0; i + 1 < Math.min(ents.length, 12); i += 2) {
    const a = ents[i], b = ents[i + 1];
    const pa = m.w[i] / (m.w[i] + m.w[i + 1]);
    markets.push({ key: `h2h:${a.id}:${b.id}`, group: g.h2h, name: `${a.short} vs ${b.short}`, sels: [
      { key: a.id, label: a.name, p: pa, odds: oddsFrom(pa, MARGIN.main) }, { key: b.id, label: b.name, p: 1 - pa, odds: oddsFrom(1 - pa, MARGIN.main) }] });
  }
  return markets;
}
function settleRace(ev: SportEvent, market: string, sel: string): Outcome {
  const fin = ev.finish ?? [];
  const pos = fin.indexOf(sel);
  if (market.startsWith('h2h:')) {
    const [, a, b] = market.split(':');
    const pa = fin.indexOf(a), pb = fin.indexOf(b);
    if (pa < 0 || pb < 0) return 'void';
    return (sel === a ? pa < pb : pb < pa) ? 'won' : 'lost';
  }
  if (pos < 0) return 'void'; // did not start
  if (market === 'win') return pos === 0 ? 'won' : 'lost';
  if (market === 'podium') return pos < 3 ? 'won' : 'lost';
  if (market === 'top6') return pos < 6 ? 'won' : 'lost';
  return 'void';
}

/* ─────────────────────────────── UFC (one fight, two fighters) ─────────────────────────────── */
function duelDefs(ev: SportEvent, lang: Lang): Def<{ h: number; a: number }>[] {
  const H = ev.home?.short ?? '1', A = ev.away?.short ?? '2';
  // a draw or no contest leaves both at 0 → void (stake back)
  return [{ key: 'ml', group: L(lang, 'Principales', 'Main'), name: L(lang, 'Ganador del combate', 'Fight winner'), margin: MARGIN.main, sels: [
    { key: 'h', label: H, win: (r) => (r.h === r.a ? null : r.h > r.a) }, { key: 'a', label: A, win: (r) => (r.h === r.a ? null : r.a > r.h) }] }];
}

/* ─────────────────────────────── public API ─────────────────────────────── */
function defsFor(ev: SportEvent, lang: Lang): Def<{ h: number; a: number }>[] {
  if (ev.model.kind === 'duel') return duelDefs(ev, lang);
  if (ev.sport === 'soccer') return soccerDefs(ev, lang);
  if (ev.sport === 'tennis') return tennisDefs(ev, lang);
  return pointsDefs(ev, lang);
}
function probOf(ev: SportEvent, f: Pred<{ h: number; a: number }>): number {
  const m = ev.model;
  if (m.kind === 'poisson') {
    const mat = scoreMatrix(m.lh, m.la);
    return sumWhere(mat, (h, a) => f({ h, a }) === true);
  }
  if (m.kind === 'sets') return tennisOutcomes(m.pSet).reduce((s, o) => s + (f(o) ? o.p : 0), 0);
  if (m.kind === 'duel') return (f({ h: 1, a: 0 }) ? m.p : 0) + (f({ h: 0, a: 1 }) ? 1 - m.p : 0);
  if (m.kind === 'normal') {
    const r = pointsProb(m, f);
    return r.p / Math.max(1e-9, 1 - r.pVoid); // a push (void) returns the stake, so price on the other outcomes
  }
  return 0;
}

/** Every market of an event with its selections and fixed odds. */
export function buildMarkets(ev: SportEvent, lang: Lang = 'es'): Market[] {
  if (ev.model.kind === 'race') return raceMarkets(ev, lang);
  return defsFor(ev, lang).map((d) => ({
    key: d.key, group: d.group, name: d.name,
    sels: d.sels.map((s) => {
      const p = probOf(ev, s.win);
      return { key: s.key, label: s.label, p, odds: oddsFrom(p, d.margin) };
    }),
  }));
}

export function findSelection(ev: SportEvent, market: string, sel: string): (Selection & { marketName: string }) | null {
  const m = buildMarkets(ev).find((x) => x.key === market);
  const s = m?.sels.find((x) => x.key === sel);
  return m && s ? { ...s, marketName: m.name } : null;
}

/** How a selection ended (pending until the event is final; void if it was called off). */
export function settleSelection(ev: SportEvent, market: string, sel: string): Outcome {
  if (ev.status === 'void') return 'void';
  if (ev.status !== 'final') return 'pending';
  if (ev.sport === 'f1') return settleRace(ev, market, sel);
  const result = ev.sport === 'tennis' ? ev.sets : ev.score;
  if (!result) return 'void';
  if (ev.sport === 'tennis' && Math.max(result.home, result.away) < 2) return market === 'ml' && ev.score ? (sel === 'h' ? (ev.score.home > ev.score.away ? 'won' : 'lost') : ev.score.away > ev.score.home ? 'won' : 'lost') : 'void';
  const def = defsFor(ev, 'es').find((d) => d.key === market)?.sels.find((s) => s.key === sel);
  if (!def) return 'void';
  const w = def.win({ h: result.home, a: result.away });
  return w === null ? 'void' : w ? 'won' : 'lost';
}

/* ─────────────────────────────── bet slips ─────────────────────────────── */
export const SLIP = { maxSelections: 10, maxStake: 5000, minStake: 10, maxOdds: 1000 };
export interface SlipSel { eventId: string; market: string; sel: string; odds: number; label: string; marketName: string; eventName: string; status?: Outcome }

/** Settles a single or combo: lost if any leg lost; void legs count as odds 1; all void → stake back. */
export function settleSlip(stake: number, legs: SlipSel[]): { status: 'pending' | 'won' | 'lost' | 'void'; payout: number } {
  if (legs.some((l) => l.status === 'lost')) return { status: 'lost', payout: 0 };
  if (legs.some((l) => !l.status || l.status === 'pending')) return { status: 'pending', payout: 0 };
  if (legs.every((l) => l.status === 'void')) return { status: 'void', payout: stake };
  const odds = legs.reduce((o, l) => o * (l.status === 'void' ? 1 : l.odds), 1);
  return { status: 'won', payout: Math.floor(stake * Math.min(odds, SLIP.maxOdds) + 1e-9) };
}

/**
 * Cash out: close a pending bet now for a fixed amount. Fair value = stake × (odds taken ÷ odds now) for the
 * legs still to play, minus a small 3 % fee. Won legs count as settled (odds now = 1), void legs drop out.
 * Only offered while every leg still to play is pre-match and priced (no in-play prices here): returns null
 * otherwise, or if a leg already lost.
 */
export const CASHOUT_FEE = 0.03;
export function cashOutValue(stake: number, legs: (SlipSel & { now?: number | null })[]): number | null {
  if (legs.some((l) => l.status === 'lost')) return null;
  let taken = 1;
  let current = 1;
  for (const l of legs) {
    if (l.status === 'void') continue;
    taken *= l.odds;
    if (l.status === 'won') continue;
    if (!l.now || l.now < 1) return null;
    current *= l.now;
  }
  const value = Math.floor(stake * Math.min(taken, SLIP.maxOdds) / current * (1 - CASHOUT_FEE) + 1e-9);
  return value >= 1 ? value : null;
}

/** Current price of every leg of a bet (null when it cannot be priced: started, finished or missing). */
export function pricedLegs(legs: SlipSel[], find: (id: string) => SportEvent | undefined, now: number): (SlipSel & { now: number | null })[] {
  return legs.map((l) => {
    const ev = find(l.eventId);
    const status = ev ? settleSelection(ev, l.market, l.sel) : l.status ?? 'pending';
    const open = ev && ev.status === 'pre' && new Date(ev.startsAt).getTime() > now;
    return { ...l, status, now: status === 'pending' && open ? findSelection(ev!, l.market, l.sel)?.odds ?? null : null };
  });
}
