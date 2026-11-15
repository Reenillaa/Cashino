import { randomInt, type Rng } from '../rng/rng.ts';
import { newDeck, type Card } from '../cards/cards.ts';
import { chenScore, evaluate } from './evaluator.ts';

const key = (c: Card) => c.rank * 4 + 'shdc'.indexOf(c.suit);

/**
 * Monte Carlo equity of `hole` against `opponents` unknown hands given the board.
 * `minOpponentChen` optionally narrows opponent ranges (rejection sampling) to model tighter ranges.
 * Returns win probability with ties counted fractionally.
 */
export function monteCarloEquity(
  rng: Rng,
  hole: Card[],
  board: Card[],
  opponents: number,
  iterations: number,
  minOpponentChen = -Infinity,
): number {
  if (opponents <= 0) return 1;
  const used = new Set([...hole, ...board].map(key));
  const deck = newDeck().filter((c) => !used.has(key(c)));
  let score = 0;
  const pool = deck.slice();
  for (let it = 0; it < iterations; it++) {
    // partial shuffle draw without replacement
    let n = pool.length;
    const take = (): Card => {
      const j = randomInt(rng, n);
      const c = pool[j];
      pool[j] = pool[n - 1];
      pool[n - 1] = c;
      n--;
      return c;
    };
    const opp: Card[][] = [];
    for (let o = 0; o < opponents; o++) {
      let a = take(), b = take();
      let tries = 0;
      while (chenScore(a, b) < minOpponentChen && tries++ < 6 && n >= 2) {
        a = take();
        b = take();
      }
      opp.push([a, b]);
    }
    const fullBoard = board.slice();
    while (fullBoard.length < 5) fullBoard.push(take());
    const mine = evaluate([...hole, ...fullBoard]).score;
    let best = 0, ties = 0, beaten = false;
    for (const h of opp) {
      const s = evaluate([...h, ...fullBoard]).score;
      if (s > mine) {
        beaten = true;
        break;
      }
      if (s === mine) ties++;
      best = Math.max(best, s);
    }
    if (!beaten) score += ties > 0 ? 1 / (ties + 1) : 1;
  }
  return score / iterations;
}

/** Exact count of "outs" that improve the hand category on the next card (Academy helper). */
export function countOuts(hole: Card[], board: Card[]): { outs: number; cards: Card[] } {
  const used = new Set([...hole, ...board].map(key));
  const now = evaluate([...hole, ...board]).category;
  const cards = newDeck().filter((c) => !used.has(key(c)) && evaluate([...hole, ...board, c]).category > now);
  return { outs: cards.length, cards };
}
