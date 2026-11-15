import { useWallet } from '../wallet';
import { useLearning, tutorialKey } from '../learning';
import { useProgress } from '../progress';
import { ECONOMY } from '@/engine/meta/economy.ts';

describe('wallet store', () => {
  beforeEach(() => useWallet.getState().resetAll());
  it('starts with the simulated starting balance and never goes negative', () => {
    expect(useWallet.getState().balance).toBe(ECONOMY.startingBalance);
    expect(useWallet.getState().debit(ECONOMY.startingBalance + 1, 'bet')).toBe(false);
    expect(useWallet.getState().debit(100, 'bet', 'dice')).toBe(true);
    expect(useWallet.getState().balance).toBe(ECONOMY.startingBalance - 100);
    expect(useWallet.getState().ledger[0]).toMatchObject({ kind: 'bet', amount: -100, game: 'dice' });
  });
  it('daily gift once per day and refill only when nearly empty', () => {
    const now = Date.UTC(2026, 10, 15, 12);
    expect(useWallet.getState().claimDaily(now)).toBe(ECONOMY.dailyRewards[0]);
    expect(useWallet.getState().canClaimDaily(now)).toBe(false);
    expect(useWallet.getState().canRefill(now)).toBe(false);
    useWallet.setState({ balance: 5 });
    expect(useWallet.getState().refillNow(now)).toBe(ECONOMY.refillAmount - 5);
    expect(useWallet.getState().balance).toBe(ECONOMY.refillAmount);
  });
  it('practice chips are separate from coins', () => {
    useWallet.getState().practiceDebit(300);
    expect(useWallet.getState().practice).toBe(ECONOMY.practiceBalance - 300);
    expect(useWallet.getState().balance).toBe(ECONOMY.startingBalance);
  });
});

describe('learning store', () => {
  beforeEach(() => useLearning.getState().resetAll());
  it('stores tutorial completion with the required key names', () => {
    useLearning.getState().completeTutorial('poker');
    expect(useLearning.getState().tutorials).toEqual({ poker_tutorial_completed: true });
    expect(tutorialKey('crash')).toBe('crash_tutorial_completed');
    expect(useLearning.getState().isTutorialDone('poker')).toBe(true);
    expect(useLearning.getState().isTutorialDone('blackjack')).toBe(false);
  });
  it('merges remote progress as a union', () => {
    useLearning.getState().completeLesson('dice.probability');
    useLearning.getState().mergeRemote({ tutorials: { crash_tutorial_completed: true }, lessons: { 'poker.positions': 1 } });
    const s = useLearning.getState();
    expect(Object.keys(s.lessons).sort()).toEqual(['dice.probability', 'poker.positions']);
    expect(s.tutorials.crash_tutorial_completed).toBe(true);
  });
});

describe('progress store', () => {
  beforeEach(() => useProgress.getState().resetAll());
  it('records rounds, XP (not for practice) and achievements', () => {
    const p = useProgress.getState();
    expect(p.recordRound({ game: 'dice', ts: Date.now(), bet: 10, payout: 20, practice: true, detail: 'x' }).xp).toBe(0);
    expect(useProgress.getState().practiceStats.dice?.rounds).toBe(1);
    expect(useProgress.getState().recordRound({ game: 'dice', ts: Date.now(), bet: 10, payout: 20, practice: false, detail: 'x' }).xp).toBe(10);
    const unlocked = useProgress.getState().checkAchievements({ lessons: 0, tutorials: 0 });
    expect(unlocked).toContain('first-round');
    expect(useProgress.getState().xp).toBeGreaterThan(10);
  });
});
