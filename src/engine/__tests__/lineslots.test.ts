import { seededRng } from '../rng/rng.ts';
import { lineWins, PAYLINES } from '../games/lineslot.ts';
import * as F from '../games/fishing.ts';
import * as J from '../games/jade.ts';

describe('line slot engine', () => {
  it('pays 3, 4 and 5 in a row from the first reel, wilds substitute', () => {
    const pays: [number, number, number][] = [[1, 2, 3], [5, 10, 20]];
    const g = (row: number[]) => row.map((c) => [9, c, 9]); // middle row = payline 0
    expect(lineWins(g([0, 0, 0, 3, 3]), (c) => c, 1, pays).find((w) => w.line === 0)?.pay).toBe(1);
    expect(lineWins(g([0, 0, 0, 1, 1]), (c) => c, 1, pays).find((w) => w.line === 0)?.pay).toBe(3); // wilds extend the line
    expect(lineWins(g([0, 1, 0, 0, 1]), (c) => c, 1, pays).find((w) => w.line === 0)?.pay).toBe(3);
    expect(lineWins(g([0, 0, 2, 0, 0]), (c) => (c === 2 ? -1 : c), 1, pays).find((w) => w.line === 0)).toBeUndefined();
    expect(PAYLINES).toHaveLength(10);
  });
});

describe('Lago de Oro (fishing)', () => {
  it('collects fish only with fishermen, during free spins, with the right multiplier', () => {
    const rng = seededRng(3);
    let bonusSeen = 0;
    for (let i = 0; i < 3000; i++) {
      const r = F.playFishing(rng, 100);
      expect(r.multiplier).toBeLessThanOrEqual(F.FISHING_MAX_WIN);
      expect(r.payout).toBe(Math.floor(100 * r.multiplier + 1e-9));
      expect(r.spins[0].grid.flat().includes(F.FISHER)).toBe(false); // no fisherman in the base game
      for (const s of r.spins) {
        expect(s.collect).toBe(s.free && s.fishers ? s.fishers * s.fishTotal * s.multiplier : 0);
        expect(F.FISHING_LEVELS).toContain(s.multiplier);
      }
      if (r.spins.length > 1) bonusSeen++;
    }
    expect(bonusSeen).toBeGreaterThan(3);
  });
  it('returns about 95.5 % over many spins', () => {
    const s = F.fishingStats(seededRng(11), 300_000);
    expect(s.rtp).toBeGreaterThan(0.85);
    expect(s.rtp).toBeLessThan(1.06);
    expect(s.hit).toBeGreaterThan(0.23);
    expect(s.hit).toBeLessThan(0.29);
  });
});

describe('Templo de Jade (expanding symbol)', () => {
  it('expands the special symbol only in free spins and pays it on all 10 lines', () => {
    const rng = seededRng(5);
    let expandedSeen = 0;
    for (let i = 0; i < 4000; i++) {
      const r = J.playJade(rng, 100);
      expect(r.multiplier).toBeLessThanOrEqual(J.JADE_MAX_WIN);
      expect(r.spins[0].expanded).toHaveLength(0);
      if (r.special !== null) expect(r.special).toBeLessThan(J.IDOL);
      for (const s of r.spins) {
        if (s.expanded.length) {
          expandedSeen++;
          expect(s.expanded.every((reel) => s.grid[reel].includes(r.special!))).toBe(true);
          const per = s.expandPay / PAYLINES.length;
          expect([...J.JADE_PAYS[r.special!], J.JADE_TWO[r.special!]].some((v) => Math.abs(v - per) < 1e-9)).toBe(true);
        }
      }
    }
    expect(expandedSeen).toBeGreaterThan(0);
  });
  it('returns about 97 % over many spins', () => {
    const s = J.jadeStats(seededRng(13), 300_000);
    expect(s.rtp).toBeGreaterThan(0.88);
    expect(s.rtp).toBeLessThan(1.06);
    expect(s.hit).toBeGreaterThan(0.22);
  });
});
