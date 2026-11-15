/**
 * Monte Carlo: plays thousands of real rounds with the same game engine (protocol) the app uses,
 * with a fixed simple strategy per option, and reports what actually happened.
 */
import type { GameId } from '@/engine/games/types.ts';
import { runOp } from '@/engine/protocol.ts';
import { seededRng, type Rng } from '@/engine/rng/rng.ts';
import type { Lang } from './models';

type Round = (rng: Rng, bet: number) => { stake: number; payout: number };
export interface SimOption { label: (lang: Lang) => string; round: Round; rtp: number }

const L = (es: string, en: string) => (lang: Lang) => (lang === 'es' ? es : en);
const one = (game: GameId, params: Record<string, unknown>): Round => (rng, bet) => {
  const r = runOp(game, null, 'play', { ...params, bet }, { rng, now: 0 });
  return { stake: r.stake, payout: r.payout };
};
/** Multi-step round: start, then up to `steps` actions, cashing out if still alive. */
const steps = (game: GameId, start: Record<string, unknown>, action: (i: number) => [string, Record<string, unknown>], n: number): Round => (rng, bet) => {
  let r = runOp(game, null, 'start', { ...start, bet }, { rng, now: 0 });
  let stake = r.stake, payout = r.payout;
  for (let i = 0; i < n && !r.done; i++) {
    const [op, p] = action(i);
    r = runOp(game, r.state, op, p, { rng, now: 0 });
    stake += r.stake;
    payout += r.payout;
  }
  if (!r.done) {
    r = runOp(game, r.state, 'cashout', {}, { rng, now: 0 });
    payout += r.payout;
  }
  return { stake, payout };
};
const crashAt = (x: number): Round => (rng, bet) => {
  const a = runOp('crash', null, 'start', { bet, autoCashout: x }, { rng, now: 0 });
  const b = runOp('crash', a.state, 'settle', {}, { rng, now: 1e12 });
  return { stake: a.stake, payout: b.payout };
};

