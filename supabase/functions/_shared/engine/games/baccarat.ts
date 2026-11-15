import type { Rng } from '../rng/rng.ts';
import { shuffledDeck, type Card } from '../cards/cards.ts';

/**
 * Punto Banco, 8 decks shuffled fresh every coup (continuous-shuffle equivalent).
 * Pays: Player 1:1 · Banker 0.95:1 (5 % commission) · Tie 8:1 · Player/Banker Pair 11:1.
 * On a tie, Player and Banker bets push.
 */
export const BACCARAT_DECKS = 8;
export type BaccaratBetKind = 'player' | 'banker' | 'tie' | 'playerPair' | 'bankerPair';
export const BACCARAT_PAYS: Record<BaccaratBetKind, number> = { player: 1, banker: 0.95, tie: 8, playerPair: 11, bankerPair: 11 };

export function baccaratValue(c: Card): number {
  return c.rank >= 10 && c.rank <= 13 ? 0 : c.rank === 14 ? 1 : c.rank;
}
export function handTotal(cards: Card[]): number {
  return cards.reduce((s, c) => s + baccaratValue(c), 0) % 10;
}

/** Banker drawing rule when the Player drew a third card with value t. */
export function bankerDraws(bankerTotal: number, playerThird: number | null): boolean {
  if (playerThird === null) return bankerTotal <= 5;
  switch (bankerTotal) {
    case 0: case 1: case 2: return true;
    case 3: return playerThird !== 8;
    case 4: return playerThird >= 2 && playerThird <= 7;
    case 5: return playerThird >= 4 && playerThird <= 7;
    case 6: return playerThird === 6 || playerThird === 7;
    default: return false;
  }
}

export interface Coup {
  player: Card[];
  banker: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: 'player' | 'banker' | 'tie';
  natural: boolean;
  /** Order in which cards were dealt, for the animation. */
  order: ('player' | 'banker')[];
}

/** Deals a coup from the top of `shoe` (index 0 first). */
export function dealCoup(shoe: Card[]): Coup {
  let i = 0;
  const next = () => {
    const c = shoe[i++];
    if (!c) throw new Error('Shoe exhausted');
    return c;
  };
  const player = [next()];
  const banker = [next()];
  player.push(next());
  banker.push(next());
  const order: ('player' | 'banker')[] = ['player', 'banker', 'player', 'banker'];
  let pt = handTotal(player), bt = handTotal(banker);
  const natural = pt >= 8 || bt >= 8;
  if (!natural) {
    let playerThird: number | null = null;
    if (pt <= 5) {
      const c = next();
      player.push(c);
      order.push('player');
      playerThird = baccaratValue(c);
      pt = handTotal(player);
    }
    if (bankerDraws(bt, playerThird)) {
      banker.push(next());
      order.push('banker');
      bt = handTotal(banker);
    }
  }
  return { player, banker, playerTotal: pt, bankerTotal: bt, winner: pt > bt ? 'player' : bt > pt ? 'banker' : 'tie', natural, order };
}

export type BaccaratBets = Partial<Record<BaccaratBetKind, number>>;

export function settleBaccarat(coup: Coup, bets: BaccaratBets): { totalBet: number; payout: number; results: Partial<Record<BaccaratBetKind, number>> } {
  let totalBet = 0, payout = 0;
  const results: Partial<Record<BaccaratBetKind, number>> = {};
  const isPair = (h: Card[]) => h[0].rank === h[1].rank;
  for (const [k, amt] of Object.entries(bets) as [BaccaratBetKind, number][]) {
    if (!amt) continue;
    if (!Number.isInteger(amt) || amt < 0) throw new Error('Invalid amount');
    totalBet += amt;
    let p = 0;
    if (k === 'player' || k === 'banker') {
      if (coup.winner === 'tie') p = amt;
      else if (coup.winner === k) p = Math.floor(amt * (1 + BACCARAT_PAYS[k]) + 1e-9);
    } else if (k === 'tie') {
      if (coup.winner === 'tie') p = amt * (1 + BACCARAT_PAYS.tie);
    } else if (k === 'playerPair') {
      if (isPair(coup.player)) p = amt * 12;
    } else if (k === 'bankerPair') {
      if (isPair(coup.banker)) p = amt * 12;
    }
    results[k] = p;
    payout += p;
  }
  return { totalBet, payout, results };
}

export function playBaccarat(rng: Rng, bets: BaccaratBets) {
  const coup = dealCoup(shuffledDeck(rng, BACCARAT_DECKS));
  return { coup, ...settleBaccarat(coup, bets) };
}
