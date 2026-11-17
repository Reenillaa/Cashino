import type { Rng } from '../rng/rng.ts';
import { payoutFor } from './types.ts';
import { PAYLINES, REELS, ROWS, lineWins, pickWeighted, type LineWin } from './lineslot.ts';

/**
 * Templo de Jade ("Jade Temple"): an original jungle-temple slot with the popular "expanding symbol" free spins.
 * - 5×3, 10 lines, pays × total bet. The idol is wild AND scatter: 3/4/5 anywhere pay ×2/×20/×200 and start
 *   10 free spins (3+ idols during them add 10 more).
 * - Before the free spins one symbol is drawn as the SPECIAL symbol. In every free spin, if it lands on enough
 *   reels to win, it fills those whole reels and pays on all 10 lines, wherever it is (no need to be adjacent).
 * - Biggest round ×5000 the bet. Return ≈ 96 % (simulated, see `jadeStats` and the tests).
 */
export const JADE_SYMBOLS = ['leaf', 'feather', 'shell', 'amulet', 'drum', 'mask', 'jaguar', 'serpent', 'explorer', 'idol'] as const;
export const IDOL = 9;
/** Pays (× total bet) for 3 / 4 / 5 of a kind. The explorer also pays for 2 (see JADE_TWO). */
export const JADE_PAYS: [number, number, number][] = [
  [0.7, 3.5, 14], // leaf
  [0.7, 3.5, 14], // feather
  [0.7, 3.5, 14], // shell
  [0.7, 5.5, 21], // amulet
  [0.7, 5.5, 21], // drum
  [4, 14, 100], // mask
  [4, 14, 100], // jaguar
  [5.5, 55, 280], // serpent
  [14, 140, 700], // explorer
  [2, 20, 200], // idol (scatter pays, anywhere)
];
/** Two-of-a-kind pays for the top symbols. */
export const JADE_TWO: Record<number, number> = { 7: 0.5, 8: 1 };
export const JADE_WEIGHTS = {
  base: [20, 20, 20, 16, 16, 9, 9, 5, 3, 2.86],
  free: [20, 20, 20, 16, 16, 9, 9, 5, 3, 2.1],
};
export const JADE_FREE = 10;
export const JADE_MAX_FREE = 60;
export const JADE_MAX_WIN = 5000;

const symOf = (c: number) => c;
function grid(rng: Rng, free: boolean): number[][] {
  const w = free ? JADE_WEIGHTS.free : JADE_WEIGHTS.base;
  return Array.from({ length: REELS }, () => Array.from({ length: ROWS }, () => pickWeighted(rng, w)));
}

/** Line wins plus the 2-of-a-kind pays of the top symbols. */
function wins(g: number[][]): LineWin[] {
  const out = lineWins(g, (c) => (c === IDOL ? IDOL : symOf(c)), IDOL, JADE_PAYS.map((p, i) => (i === IDOL ? [0, 0, 0] : p)) as [number, number, number][]);
  const won = new Set(out.map((w) => w.line));
  PAYLINES.forEach((rows, line) => {
    if (won.has(line)) return;
    const a = g[0][rows[0]], b = g[1][rows[1]];
    const s = a === IDOL ? b : a;
    if (JADE_TWO[s] && (a === s || a === IDOL) && (b === s || b === IDOL) && g[2][rows[2]] !== s && g[2][rows[2]] !== IDOL) out.push({ line, sym: s, count: 2, pay: JADE_TWO[s] });
  });
  return out;
}

export interface JadeSpin {
  grid: number[][];
  lines: LineWin[];
  scatters: number;
  scatterPay: number;
  /** Free spins: reels where the special symbol expanded (empty if it did not) and what it paid. */
  expanded: number[];
  expandPay: number;
  total: number;
  free: boolean;
}
export interface JadeResult { spins: JadeSpin[]; special: number | null; freeSpins: number; multiplier: number; payout: number; capped: boolean; bet: number }

function spin(rng: Rng, free: boolean, special: number | null): JadeSpin {
  const g = grid(rng, free);
  const lines = wins(g);
  let scatters = 0;
  for (const col of g) for (const c of col) if (c === IDOL) scatters++;
  const scatterPay = scatters >= 3 ? JADE_PAYS[IDOL][Math.min(5, scatters) - 3] : 0;
  let expanded: number[] = [];
  let expandPay = 0;
  if (free && special !== null) {
    const reels = g.map((col, i) => (col.includes(special) ? i : -1)).filter((i) => i >= 0);
    const need = JADE_TWO[special] ? 2 : 3;
    if (reels.length >= need) {
      const n = Math.min(5, reels.length);
      const per = n >= 3 ? JADE_PAYS[special][n - 3] : JADE_TWO[special];
      expanded = reels;
      expandPay = per * PAYLINES.length;
    }
  }
  const total = lines.reduce((a, l) => a + l.pay, 0) + scatterPay + expandPay;
  return { grid: g, lines, scatters, scatterPay, expanded, expandPay, total, free };
}

export function playJade(rng: Rng, bet: number): JadeResult {
  const first = spin(rng, false, null);
  const spins = [first];
  let mult = first.total;
  let freeSpins = first.scatters >= 3 ? JADE_FREE : 0;
  const special = freeSpins ? pickWeighted(rng, [14, 14, 14, 12, 12, 8, 8, 5, 3]) : null;
  for (let k = 0; k < freeSpins && mult < JADE_MAX_WIN; k++) {
    const s = spin(rng, true, special);
    spins.push(s);
    mult += s.total;
    if (s.scatters >= 3) freeSpins = Math.min(JADE_MAX_FREE, freeSpins + JADE_FREE);
  }
  const capped = mult >= JADE_MAX_WIN;
  const multiplier = Math.min(JADE_MAX_WIN, Math.round(mult * 100) / 100);
  return { spins, special, freeSpins, multiplier, payout: payoutFor(bet, multiplier), capped, bet };
}

export function jadeStats(rng: Rng, n: number) {
  let paid = 0, hits = 0, bonus = 0, big = 0;
  for (let i = 0; i < n; i++) {
    const r = playJade(rng, 100);
    paid += r.multiplier;
    if (r.multiplier > 0) hits++;
    if (r.freeSpins) bonus++;
    if (r.multiplier >= 100) big++;
  }
  return { rtp: paid / n, hit: hits / n, bonus: bonus / n, big: big / n };
}
