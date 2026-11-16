import { randomInt, seededRng, type Rng } from '../rng/rng.ts';

/**
 * Horse racing, hippodrome style.
 *
 * A race card shows 8 runners with everything a punter studies: speed, stamina, acceleration, recent
 * form, running style, the jockey, and which ground and distance each horse likes. The race is then run
 * with a performance model where ALL of those matter, plus luck.
 *
 * The bookmaker sets fixed odds by simulating the race with the horses' numbers, but only prices in half
 * of the ground and distance effect. That is the edge a careful reader can find: a horse that loves heavy
 * ground on a heavy day, over its best trip, may be bigger odds than it should. Everything is decided by the RNG when the race is run,
 * after you bet; the odds you saw are the odds you are paid.
 */

export const GOINGS = ['firm', 'good', 'soft', 'heavy'] as const;
export type Going = (typeof GOINGS)[number];
export const DISTANCES = [1200, 1600, 2000, 2400] as const;
export type Style = 'leader' | 'stalker' | 'closer';
export const RUNNERS = 8;

export interface Horse {
  n: number; // saddle number 1..8
  name: string;
  silks: [string, string];
  jockey: { name: string; skill: number }; // 0..100
  age: number;
  speed: number; // 0..100
  stamina: number;
  accel: number;
  style: Style;
  likesGoing: Going;
  bestDistance: number;
  form: number[]; // last 5 finishes, most recent last
}

export interface RaceCard {
  race: string;
  distance: number;
  going: Going;
  horses: Horse[];
  /** Seed of the bookmaker's simulation (its odds are reproducible from the card). */
  bookSeed: number;
  /** Bookmaker's win probabilities, same order as horses. */
  book: number[];
}

const NAMES = ['Relámpago', 'Viento Sur', 'Duquesa', 'Trueno Azul', 'Bandolera', 'Faraón', 'Estrella Fugaz', 'Centella', 'Marqués', 'Brisa Real', 'Tormenta', 'Gitano', 'Lucero', 'Halcón', 'Perla Negra', 'Capitán', 'Sultana', 'Rayo de Luna', 'Valiente', 'Coronel', 'Mistral', 'Zafiro', 'Pimienta', 'Torero'];
const JOCKEYS = ['M. Ruiz', 'L. Ortega', 'A. Vidal', 'C. Soto', 'J. Navarro', 'P. Gil', 'R. Moreno', 'S. Herrero', 'D. Castro', 'E. Lozano'];
const SILKS: [string, string][] = [['#7B5CFF', '#FFD06B'], ['#FF4FA3', '#FFFFFF'], ['#12C08A', '#231A3A'], ['#FFB938', '#7B5CFF'], ['#3BA7FF', '#FFFFFF'], ['#E8304F', '#FFD06B'], ['#231A3A', '#5BE3B0'], ['#FFFFFF', '#E8304F'], ['#8A2346', '#FFFFFF'], ['#0B6E6E', '#FFB938']];
const RACES = ['Gran Premio Cashino', 'Premio de la Villa', 'Copa de Plata', 'Handicap del Hipódromo', 'Premio Primavera', 'Clásico de Otoño'];

