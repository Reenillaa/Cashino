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
import * as Angler from './games/angler.ts';
import * as Penguin from './games/penguin.ts';
import * as Scratch from './games/scratch.ts';
import * as Hilo from './games/hilo.ts';
import * as Roulette from './games/roulette.ts';
import * as Bac from './games/baccarat.ts';
import * as SicBo from './games/sicbo.ts';
import * as BJ from './games/blackjack.ts';
import * as Slots from './games/slots.ts';
import * as Cascade from './games/cascade.ts';
import * as Fishing from './games/fishing.ts';
import * as Goldmine from './games/goldmine.ts';
import * as Fruits from './games/fruits.ts';
import * as Pirate from './games/pirate.ts';
import * as Jade from './games/jade.ts';
import * as Trader from './games/trader.ts';
import * as VP from './games/videopoker.ts';
import * as Wheel from './games/wheel.ts';
import * as Towers from './games/towers.ts';
import * as Diamonds from './games/diamonds.ts';
import * as Pump from './games/pump.ts';
import * as DT from './games/dragontiger.ts';
import * as Horses from './games/horses.ts';
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
  /** Part of the stake the room limits apply to, when the stake also holds a refundable bond (Pesca Profunda). */
  roomStake?: number;
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
  cascade: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = Cascade.playCascade(rng, b);
    const detail = `${r.multiplier}×${r.freeSpins ? ` · 🍭 ${r.spins.length - 1}` : ''}`;
    return single(b, r.payout, detail, { spins: r.spins, freeSpins: r.freeSpins, scatterWin: r.scatterWin, multiplier: r.multiplier, capped: r.capped });
  },
  fishing: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = Fishing.playFishing(rng, b);
    return single(b, r.payout, `${r.multiplier}×${r.spins.length > 1 ? ` · 🎣 ${r.spins.length - 1}` : ''}`, { spins: r.spins, freeSpins: r.freeSpins, collected: r.collected, multiplier: r.multiplier, capped: r.capped });
  },
  jade: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = Jade.playJade(rng, b);
    return single(b, r.payout, `${r.multiplier}×${r.spins.length > 1 ? ` · 🗿 ${r.spins.length - 1}` : ''}`, { spins: r.spins, special: r.special, freeSpins: r.freeSpins, multiplier: r.multiplier, capped: r.capped });
  },
  goldmine: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = Goldmine.playGoldmine(rng, b);
    return single(b, r.payout, `${r.multiplier}×${r.respins.length ? ` · ⛏️ ${r.respins.length}` : ''}${r.grand ? ' · GRAND' : ''}`, { grid: r.grid, lines: r.lines, lineWin: r.lineWin, nuggets: r.nuggets, respins: r.respins, bonus: r.bonus, grand: r.grand, multiplier: r.multiplier, capped: r.capped });
  },
  fruits: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = Fruits.playFruits(rng, b);
    return single(b, r.payout, `${r.multiplier}×${r.spins.length > 1 ? ` · ⭐ ${r.spins.length - 1}` : ''}`, { spins: r.spins, freeSpins: r.freeSpins, multiplier: r.multiplier, capped: r.capped });
  },
  pirate: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = Pirate.playPirate(rng, b);
    return single(b, r.payout, `${r.multiplier}×${r.spins.length > 1 ? ` · 🦜 ${r.spins.length - 1}` : ''}`, { spins: r.spins, multiplier: r.multiplier, capped: r.capped });
  },
  horses: (s, op, p, { rng }) => {
    type HState = { card: Horses.RaceCard; min: number; max: number };
    const st = s as HState | null;
    if (op === 'start') {
      if (st) fail('round_active');
      const room = roomById(p.room);
      // the server passes `hotCap` when the hot-table limit applies (clients cannot lower it… or raise it)
      const cap = typeof p.hotCap === 'number' ? p.hotCap : Infinity;
      const ns: HState = { card: Horses.makeCard(rng), min: room?.min ?? 1, max: Math.min(room?.max ?? MAX_BET, cap) };
      return { state: ns, view: { card: ns.card, min: ns.min, max: ns.max }, stake: 0, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'run') {
      const bets = (Array.isArray(p.bets) ? p.bets : fail('invalid_bets')) as Horses.HorseBet[];
      if (!bets.length || bets.length > 12) fail('invalid_bets');
      const clean = bets.map((b) => ({ type: oneOf(b?.type, Horses.BET_TYPES, 'bet_type'), horses: Array.isArray(b?.horses) ? b.horses.map(Number) : [], amount: bet(b?.amount) }));
      if (!clean.every(Horses.validBet)) fail('invalid_bets');
      const total = clean.reduce((a, b) => a + b.amount, 0);
      if (total < st!.min || total > st!.max) fail(`room_max:${st!.max}`);
      const race = Horses.runRace(rng, st!.card);
      const r = Horses.settleBets(st!.card, race.finish, clean);
      return {
        state: null,
        view: { card: st!.card, race, lines: r.lines, totalBet: r.totalBet, payout: r.payout },
        stake: r.totalBet,
        payout: r.payout,
        done: true,
        summary: { bet: r.totalBet, payout: r.payout, detail: race.finish.slice(0, 3).join('-'), multiStep: true },
      };
    }
    return fail('invalid_op');
  },
  wheel: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = Wheel.playWheel(rng, b, oneOf(p.risk, ['low', 'medium', 'high'] as const, 'risk'));
    return single(b, r.payout, `${r.multiplier}×`, { segment: r.segment, risk: r.risk, multiplier: r.layout[r.segment] });
  },
  diamonds: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const r = Diamonds.playDiamonds(rng, b);
    return single(b, r.payout, r.hand, { gems: r.gems, hand: r.hand, multiplier: Diamonds.DIAMOND_PAYS[r.hand] });
  },
  dragontiger: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const raw = (p.bets ?? {}) as Record<string, unknown>;
    const bets: DT.DTBets = {};
    for (const k of Object.keys(raw)) {
      const key = oneOf(k, ['dragon', 'tiger', 'tie'] as const, 'bet');
      const v = bet(raw[k]);
      if (v > 0) bets[key] = v;
    }
    const r = guard(() => DT.playDragonTiger(rng, bets));
    if (r.totalBet > MAX_BET) fail('invalid_bet');
    return single(r.totalBet, r.payout, `${cardCode(r.dragon)} ${cardCode(r.tiger)}`, { dragon: cardCode(r.dragon), tiger: cardCode(r.tiger), winner: r.winner });
  },
  towers: (s, op, p, { rng }) => {
    const st = s as Towers.TowerState | null;
    const view = (x: Towers.TowerState, reveal: boolean) => ({ level: x.level, picks: x.picks, status: x.status, bet: x.bet, multiplier: Towers.towerMultiplier(x.level, x.status === 'lost' ? x.picks.length - 1 : x.picks.length), bad: reveal ? x.bad : null });
    if (op === 'start') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      const ns = Towers.startTower(rng, b, oneOf(p.level, ['easy', 'medium', 'hard', 'expert'] as const, 'level'));
      return { state: ns, view: view(ns, false), stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'pick') {
      const ns = guard(() => Towers.pickTower(st!, num(p.door, 'door')));
      if (ns.status === 'lost') return { state: null, view: view(ns, true), stake: 0, payout: 0, done: true, summary: { bet: ns.bet, payout: 0, detail: `✗ ${ns.picks.length}`, multiStep: true } };
      if (ns.picks.length === Towers.TOWER_FLOORS) {
        const r = Towers.cashoutTower(ns);
        return { state: null, view: view(r, true), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${r.multiplier}×`, multiStep: true } };
      }
      return { state: ns, view: view(ns, false), stake: 0, payout: 0, done: false };
    }
    if (op === 'cashout') {
      const r = guard(() => Towers.cashoutTower(st!));
      return { state: null, view: view(r, true), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${r.multiplier}×`, multiStep: true } };
    }
    return fail('invalid_op');
  },
  pump: (s, op, p, { rng }) => {
    const st = s as Pump.PumpState | null;
    const view = (x: Pump.PumpState) => ({ level: x.level, pumps: x.pumps, status: x.status, bet: x.bet, multiplier: Pump.pumpMultiplier(x.level, x.status === 'popped' ? x.pumps - 1 : x.pumps), next: Pump.pumpMultiplier(x.level, x.pumps + 1), max: Pump.PUMP_MAX[x.level] });
    if (op === 'start') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      const ns = Pump.startPump(rng, b, oneOf(p.level, ['easy', 'medium', 'hard', 'expert'] as const, 'level'));
      return { state: ns, view: view(ns), stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'pump') {
      const ns = guard(() => Pump.pump(st!));
      if (ns.status === 'popped') return { state: null, view: view(ns), stake: 0, payout: 0, done: true, summary: { bet: ns.bet, payout: 0, detail: '💥', multiStep: true } };
      if (ns.pumps === Pump.PUMP_MAX[ns.level]) {
        const r = Pump.cashoutPump(ns);
        return { state: null, view: view(r), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${r.multiplier}×`, multiStep: true } };
      }
      return { state: ns, view: view(ns), stake: 0, payout: 0, done: false };
    }
    if (op === 'cashout') {
      const r = guard(() => Pump.cashoutPump(st!));
      return { state: null, view: view(r), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${r.multiplier}×`, multiStep: true } };
    }
    return fail('invalid_op');
  },
  videopoker: (s, op, p, { rng }) => {
    const st = s as VP.VPState | null;
    if (op === 'deal') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      const ns = VP.dealVP(rng, b);
      return { state: ns, view: { hand: ns.hand.map(cardCode), bet: b, made: VP.classify(ns.hand) }, stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'draw') {
      const hold = Array.isArray(p.hold) && p.hold.length === 5 && p.hold.every((h) => typeof h === 'boolean') ? (p.hold as boolean[]) : fail('invalid_hold');
      const r = VP.drawVP(st!, hold);
      return {
        state: null,
        view: { hand: r.hand.map(cardCode), held: r.held, result: r.result, multiplier: r.multiplier, bet: r.bet, payout: r.payout },
        stake: 0,
        payout: r.payout,
        done: true,
        summary: { bet: r.bet, payout: r.payout, detail: r.result, multiStep: true },
      };
    }
    return fail('invalid_op');
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
    return single(o.totalBet, o.payout, `${o.number}`, { number: o.number, color: o.color, fire: o.fire, fireHit: o.fireHit, winning: o.winning.map((w) => Roulette.betKey(w.bet)) });
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
  angler: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const b = bet(p.bet);
    const pick = oneOf(p.pick, Angler.ANGLER_GOOD, 'pick');
    const r = Angler.playAngler(rng, b, pick);
    return {
      state: null,
      view: { ...r },
      stake: r.stake,
      payout: r.payout,
      roomStake: b,
      done: true,
      // the summary counts the bond lost to a bad catch as part of what was bet
      summary: { bet: r.bad ? r.stake : b, payout: r.bad ? 0 : r.payout - r.bond, detail: `${r.pick}→${r.catch}`, multiStep: false },
    };
  },
  scratch: (_s, op, p, { rng }) => {
    if (op !== 'play') fail('invalid_op');
    const card = oneOf(p.card, Scratch.SCRATCH_CARDS, 'card');
    const r = Scratch.playScratch(rng, card);
    return {
      state: null,
      view: { ...r },
      stake: r.price,
      payout: r.payout,
      done: true,
      summary: { bet: r.price, payout: r.payout, detail: card, multiStep: false },
    };
  },
  penguin: (s, op, p, { rng }) => {
    const st = s as Penguin.PenguinState | null;
    const view = (x: Penguin.PenguinState) => ({ ...Penguin.publicPenguin(x), multiplier: Penguin.penguinMultiplier(x.difficulty, x.hop), next: Penguin.penguinMultiplier(x.difficulty, x.hop + 1) });
    if (op === 'start') {
      if (st) fail('round_active');
      const b = bet(p.bet);
      const ns = Penguin.startPenguin(rng, b, oneOf(p.difficulty, ['easy', 'medium', 'hard', 'extreme'] as const, 'difficulty'));
      return { state: ns, view: view(ns), stake: b, payout: 0, done: false };
    }
    if (!st) fail('no_round');
    if (op === 'hop') {
      const ns = guard(() => Penguin.hop(st!));
      if (ns.status === 'lost') return { state: null, view: view(ns), stake: 0, payout: 0, done: true, summary: { bet: ns.bet, payout: 0, detail: `${ns.hop}`, multiStep: true } };
      if (ns.status === 'cashed') {
        const r = guard(() => Penguin.cashoutPenguin({ ...ns, status: 'active' }));
        return { state: null, view: view(r), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${r.hop}`, multiStep: true } };
      }
      return { state: ns, view: view(ns), stake: 0, payout: 0, done: false };
    }
    if (op === 'cashout') {
      const r = guard(() => Penguin.cashoutPenguin(st!));
      return { state: null, view: view(r), stake: 0, payout: r.payout, done: true, summary: { bet: r.bet, payout: r.payout, detail: `${r.hop}`, multiStep: true } };
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
  // Scratch cards are sold at a fixed price, so no room limit applies to them.
  if (STARTING_OPS.has(op) && params?.room !== undefined && res.stake > 0 && game !== 'scratch') {
    const room = roomById(params.room);
    if (!room) fail('invalid_room');
    if (!stakeAllowed(room!, res.roomStake ?? res.stake)) fail('stake_outside_room');
  }
  return res;
}

export const MULTI_STEP: GameId[] = ['coinflip', 'mines', 'crossing', 'penguin', 'hilo', 'blackjack', 'crash'];
