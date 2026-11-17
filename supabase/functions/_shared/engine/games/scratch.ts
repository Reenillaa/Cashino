import type { Rng } from '../rng/rng.ts';
import { payoutFor } from './types.ts';

/**
 * Rasca y gana: five original Spanish-themed scratch cards sold in the shop. The prize of a card is drawn
 * when it is bought (from the card's prize table); the layout under the foil is then built to show exactly
 * that prize, so scratching only reveals what was already decided. Each card returns 86–92 % of its price.
 *
 * - Tapas de Oro: 9 amounts — three equal amounts win that amount.
 * - Sol y Playa: 2 winning numbers and 6 of yours with a prize each — a match wins its prize.
 * - Feria de Abril: 6 symbols and a prize box — three farolillos (paper lanterns) win the box.
 * - Siesta Millonaria: a hat with the prize and 3 pillows — the moon under a pillow wins the hat.
 * - Paella Premiada: 6 ingredients — three of one ingredient win its prize (lemon … golden paella pan).
 */
export const SCRATCH_CARDS = ['tapas', 'playa', 'feria', 'siesta', 'paella'] as const;
export type ScratchCardId = (typeof SCRATCH_CARDS)[number];

/** Price (chips) and prize table: [multiple of the price, chance]. */
export const SCRATCH: Record<ScratchCardId, { price: number; prizes: [number, number][] }> = {
  tapas: { price: 50, prizes: [[1, 0.18], [2, 0.1], [3, 0.05], [5, 0.03], [20, 0.006], [100, 0.0008]] },
  playa: { price: 100, prizes: [[1, 0.14], [2, 0.09], [5, 0.04], [10, 0.018], [50, 0.002], [500, 0.0002]] },
  feria: { price: 200, prizes: [[2, 0.1], [4, 0.05], [10, 0.02], [25, 0.006], [100, 0.0012], [1000, 0.00005]] },
  siesta: { price: 500, prizes: [[1, 0.1], [3, 0.05], [10, 0.02], [50, 0.004], [500, 0.0003], [2000, 0.00003]] },
  paella: { price: 1000, prizes: [[2, 0.13], [5, 0.035], [20, 0.009], [100, 0.0012], [1000, 0.0001], [5000, 0.00001]] },
};
export const FERIA_SYMBOLS = ['farolillo', 'abanico', 'clavel', 'peineta', 'castanuelas', 'guitarra'] as const;
export const PAELLA_INGREDIENTS = ['limon', 'gamba', 'mejillon', 'azafran', 'langosta', 'paellera'] as const;
export const SIESTA_DUDS = ['oveja', 'gallo', 'despertador', 'cafe'] as const;

/** Expected return of a card (share of its price). */
export function scratchRtp(card: ScratchCardId): number {
  return SCRATCH[card].prizes.reduce((a, [m, p]) => a + m * p, 0);
}
/** Chance to win anything. */
export function scratchHit(card: ScratchCardId): number {
  return SCRATCH[card].prizes.reduce((a, [, p]) => a + p, 0);
}

