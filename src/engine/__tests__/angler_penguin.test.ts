import { seededRng } from '../rng/rng.ts';
import * as A from '../games/angler.ts';
import * as P from '../games/penguin.ts';
import { runOp } from '../protocol.ts';

describe('Pesca Profunda (angler)', () => {
  it('chances add up to 1 and rarer fish pay more', () => {
    const total = Object.values(A.ANGLER_FISH).reduce((a, f) => a + f.p, 0);
    expect(total).toBeCloseTo(1, 9);
    const mults = A.ANGLER_GOOD.map(A.anglerMultiplier);
    for (let i = 1; i < mults.length; i++) expect(mults[i]).toBeGreaterThan(mults[i - 1]);
  });
  it('every pick returns between 94 % and 96 % of the bet', () => {
    for (const f of A.ANGLER_GOOD) {
      expect(A.anglerReturn(f)).toBeGreaterThan(0.94);
      expect(A.anglerReturn(f)).toBeLessThanOrEqual(0.96 + 1e-9);
    }
  });
  it('pays prize + bond on a win, the bond on a miss and nothing on a bad catch', () => {
    const rng = seededRng(4);
    let seen = { win: 0, miss: 0, bad: 0 };
    for (let i = 0; i < 20000; i++) {
      const r = A.playAngler(rng, 100, 'sardine');
      expect(r.stake).toBe(150);
      if (r.bad) { expect(r.payout).toBe(0); seen.bad++; }
      else if (r.won) { expect(r.payout).toBe(Math.floor(100 * A.anglerMultiplier('sardine')) + 50); seen.win++; }
      else { expect(r.payout).toBe(50); seen.miss++; }
    }
    expect(seen.win).toBeGreaterThan(6000);
    expect(seen.bad).toBeGreaterThan(1200);
    // simulated return matches the formula
    const rng2 = seededRng(9);
    let net = 0;
    for (let i = 0; i < 200000; i++) { const r = A.playAngler(rng2, 100, 'clownfish'); net += r.payout - r.stake; }
    expect(1 + net / 200000 / 100).toBeCloseTo(A.anglerReturn('clownfish'), 1);
  });
  it('room limits apply to the bet, not to the bond', () => {
    const r = runOp('angler', null, 'play', { bet: 100, pick: 'tuna', room: 'r1' }, { rng: seededRng(1), now: 0 });
    expect(r.stake).toBe(150);
    expect(() => runOp('angler', null, 'play', { bet: 100, pick: 'boot', room: 'r1' }, { rng: seededRng(1), now: 0 })).toThrow();
  });
});

describe('Pingüino Saltarín (penguin)', () => {
  it('cashing out after k hops returns 99 % on average', () => {
    for (const d of ['easy', 'medium', 'hard', 'extreme'] as const) {
      for (const k of [1, 3, 6]) expect(P.penguinMultiplier(d, k) * P.penguinSurvival(d, k)).toBeCloseTo(0.99, 3);
    }
  });
  it('plays through the protocol: hop, crack or cash out', () => {
    const rng = seededRng(7);
    let lost = 0, cashed = 0;
    for (let i = 0; i < 300; i++) {
      let r = runOp('penguin', null, 'start', { bet: 20, difficulty: 'hard', room: 'r1' }, { rng, now: 0 });
      let st = r.state;
      for (let k = 0; k < 3 && !r.done; k++) { r = runOp('penguin', st, 'hop', {}, { rng, now: 0 }); st = r.state; }
      if (!r.done) r = runOp('penguin', st, 'cashout', {}, { rng, now: 0 });
      if (r.payout > 0) { cashed++; expect(r.payout).toBe(Math.floor(20 * P.penguinMultiplier('hard', 3))); } else lost++;
    }
    expect(lost).toBeGreaterThan(50);
    expect(cashed).toBeGreaterThan(80);
  });
});
