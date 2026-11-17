import { dailyMissions, weeklyMissions } from '../meta/progression.ts';
import { FREE_UNLOCK_CREDITS, TRIAL_ROUNDS, isUnlocked, trialLeft, unlockPrice, type UnlockId } from '../meta/unlocks.ts';

describe('missions only for unlocked games', () => {
  it('never offers a game mission for a locked game', () => {
    const owned = ['game:roulette'];
    for (let day = 20000; day < 20400; day++) {
      for (const m of [...dailyMissions(day, owned), ...weeklyMissions(day, owned)]) {
        if (m.game) expect(isUnlocked(owned, `game:${m.game}` as UnlockId)).toBe(true);
      }
      expect(dailyMissions(day, owned)).toHaveLength(3);
    }
  });
  it('is the same set for the same day and unlocks (app and server agree)', () => {
    expect(dailyMissions(20123, ['game:slots']).map((m) => m.id)).toEqual(dailyMissions(20123, ['game:slots']).map((m) => m.id));
  });
});

describe('trials and free unlocks', () => {
  it('gives 3 trial rounds and 1 free unlock', () => {
    expect(TRIAL_ROUNDS).toBe(3);
    expect(FREE_UNLOCK_CREDITS).toBe(1);
    expect(trialLeft(undefined)).toBe(3);
    expect(trialLeft(2)).toBe(1);
    expect(trialLeft(5)).toBe(0);
  });
  it('free unlocks do not raise the price ladder (price counts paid unlocks only)', () => {
    // a free game and no purchase: the first purchase still costs the first price
    expect(unlockPrice(0, 0)).toBe(2500);
  });
});
