import { slotAt, liveCard, liveResult, checkLiveBet, livePayout, LIVE_CONFIG, liveCrashMult, liveCrashTime, liveCashout, LIVE_CRASH_CAP } from '../meta/live.ts';
import { oddsFor, type RaceResult } from '../games/horses.ts';

describe('live rounds', () => {
  it('cuts time into slots with betting, a lead-in and the show', () => {
    const t = 1_800_000_000_000 + 12_345;
    const s = slotAt('roulette', t);
    expect(s.opensAt).toBeLessThanOrEqual(t);
    expect(s.endsAt - s.opensAt).toBe(LIVE_CONFIG.roulette.period);
    expect(s.closesAt).toBe(s.opensAt + LIVE_CONFIG.roulette.betting);
    expect(slotAt('roulette', s.endsAt).slot).toBe(s.slot + 1);
  });
  it('card and result are reproducible from their seeds (anyone can re-check a round)', () => {
    const card = liveCard('horses', 42)!;
    expect(liveCard('horses', 42)!.horses.map((h) => h.name)).toEqual(card.horses.map((h) => h.name));
    const a = liveResult('horses', card, 7) as { race: { finish: number[] } };
    const b = liveResult('horses', card, 7) as { race: { finish: number[] } };
    expect(a.race.finish).toEqual(b.race.finish);
    expect(liveCard('roulette', 1)).toBeNull();
  });
  it('validates bets and pays them like the solo games', () => {
    const card = liveCard('horses', 3)!;
    const res = liveResult('horses', card, 9) as { race: RaceResult };
    const winBet = { type: 'win' as const, horses: [res.race.finish[0]], amount: 50 };
    expect(checkLiveBet('horses', winBet)).toBe(50);
    expect(livePayout('horses', card, res, winBet)).toBe(Math.floor(50 * oddsFor(card, 'win', [res.race.finish[0]]) + 1e-9));
    expect(() => checkLiveBet('horses', { type: 'win', horses: [1], amount: 5 })).toThrow();
    expect(() => checkLiveBet('roulette', { bet: { kind: 'split', numbers: [1, 2] }, amount: 50 })).toThrow();
    const red = { bet: { kind: 'red' as const }, amount: 20 };
    expect(livePayout('roulette', null, { number: 1 }, red)).toBe(40);
    expect(livePayout('roulette', null, { number: 2 }, red)).toBe(0);
    expect(livePayout('roulette', null, { number: 0 }, red)).toBe(0);
  });
});

describe('live rocket', () => {
  it('shared crash point under the cap; auto cash-outs pay only below the crash', () => {
    for (let s = 1; s < 200; s++) {
      const r = liveResult('crash', null, s) as { crash: number };
      expect(r.crash).toBeGreaterThanOrEqual(1);
      expect(r.crash).toBeLessThanOrEqual(LIVE_CRASH_CAP);
    }
    expect(livePayout('crash', null, { crash: 3.2 }, { amount: 100, auto: 2 })).toBe(200);
    expect(livePayout('crash', null, { crash: 1.5 }, { amount: 100, auto: 2 })).toBe(0);
    expect(livePayout('crash', null, { crash: 9 }, { amount: 100, auto: null })).toBe(0);
    expect(livePayout('crash', null, { crash: LIVE_CRASH_CAP }, { amount: 100 })).toBe(100 * LIVE_CRASH_CAP);
    // manual cash-out: pays the multiplier at that moment, nothing once it has exploded, never before take-off
    expect(liveCashout(5, { amount: 100 }, liveCrashTime(2) + 1)).toBe(200);
    expect(liveCashout(1.8, { amount: 100 }, liveCrashTime(2) + 1)).toBeNull();
    expect(liveCashout(5, { amount: 100 }, -10)).toBeNull();
    expect(liveCashout(5, { amount: 100, auto: 1.5 }, liveCrashTime(3))).toBe(150);
    // RTP of a fixed auto cash-out is 1 − edge for every target (simulated)
    let paid = 0;
    const N = 40000;
    for (let s = 1; s <= N; s++) paid += livePayout('crash', null, liveResult('crash', null, s * 7919), { amount: 100, auto: 3 });
    expect(paid / (N * 100)).toBeGreaterThan(0.93);
    expect(paid / (N * 100)).toBeLessThan(1.01);
    expect(liveCrashMult(liveCrashTime(10))).toBeCloseTo(10, 1);
    expect(liveCrashMult(10 ** 9)).toBe(LIVE_CRASH_CAP);
    expect(() => checkLiveBet('crash', { amount: 50, auto: 0.5 })).toThrow();
    expect(checkLiveBet('crash', { amount: 50, auto: 2 })).toBe(50);
  });
});
