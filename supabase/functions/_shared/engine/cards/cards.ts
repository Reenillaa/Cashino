import { shuffle, type Rng } from '../rng/rng.ts';

export type Suit = 's' | 'h' | 'd' | 'c';
/** Rank 2..14 (11=J, 12=Q, 13=K, 14=A). */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export interface Card {
  rank: Rank;
  suit: Suit;
}

export const SUITS: readonly Suit[] = ['s', 'h', 'd', 'c'];
export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export function newDeck(): Card[] {
  const d: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) d.push({ rank, suit });
  return d;
}

export function newShoe(decks: number): Card[] {
  const s: Card[] = [];
  for (let i = 0; i < decks; i++) s.push(...newDeck());
  return s;
}

export function shuffledDeck(rng: Rng, decks = 1): Card[] {
  return shuffle(rng, decks === 1 ? newDeck() : newShoe(decks));
}

const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
export function rankLabel(r: Rank): string {
  return RANK_LABEL[r] ?? String(r);
}
export function cardCode(c: Card): string {
  return `${rankLabel(c.rank) === '10' ? 'T' : rankLabel(c.rank)}${c.suit}`;
}
export function parseCard(code: string): Card {
  const r = code[0].toUpperCase();
  const map: Record<string, Rank> = { T: 10, J: 11, Q: 12, K: 13, A: 14 };
  const rank = (map[r] ?? Number(r)) as Rank;
  const suit = code[1] as Suit;
  if (!RANKS.includes(rank) || !SUITS.includes(suit)) throw new Error(`Bad card ${code}`);
  return { rank, suit };
}
export function parseCards(codes: string): Card[] {
  return codes.trim().split(/\s+/).filter(Boolean).map(parseCard);
}
export function isRed(c: Card): boolean {
  return c.suit === 'h' || c.suit === 'd';
}
