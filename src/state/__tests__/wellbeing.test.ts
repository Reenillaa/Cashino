import { changeTimeLimit, dayOf, effectiveLimit, useWellbeing, weekSummary } from '../wellbeing';
import { useSettings } from '../settings';

describe('responsible play', () => {
  beforeEach(() => {
    useWellbeing.setState({ days: {}, lossAlertDay: null, pendingLimit: null });
    useSettings.setState({ dailyTimeLimitMin: 0 });
  });
  it('a lower limit applies at once; a higher one (or none) only from tomorrow', () => {
    const now = Date.UTC(2026, 10, 20, 12);
    changeTimeLimit(60, now);
    expect(effectiveLimit(useSettings.getState().dailyTimeLimitMin, useWellbeing.getState().pendingLimit, dayOf(now))).toBe(60);
    changeTimeLimit(30, now);
    expect(effectiveLimit(30, useWellbeing.getState().pendingLimit, dayOf(now))).toBe(30);
    changeTimeLimit(120, now);
    expect(effectiveLimit(120, useWellbeing.getState().pendingLimit, dayOf(now))).toBe(30);
    expect(effectiveLimit(120, useWellbeing.getState().pendingLimit, dayOf(now) + 1)).toBe(120);
    changeTimeLimit(0, now);
    expect(effectiveLimit(0, useWellbeing.getState().pendingLimit, dayOf(now))).toBe(30);
  });
  it('adds up the week honestly', () => {
    const now = Date.UTC(2026, 10, 20, 12);
    const w = useWellbeing.getState();
    w.addRound(100, 0, now);
    w.addRound(100, 250, now);
    w.addTime(30 * 60_000, now);
    w.addRound(50, 0, now - 8 * 86_400_000); // older than a week: not counted
    const s = weekSummary(useWellbeing.getState().days, now);
    expect(s.total).toEqual({ ms: 30 * 60_000, rounds: 2, bet: 200, payout: 250 });
    expect(s.net).toBe(50);
    expect(s.list).toHaveLength(7);
  });
});
