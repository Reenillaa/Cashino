import { randomInt, type Rng } from '../rng/rng.ts';
import { settle, type Settled } from './types.ts';

/**
 * Classic 3-reel, 1-line slot machine. Each reel stops on one symbol drawn independently with the
 * weights below (a virtual reel of 24 stops). Pays (bet × multiplier, stake included):
 * three of a kind per symbol, two cherries ×2, one cherry ×1 (stake back). Exact RTP ≈ 97.4 %.
 */
export const SLOT_SYMBOLS = ['cherry', 'lemon', 'bell', 'bar', 'seven', 'diamond'] as const;
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = { cherry: 4, lemon: 7, bell: 6, bar: 4, seven: 2, diamond: 1 };
export const SLOT_THREE: Record<SlotSymbol, number> = { cherry: 10, lemon: 5, bell: 9, bar: 20, seven: 80, diamond: 500 };
export const SLOT_TWO_CHERRIES = 2;
export const SLOT_ONE_CHERRY = 1;
const STRIP: SlotSymbol[] = SLOT_SYMBOLS.flatMap((s) => Array.from({ length: SLOT_WEIGHTS[s] }, () => s));

export function spinReel(rng: Rng): SlotSymbol {
  return STRIP[randomInt(rng, STRIP.length)];
}

/** Multiplier for a final line (stake included). */
export function slotMultiplier(line: readonly SlotSymbol[]): number {
  if (line[0] === line[1] && line[1] === line[2]) return SLOT_THREE[line[0]];
  const cherries = line.filter((s) => s === 'cherry').length;
  return cherries === 2 ? SLOT_TWO_CHERRIES : cherries === 1 ? SLOT_ONE_CHERRY : 0;
}

/** Exact return to player and hit rate, enumerating every combination. */
export function slotsStats(): { rtp: number; hit: number } {
  const total = STRIP.length;
  let rtp = 0, hit = 0;
  for (const a of SLOT_SYMBOLS) for (const b of SLOT_SYMBOLS) for (const c of SLOT_SYMBOLS) {
    const p = (SLOT_WEIGHTS[a] * SLOT_WEIGHTS[b] * SLOT_WEIGHTS[c]) / total ** 3;
    const m = slotMultiplier([a, b, c]);
    rtp += p * m;
    if (m > 0) hit += p;
  }
  return { rtp, hit };
}

export function playSlots(rng: Rng, bet: number): Settled & { line: [SlotSymbol, SlotSymbol, SlotSymbol] } {
  const line: [SlotSymbol, SlotSymbol, SlotSymbol] = [spinReel(rng), spinReel(rng), spinReel(rng)];
  return { ...settle(bet, slotMultiplier(line)), line };
}