/** Simple strategies the player can compare. `rtp` is the theoretical return of that strategy. */
export const SIM_OPTIONS: Partial<Record<GameId, SimOption[]>> = {
  dice: [
    { label: L('50 % (×1,98)', '50 % (×1.98)'), round: one('dice', { mode: 'under', target: 50 }), rtp: 0.99 },
    { label: L('25 % (×3,96)', '25 % (×3.96)'), round: one('dice', { mode: 'under', target: 25 }), rtp: 0.99 },
    { label: L('10 % (×9,9)', '10 % (×9.9)'), round: one('dice', { mode: 'under', target: 10 }), rtp: 0.99 },
  ],
  limbo: [
    { label: L('Objetivo ×2', 'Target ×2'), round: one('limbo', { target: 2 }), rtp: 0.99 },
    { label: L('Objetivo ×5', 'Target ×5'), round: one('limbo', { target: 5 }), rtp: 0.99 },
    { label: L('Objetivo ×20', 'Target ×20'), round: one('limbo', { target: 20 }), rtp: 0.99 },
  ],
  crash: [
    { label: L('Retirar en ×1,5', 'Cash out at ×1.5'), round: crashAt(1.5), rtp: 0.99 },
    { label: L('Retirar en ×2', 'Cash out at ×2'), round: crashAt(2), rtp: 0.99 },
    { label: L('Retirar en ×10', 'Cash out at ×10'), round: crashAt(10), rtp: 0.99 },
  ],
  coinflip: [
    { label: L('1 acierto y cobrar', '1 win then collect'), round: steps('coinflip', {}, () => ['call', { side: 'heads' }], 1), rtp: 0.99 },
    { label: L('3 seguidos y cobrar', '3 in a row then collect'), round: steps('coinflip', {}, () => ['call', { side: 'heads' }], 3), rtp: 0.99 },
  ],
  mines: [
    { label: L('3 bombas · 1 diamante', '3 bombs · 1 diamond'), round: steps('mines', { mines: 3 }, (i) => ['reveal', { tile: i }], 1), rtp: 0.99 },
    { label: L('3 bombas · 5 diamantes', '3 bombs · 5 diamonds'), round: steps('mines', { mines: 3 }, (i) => ['reveal', { tile: i }], 5), rtp: 0.99 },
  ],
  plinko: [
    { label: L('Riesgo bajo', 'Low risk'), round: one('plinko', { rows: 12, risk: 'low' }), rtp: 0.99 },
    { label: L('Riesgo alto', 'High risk'), round: one('plinko', { rows: 12, risk: 'high' }), rtp: 0.99 },
  ],
  crossing: [
    { label: L('Fácil · 2 carriles', 'Easy · 2 lanes'), round: steps('crossing', { difficulty: 'easy' }, () => ['advance', {}], 2), rtp: 0.99 },
    { label: L('Difícil · 3 carriles', 'Hard · 3 lanes'), round: steps('crossing', { difficulty: 'hard' }, () => ['advance', {}], 3), rtp: 0.99 },
  ],
  roulette: [
    { label: L('Siempre al rojo', 'Always red'), round: (rng, bet) => one('roulette', { bets: [{ bet: { kind: 'red' }, amount: bet }] })(rng, bet), rtp: 36 / 37 },
    { label: L('Siempre al 17', 'Always 17'), round: (rng, bet) => one('roulette', { bets: [{ bet: { kind: 'straight', numbers: [17] }, amount: bet }] })(rng, bet), rtp: 36 / 37 },
  ],
  keno: [
    { label: L('5 números', '5 numbers'), round: one('keno', { picks: [3, 11, 19, 27, 35], risk: 'medium' }), rtp: 0.99 },
  ],
  sicbo: [
    { label: L('Siempre «pequeño»', 'Always “small”'), round: (rng, bet) => one('sicbo', { bets: [{ bet: { kind: 'small' }, amount: bet }] })(rng, bet), rtp: 0.9722 },
  ],
  baccarat: [
    { label: L('Siempre a la Banca', 'Always Banker'), round: (rng, bet) => one('baccarat', { bets: { banker: bet } })(rng, bet), rtp: 0.9894 },
    { label: L('Siempre al empate', 'Always Tie'), round: (rng, bet) => one('baccarat', { bets: { tie: bet } })(rng, bet), rtp: 0.8564 },
  ],
};

export interface SimResult {
  /** Running net result (chips won minus chips bet) for each simulated player, sampled for the chart. */
  paths: number[][];
  rounds: number;
  bet: number;
  staked: number;
  returned: number;
  wins: number;
  best: number;
  worst: number;
  /** Players (of `paths.length`) who ended ahead. */
  ahead: number;
}

/** Plays `rounds` rounds for `players` independent players. Deterministic for a given seed. */
export function simulate(option: SimOption, rounds: number, players: number, bet: number, seed: number, samples = 120): SimResult {
  const paths: number[][] = [];
  let staked = 0, returned = 0, wins = 0, best = -Infinity, worst = Infinity, ahead = 0;
  const every = Math.max(1, Math.floor(rounds / samples));
  for (let p = 0; p < players; p++) {
    const rng = seededRng(seed + p * 7919);
    let net = 0;
    const path = [0];
    for (let i = 1; i <= rounds; i++) {
      const r = option.round(rng, bet);
      net += r.payout - r.stake;
      if (p === 0) {
        staked += r.stake;
        returned += r.payout;
        if (r.payout > r.stake) wins++;
      }
      if (i % every === 0 || i === rounds) path.push(net);
    }
    best = Math.max(best, net);
    worst = Math.min(worst, net);
    if (net > 0) ahead++;
    paths.push(path);
  }
  return { paths, rounds, bet, staked, returned, wins, best, worst, ahead };
}
