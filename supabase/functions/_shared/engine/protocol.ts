/**
 * Game protocol: one pure handler per game that turns (hidden state, operation, params) into a new
 * state, a public view and the coin movements to apply. The SAME code runs:
 *  - in the app for guest/offline and practice play (local wallet), and
 *  - in the Edge Function for account play (server wallet, server RNG, persisted hidden state).
 * Clients never send results — only operations and parameters, which are validated here.
 */
import type { Rng } from './rng/rng.ts';
import { type GameId } from './games/types.ts';
import * as Crash from './games/crash.ts';
import * as Limbo from './games/limbo.ts';
import * as Dice from './games/dice.ts';
import * as Coin from './games/coinflip.ts';
import * as Mines from './games/mines.ts';
import * as Plinko from './games/plinko.ts';
import * as Keno from './games/keno.ts';
import * as Crossing from './games/crossing.ts';
import * as Hilo from './games/hilo.ts';
import * as Roulette from './games/roulette.ts';
import * as Bac from './games/baccarat.ts';
import * as SicBo from './games/sicbo.ts';
import * as BJ from './games/blackjack.ts';
import * as Slots from './games/slots.ts';
import * as Trader from './games/trader.ts';
import { cardCode } from './cards/cards.ts';
import { roomById, stakeAllowed } from './meta/rooms.ts';

export const MAX_BET = 1_000_000;

export interface OpContext {
  rng: Rng;
  /** Clock of the party that owns the wallet (server time online). */
  now: number;
}

export interface OpResult {
  /** Full state to keep for the next operation (may contain hidden information). null when finished. */
  state: unknown | null;
  /** What the player may see. */
  view: Record<string, unknown>;
  /** Coins to take from the wallet before applying this result. */
  stake: number;
  /** Coins to give back (stake included) once the round settles. */
  payout: number;
  done: boolean;
  summary?: { bet: number; payout: number; detail: string; multiStep: boolean };
}

export class ProtocolError extends Error {}
const fail = (m: string): never => {
  throw new ProtocolError(m);
};

const bet = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > MAX_BET) fail('invalid_bet');
  return v as number;
};
const num = (v: unknown, name: string): number => (typeof v === 'number' && Number.isFinite(v) ? v : fail(`invalid_${name}`));
const oneOf = <T extends string>(v: unknown, opts: readonly T[], name: string): T => (opts.includes(v as T) ? (v as T) : fail(`invalid_${name}`));

const single = (b: number, payout: number, detail: string, view: Record<string, unknown>): OpResult => ({
  state: null,
  view: { ...view, bet: b, payout },
  stake: b,
  payout,
  done: true,
  summary: { bet: b, payout, detail, multiStep: false },
});

type Params = Record<string, unknown>;
type Handler = (state: unknown, op: string, p: Params, ctx: OpContext) => OpResult;

const guard = <T>(fn: () => T): T => {
  try {
    return fn();
  } catch (e) {
    if (e instanceof ProtocolError) throw e;
    throw new ProtocolError(e instanceof Error ? e.message : 'invalid');
  }
};

