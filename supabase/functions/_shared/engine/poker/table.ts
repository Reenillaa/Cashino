import { shuffle, type Rng } from '../rng/rng.ts';
import { newDeck, type Card } from '../cards/cards.ts';
import { evaluate, type HandCategory } from './evaluator.ts';

/**
 * No-Limit Texas Hold'em engine (pure, immutable-style transitions).
 * Formats: cash tables (2–6 seats) and single-table Sit & Go tournaments with blind levels.
 * Rules implemented: button/blinds rotation, heads-up blind rule, min-raise = last full raise,
 * incomplete all-in raises do not reopen betting, side pots, uncalled bets returned, split pots with
 * odd chips to the first winner left of the button, run-out when action is closed.
 */
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PokerActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise';
export interface PokerAction {
  type: PokerActionType;
  /** For bet/raise: total amount the player's bet will be on this street ("raise to"). */
  amount?: number;
}

export interface SeatInfo {
  id: string;
  name: string;
  isBot: boolean;
  botProfile?: string;
  stack: number;
  sittingOut: boolean;
  avatar?: string;
}

export interface HandPlayer {
  seat: number;
  id: string;
  hole: Card[];
  bet: number;
  committed: number;
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  lastActedRaise: number;
}

export interface LogEntry {
  seat: number;
  street: Street;
  type: PokerActionType | 'sb' | 'bb' | 'ante';
  amount: number;
}

export interface PotResult {
  amount: number;
  winners: number[];
  eligible: number[];
}

export interface ShowdownInfo {
  seat: number;
  hole: Card[];
  category: HandCategory;
  best: Card[];
  score: number;
}

export interface HandState {
  number: number;
  button: number;
  sb: number;
  bb: number;
  deck: Card[];
  board: Card[];
  street: Street;
  players: HandPlayer[];
  toAct: number | null;
  currentBet: number;
  minRaise: number;
  fullRaises: number;
  log: LogEntry[];
  complete: boolean;
  pots?: PotResult[];
  winnings?: Record<number, number>;
  showdown?: ShowdownInfo[];
}

export interface BlindLevel {
  sb: number;
  bb: number;
  ante: number;
}

export interface TableConfig {
  maxSeats: number;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  /** Tournament mode: blinds increase every `handsPerLevel` hands, no rebuys, eliminated players finish. */
  tournament?: { levels: BlindLevel[]; handsPerLevel: number };
}

export interface TableState {
  config: TableConfig;
  seats: (SeatInfo | null)[];
  button: number;
  hand: HandState | null;
  handsPlayed: number;
  /** Tournament: seat ids in elimination order (first eliminated first). */
  eliminated: string[];
  version: number;
}

export function createTable(config: TableConfig): TableState {
  if (config.maxSeats < 2 || config.maxSeats > 9) throw new Error('2–9 seats');
  return { config, seats: Array(config.maxSeats).fill(null), button: -1, hand: null, handsPlayed: 0, eliminated: [], version: 0 };
}

export function sitDown(t: TableState, seat: number, info: SeatInfo): TableState {
  if (t.seats[seat]) throw new Error('Seat taken');
  if (t.seats.some((s) => s?.id === info.id)) throw new Error('Already seated');
  const seats = [...t.seats];
  seats[seat] = { ...info };
  return { ...t, seats, version: t.version + 1 };
}

export function standUp(t: TableState, seat: number): TableState {
  if (t.hand && !t.hand.complete && t.hand.players.some((p) => p.seat === seat && !p.folded)) throw new Error('Finish or fold the hand first');
  const seats = [...t.seats];
  seats[seat] = null;
  return { ...t, seats, version: t.version + 1 };
}

export function currentBlinds(t: TableState): BlindLevel {
  const tour = t.config.tournament;
  if (!tour) return { sb: t.config.smallBlind, bb: t.config.bigBlind, ante: t.config.ante ?? 0 };
  const lvl = Math.min(tour.levels.length - 1, Math.floor(t.handsPlayed / tour.handsPerLevel));
  return tour.levels[lvl];
}

const nextSeat = (t: TableState, from: number, pred: (i: number) => boolean): number => {
  const n = t.seats.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k + n) % n;
    if (pred(i)) return i;
  }
  return -1;
};

export function eligibleSeats(t: TableState): number[] {
  return t.seats.map((s, i) => (s && !s.sittingOut && s.stack > 0 ? i : -1)).filter((i) => i >= 0);
}

