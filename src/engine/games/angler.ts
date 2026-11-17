import type { Rng } from '../rng/rng.ts';
import { floorTo, payoutFor } from './types.ts';

/**
 * Pesca Profunda ("Deep Catch"): guess which fish will bite.
 * - Before casting you pick one of the sea's fish. Each has a known chance to bite and a prize: the rarer
 *   it is, the bigger the prize (a sardine ×2.9 … the golden shark ×500).
 * - The hook sinks to the depth where the fish that bites lives. If it is yours, you win bet × its prize.
 *   If it is another fish, you lose the bet.
 * - Some catches are bad (an old boot, a dead fish, a puffer fish): they also take a bond of half your bet
 *   that is put down with every cast and handed back whenever no bad catch bites.
 * - The return of every pick is about 96 % of the bet (see `anglerReturn` and the tests).
 */
export const ANGLER_GOOD = ['sardine', 'mackerel', 'bream', 'clownfish', 'swordfish', 'octopus', 'lanternfish', 'tuna', 'goldshark'] as const;
export const ANGLER_BAD = ['boot', 'deadfish', 'puffer'] as const;
export type AnglerGood = (typeof ANGLER_GOOD)[number];
export type AnglerBad = (typeof ANGLER_BAD)[number];
export type AnglerCatch = AnglerGood | AnglerBad;

/** Chance to bite (per cast) and depth where it lives (0 = surface, 1 = abyss). */
export const ANGLER_FISH: Record<AnglerCatch, { p: number; depth: number }> = {
  sardine: { p: 0.34, depth: 0.12 },
  mackerel: { p: 0.22, depth: 0.22 },
  bream: { p: 0.14, depth: 0.32 },
  clownfish: { p: 0.09, depth: 0.42 },
  swordfish: { p: 0.06, depth: 0.52 },
  octopus: { p: 0.04, depth: 0.62 },
  lanternfish: { p: 0.02, depth: 0.74 },
  tuna: { p: 0.008, depth: 0.84 },
  goldshark: { p: 0.002, depth: 0.94 },
  boot: { p: 0.035, depth: 0.98 },
  deadfish: { p: 0.03, depth: 0.5 },
  puffer: { p: 0.015, depth: 0.3 },
};
/** Bond put down with every cast (share of the bet), lost only to a bad catch. */
export const ANGLER_BOND = 0.5;
export const ANGLER_TARGET = 0.96;
export const isBad = (c: AnglerCatch): c is AnglerBad => (ANGLER_BAD as readonly string[]).includes(c);
const BAD_P = ANGLER_BAD.reduce((a, k) => a + ANGLER_FISH[k].p, 0);

/** Prize (× bet) of catching the fish you picked: (target + expected bond loss) ÷ chance, floored. */
export function anglerMultiplier(fish: AnglerGood): number {
  return floorTo((ANGLER_TARGET + BAD_P * ANGLER_BOND) / ANGLER_FISH[fish].p, 1);
}
export const anglerBond = (bet: number) => Math.ceil(bet * ANGLER_BOND);

/** Expected return per unit of bet for a pick (bond not counted as bet). */
export function anglerReturn(fish: AnglerGood): number {
  return ANGLER_FISH[fish].p * anglerMultiplier(fish) - BAD_P * ANGLER_BOND;
}

const ORDER = Object.keys(ANGLER_FISH) as AnglerCatch[];
export function drawCatch(rng: Rng): AnglerCatch {
  let x = rng.float();
  for (const k of ORDER) if ((x -= ANGLER_FISH[k].p) < 0) return k;
  return 'sardine';
}

export interface AnglerResult {
  bet: number;
  bond: number;
  pick: AnglerGood;
  catch: AnglerCatch;
  won: boolean;
  bad: boolean;
  multiplier: number;
  /** Total taken when casting (bet + bond) and handed back (prize + bond, bond, or nothing). */
  stake: number;
  payout: number;
}

export function playAngler(rng: Rng, bet: number, pick: AnglerGood): AnglerResult {
  const bond = anglerBond(bet);
  const c = drawCatch(rng);
  const bad = isBad(c);
  const won = c === pick;
  const multiplier = won ? anglerMultiplier(pick) : 0;
  const payout = (won ? payoutFor(bet, multiplier) : 0) + (bad ? 0 : bond);
  return { bet, bond, pick, catch: c, won, bad, multiplier, stake: bet + bond, payout };
}
