import { seededRng } from '../rng/rng.ts';
import * as Slots from '../games/slots.ts';
import * as Trader from '../games/trader.ts';
import { runOp } from '../protocol.ts';

describe('slots', () => {
  it('has an exact RTP of about 97 % and wins often enough', () => {
    const { rtp, hit } = Slots.slotsStats();
    expect(rtp).toBeGreaterThan(0.96);
    expect(rtp).toBeLessThan(0.98);
    expect(hit).toBeGreaterThan(0.4);
  });
  it('pays three of a kind and cherries', () => {
    expect(Slots.slotMultiplier(['diamond', 'diamond', 'diamond'])).toBe(500);
    expect(Slots.slotMultiplier(['cherry', 'bar', 'cherry'])).toBe(2);
    expect(Slots.slotMultiplier(['lemon', 'cherry', 'bar'])).toBe(1);
    expect(Slots.slotMultiplier(['lemon', 'bell', 'bar'])).toBe(0);
  });
  it('simulated return converges to the exact RTP', () => {
    const rng = seededRng(99);
    let paid = 0;
    const n = 200000;
    for (let i = 0; i < n; i++) paid += Slots.playSlots(rng, 100).payout;
    expect(paid / (n * 100)).toBeCloseTo(Slots.slotsStats().rtp, 1);
  });
  it('runs through the protocol', () => {
    const r = runOp('slots', null, 'play', { bet: 20 }, { rng: seededRng(1), now: 0 });
    expect(r.stake).toBe(20);
    expect((r.view.line as string[]).length).toBe(3);
  });
});

describe('trader (bolsa)', () => {
  it('pays ×1.98 and up/down are 50/50', () => {
    expect(Trader.TRADER_MULTIPLIER).toBeCloseTo(1.98, 10);
    const rng = seededRng(7);
    let ups = 0;
    const n = 40000;
    for (let i = 0; i < n; i++) if (Trader.playTrader(rng, 10, 'up').won) ups++;
    expect(ups / n).toBeGreaterThan(0.49);
    expect(ups / n).toBeLessThan(0.51);
  });
  it('returns the full path and rejects bad sides', () => {
    const r = Trader.playTrader(seededRng(3), 10, 'down');
    expect(r.path).toHaveLength(Trader.TRADER_TICKS + 1);
    expect(r.path[0]).toBe(Trader.TRADER_START);
    expect(() => runOp('trader', null, 'play', { bet: 10, side: 'sideways' }, { rng: seededRng(1), now: 0 })).toThrow();
  });
});