export function canStartHand(t: TableState): boolean {
  return (!t.hand || t.hand.complete) && eligibleSeats(t).length >= 2;
}

export function startHand(t: TableState, rng: Rng): TableState {
  if (!canStartHand(t)) throw new Error('Cannot start hand');
  const eligible = new Set(eligibleSeats(t));
  const seats = t.seats.map((s) => (s ? { ...s } : null));
  const isIn = (i: number) => eligible.has(i);
  const button = nextSeat(t, t.button, isIn);
  const headsUp = eligible.size === 2;
  const sb = headsUp ? button : nextSeat(t, button, isIn);
  const bb = nextSeat(t, sb, isIn);
  const { sb: sbAmt, bb: bbAmt, ante } = currentBlinds(t);
  const deck = shuffle(rng, newDeck());
  const order: number[] = [];
  for (let i = nextSeat(t, button, isIn), k = 0; k < eligible.size; k++, i = nextSeat(t, i, isIn)) order.push(i);
  const players: HandPlayer[] = [...eligible].sort((a, b) => a - b).map((seat) => ({
    seat, id: seats[seat]!.id, hole: [], bet: 0, committed: 0, folded: false, allIn: false, acted: false, lastActedRaise: -1,
  }));
  const P = (seat: number) => players.find((p) => p.seat === seat)!;
  let cursor = 0;
  for (let r = 0; r < 2; r++) for (const s of order) P(s).hole.push(deck[cursor++]);
  const hand: HandState = {
    number: t.handsPlayed + 1, button, sb, bb, deck: deck.slice(cursor), board: [], street: 'preflop', players,
    toAct: null, currentBet: 0, minRaise: bbAmt, fullRaises: 0, log: [], complete: false,
  };
  const post = (seat: number, amt: number, type: LogEntry['type'], asBet: boolean) => {
    const s = seats[seat]!;
    const p = P(seat);
    const a = Math.min(amt, s.stack);
    s.stack -= a;
    p.committed += a;
    if (asBet) p.bet += a;
    if (s.stack === 0) p.allIn = true;
    hand.log.push({ seat, street: 'preflop', type, amount: a });
  };
  if (ante > 0) for (const s of order) post(s, ante, 'ante', false);
  post(sb, sbAmt, 'sb', true);
  post(bb, bbAmt, 'bb', true);
  hand.currentBet = Math.max(...players.map((p) => p.bet));
  const first = nextSeat(t, bb, (i) => eligible.has(i));
  const next: TableState = { ...t, seats, button, hand, version: t.version + 1 };
  hand.toAct = findNextToAct(next, first, true);
  return resolveIfClosed(next);
}

const pending = (h: HandState, p: HandPlayer) => !p.folded && !p.allIn && (!p.acted || p.bet < h.currentBet);

function findNextToAct(t: TableState, from: number, inclusive: boolean): number | null {
  const h = t.hand!;
  const n = t.seats.length;
  for (let k = inclusive ? 0 : 1; k <= n; k++) {
    const seat = (from + k) % n;
    const p = h.players.find((x) => x.seat === seat);
    if (p && pending(h, p)) return seat;
  }
  return null;
}

export interface LegalActions {
  seat: number;
  canFold: boolean;
  canCheck: boolean;
  callAmount: number; // additional chips needed to call (0 if check)
  canBet: boolean;
  canRaise: boolean;
  /** Raise-to bounds (total street bet). */
  minRaiseTo: number;
  maxRaiseTo: number;
}

export function legalActions(t: TableState): LegalActions | null {
  const h = t.hand;
  if (!h || h.complete || h.toAct === null) return null;
  const p = h.players.find((x) => x.seat === h.toAct)!;
  const stack = t.seats[p.seat]!.stack;
  const toCall = Math.min(h.currentBet - p.bet, stack);
  const maxTo = p.bet + stack;
  const othersCanAct = h.players.some((o) => o.seat !== p.seat && !o.folded && !o.allIn);
  const reopened = p.lastActedRaise < h.fullRaises || !p.acted;
  const canAggress = stack > toCall && othersCanAct && reopened;
  const minTo = Math.min(maxTo, h.currentBet === 0 ? currentBlinds(t).bb : h.currentBet + h.minRaise);
  return {
    seat: p.seat,
    canFold: toCall > 0,
    canCheck: toCall === 0,
    callAmount: toCall,
    canBet: canAggress && h.currentBet === 0,
    canRaise: canAggress && h.currentBet > 0,
    minRaiseTo: minTo,
    maxRaiseTo: maxTo,
  };
}

