import { unlockPrice, nicePrice, isUnlocked, unlockRequires, UNLOCKABLES, FREE_UNLOCKS } from '../meta/unlocks.ts';

describe('unlocks', () => {
  it('starts at 2 500, then 5 000, then grows ×1.5 and with the biggest bankroll ever held', () => {
    expect(unlockPrice(0, 1e9)).toBe(2500);
    expect(unlockPrice(1, 1e9)).toBe(5000);
    expect(unlockPrice(2, 0)).toBe(7500);
    expect(unlockPrice(3, 0)).toBe(12000); // 11 250 → 12 000
    expect(unlockPrice(2, 100_000)).toBe(40000);
    for (let k = 2; k < 30; k++) expect(unlockPrice(k + 1, 0)).toBeGreaterThan(unlockPrice(k, 0));
  });
  it('rounds to two significant figures and keeps blackjack and poker free', () => {
    expect(nicePrice(12345)).toBe(13000);
    expect(nicePrice(7500)).toBe(7500);
    expect(isUnlocked([], 'game:poker')).toBe(true);
    expect(isUnlocked([], 'game:roulette')).toBe(false);
    expect(UNLOCKABLES.some((u) => FREE_UNLOCKS.includes(u))).toBe(false);
    expect(unlockRequires('sport:nba')).toBe('sports');
  });
});