const pick = <T>(rng: Rng, a: readonly T[]) => a[randomInt(rng, a.length)];
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
/** Standard normal from two uniforms (Box–Muller). */
export function gauss(rng: Rng): number {
  const u = Math.max(1e-12, rng.float()), v = rng.float();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Ground fit: +1 on the ground it likes, falling off one step at a time. */
export const goingFit = (h: Horse, going: Going) => 1 - Math.abs(GOINGS.indexOf(h.likesGoing) - GOINGS.indexOf(going)) * 0.75;
/** Distance fit: 1 at its best distance, −0.5 per 400 m away. */
export const distanceFit = (h: Horse, d: number) => 1 - Math.abs(h.bestDistance - d) / 800;

export const GOING_WEIGHT = 2.6;
export const DISTANCE_WEIGHT = 2.2;
/** How much of the ground/distance effect the bookmaker prices in (the rest is the punter's edge). */
export const BOOK_FIT_SHARE = 0.75;

const engine = (h: Horse, distance: number) => {
  const w = (distance - 1200) / 1200; // 0 sprint … 1 marathon
  return h.speed * 0.42 + h.stamina * (0.12 + 0.22 * w) + h.accel * (0.24 - 0.2 * w) + h.jockey.skill * 0.08;
};
/** The true strength of a horse in THIS race (before luck). */
export function strength(h: Horse, card: Pick<RaceCard, 'distance' | 'going'>): number {
  return engine(h, card.distance) + goingFit(h, card.going) * GOING_WEIGHT + distanceFit(h, card.distance) * DISTANCE_WEIGHT;
}
/** The bookmaker's view: the same, but only part of the ground and distance effect. */
export function bookStrength(h: Horse, card: Pick<RaceCard, 'distance' | 'going'>): number {
  return engine(h, card.distance) + BOOK_FIT_SHARE * (goingFit(h, card.going) * GOING_WEIGHT + distanceFit(h, card.distance) * DISTANCE_WEIGHT);
}

/** The bookmaker's simulation of the race: how often each finishing order comes up (deterministic per seed). */
export interface BookTable { sims: number; win: number[]; top3: number[]; exacta: number[][]; trifecta: Map<string, number> }
export const BOOK_SIMS = 20000;
const bookCache = new Map<string, BookTable>();

export function bookTable(card: Pick<RaceCard, 'distance' | 'going' | 'horses' | 'bookSeed'>): BookTable {
  const key = `${card.bookSeed}:${card.distance}:${card.going}:${card.horses.map((h) => h.name).join(',')}`;
  const hit = bookCache.get(key);
  if (hit) return hit;
  const rng = seededRng(card.bookSeed);
  const s = card.horses.map((h) => bookStrength(h, card));
  const n = s.length;
  const win = new Array(n).fill(0), top3 = new Array(n).fill(0);
  const exacta = Array.from({ length: n }, () => new Array(n).fill(0));
  const trifecta = new Map<string, number>();
  const v = new Array(n).fill(0);
  for (let k = 0; k < BOOK_SIMS; k++) {
    for (let i = 0; i < n; i++) v[i] = s[i] + gauss(rng) * LUCK;
    // top three without sorting everything
    let a = -1, b = -1, c = -1;
    for (let i = 0; i < n; i++) {
      if (a < 0 || v[i] > v[a]) { c = b; b = a; a = i; } else if (b < 0 || v[i] > v[b]) { c = b; b = i; } else if (c < 0 || v[i] > v[c]) c = i;
    }
    win[a]++; top3[a]++; top3[b]++; top3[c]++;
    exacta[a][b]++;
    const t = `${a + 1}-${b + 1}-${c + 1}`;
    trifecta.set(t, (trifecta.get(t) ?? 0) + 1);
  }
  const table = { sims: BOOK_SIMS, win, top3, exacta, trifecta };
  if (bookCache.size > 20) bookCache.clear();
  bookCache.set(key, table);
  return table;
}

export const LUCK = 7; // standard deviation of the race-day luck, in strength points

export function makeCard(rng: Rng): RaceCard {
  const distance = pick(rng, DISTANCES);
  const going = pick(rng, GOINGS);
  const names = [...NAMES];
  const horses: Horse[] = [];
  for (let n = 1; n <= RUNNERS; n++) {
    const q = gauss(rng); // overall class
    const name = names.splice(randomInt(rng, names.length), 1)[0];
    const h: Horse = {
      n,
      name,
      silks: SILKS[(n - 1 + randomInt(rng, 3)) % SILKS.length],
      jockey: { name: pick(rng, JOCKEYS), skill: Math.round(clamp(60 + gauss(rng) * 14, 30, 99)) },
      age: 3 + randomInt(rng, 6),
      speed: Math.round(clamp(76 + q * 7 + gauss(rng) * 4, 50, 99)),
      stamina: Math.round(clamp(74 + q * 5 + gauss(rng) * 8, 45, 99)),
      accel: Math.round(clamp(74 + q * 5 + gauss(rng) * 8, 45, 99)),
      style: pick(rng, ['leader', 'stalker', 'closer'] as const),
      likesGoing: pick(rng, GOINGS),
      bestDistance: pick(rng, DISTANCES),
      form: [],
    };
    horses.push(h);
  }
  // Recent form: past races on random ground/distance, run with the same model (so form is informative but noisy).
  for (let k = 0; k < 5; k++) {
    const past = { distance: pick(rng, DISTANCES), going: pick(rng, GOINGS) };
    const order = horses.map((h) => ({ n: h.n, s: strength(h, past) + gauss(rng) * LUCK * 1.3 })).sort((a, b) => b.s - a.s);
    order.forEach((o, i) => horses[o.n - 1].form.push(i + 1));
  }
  const race = pick(rng, RACES);
  const bookSeed = Math.floor(rng.float() * 2 ** 31);
  const t = bookTable({ distance, going, horses, bookSeed });
  return { race, distance, going, horses, bookSeed, book: t.win.map((w) => w / t.sims) };
}

/* ─────────────────────────────── Betting ─────────────────────────────── */

export const BET_TYPES = ['win', 'place', 'quinella', 'exacta', 'trifecta', 'trifectaBox'] as const;
export type BetType = (typeof BET_TYPES)[number];
/** How many horses each bet needs and whether the order matters. */
export const BET_SHAPE: Record<BetType, { picks: number; ordered: boolean }> = {
  win: { picks: 1, ordered: true }, // Ganador
  place: { picks: 1, ordered: false }, // Colocado (top 3)
  quinella: { picks: 2, ordered: false }, // Gemela
  exacta: { picks: 2, ordered: true }, // Gemela exacta (en orden)
  trifecta: { picks: 3, ordered: true }, // Trío (en orden)
  trifectaBox: { picks: 3, ordered: false }, // Trío reversa (cualquier orden)
};
/** Bookmaker margin per bet type (exotic bets keep more, like a real track). */
export const MARGIN: Record<BetType, number> = { win: 0.15, place: 0.18, quinella: 0.2, exacta: 0.2, trifecta: 0.25, trifectaBox: 0.25 };
export const MAX_ODDS = 1500;

export interface HorseBet { type: BetType; horses: number[]; amount: number }

/** Harville: probability that `order` are the first horses home in that exact order, from win probabilities. */
export function orderProb(p: number[], order: number[]): number {
  let prob = 1, rest = 1;
  for (const n of order) {
    const pi = p[n - 1];
    if (rest <= 1e-12) return 0;
    prob *= pi / rest;
    rest -= pi;
  }
  return prob;
}
const perms = (a: number[]): number[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));