export function act(t: TableState, seat: number, action: PokerAction): TableState {
  const h0 = t.hand;
  if (!h0 || h0.complete) throw new Error('No active hand');
  if (h0.toAct !== seat) throw new Error('Not your turn');
  const legal = legalActions(t)!;
  const seats = t.seats.map((s) => (s ? { ...s } : null));
  const h: HandState = { ...h0, players: h0.players.map((p) => ({ ...p, hole: [...p.hole] })), log: [...h0.log], board: [...h0.board] };
  const p = h.players.find((x) => x.seat === seat)!;
  const s = seats[seat]!;
  const put = (amt: number) => {
    s.stack -= amt;
    p.bet += amt;
    p.committed += amt;
    if (s.stack === 0) p.allIn = true;
  };
  switch (action.type) {
    case 'fold':
      if (!legal.canFold) throw new Error('Cannot fold when you can check');
      p.folded = true;
      h.log.push({ seat, street: h.street, type: 'fold', amount: 0 });
      break;
    case 'check':
      if (!legal.canCheck) throw new Error('Cannot check');
      h.log.push({ seat, street: h.street, type: 'check', amount: 0 });
      break;
    case 'call':
      if (legal.callAmount <= 0) throw new Error('Nothing to call');
      put(legal.callAmount);
      h.log.push({ seat, street: h.street, type: 'call', amount: legal.callAmount });
      break;
    case 'bet':
    case 'raise': {
      if (action.type === 'bet' ? !legal.canBet : !legal.canRaise) throw new Error(`Cannot ${action.type}`);
      const to = Math.floor(action.amount ?? 0);
      if (to > legal.maxRaiseTo || (to < legal.minRaiseTo && to !== legal.maxRaiseTo)) {
        throw new Error(`Raise must be between ${legal.minRaiseTo} and ${legal.maxRaiseTo}`);
      }
      const raiseSize = to - h.currentBet;
      put(to - p.bet);
      if (raiseSize >= h.minRaise) {
        h.minRaise = raiseSize;
        h.fullRaises += 1;
      }
      h.currentBet = Math.max(h.currentBet, to);
      h.log.push({ seat, street: h.street, type: action.type, amount: to });
      break;
    }
  }
  p.acted = true;
  p.lastActedRaise = h.fullRaises;
  const next: TableState = { ...t, seats, hand: h, version: t.version + 1 };
  h.toAct = findNextToAct(next, seat, false);
  return resolveIfClosed(next);
}

/** Advances streets / finishes the hand when no one needs to act. */
function resolveIfClosed(t: TableState): TableState {
  let state = t;
  for (;;) {
    const h = state.hand!;
    const live = h.players.filter((p) => !p.folded);
    if (live.length === 1) return finishHand(state);
    if (h.toAct !== null) return state;
    // Street over → collect & deal next street.
    const canAct = live.filter((p) => !p.allIn);
    const nextStreet: Record<Street, Street> = { preflop: 'flop', flop: 'turn', turn: 'river', river: 'showdown', showdown: 'showdown' };
    const ns = nextStreet[h.street];
    if (ns === 'showdown') return finishHand(state);
    const deck = [...h.deck];
    deck.shift(); // burn
    const n = ns === 'flop' ? 3 : 1;
    const board = [...h.board, ...deck.splice(0, n)];
    const players = h.players.map((p) => ({ ...p, bet: 0, acted: false, lastActedRaise: -1 }));
    const nh: HandState = { ...h, deck, board, street: ns, players, currentBet: 0, minRaise: currentBlinds(state).bb, fullRaises: 0 };
    state = { ...state, hand: nh };
    // If at most one player can still act, betting is closed: run the board out.
    nh.toAct = canAct.length >= 2 ? findNextToAct(state, nextSeat(state, h.button, () => true), true) : null;
  }
}

/** Builds main/side pots from total commitments. Folded chips stay in the pots they reached. */
export function buildPots(players: HandPlayer[]): PotResult[] {
  const levels = [...new Set(players.filter((p) => p.committed > 0).map((p) => p.committed))].sort((a, b) => a - b);
  const pots: PotResult[] = [];
  let prev = 0;
  for (const lvl of levels) {
    const contributors = players.filter((p) => p.committed >= lvl);
    const amount = contributors.length * (lvl - prev) + players.filter((p) => p.committed > prev && p.committed < lvl).reduce((s, p) => s + (p.committed - prev), 0);
    const eligible = contributors.filter((p) => !p.folded).map((p) => p.seat);
    if (amount > 0) {
      const last = pots[pots.length - 1];
      if (last && last.eligible.join() === eligible.join()) last.amount += amount;
      else pots.push({ amount, eligible, winners: [] });
    }
    prev = lvl;
  }
  return pots;
}

