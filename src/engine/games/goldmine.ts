import type { Rng } from '../rng/rng.ts';
import { payoutFor } from './types.ts';
import { REELS, ROWS, lineWins, pickWeighted, type LineWin } from './lineslot.ts';

/**
 * Mina de Oro ("Gold Mine"): an original mining slot with the popular "hold and win" bonus.
 * - 5×3, 10 lines, pays × total bet. The miner is wild. Gold nuggets carry a value (× total bet) and never
 *   pay on lines; MINI (×20) and MAJOR (×100) nuggets are fixed prizes, not progressive jackpots.
 * - 5 or more nuggets start the bonus: nuggets stay, every other cell respins. You get 3 respins and every new
 *   nugget resets them to 3. When no respins are left, every nugget pays its value. Fill all 15 = GRAND ×1000.
 * - Biggest round ×5000 the bet. Return measured by simulation (see `goldmineStats` and the tests).
 */
export const MINE_SYMBOLS = ['pickaxe', 'shovel', 'lantern', 'helmet', 'cart', 'dynamite', 'goldbar', 'miner'] as const;
export const MINER = 7;
export const NUGGET = 1000;
export const isNugget = (c: number) => c >= NUGGET;
export const nuggetValue = (c: number) => c - NUGGET;
export const MINI = 20;
export const MAJOR = 100;
export const GRAND = 1000;
/** 3 / 4 / 5 of a kind (× total bet). */
export const MINE_PAYS: [number, number, number][] = [
  [1.1, 3.3, 13], // pickaxe
  [1.1, 3.3, 13], // shovel
  [1.3, 4.4, 18], // lantern
  [1.3, 4.4, 18], // helmet
  [2.6, 8.8, 40], // cart
  [3.3, 13, 66], // dynamite
  [6.6, 33, 176], // gold bar
  [13, 66, 440], // miner (wild)
];
/** Cell weights: the 8 symbols, then the nugget. */
export const MINE_WEIGHTS = [22, 22, 18, 18, 11, 8, 5, 2.4, 9];
/** Nugget values (× total bet) and their weights. */
export const NUGGET_VALUES: [number, number][] = [[1, 40], [2, 26], [3, 14], [5, 9], [8, 5], [15, 2.5], [MINI, 1.2], [MAJOR, 0.12]];
/** Bonus: nuggets needed, respins given (and reset to), chance that an empty cell becomes a nugget. */
export const MINE_BONUS = { trigger: 5, respins: 3, chance: 0.08 };
export const MINE_MAX_WIN = 5000;

const NV_TOTAL = NUGGET_VALUES.reduce((a, [, w]) => a + w, 0);
function nugget(rng: Rng): number {
  let x = rng.float() * NV_TOTAL;
  for (const [v, w] of NUGGET_VALUES) if ((x -= w) < 0) return NUGGET + v;
  return NUGGET + 1;
}
const symOf = (c: number) => (isNugget(c) ? -1 : c);

export interface MineRespin {
  /** Board after this respin: nugget codes, 0 for an empty cell. */
  board: number[][];
  /** Cells that got a new nugget on this respin. */
  fresh: { reel: number; row: number }[];
  /** Respins left after this one. */
  left: number;
}
export interface MineResult {
  grid: number[][];
  lines: LineWin[];
  lineWin: number;
  nuggets: number;
  respins: MineRespin[];
  /** Bonus win (sum of nuggets, plus the GRAND if the board was filled). */
  bonus: number;
  grand: boolean;
  multiplier: number;
  payout: number;
  capped: boolean;
  bet: number;
}

export function playGoldmine(rng: Rng, bet: number): MineResult {
  const grid = Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => {
    const k = pickWeighted(rng, MINE_WEIGHTS);
    return k === 8 ? nugget(rng) : k;
  }));
  const lines = lineWins(grid, symOf, MINER, MINE_PAYS);
  const lineWin = lines.reduce((a, l) => a + l.pay, 0);
  let nuggets = 0;
  for (const col of grid) for (const c of col) if (isNugget(c)) nuggets++;
  const respins: MineRespin[] = [];
  let bonus = 0;
  let grand = false;
  if (nuggets >= MINE_BONUS.trigger) {
    const board = grid.map((col) => col.map((c) => (isNugget(c) ? c : 0)));
    let left = MINE_BONUS.respins;
    let filled = nuggets;
    while (left > 0 && filled < REELS * ROWS) {
      const fresh: { reel: number; row: number }[] = [];
      for (let reel = 0; reel < REELS; reel++) for (let row = 0; row < ROWS; row++) {
        if (board[reel][row]) continue;
        if (rng.float() < MINE_BONUS.chance) {
          board[reel][row] = nugget(rng);
          fresh.push({ reel, row });
        }
      }
      filled += fresh.length;
      left = fresh.length ? MINE_BONUS.respins : left - 1;
      if (filled >= REELS * ROWS) left = 0;
      respins.push({ board: board.map((c) => [...c]), fresh, left });
    }
    for (const col of board) for (const c of col) if (c) bonus += nuggetValue(c);
    grand = filled >= REELS * ROWS;
    if (grand) bonus += GRAND;
  }
  const raw = lineWin + bonus;
  const capped = raw >= MINE_MAX_WIN;
  const multiplier = Math.min(MINE_MAX_WIN, Math.round(raw * 100) / 100);
  return { grid, lines, lineWin, nuggets, respins, bonus, grand, multiplier, payout: payoutFor(bet, multiplier), capped, bet };
}

export function goldmineStats(rng: Rng, n: number) {
  let paid = 0, hits = 0, bonus = 0, big = 0;
  for (let i = 0; i < n; i++) {
    const r = playGoldmine(rng, 100);
    paid += r.multiplier;
    if (r.multiplier > 0) hits++;
    if (r.respins.length) bonus++;
    if (r.multiplier >= 100) big++;
  }
  return { rtp: paid / n, hit: hits / n, bonus: bonus / n, big: big / n };
}
