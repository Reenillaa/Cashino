import { makeCard, runRace, oddsFor, betWins, settleBets, validBet, betProb, BET_TYPES, BET_SHAPE, MARGIN, RUNNERS, type RaceCard } from '../games/horses.ts';
import { seededRng } from '../rng/rng.ts';
import { runOp } from '../protocol.ts';

let card: RaceCard;
beforeAll(() => {
  card = makeCard(seededRng(11));
});

describe('horse racing', () => {
  it('builds a full race card the punter can study', () => {
    expect(card.horses).toHaveLength(RUNNERS);
    for (const h of card.horses) {
      expect(h.form).toHaveLength(5);
      expect(h.form.every((p) => p >= 1 && p <= RUNNERS)).toBe(true);
      for (const v of [h.speed, h.stamina, h.accel, h.jockey.skill]) expect(v).toBeGreaterThan(0);
    }
    expect(new Set(card.horses.map((h) => h.name)).size).toBe(RUNNERS);
    expect(card.book.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it('the same seed gives the same card and the same odds (server and app agree)', () => {
    const again = makeCard(seededRng(11));
    expect(again.horses.map((h) => h.name)).toEqual(card.horses.map((h) => h.name));
    expect(oddsFor(again, 'trifecta', [1, 2, 3])).toBe(oddsFor(card, 'trifecta', [1, 2, 3]));
  });

  it('every bet type keeps the bookmaker margin (sum of win chances at the offered odds > 1)', () => {
    const overround = card.horses.reduce((a, h) => a + 1 / oddsFor(card, 'win', [h.n]), 0);
    expect(overround).toBeGreaterThan(1.1);
    for (const t of BET_TYPES) {
      const picks = [1, 2, 3].slice(0, BET_SHAPE[t].picks);
      const p = betProb(card, t, picks);
      expect(p).toBeGreaterThan(0);
      expect(oddsFor(card, t, picks)).toBeLessThanOrEqual(Math.max(1.05, (1 - MARGIN[t]) / p) + 1e-9);
    }
  });

  it('settles each hippodrome bet by the finishing order', () => {
    const fin = [3, 5, 1, 2, 4, 6, 7, 8];
    expect(betWins('win', [3], fin)).toBe(true);
    expect(betWins('place', [1], fin)).toBe(true);
    expect(betWins('place', [2], fin)).toBe(false);
    expect(betWins('quinella', [5, 3], fin)).toBe(true);
    expect(betWins('exacta', [5, 3], fin)).toBe(false);
    expect(betWins('exacta', [3, 5], fin)).toBe(true);
    expect(betWins('trifecta', [3, 5, 1], fin)).toBe(true);
    expect(betWins('trifecta', [1, 5, 3], fin)).toBe(false);
    expect(betWins('trifectaBox', [1, 5, 3], fin)).toBe(true);
    expect(validBet({ type: 'quinella', horses: [2, 2], amount: 10 })).toBe(false);
    const r = settleBets(card, fin, [{ type: 'win', horses: [3], amount: 10 }, { type: 'win', horses: [4], amount: 10 }]);
    expect(r.totalBet).toBe(20);
    expect(r.payout).toBe(Math.floor(10 * oddsFor(card, 'win', [3]) + 1e-9));
  });

  it('runs a race whose animation ends exactly in the finishing order', () => {
    const res = runRace(seededRng(5), card);
    expect([...res.finish].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const ends = res.splits.map((s) => s[s.length - 1]);
    for (let i = 1; i < res.finish.length; i++) expect(ends[res.finish[i - 1] - 1]).toBeGreaterThanOrEqual(ends[res.finish[i] - 1]);
    expect(res.lengths[res.finish[0] - 1]).toBe(0);
  });

  it('protocol: card first (no stake), then bets within the room and the race', () => {
    const rng = seededRng(3);
    const a = runOp('horses', null, 'start', { room: 'r1' }, { rng, now: 0 });
    expect(a.stake).toBe(0);
    expect(a.done).toBe(false);
    expect(() => runOp('horses', a.state, 'run', { bets: [{ type: 'win', horses: [1], amount: 500 }] }, { rng, now: 0 })).toThrow();
    const b = runOp('horses', a.state, 'run', { bets: [{ type: 'win', horses: [1], amount: 20 }, { type: 'trifectaBox', horses: [1, 2, 3], amount: 20 }] }, { rng, now: 0 });
    expect(b.done).toBe(true);
    expect(b.stake).toBe(40);
    // the server's hot-table cap is kept in the round
    const hot = runOp('horses', null, 'start', { room: 'r1', hotCap: 20 }, { rng, now: 0 });
    expect(() => runOp('horses', hot.state, 'run', { bets: [{ type: 'win', horses: [1], amount: 40 }] }, { rng, now: 0 })).toThrow();
  });
});