function finishHand(t: TableState): TableState {
  const h0 = t.hand!;
  const seats = t.seats.map((s) => (s ? { ...s } : null));
  let board = [...h0.board];
  const deck = [...h0.deck];
  const live = h0.players.filter((p) => !p.folded);
  // Run out the board for an all-in showdown.
  if (live.length > 1) {
    while (board.length < 5) {
      deck.shift();
      board = [...board, ...deck.splice(0, board.length === 0 ? 3 : 1)];
    }
  }
  const pots = buildPots(h0.players);
  const winnings: Record<number, number> = {};
  const evals = new Map<number, ShowdownInfo>();
  if (live.length > 1) {
    for (const p of live) {
      const r = evaluate([...p.hole, ...board]);
      evals.set(p.seat, { seat: p.seat, hole: p.hole, category: r.category, best: r.best, score: r.score });
    }
  }
  const n = t.seats.length;
  const leftOfButton = (seats: number[]) => [...seats].sort((a, b) => ((a - h0.button - 1 + n) % n) - ((b - h0.button - 1 + n) % n));
  for (const pot of pots) {
    let winners: number[];
    if (pot.eligible.length === 1) winners = pot.eligible;
    else if (live.length === 1) winners = [live[0].seat];
    else {
      const best = Math.max(...pot.eligible.map((s) => evals.get(s)!.score));
      winners = pot.eligible.filter((s) => evals.get(s)!.score === best);
    }
    winners = leftOfButton(winners);
    pot.winners = winners;
    const share = Math.floor(pot.amount / winners.length);
    let odd = pot.amount - share * winners.length;
    for (const w of winners) {
      const amt = share + (odd > 0 ? 1 : 0);
      if (odd > 0) odd--;
      winnings[w] = (winnings[w] ?? 0) + amt;
    }
  }
  for (const [seat, amt] of Object.entries(winnings)) seats[Number(seat)]!.stack += amt;
  // Tournament eliminations (busted players, ordered by smaller starting stack first).
  const eliminated = [...t.eliminated];
  if (t.config.tournament) {
    const busted = h0.players
      .filter((p) => seats[p.seat]!.stack === 0)
      .sort((a, b) => a.committed - b.committed);
    for (const b of busted) {
      eliminated.push(b.id);
      seats[b.seat] = { ...seats[b.seat]!, sittingOut: true };
    }
  }
  const hand: HandState = {
    ...h0, board, deck, toAct: null, complete: true, street: live.length > 1 ? 'showdown' : h0.street, pots, winnings,
    showdown: live.length > 1 ? [...evals.values()] : undefined,
  };
  return { ...t, seats, hand, handsPlayed: t.handsPlayed + 1, eliminated, version: t.version + 1 };
}

export function potTotal(h: HandState): number {
  return h.players.reduce((s, p) => s + p.committed, 0);
}

/** Tournament finished when one player has chips. */
export function tournamentWinner(t: TableState): SeatInfo | null {
  if (!t.config.tournament) return null;
  const alive = t.seats.filter((s) => s && s.stack > 0);
  return alive.length === 1 ? alive[0]! : null;
}

/** Sanitised view for a given viewer: hides other players' hole cards until showdown, and the deck. */
export function viewFor(t: TableState, viewerId: string | null) {
  const h = t.hand;
  return {
    ...t,
    hand: h
      ? {
          ...h,
          deck: [] as Card[],
          players: h.players.map((p) => ({
            ...p,
            hole: p.id === viewerId || (h.complete && h.showdown?.some((s) => s.seat === p.seat)) ? p.hole : [],
          })),
        }
      : null,
  };
}

export const DEFAULT_SNG_LEVELS: BlindLevel[] = [
  { sb: 10, bb: 20, ante: 0 }, { sb: 15, bb: 30, ante: 0 }, { sb: 25, bb: 50, ante: 5 }, { sb: 50, bb: 100, ante: 10 },
  { sb: 75, bb: 150, ante: 15 }, { sb: 100, bb: 200, ante: 25 }, { sb: 150, bb: 300, ante: 30 }, { sb: 200, bb: 400, ante: 50 },
  { sb: 300, bb: 600, ante: 75 }, { sb: 500, bb: 1000, ante: 100 },
];
