import * as E from '../meta/economy.ts';
import * as P from '../meta/progression.ts';
import * as R from '../meta/ranking.ts';
import * as A from '../meta/achievements.ts';

describe('economy', () => {
  it('daily streak grows and decays gently', () => {
    let s: E.DailyState = { lastClaimDay: null, streak: 0 };
    let r = E.claimDaily(s, 100);
    expect(r.amount).toBe(500);
    s = r.state;
    expect(() => E.claimDaily(s, 100)).toThrow();
    for (let d = 101; d <= 107; d++) s = E.claimDaily(s, d).state;
    expect(s.streak).toBe(7);
    r = E.claimDaily(s, 110); // missed 2 days → streak 7 - 2 + 1 = 6
    expect(r.state.streak).toBe(6);
    expect(E.claimDaily({ lastClaimDay: 1, streak: 3 }, 50).state.streak).toBe(1);
  });
  it('refills only when nearly empty and at most 3×/day', () => {
    let refill: E.RefillState = { day: 0, used: 0 };
    expect(E.canRefill(500, refill, 10)).toBe(false);
    for (let i = 0; i < 3; i++) {
      const r = E.applyRefill(20, refill, 10);
      expect(r.amount).toBe(1980);
      refill = r.refill;
    }
    expect(E.canRefill(20, refill, 10)).toBe(false);
    expect(E.canRefill(20, refill, 11)).toBe(true);
  });
  it('caps guest migration', () => {
    expect(E.guestMigrationAmount(1e9)).toBe(E.ECONOMY.guestMigrationCap);
    expect(E.guestMigrationAmount(-5)).toBe(0);
  });
});

describe('progression', () => {
  it('levels from XP', () => {
    expect(P.levelFromXp(0)).toEqual({ level: 1, into: 0, needed: 150 });
    expect(P.levelFromXp(150).level).toBe(2);
    expect(P.levelFromXp(1e9).level).toBe(P.XP.maxLevel);
  });
  it('caps round XP per day', () => {
    expect(P.roundXp(0, false)).toBe(10);
    expect(P.roundXp(P.XP.dailyRoundCap - 3, true)).toBe(3);
    expect(P.roundXp(P.XP.dailyRoundCap, false)).toBe(0);
  });
  it('missions are deterministic per day and distinct', () => {
    const a = P.dailyMissions(20000), b = P.dailyMissions(20000);
    expect(a).toEqual(b);
    expect(new Set(a.map((m) => m.id)).size).toBe(3);
    expect(P.weeklyMissions(20000)).toHaveLength(3);
    expect(P.missionIncrement(a[0], { type: 'lesson' })).toBeGreaterThanOrEqual(0);
  });
  it('season boundaries', () => {
    const s = P.seasonAt(Date.UTC(2026, 10, 15));
    expect(s.start).toBeLessThanOrEqual(Date.UTC(2026, 10, 15));
    expect(s.end).toBeGreaterThan(Date.UTC(2026, 10, 15));
    expect(P.seasonTier(P.SEASON_TIER_POINTS * 3 + 1)).toBe(3);
  });
});

describe('rankings', () => {
  it('wilson lower bound penalises small samples', () => {
    expect(R.wilsonLower(9, 10)).toBeLessThan(R.wilsonLower(900, 1000));
    expect(R.blackjackSkill(0, 0)).toBe(0);
  });
  it('elo is (almost) zero-sum and rewards the winner', () => {
    const before = { a: 1200, b: 1200, c: 1200 };
    const after = R.eloUpdate(before, ['a', 'b', 'c']);
    expect(after.a).toBeGreaterThan(1200);
    expect(after.c).toBeLessThan(1200);
    expect(Math.abs(after.a + after.b + after.c - 3600)).toBeLessThanOrEqual(2);
  });
  it('mastery is bounded and not driven by volume alone', () => {
    expect(R.masteryScore({ rounds: 1e6, academyProgress: 0, achievementRatio: 0, tutorialDone: false })).toBe(400);
    expect(R.masteryScore({ rounds: 100, academyProgress: 1, achievementRatio: 1, tutorialDone: true })).toBeGreaterThan(800);
  });
});

describe('stats & achievements', () => {
  it('aggregates rounds', () => {
    let s = A.emptyStats();
    s = A.applyRound(s, { game: 'dice', bet: 10, payout: 20, practice: false, ts: 1 });
    s = A.applyRound(s, { game: 'dice', bet: 10, payout: 0, practice: false, ts: 2 });
    s = A.applyRound(s, { game: 'dice', bet: 10, payout: 10, practice: false, ts: 3 });
    expect(s).toMatchObject({ rounds: 3, wins: 1, losses: 1, pushes: 1, wagered: 30, returned: 30, biggestWin: 10, bestMultiplier: 2, bestStreak: 1 });
  });
  it('unlocks achievements once', () => {
    const ctx = { byGame: { dice: { ...A.emptyStats(), rounds: 60 } }, totalRounds: 60, lessons: 0, tutorials: 0, level: 1 };
    const first = A.newlyUnlocked(ctx, new Set());
    expect(first.map((a) => a.id)).toEqual(expect.arrayContaining(['first-round', 'dice-rounds-50']));
    expect(A.newlyUnlocked(ctx, new Set(first.map((a) => a.id)))).toHaveLength(0);
  });
});