/** Bookmaker probability of a bet, from its simulation (rare combinations are smoothed with Harville). */
export function betProb(card: RaceCard, type: BetType, horses: number[]): number {
  const t = bookTable(card);
  const N = t.sims, prior = 30;
  const smooth = (count: number, harv: number) => (count + prior * harv) / (N + prior);
  const p = card.book;
  const h = horses;
  switch (type) {
    case 'win': return t.win[h[0] - 1] / N;
    case 'place': return t.top3[h[0] - 1] / N;
    case 'exacta': return smooth(t.exacta[h[0] - 1][h[1] - 1], orderProb(p, h));
    case 'quinella': return smooth(t.exacta[h[0] - 1][h[1] - 1] + t.exacta[h[1] - 1][h[0] - 1], orderProb(p, [h[0], h[1]]) + orderProb(p, [h[1], h[0]]));
    case 'trifecta': return smooth(t.trifecta.get(h.join('-')) ?? 0, orderProb(p, h));
    case 'trifectaBox': return perms(h).reduce((a, o) => a + smooth(t.trifecta.get(o.join('-')) ?? 0, orderProb(p, o)), 0);
  }
}

/** Fixed decimal odds (stake included) for a bet on this card. */
export function oddsFor(card: RaceCard, type: BetType, horses: number[]): number {
  const prob = betProb(card, type, horses);
  const raw = (1 - MARGIN[type]) / Math.max(prob, 1e-9);
  return clamp(Math.floor(raw * 10) / 10, 1.05, MAX_ODDS);
}

