import type { GameId } from '@/engine/games/types.ts';
import { gameTint } from '@/design/tokens';

export type GameCategory = 'cards' | 'originals' | 'table';

export interface GameMeta {
  id: GameId;
  category: GameCategory;
  tint: string;
  /** RTP shown in rules (exact or range). */
  rtp: string;
  edge: string;
  multiStep: boolean;
  /** Has a server-authoritative online mode. */
  online: boolean;
  multiplayer?: boolean;
}

export const CATALOG: GameMeta[] = [
  { id: 'poker', category: 'cards', tint: gameTint.poker, rtp: '—', edge: '0 % (P2P)', multiStep: true, online: true, multiplayer: true },
  { id: 'blackjack', category: 'cards', tint: gameTint.blackjack, rtp: '≈99.5 %', edge: '≈0.5 %', multiStep: true, online: true },
  { id: 'crash', category: 'originals', tint: gameTint.crash, rtp: '99 %', edge: '1 %', multiStep: true, online: true },
  { id: 'dice', category: 'originals', tint: gameTint.dice, rtp: '99 %', edge: '1 %', multiStep: false, online: true },
  { id: 'mines', category: 'originals', tint: gameTint.mines, rtp: '99 %', edge: '1 %', multiStep: true, online: true },
  { id: 'plinko', category: 'originals', tint: gameTint.plinko, rtp: '98.6–99.0 %', edge: '1.0–1.4 %', multiStep: false, online: true },
  { id: 'crossing', category: 'originals', tint: gameTint.crossing, rtp: '99 %', edge: '1 %', multiStep: true, online: true },
  { id: 'roulette', category: 'table', tint: gameTint.roulette, rtp: '97.3 %', edge: '2.70 %', multiStep: false, online: true },
  { id: 'limbo', category: 'originals', tint: gameTint.limbo, rtp: '99 %', edge: '1 %', multiStep: false, online: true },
  { id: 'coinflip', category: 'originals', tint: gameTint.coinflip, rtp: '99 %', edge: '1 %', multiStep: true, online: true },
  { id: 'baccarat', category: 'cards', tint: gameTint.baccarat, rtp: '98.8 % (B)', edge: '1.06–14.4 %', multiStep: false, online: true },
  { id: 'hilo', category: 'cards', tint: gameTint.hilo, rtp: '99 %', edge: '1 %', multiStep: true, online: true },
  { id: 'keno', category: 'originals', tint: gameTint.keno, rtp: '98.5–99.3 %', edge: '0.7–1.5 %', multiStep: false, online: true },
  { id: 'slots', category: 'originals', tint: gameTint.slots, rtp: '97.4 %', edge: '2.6 %', multiStep: false, online: true },
  { id: 'horses', category: 'originals', tint: gameTint.horses, rtp: '75–85 %', edge: '15–25 %', multiStep: true, online: true },
  { id: 'wheel', category: 'originals', tint: gameTint.wheel, rtp: '99 %', edge: '1 %', multiStep: false, online: true },
  { id: 'towers', category: 'originals', tint: gameTint.towers, rtp: '99 %', edge: '1 %', multiStep: true, online: true },
  { id: 'diamonds', category: 'originals', tint: gameTint.diamonds, rtp: '99 %', edge: '1 %', multiStep: false, online: true },
  { id: 'fishing', category: 'originals', tint: gameTint.fishing, rtp: '≈95.6 %', edge: '≈4.4 %', multiStep: false, online: true },
  { id: 'jade', category: 'originals', tint: gameTint.jade, rtp: '≈97 %', edge: '≈3 %', multiStep: false, online: true },
  { id: 'goldmine', category: 'originals', tint: gameTint.goldmine, rtp: '≈95.8 %', edge: '≈4.2 %', multiStep: false, online: true },
  { id: 'fruits', category: 'originals', tint: gameTint.fruits, rtp: '≈97.6 %', edge: '≈2.4 %', multiStep: false, online: true },
  { id: 'pirate', category: 'originals', tint: gameTint.pirate, rtp: '≈95.5 %', edge: '≈4.5 %', multiStep: false, online: true },
  { id: 'angler', category: 'originals', tint: gameTint.angler, rtp: '94.6–96 %', edge: '4–5.4 %', multiStep: false, online: true },
  { id: 'penguin', category: 'originals', tint: gameTint.penguin, rtp: '99 %', edge: '1 %', multiStep: true, online: true },
  { id: 'scratch', category: 'originals', tint: gameTint.scratch, rtp: '86–92 %', edge: '8–14 %', multiStep: false, online: true },
  { id: 'cascade', category: 'originals', tint: gameTint.cascade, rtp: '≈96.5 %', edge: '≈3.5 %', multiStep: false, online: true },
  { id: 'pump', category: 'originals', tint: gameTint.pump, rtp: '99 %', edge: '1 %', multiStep: true, online: true },
  { id: 'dragontiger', category: 'cards', tint: gameTint.dragontiger, rtp: '96.3 %', edge: '3.7–10.4 %', multiStep: false, online: true },
  { id: 'videopoker', category: 'cards', tint: gameTint.videopoker, rtp: '99.5 %', edge: '0.5 %', multiStep: true, online: true },
  { id: 'trader', category: 'originals', tint: gameTint.trader, rtp: '99 %', edge: '1 %', multiStep: false, online: true },
  { id: 'sicbo', category: 'table', tint: gameTint.sicbo, rtp: '97.2 % (Small/Big)', edge: '2.8–30 %', multiStep: false, online: true },
];

export const META: Record<GameId, GameMeta> = Object.fromEntries(CATALOG.map((g) => [g.id, g])) as Record<GameId, GameMeta>;

/** Games kept working (deep links, history) but no longer shown in the lobby. */
export const HIDDEN_GAMES: GameId[] = ['keno', 'sicbo'];
/** What the lobby, the collection and the Academy show, in order (most famous first). */
export const VISIBLE_GAMES: GameMeta[] = [
  ...(['blackjack', 'poker', 'roulette', 'horses', 'videopoker', 'baccarat', 'crash', 'angler', 'penguin', 'slots', 'cascade', 'fishing', 'goldmine', 'jade', 'fruits', 'pirate', 'wheel', 'towers', 'pump', 'diamonds', 'dragontiger', 'trader', 'dice', 'mines', 'plinko', 'coinflip', 'hilo', 'limbo', 'crossing'] as GameId[]).map((id) => META[id]),
];

/** The slot hall: every slot machine, newest first, with what makes each one different. */
export const SLOT_HALL: { id: GameId; reels: string; max: number; free: boolean }[] = [
  { id: 'fishing', reels: '5×3', max: 5000, free: true },
  { id: 'jade', reels: '5×3', max: 5000, free: true },
  { id: 'goldmine', reels: '5×3', max: 5000, free: true },
  { id: 'fruits', reels: '5×3', max: 5000, free: true },
  { id: 'pirate', reels: '5×3', max: 2000, free: true },
  { id: 'cascade', reels: '6×5', max: 5000, free: true },
  { id: 'slots', reels: '3', max: 500, free: false },
];