const handlers: Record<Exclude<GameId, 'poker'>, Handler> = {
  dice: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = guard(() => Dice.playDice(rng, b, oneOf(p.mode, ['over', 'under'] as const, 'mode'), num(p.target, 'target')));
    return single(b, r.payout, `${r.roll.toFixed(2)}`, { roll: r.roll, won: r.won, chance: r.chance, multiplier: Dice.diceMultiplier(p.mode as Dice.DiceMode, p.target as number) });
  },
  slots: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = Slots.playSlots(rng, b);
    return single(b, r.payout, r.line.map((x) => ({ cherry: '🍒', lemon: '🍋', bell: '🔔', bar: 'BAR', seven: '7', diamond: '💎' })[x]).join(' '), { line: r.line, multiplier: r.multiplier });
  },
  trader: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = guard(() => Trader.playTrader(rng, b, oneOf(p.side, ['up', 'down'] as const, 'side')));
    return single(b, r.payout, `${r.side === 'up' ? '▲' : '▼'} ${r.path[r.path.length - 1].toFixed(2)}`, { path: r.path, side: r.side, won: r.won });
  },
  limbo: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = guard(() => Limbo.playLimbo(rng, b, num(p.target, 'target')));
    return single(b, r.payout, `${r.result.toFixed(2)}×`, { result: r.result, won: r.won, target: r.target });
  },
  plinko: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const risk = oneOf(p.risk, ['low', 'medium', 'high'] as const, 'risk');
    const r = guard(() => Plinko.playPlinko(rng, b, num(p.rows, 'rows'), risk));
    return single(b, r.payout, `${r.tableMultiplier}×`, { path: r.path, bin: r.bin, multiplier: r.tableMultiplier });
  },
  keno: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const picks = Array.isArray(p.picks) ? (p.picks as number[]) : fail('invalid_picks');
    const r = guard(() => Keno.playKeno(rng, b, picks, oneOf(p.risk, ['low', 'medium', 'high'] as const, 'risk')));
    return single(b, r.payout, `${r.hits.length}/${r.picks.length}`, { drawn: r.drawn, hits: r.hits, picks: r.picks });
  },
  roulette: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const bets = Array.isArray(p.bets) ? (p.bets as Roulette.PlacedBet[]) : fail('invalid_bets');
    if (bets.length === 0 || bets.length > 60) fail('invalid_bets');
    bets.forEach((x) => bet(x.amount));
    const o = guard(() => Roulette.playRoulette(rng, bets));
    if (o.totalBet > MAX_BET) fail('invalid_bet');
    return single(o.totalBet, o.payout, `${o.number}`, { number: o.number, color: o.color, winning: o.winning.map((w) => Roulette.betKey(w.bet)) });
  },
  sicbo: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const bets = Array.isArray(p.bets) ? (p.bets as SicBo.SicBoPlaced[]) : fail('invalid_bets');
    if (bets.length === 0 || bets.length > 60) fail('invalid_bets');
    bets.forEach((x) => bet(x.amount));
    const r = guard(() => SicBo.playSicBo(rng, bets));
    if (r.totalBet > MAX_BET) fail('invalid_bet');
    return single(r.totalBet, r.payout, r.dice.join('-'), { dice: r.dice, lines: r.lines.map((l) => ({ key: SicBo.sicBoKey(l.bet), returned: l.returned })) });
  },
  baccarat: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const bets = (p.bets ?? {}) as Bac.BaccaratBets;
    for (const [k, v] of Object.entries(bets)) {
      oneOf(k, ['player', 'banker', 'tie', 'playerPair', 'bankerPair'] as const, 'bet_kind');
      bet(v);
    }
    const r = guard(() => Bac.playBaccarat(rng, bets));
    if (r.totalBet <= 0) fail('invalid_bet');
    return single(r.totalBet, r.payout, `${r.coup.playerTotal}–${r.coup.bankerTotal}`, {
      player: r.coup.player.map(cardCode), banker: r.coup.banker.map(cardCode), playerTotal: r.coup.playerTotal, bankerTotal: r.coup.bankerTotal,
      winner: r.coup.winner, order: r.coup.order, results: r.results,
    });
  },
  coinflip: (s, op, p, { rng }) => {
    const st = s as Coin.CoinflipState | null;
    if (op === 'start') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      const ns = Coin.startCoinflip(b);
      return { state: ns, view: { ...ns }, stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'call') {
      const ns = guard(() => Coin.callFlip(st!, oneOf(p.side, ['heads', 'tails'] as const, 'side'), rng));
      const done = ns.status === 'lost';
      return { state: done ? null : ns, view: { ...ns, multiplier: Coin.streakMultiplier(ns.wins) }, stake: 0, payout: 0, done, summary: done ? { bet: ns.bet, payout: 0, detail: `${ns.wins}`, multiStep: true } : undefined };
    }
    if (op === 'cashout') {
      const r = guard(() => Coin.cashoutCoinflip(st!));
      return { state: null, view: { ...r }, stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${r.wins}×✓`, multiStep: true } };
    }
    return fail('invalid_op');
  },
  mines: (s, op, p, { rng }) => {
    const st = s as Mines.MinesState | null;
    const view = (x: Mines.MinesState) => ({ ...Mines.publicMines(x), multiplier: Mines.currentMultiplier(x), next: Mines.minesMultiplier(x.mines, x.revealed.length + 1) });
    if (op === 'start') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      const ns = guard(() => Mines.startMines(rng, b, num(p.mines, 'mines')));
      return { state: ns, view: view(ns), stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'reveal') {
      const ns = guard(() => Mines.revealTile(st!, num(p.tile, 'tile')));
      if (ns.status === 'lost') return { state: null, view: view(ns), stake: 0, payout: 0, done: true, summary: { bet: ns.bet, payout: 0, detail: '💥', multiStep: true } };
      if (ns.status === 'cashed') {
        const r = guard(() => Mines.cashoutMines({ ...ns, status: 'active' }));
        return { state: null, view: view(r), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${Mines.currentMultiplier(r)}×`, multiStep: true } };
      }
      return { state: ns, view: view(ns), stake: 0, payout: 0, done: false };
    }
    if (op === 'cashout') {
      const r = guard(() => Mines.cashoutMines(st!));
      return { state: null, view: view(r), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${Mines.currentMultiplier(r)}×`, multiStep: true } };
    }
    return fail('invalid_op');
  },
  crossing: (s, op, p, { rng }) => {
    const st = s as Crossing.CrossingState | null;
    const view = (x: Crossing.CrossingState) => ({ ...Crossing.publicCrossing(x), multiplier: Crossing.crossingMultiplier(x.difficulty, x.lane), next: Crossing.crossingMultiplier(x.difficulty, x.lane + 1) });
    if (op === 'start') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      const ns = Crossing.startCrossing(rng, b, oneOf(p.difficulty, ['easy', 'medium', 'hard', 'extreme'] as const, 'difficulty'));
      return { state: ns, view: view(ns), stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'advance') {
      const ns = guard(() => Crossing.advance(st!));
      if (ns.status === 'lost') return { state: null, view: view(ns), stake: 0, payout: 0, done: true, summary: { bet: ns.bet, payout: 0, detail: `${ns.lane}`, multiStep: true } };
      if (ns.status === 'cashed') {
        const r = guard(() => Crossing.cashoutCrossing({ ...ns, status: 'active' }));
        return { state: null, view: view(r), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${r.lane}`, multiStep: true } };
      }
      return { state: ns, view: view(ns), stake: 0, payout: 0, done: false };
    }
    if (op === 'cashout') {
      const r = guard(() => Crossing.cashoutCrossing(st!));
      return { state: null, view: view(r), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${r.lane}`, multiStep: true } };
    }
    return fail('invalid_op');
  },
  hilo: (s, op, p, { rng }) => {
    const st = s as Hilo.HiloState | null;
    const view = (x: Hilo.HiloState) => ({ ...x, current: cardCode(x.current), steps: x.steps.map((k) => ({ ...k, card: cardCode(k.card) })), multiplier: Hilo.hiloMultiplier(x) });
    if (op === 'start') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      const ns = Hilo.startHilo(rng, b);
      return { state: ns, view: view(ns), stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'guess') {
      const ns = guard(() => Hilo.guess(st!, oneOf(p.guess, ['higher', 'lower', 'higherOrSame', 'lowerOrSame', 'same'] as const, 'guess'), rng));
      const done = ns.status === 'lost';
      return { state: done ? null : ns, view: view(ns), stake: 0, payout: 0, done, summary: done ? { bet: ns.bet, payout: 0, detail: '✗', multiStep: true } : undefined };
    }
    if (op === 'skip') {
      const ns = guard(() => Hilo.skip(st!, rng));
      return { state: ns, view: view(ns), stake: 0, payout: 0, done: false };
    }
    if (op === 'cashout') {
      const r = guard(() => Hilo.cashoutHilo(st!));
      return { state: null, view: view(r), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${Hilo.hiloMultiplier(r)}×`, multiStep: true } };
    }
    return fail('invalid_op');
  },
  blackjack: (s, op, p, { rng }) => {
    const st = s as BJ.BJState | null;
    const view = (x: BJ.BJState) => {
      const v = BJ.publicBlackjack(x);
      return { ...v, dealer: v.dealer.map(cardCode), hands: v.hands.map((h) => ({ ...h, cards: h.cards.map(cardCode) })), legal: BJ.legalActions(x) };
    };
    const finish = (x: BJ.BJState, stake: number): OpResult => ({
      state: null, view: view(x), stake, payout: x.payout, done: true,
      summary: { bet: x.totalBet, payout: x.payout, detail: `${BJ.handValue(x.hands[0].cards).total} vs ${BJ.handValue(x.dealer).total}`, multiStep: true },
    });
    if (op === 'deal') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      if (b <= 0) fail('invalid_bet');
      const ns = BJ.dealBlackjack(rng, b);
      return ns.phase === 'settled' ? finish(ns, b) : { state: ns, view: view(ns), stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'action') {
      const a = oneOf(p.action, ['hit', 'stand', 'double', 'split'] as const, 'action');
      const extra = BJ.legalActions(st!).includes(a) ? BJ.extraStake(st!, a) : 0;
      const ns = guard(() => BJ.act(st!, a));
      return ns.phase === 'settled' ? finish(ns, extra) : { state: ns, view: view(ns), stake: extra, payout: 0, done: false };
    }
    return fail('invalid_op');
  },
  crash: (s, op, p, { rng, now }) => {
    type CS = { bet: number; crash: number; startedAt: number; auto: number | null };
    const st = s as CS | null;
    if (op === 'start') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      const auto = p.autoCashout == null ? null : Math.max(Crash.MIN_CASHOUT, Math.min(Crash.CRASH_MAX, num(p.autoCashout, 'auto')));
      const ns: CS = { bet: b, crash: Crash.crashPoint(rng), startedAt: now, auto };
      return { state: ns, view: { bet: b, startedAt: now, auto }, stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    const elapsed = now - st!.startedAt;
    const current = Math.floor(Crash.multiplierAt(elapsed) * 100) / 100;
    const crashedNow = current >= st!.crash;
    const close = (cashout: number | null): OpResult => {
      const r = Crash.settleCrash(st!.bet, st!.crash, cashout);
      return {
        state: null, view: { crash: st!.crash, cashout: r.won ? cashout : null, won: r.won, startedAt: st!.startedAt }, stake: 0, payout: r.payout, done: true,
        summary: { bet: st!.bet, payout: r.payout, detail: `${st!.crash.toFixed(2)}×`, multiStep: true },
      };
    };
    // Auto cash-out always applies first when the target is below the crash point.
    if (st!.auto !== null && st!.auto <= st!.crash && (crashedNow || current >= st!.auto || op === 'settle')) return close(st!.auto);
    if (op === 'cashout') return close(crashedNow ? null : Math.max(Crash.MIN_CASHOUT, current));
    if (op === 'settle') {
      if (!crashedNow) return { state: st, view: { pending: true, startedAt: st!.startedAt }, stake: 0, payout: 0, done: false };
      return close(null);
    }
    return fail('invalid_op');
  },
};

const STARTING_OPS = new Set(['play', 'start', 'deal']);

export function runOp(game: GameId, state: unknown, op: string, params: Params, ctx: OpContext): OpResult {
  if (game === 'poker') fail('use_poker_service');
  const h = handlers[game as Exclude<GameId, 'poker'>];
  if (!h) fail('unknown_game');
  const res = h(state, op, params ?? {}, ctx);
  // Room limits apply to the stake that opens a round (doubles/splits in blackjack are extra stakes).
  if (STARTING_OPS.has(op) && params?.room !== undefined) {
    const room = roomById(params.room);
    if (!room) fail('invalid_room');
    if (!stakeAllowed(room!, res.stake)) fail('stake_outside_room');
  }
  return res;
}

export const MULTI_STEP: GameId[] = ['coinflip', 'mines', 'crossing', 'hilo', 'blackjack', 'crash'];