export function validBet(b: HorseBet): boolean {
  const s = BET_SHAPE[b.type];
  return !!s && Array.isArray(b.horses) && b.horses.length === s.picks && new Set(b.horses).size === s.picks && b.horses.every((n) => Number.isInteger(n) && n >= 1 && n <= RUNNERS) && Number.isInteger(b.amount) && b.amount > 0;
}

export function betWins(type: BetType, horses: number[], finish: number[]): boolean {
  const [a, b, c] = finish;
  switch (type) {
    case 'win': return horses[0] === a;
    case 'place': return finish.slice(0, 3).includes(horses[0]);
    case 'quinella': return new Set([a, b]).has(horses[0]) && new Set([a, b]).has(horses[1]);
    case 'exacta': return horses[0] === a && horses[1] === b;
    case 'trifecta': return horses[0] === a && horses[1] === b && horses[2] === c;
    case 'trifectaBox': return [a, b, c].every((x) => horses.includes(x));
  }
}

/* ─────────────────────────────── The race ─────────────────────────────── */

export interface RaceResult {
  /** Saddle numbers in finishing order. */
  finish: number[];
  /** Finishing gap behind the winner in lengths, by saddle number - 1. */
  lengths: number[];
  /** Position (0..1 of the distance) of each horse at 12 checkpoints, for the animation; ends at 1 for all. */
  splits: number[][];
}

export function runRace(rng: Rng, card: RaceCard): RaceResult {
  const perf = card.horses.map((h) => strength(h, card) + gauss(rng) * LUCK);
  const finish = card.horses.map((h) => h.n).sort((x, y) => perf[y - 1] - perf[x - 1]);
  const best = perf[finish[0] - 1];
  const lengths = perf.map((p) => Math.round((best - p) * 0.55 * 10) / 10);
  // Splits: each horse's running shape follows its style (leaders go early, closers come late),
  // with small random surges, then it arrives at its finishing gap. Purely cosmetic: the order is set.
  const CHECK = 12;
  const splits = card.horses.map((h, i) => {
    const shape = h.style === 'leader' ? 1.25 : h.style === 'closer' ? 0.8 : 1;
    const wobble = Array.from({ length: CHECK }, () => gauss(rng) * 0.006);
    const gap = lengths[i] * 0.0035; // how far behind at the line, as a share of the track
    return Array.from({ length: CHECK }, (_, k) => {
      const t = (k + 1) / CHECK;
      const base = Math.pow(t, 1 / shape) * (1 - gap * t) + wobble[k] * Math.sin(Math.PI * t);
      return k === CHECK - 1 ? 1 - gap : clamp(base, 0, 1);
    });
  });
  return { finish, lengths, splits };
}

export interface SettledLine { bet: HorseBet; odds: number; won: boolean; returned: number }
export function settleBets(card: RaceCard, finish: number[], bets: HorseBet[]): { lines: SettledLine[]; totalBet: number; payout: number } {
  const lines = bets.map((bet) => {
    const odds = oddsFor(card, bet.type, bet.horses);
    const won = betWins(bet.type, bet.horses, finish);
    return { bet, odds, won, returned: won ? Math.floor(bet.amount * odds + 1e-9) : 0 };
  });
  return { lines, totalBet: bets.reduce((a, b) => a + b.amount, 0), payout: lines.reduce((a, l) => a + l.returned, 0) };
}
