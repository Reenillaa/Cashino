import { seededRng } from '../rng/rng.ts';
import { SCRATCH, SCRATCH_CARDS, playScratch, scratchHit, scratchPrizeFromLayout, scratchRtp } from '../games/scratch.ts';
import { runOp } from '../protocol.ts';

describe('Rasca y gana', () => {
  it('every card returns 86–92 % and pays something at least 1 time in 6', () => {
    for (const c of SCRATCH_CARDS) {
      expect(scratchRtp(c)).toBeGreaterThanOrEqual(0.86 - 1e-9);
      expect(scratchRtp(c)).toBeLessThanOrEqual(0.92 + 1e-9);
      expect(scratchHit(c)).toBeGreaterThan(0.17);
    }
  });
  it('what is under the foil is exactly the prize paid (never a hidden or missing win)', () => {
    const rng = seededRng(11);
    for (const c of SCRATCH_CARDS) {
      for (let i = 0; i < 4000; i++) {
        const r = playScratch(rng, c);
        expect(scratchPrizeFromLayout(c, r.layout)).toBe(r.payout);
      }
    }
  });
  it('simulated return matches the prize table', () => {
    const rng = seededRng(5);
    for (const c of SCRATCH_CARDS) {
      let paid = 0;
      const n = 200000;
      for (let i = 0; i < n; i++) paid += playScratch(rng, c).payout;
      // the big prizes are rare, so allow a margin
      expect(Math.abs(paid / (n * SCRATCH[c].price) - scratchRtp(c))).toBeLessThan(0.12);
    }
  });
  it('is sold at its fixed price whatever the room', () => {
    const r = runOp('scratch', null, 'play', { card: 'paella', room: 'r1' }, { rng: seededRng(2), now: 0 });
    expect(r.stake).toBe(1000);
    expect(() => runOp('scratch', null, 'play', { card: 'nope', room: 'r1' }, { rng: seededRng(2), now: 0 })).toThrow();
  });
});
