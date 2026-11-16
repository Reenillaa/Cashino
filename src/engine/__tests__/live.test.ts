import { slotAt, liveCard, liveResult, checkLiveBet, livePayout, LIVE_CONFIG } from '../meta/live.ts';
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
