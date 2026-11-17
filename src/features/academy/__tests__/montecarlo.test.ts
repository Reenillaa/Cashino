import { SIM_OPTIONS, simulate } from '../montecarlo';

describe('Monte Carlo simulator (real engine)', () => {
  for (const [game, opts] of Object.entries(SIM_OPTIONS)) {
    it.each(opts!.map((o, i) => [i, o] as const))(`${game} option %i converges to its theoretical return`, (_i, o) => {
      const r = simulate(o, 20000, 1, 10, 12345);
      expect(r.staked).toBe(20000 * 10 * (o.stakeFactor ?? 1));
      const rtp = r.returned / r.staked;
      // Generous band: high-variance strategies (×10 targets, plenos) move a lot in 20k rounds.
      expect(Math.abs(rtp - o.rtp)).toBeLessThan(o.spread ?? 0.08);
    });
  }
  it('is deterministic for a seed and samples the path', () => {
    const o = SIM_OPTIONS.dice![0];
    const a = simulate(o, 1000, 3, 10, 7), b = simulate(o, 1000, 3, 10, 7);
    expect(a).toEqual(b);
    expect(a.paths).toHaveLength(3);
    expect(a.paths[0].length).toBeGreaterThan(50);
  });
});
