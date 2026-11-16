import type { Rng } from '../rng/rng.ts';
import { shuffledDeck, type Card } from '../cards/cards.ts';

/**
 * Dragon Tiger (8 decks): one card to Dragon, one to Tiger, the higher card wins (ace is low, suits
 * don't matter). Dragon/Tiger pay 1:1, but on a tie they lose half. Tie pays 11:1.
 */
export type DTBet = 'dragon' | 'tiger' | 'tie';
export type DTBets = Partial<Record<DTBet, number>>;
export const DT_DECKS = 8;
export const DT_TIE_PAYS = 11;

export const dtValue = (c: Card): number => (c.rank === 14 ? 1 : c.rank);

/** Exact probability of a tie with 8 decks, and each bet's return. */
export function dtStats() {
  const perRank = 4 * DT_DECKS, total = 52 * DT_DECKS;
  const tie = (13 * perRank * (perRank - 1)) / (total * (total - 1));
  const side = (1 - tie) / 2;
  return { tie, side, rtpSide: side * 2 + tie * 0.5, rtpTie: tie * (DT_TIE_PAYS + 1) };
}

export function playDragonTiger(rng: Rng, bets: DTBets) {
  const total = (bets.dragon ?? 0) + (bets.tiger ?? 0) + (bets.tie ?? 0);
  if (total <= 0) throw new Error('no_bets');
  const shoe = shuffledDeck(rng, DT_DECKS);
  const dragon = shoe[0], tiger = shoe[1];
  const d = dtValue(dragon), t = dtValue(tiger);
  const winner: DTBet = d > t ? 'dragon' : t > d ? 'tiger' : 'tie';
  let payout = 0;
  if (winner === 'tie') payout = Math.floor((bets.dragon ?? 0) / 2) + Math.floor((bets.tiger ?? 0) / 2) + (bets.tie ?? 0) * (DT_TIE_PAYS + 1);
  else payout = (bets[winner] ?? 0) * 2;
  return { totalBet: total, payout, dragon, tiger, winner };
}
