/**
 * Virtual economy rules. Coins have NO monetary value: they cannot be bought, sold, transferred,
 * withdrawn or exchanged for anything of value. Values here were chosen with scripts/economy-sim.mjs
 * (see docs/06-ECONOMY.md).
 */
export const ECONOMY = {
  startingBalance: 10_000,
  practiceBalance: 10_000,
  minBet: 1,
  /** Daily gift by streak day (1-indexed). Missing days steps the streak back gently instead of resetting it. */
  dailyRewards: [500, 600, 700, 800, 900, 1_000, 1_500],
  /** Free balance recovery when the wallet is nearly empty. */
  refillThreshold: 100,
  refillAmount: 2_000,
  refillsPerDay: 3,
  levelUpBonusBase: 250,
  /** One-time cap when migrating a guest wallet into an account. */
  guestMigrationCap: 50_000,
} as const;

export const DAY_MS = 86_400_000;
export const utcDay = (ts: number) => Math.floor(ts / DAY_MS);

export interface DailyState {
  lastClaimDay: number | null;
  streak: number;
}

/** Streak after claiming today. Missing k days reduces the streak by k (never below 1), no hard reset. */
export function nextStreak(state: DailyState, today: number): number {
  if (state.lastClaimDay === null) return 1;
  if (today <= state.lastClaimDay) return state.streak;
  const missed = today - state.lastClaimDay - 1;
  return Math.max(1, Math.min(ECONOMY.dailyRewards.length, state.streak - missed + 1));
}

export function canClaimDaily(state: DailyState, today: number): boolean {
  return state.lastClaimDay === null || today > state.lastClaimDay;
}

export function dailyRewardAmount(streak: number): number {
  const i = Math.max(1, Math.min(streak, ECONOMY.dailyRewards.length)) - 1;
  return ECONOMY.dailyRewards[i];
}

export function claimDaily(state: DailyState, today: number): { state: DailyState; amount: number } {
  if (!canClaimDaily(state, today)) throw new Error('Already claimed today');
  const streak = nextStreak(state, today);
  return { state: { lastClaimDay: today, streak }, amount: dailyRewardAmount(streak) };
}

export interface RefillState {
  day: number;
  used: number;
}

export function canRefill(balance: number, refill: RefillState, today: number): boolean {
  const used = refill.day === today ? refill.used : 0;
  return balance < ECONOMY.refillThreshold && used < ECONOMY.refillsPerDay;
}

export function applyRefill(balance: number, refill: RefillState, today: number): { amount: number; refill: RefillState } {
  if (!canRefill(balance, refill, today)) throw new Error('Refill not available');
  const used = refill.day === today ? refill.used : 0;
  return { amount: ECONOMY.refillAmount - balance, refill: { day: today, used: used + 1 } };
}

/** Amount of a guest wallet that may be migrated into a new account (once). */
export function guestMigrationAmount(guestBalance: number): number {
  return Math.max(0, Math.min(Math.floor(guestBalance), ECONOMY.guestMigrationCap));
}
