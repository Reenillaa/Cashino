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
  { id: 'sicbo', category: 'table', tint: gameTint.sicbo, rtp: '97.2 % (Small/Big)', edge: '2.8–30 %', multiStep: false, online: true },
];

export const META: Record<GameId, GameMeta> = Object.fromEntries(CATALOG.map((g) => [g.id, g])) as Record<GameId, GameMeta>;
