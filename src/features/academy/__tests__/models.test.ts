import { GAME_IDS } from '@/engine/games/types.ts';
import { gameModel } from '../models';

describe('academy game models', () => {
  it.each(GAME_IDS)('%s builds in both languages with valid numbers', (g) => {
    for (const lang of ['es', 'en'] as const) {
      const m = gameModel(g, lang);
      expect(m.idea.length).toBeGreaterThan(20);
      expect(m.rows.length).toBeGreaterThan(1);
      for (const r of m.rows) {
        expect(r.p).toBeGreaterThan(0);
        expect(r.p).toBeLessThanOrEqual(1);
        if (r.mult !== null) expect(r.mult).toBeGreaterThanOrEqual(0);
      }
      if (m.rtp !== null) {
        expect(m.rtp).toBeGreaterThan(0.85);
        expect(m.rtp).toBeLessThan(1);
      }
      expect(m.formula).not.toMatch(/NaN|undefined|Infinity/);
      expect(m.example).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
  it('plinko distribution sums to 1', () => {
    const m = gameModel('plinko', 'es');
    expect(m.dist!.bins.reduce((a, b) => a + b.p, 0)).toBeCloseTo(1, 10);
  });
  it('outcome probabilities that cover every case sum to 1', () => {
    for (const g of ['keno', 'baccarat'] as const) {
      const rows = gameModel(g, 'es').rows;
      expect(rows.reduce((a, r) => a + r.p, 0)).toBeCloseTo(1, 3);
    }
  });
});
