import type { Rng } from '../rng/rng.ts';

/**
 * Shared engine for 5×3 line slots: weighted cells, 10 fixed paylines read left to right (3, 4 or 5 in a row
 * from the first reel), wilds that stand in for any paying symbol. Pays are multiples of the TOTAL bet.
 */
export const REELS = 5;
export const ROWS = 3;
/** Row of each reel for the 10 paylines (0 = top). */
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 2, 1, 0, 1],
];

/** Picks an index from a weight table. */
export function pickWeighted(rng: Rng, weights: readonly number[], total?: number): number {
  let x = rng.float() * (total ?? weights.reduce((a, b) => a + b, 0));
  for (let i = 0; i < weights.length; i++) if ((x -= weights[i]) < 0) return i;
  return weights.length - 1;
}

export interface LineWin { line: number; sym: number; count: number; pay: number }

/**
 * Best win of every payline. `grid[reel][row]` holds symbol codes; `symOf(code)` maps a code to its paying
 * symbol (or -1 for things that never pay on lines), `wild` is the wild symbol (or -1), `pays[sym]` are the
 * 3/4/5-of-a-kind multipliers of the total bet.
 */
export function lineWins(grid: number[][], symOf: (code: number) => number, wild: number, pays: readonly (readonly [number, number, number])[]): LineWin[] {
  const out: LineWin[] = [];
  PAYLINES.forEach((rows, line) => {
    const syms = rows.map((r, reel) => symOf(grid[reel][r]));
    // the line's symbol is the first non-wild (a line of only wilds pays as wilds)
    const base = syms.find((s) => s !== wild && s >= 0) ?? (syms[0] === wild ? wild : -1);
    if (base < 0) return;
    let count = 0;
    for (const s of syms) {
      if (s === base || (s === wild && wild >= 0)) count++;
      else break;
    }
    // a run of leading wilds may pay more as wilds than as the symbol after them
    let best = count >= 3 ? pays[base]?.[count - 3] ?? 0 : 0;
    let sym = base;
    if (wild >= 0 && syms[0] === wild) {
      let w = 0;
      while (w < syms.length && syms[w] === wild) w++;
      const wp = w >= 3 ? pays[wild]?.[w - 3] ?? 0 : 0;
      if (wp > best) {
        best = wp;
        sym = wild;
        count = w;
      }
    }
    if (best > 0) out.push({ line, sym, count, pay: best });
  });
  return out;
}