const pickInt = (rng: Rng, n: number) => Math.floor(rng.float() * n);
function shuffle<T>(rng: Rng, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = pickInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** Fills `n` slots from `pool` with no value more than twice (so no accidental "three of a kind"). */
function noTriples<T>(rng: Rng, pool: readonly T[], n: number, avoid?: T): T[] {
  const out: T[] = [];
  const count = new Map<T, number>();
  while (out.length < n) {
    const v = pool[pickInt(rng, pool.length)];
    if (v === avoid) continue;
    if ((count.get(v) ?? 0) >= 2) continue;
    count.set(v, (count.get(v) ?? 0) + 1);
    out.push(v);
  }
  return out;
}

export type ScratchLayout =
  | { kind: 'tapas'; amounts: number[] }
  | { kind: 'playa'; winning: [number, number]; mine: { n: number; prize: number }[] }
  | { kind: 'feria'; symbols: string[]; box: number }
  | { kind: 'siesta'; hat: number; pillows: string[] }
  | { kind: 'paella'; cells: string[] };

export interface ScratchResult { card: ScratchCardId; price: number; multiplier: number; payout: number; layout: ScratchLayout }

/** Paella: the ingredient that pays each prize multiple (same order as the prize table). */
export const PAELLA_PAYS: Record<string, number> = { limon: 2, gamba: 5, mejillon: 20, azafran: 100, langosta: 1000, paellera: 5000 };

export function playScratch(rng: Rng, card: ScratchCardId): ScratchResult {
  const { price, prizes } = SCRATCH[card];
  // 1) the prize
  let x = rng.float();
  let mult = 0;
  for (const [m, p] of prizes) if ((x -= p) < 0) { mult = m; break; }
  const amounts = prizes.map(([m]) => m * price);
  const win = mult * price;
  // 2) a layout that shows exactly that prize
  let layout: ScratchLayout;
  if (card === 'tapas') {
    const cells = mult ? [win, win, win, ...noTriples(rng, amounts, 6, win)] : noTriples(rng, amounts, 9);
    layout = { kind: 'tapas', amounts: shuffle(rng, cells) };
  } else if (card === 'playa') {
    const a = 1 + pickInt(rng, 30);
    let b = 1 + pickInt(rng, 30);
    while (b === a) b = 1 + pickInt(rng, 30);
    const others = Array.from({ length: 30 }, (_, i) => i + 1).filter((n) => n !== a && n !== b);
    const nums = shuffle(rng, others).slice(0, 6);
    const mine = nums.map((n) => ({ n, prize: amounts[pickInt(rng, amounts.length)] }));
    if (mult) mine[pickInt(rng, 6)] = { n: rng.float() < 0.5 ? a : b, prize: win };
    layout = { kind: 'playa', winning: [a, b], mine };
  } else if (card === 'feria') {
    const symbols = mult ? ['farolillo', 'farolillo', 'farolillo', ...noTriples(rng, FERIA_SYMBOLS, 3, 'farolillo')] : noTriples(rng, FERIA_SYMBOLS, 6);
    layout = { kind: 'feria', symbols: shuffle(rng, symbols), box: mult ? win : amounts[pickInt(rng, amounts.length)] };
  } else if (card === 'siesta') {
    const pillows = mult ? ['luna', ...noTriples(rng, SIESTA_DUDS, 2)] : noTriples(rng, SIESTA_DUDS, 3);
    layout = { kind: 'siesta', hat: mult ? win : amounts[pickInt(rng, amounts.length)], pillows: shuffle(rng, pillows) };
  } else {
    const ing = Object.keys(PAELLA_PAYS).find((k) => PAELLA_PAYS[k] === mult);
    const cells = ing ? [ing, ing, ing, ...noTriples(rng, PAELLA_INGREDIENTS, 3, ing)] : noTriples(rng, PAELLA_INGREDIENTS, 6);
    layout = { kind: 'paella', cells: shuffle(rng, cells) };
  }
  return { card, price, multiplier: mult, payout: payoutFor(price, mult), layout };
}

/** Reads the prize back from a layout (used by the tests: what you see is what you get). */
export function scratchPrizeFromLayout(card: ScratchCardId, l: ScratchLayout): number {
  const triple = <T>(xs: T[]) => xs.find((v) => xs.filter((y) => y === v).length >= 3);
  if (l.kind === 'tapas') return triple(l.amounts) ?? 0;
  if (l.kind === 'playa') return l.mine.filter((m) => l.winning.includes(m.n)).reduce((a, m) => a + m.prize, 0);
  if (l.kind === 'feria') return l.symbols.filter((s) => s === 'farolillo').length >= 3 ? l.box : 0;
  if (l.kind === 'siesta') return l.pillows.includes('luna') ? l.hat : 0;
  const ing = triple(l.cells);
  return ing ? PAELLA_PAYS[ing] * SCRATCH[card].price : 0;
}
