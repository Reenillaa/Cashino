import type { GameId } from '../games/types.ts';
import { DAY_MS } from './economy.ts';

/** XP never depends on coins won or lost: it rewards playing, learning and completing goals. */
export const XP = {
  perRound: 10,
  perMultiStepRound: 14,
  /** Rounds only award XP up to this amount per UTC day (anti-compulsive design). */
  dailyRoundCap: 1_200,
  lessonComplete: 60,
  quizPerfect: 40,
  tutorialComplete: 50,
  maxLevel: 100,
} as const;

/** XP needed to go from level L to L+1. */
export function xpToNext(level: number): number {
  return Math.round(150 * Math.pow(level, 1.35));
}

export function levelFromXp(totalXp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (level < XP.maxLevel && remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return { level, into: remaining, needed: level >= XP.maxLevel ? 0 : xpToNext(level) };
}

/** XP granted for a finished round given how much round-XP was already earned today. */
export function roundXp(earnedToday: number, multiStep: boolean): number {
  const base = multiStep ? XP.perMultiStepRound : XP.perRound;
  return Math.max(0, Math.min(base, XP.dailyRoundCap - earnedToday));
}

// ─────────────────────────────── Seasons ───────────────────────────────
export const SEASON_EPOCH = Date.UTC(2026, 0, 5); // Monday 5 Jan 2026
export const SEASON_DAYS = 56;

export function seasonAt(ts: number): { number: number; start: number; end: number } {
  const n = Math.floor((ts - SEASON_EPOCH) / (SEASON_DAYS * DAY_MS));
  const start = SEASON_EPOCH + n * SEASON_DAYS * DAY_MS;
  return { number: n + 1, start, end: start + SEASON_DAYS * DAY_MS };
}

/** Season pass: 30 free tiers of cosmetic rewards, 400 season points each. */
export const SEASON_TIER_POINTS = 400;
export const SEASON_TIERS = 30;
export function seasonTier(points: number): number {
  return Math.min(SEASON_TIERS, Math.floor(points / SEASON_TIER_POINTS));
}
/** Chips for reaching a pass tier (1…30): every 5th tier is a big one. Free for everybody, no paid track. */
export function passReward(tier: number): number {
  if (!Number.isInteger(tier) || tier < 1 || tier > SEASON_TIERS) return 0;
  return tier % 5 === 0 ? 150 + tier * 20 : 40 + tier * 8;
}
/** Week number used by the friend leagues (weeks start on Monday 00:00 UTC). */
export const weekAt = (ts: number) => Math.floor((ts - SEASON_EPOCH) / (7 * DAY_MS)) + 1;

// ─────────────────────────────── Missions ───────────────────────────────
export type MissionKind = 'playRounds' | 'playGame' | 'winRounds' | 'lesson' | 'quiz' | 'multiplier' | 'pokerHands' | 'variety';
export interface MissionDef {
  id: string;
  kind: MissionKind;
  game?: GameId;
  target: number;
  coins: number;
  xp: number;
  sp: number;
}

const DAILY_POOL: MissionDef[] = [
  { id: 'd-play-10', kind: 'playRounds', target: 10, coins: 30, xp: 60, sp: 40 },
  { id: 'd-variety-3', kind: 'variety', target: 3, coins: 30, xp: 60, sp: 40 },
  { id: 'd-lesson-1', kind: 'lesson', target: 1, coins: 40, xp: 80, sp: 60 },
  { id: 'd-quiz-1', kind: 'quiz', target: 1, coins: 30, xp: 60, sp: 40 },
  { id: 'd-mult-3', kind: 'multiplier', target: 3, coins: 30, xp: 60, sp: 40 },
  { id: 'd-poker-5', kind: 'pokerHands', target: 5, coins: 30, xp: 60, sp: 40 },
  { id: 'd-win-5', kind: 'winRounds', target: 5, coins: 25, xp: 50, sp: 30 },
  { id: 'd-bj-5', kind: 'playGame', game: 'blackjack', target: 5, coins: 25, xp: 50, sp: 30 },
  { id: 'd-mines-5', kind: 'playGame', game: 'mines', target: 5, coins: 25, xp: 50, sp: 30 },
  { id: 'd-roulette-5', kind: 'playGame', game: 'roulette', target: 5, coins: 25, xp: 50, sp: 30 },
  { id: 'd-plinko-10', kind: 'playGame', game: 'plinko', target: 10, coins: 25, xp: 50, sp: 30 },
  { id: 'd-baccarat-5', kind: 'playGame', game: 'baccarat', target: 5, coins: 25, xp: 50, sp: 30 },
  { id: 'd-slots-10', kind: 'playGame', game: 'slots', target: 10, coins: 25, xp: 50, sp: 30 },
  { id: 'd-vp-5', kind: 'playGame', game: 'videopoker', target: 5, coins: 25, xp: 50, sp: 30 },
  { id: 'd-trader-5', kind: 'playGame', game: 'trader', target: 5, coins: 25, xp: 50, sp: 30 },
];

const WEEKLY_POOL: MissionDef[] = [
  { id: 'w-play-100', kind: 'playRounds', target: 100, coins: 200, xp: 400, sp: 300 },
  { id: 'w-variety-8', kind: 'variety', target: 8, coins: 200, xp: 400, sp: 300 },
  { id: 'w-lesson-5', kind: 'lesson', target: 5, coins: 250, xp: 500, sp: 400 },
  { id: 'w-poker-40', kind: 'pokerHands', target: 40, coins: 200, xp: 400, sp: 300 },
  { id: 'w-mult-10', kind: 'multiplier', target: 10, coins: 150, xp: 300, sp: 250 },
  { id: 'w-slots-60', kind: 'playGame', game: 'slots', target: 60, coins: 200, xp: 400, sp: 300 },
  { id: 'w-vp-30', kind: 'playGame', game: 'videopoker', target: 30, coins: 200, xp: 400, sp: 300 },
  { id: 'w-trader-30', kind: 'playGame', game: 'trader', target: 30, coins: 150, xp: 300, sp: 250 },
  { id: 'w-win-40', kind: 'winRounds', target: 40, coins: 200, xp: 400, sp: 300 },
];

function pick<T>(pool: T[], seed: number, n: number): T[] {
  const a = pool.slice();
  let x = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    const j = x % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** Deterministic mission sets: everyone gets the same missions on the same UTC day / week. */
export function dailyMissions(day: number): MissionDef[] {
  return pick(DAILY_POOL, day * 2654435761, 3);
}
/** Days left until the weekly challenges change (weeks start on Monday, UTC). */
export function weeklyDaysLeft(day: number): number {
  return 7 - ((day + 3) % 7);
}
export function weeklyMissions(day: number): MissionDef[] {
  return pick(WEEKLY_POOL, Math.floor((day + 3) / 7) * 40503, 3);
}

export interface MissionEvent {
  type: 'round' | 'lesson' | 'quiz';
  game?: GameId;
  won?: boolean;
  multiplier?: number;
}

/** Progress increment a mission gets from an event (variety is handled by the caller using distinct games). */
export function missionIncrement(m: MissionDef, e: MissionEvent): number {
  switch (m.kind) {
    case 'playRounds': return e.type === 'round' ? 1 : 0;
    case 'playGame': return e.type === 'round' && e.game === m.game ? 1 : 0;
    case 'winRounds': return e.type === 'round' && e.won ? 1 : 0;
    case 'lesson': return e.type === 'lesson' ? 1 : 0;
    case 'quiz': return e.type === 'quiz' ? 1 : 0;
    case 'multiplier': return e.type === 'round' && (e.multiplier ?? 0) >= 2 ? 1 : 0;
    case 'pokerHands': return e.type === 'round' && e.game === 'poker' ? 1 : 0;
    case 'variety': return 0;
  }
}
