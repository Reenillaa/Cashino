import type { GameId } from '../games/types.ts';

export interface GameStats {
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  wagered: number;
  returned: number;
  biggestWin: number;
  bestMultiplier: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayed: number | null;
}

export const emptyStats = (): GameStats => ({
  rounds: 0, wins: 0, losses: 0, pushes: 0, wagered: 0, returned: 0, biggestWin: 0, bestMultiplier: 0, currentStreak: 0, bestStreak: 0, lastPlayed: null,
});

export interface RoundRecord {
  game: GameId;
  bet: number;
  payout: number;
  /** Practice rounds count for stats display but never for rankings, missions coins or achievements. */
  practice: boolean;
  ts: number;
}

export function applyRound(s: GameStats, r: RoundRecord): GameStats {
  const net = r.payout - r.bet;
  const won = net > 0, push = net === 0 && r.bet > 0;
  const mult = r.bet > 0 ? r.payout / r.bet : 0;
  const currentStreak = won ? s.currentStreak + 1 : push ? s.currentStreak : 0;
  return {
    rounds: s.rounds + 1,
    wins: s.wins + (won ? 1 : 0),
    losses: s.losses + (!won && !push ? 1 : 0),
    pushes: s.pushes + (push ? 1 : 0),
    wagered: s.wagered + r.bet,
    returned: s.returned + r.payout,
    biggestWin: Math.max(s.biggestWin, net),
    bestMultiplier: Math.max(s.bestMultiplier, mult),
    currentStreak,
    bestStreak: Math.max(s.bestStreak, currentStreak),
    lastPlayed: r.ts,
  };
}

export interface AchievementDef {
  id: string;
  icon: string;
  xp: number;
  /** Evaluated against aggregated stats. */
  test: (ctx: { byGame: Partial<Record<GameId, GameStats>>; totalRounds: number; lessons: number; tutorials: number; level: number }) => boolean;
}

/** Games retired from the menus (still playable by link); they don't count towards collection goals. */
const RETIRED: string[] = ['keno', 'sicbo'];
const played = (c: { byGame: Partial<Record<GameId, GameStats>> }) => Object.entries(c.byGame).filter(([id, s]) => !RETIRED.includes(id) && s && s.rounds > 0).length;

const g = (ctx: Parameters<AchievementDef['test']>[0], id: GameId) => ctx.byGame[id] ?? emptyStats();

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-round', icon: 'spark', xp: 50, test: (c) => c.totalRounds >= 1 },
  { id: 'rounds-100', icon: 'stack', xp: 150, test: (c) => c.totalRounds >= 100 },
  { id: 'rounds-1000', icon: 'stack', xp: 400, test: (c) => c.totalRounds >= 1000 },
  { id: 'explorer', icon: 'compass', xp: 200, test: (c) => played(c) >= 7 },
  { id: 'completionist', icon: 'grid', xp: 500, test: (c) => played(c) >= 15 },
  { id: 'student', icon: 'book', xp: 150, test: (c) => c.lessons >= 5 },
  { id: 'scholar', icon: 'book', xp: 500, test: (c) => c.lessons >= 30 },
  { id: 'tutorials-all', icon: 'check', xp: 300, test: (c) => c.tutorials >= 15 },
  { id: 'level-10', icon: 'rise', xp: 200, test: (c) => c.level >= 10 },
  { id: 'level-25', icon: 'rise', xp: 500, test: (c) => c.level >= 25 },
  { id: 'crash-10x', icon: 'rocket', xp: 150, test: (c) => g(c, 'crash').bestMultiplier >= 10 },
  { id: 'limbo-100x', icon: 'bolt', xp: 200, test: (c) => g(c, 'limbo').bestMultiplier >= 100 },
  { id: 'mines-5x', icon: 'gem', xp: 150, test: (c) => g(c, 'mines').bestMultiplier >= 5 },
  { id: 'plinko-edge', icon: 'drop', xp: 200, test: (c) => g(c, 'plinko').bestMultiplier >= 9 },
  { id: 'coin-streak-5', icon: 'coin', xp: 200, test: (c) => g(c, 'coinflip').bestMultiplier >= 31 },
  { id: 'hilo-10x', icon: 'cards', xp: 150, test: (c) => g(c, 'hilo').bestMultiplier >= 10 },
  { id: 'crossing-far', icon: 'road', xp: 150, test: (c) => g(c, 'crossing').bestMultiplier >= 5 },
  { id: 'roulette-straight', icon: 'wheel', xp: 200, test: (c) => g(c, 'roulette').bestMultiplier >= 36 },
  { id: 'slots-777', icon: 'spark', xp: 300, test: (c) => g(c, 'slots').bestMultiplier >= 80 },
  { id: 'trader-50', icon: 'rise', xp: 150, test: (c) => g(c, 'trader').rounds >= 50 },
  { id: 'baccarat-tie', icon: 'cards', xp: 150, test: (c) => g(c, 'baccarat').bestMultiplier >= 9 },
  { id: 'blackjack-21', icon: 'cards', xp: 100, test: (c) => g(c, 'blackjack').bestMultiplier >= 2.5 },
  { id: 'poker-100', icon: 'chip', xp: 200, test: (c) => g(c, 'poker').rounds >= 100 },
  { id: 'dice-rounds-50', icon: 'dice', xp: 100, test: (c) => g(c, 'dice').rounds >= 50 },
];

export function newlyUnlocked(ctx: Parameters<AchievementDef['test']>[0], unlocked: Set<string>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.test(ctx));
}
