import { seededRng } from '../rng/rng.ts';
import * as Plinko from '../games/plinko.ts';
import * as Keno from '../games/keno.ts';
import * as Roulette from '../games/roulette.ts';
import * as SicBo from '../games/sicbo.ts';

describe('Plinko', () => {
  it('every table has RTP in [98.5 %, 99.2 %] and is symmetric', () => {
    for (const risk of ['low', 'medium', 'high'] as const) {
      for (let rows = 8; rows <= 16; rows++) {
        const t = Plinko.plinkoTable(rows, risk);
        expect(t).toHaveLength(rows + 1);
        const rtp = Plinko.plinkoRtp(rows, risk);
        expect(rtp).toBeGreaterThanOrEqual(0.985);
        expect(rtp).toBeLessThanOrEqual(0.992);
        expect([...t].reverse()).toEqual(t);
      }
    }
  });
  it('bins follow the binomial distribution (chi-square, 8 rows)', () => {
    const rng = seededRng(20);
    const N = 100000;
    const counts = new Array(9).fill(0);
    for (let i = 0; i < N; i++) counts[Plinko.dropBall(rng, 8).bin]++;
    const chi = counts.reduce((s, o, i) => s + (o - N * Plinko.binProbability(8, i)) ** 2 / (N * Plinko.binProbability(8, i)), 0);
    expect(chi).toBeLessThan(26.1); // p = 0.001, 8 dof
  });
  it('path length equals rows and bin equals rights', () => {
    const r = Plinko.playPlinko(seededRng(21), 100, 12, 'high');
    expect(r.path).toHaveLength(12);
    expect(r.bin).toBe(r.path.filter(Boolean).length);
    expect(r.tableMultiplier).toBe(Plinko.plinkoTable(12, 'high')[r.bin]);
  });
});

describe('Keno', () => {
  it('hypergeometric probabilities sum to 1', () => {
    for (let s = 1; s <= 10; s++) {
      let sum = 0;
      for (let h = 0; h <= s; h++) sum += Keno.kenoHitProbability(s, h);
      expect(sum).toBeCloseTo(1, 10);
    }
  });
  it('every pay table has RTP in [98.5 %, 99.3 %]', () => {
    for (const risk of ['low', 'medium', 'high'] as const) {
      for (let s = 1; s <= 10; s++) {
        expect(Keno.KENO_TABLES[risk][s]).toHaveLength(s + 1);
        const rtp = Keno.kenoRtp(s, risk);
        expect(rtp).toBeGreaterThanOrEqual(0.985);
        expect(rtp).toBeLessThanOrEqual(0.993);
      }
    }
  });
  it('draws 10 distinct numbers 1–40 and counts hits', () => {
    const r = Keno.playKeno(seededRng(22), 10, [1, 2, 3, 4, 5], 'medium');
    expect(new Set(r.drawn).size).toBe(10);
    r.drawn.forEach((n) => expect(n >= 1 && n <= 40).toBe(true));
    expect(r.hits).toEqual(r.picks.filter((p) => r.drawn.includes(p)));
    expect(() => Keno.validatePicks([1, 1])).toThrow();
    expect(() => Keno.validatePicks([41])).toThrow();
    expect(() => Keno.validatePicks([])).toThrow();
  });
});

describe('Roulette (European)', () => {
  it('wheel has every pocket once and 18 reds', () => {
    expect([...Roulette.WHEEL_ORDER].sort((a, b) => a - b)).toEqual([...Array(37).keys()]);
    expect(Roulette.RED_NUMBERS.size).toBe(18);
  });
  it('every bet type returns 36/37 (straights ≈ 97.1 % with the fire numbers)', () => {
    expect(Roulette.rouletteExpectedReturn({ kind: 'straight', numbers: [17] })).toBeCloseTo((30 + (3 / 37) * (102 - 29)) / 37, 12);
    expect(Roulette.rouletteExpectedReturn({ kind: 'straight', numbers: [17] })).toBeGreaterThan(0.97);
    expect(Roulette.rouletteExpectedReturn({ kind: 'straight', numbers: [17] })).toBeLessThan(36 / 37);
    const bets: Roulette.RouletteBet[] = [
      { kind: 'trio', numbers: [0, 2, 3] }, { kind: 'trio', numbers: [0, 1, 2] }, { kind: 'split', numbers: [0, 2] }, { kind: 'split', numbers: [5, 8] }, { kind: 'street', row: 4 },
      { kind: 'corner', numbers: [1, 2, 4, 5] }, { kind: 'line', row: 3 }, { kind: 'column', column: 2 }, { kind: 'dozen', dozen: 3 },
      { kind: 'red' }, { kind: 'black' }, { kind: 'odd' }, { kind: 'even' }, { kind: 'low' }, { kind: 'high' },
    ];
    for (const b of bets) expect(Roulette.rouletteExpectedReturn(b)).toBeCloseTo(36 / 37, 12);
  });
  it('validates geometry', () => {
    expect(() => Roulette.coveredNumbers({ kind: 'split', numbers: [3, 4] })).toThrow();
    expect(() => Roulette.coveredNumbers({ kind: 'corner', numbers: [3, 4, 6, 7] })).toThrow();
    expect(() => Roulette.coveredNumbers({ kind: 'straight', numbers: [37] })).toThrow();
  });
  it('settles multiple bets', () => {
    const o = Roulette.settleRoulette(17, [
      { bet: { kind: 'straight', numbers: [17] }, amount: 10 },
      { bet: { kind: 'black' }, amount: 20 },
      { bet: { kind: 'even' }, amount: 5 },
    ]);
    expect(o.color).toBe('black');
    expect(o.totalBet).toBe(35);
    expect(o.payout).toBe(300 + 40); // straight 29:1 when 17 is not on fire
    expect(Roulette.settleRoulette(0, [{ bet: { kind: 'red' }, amount: 10 }]).payout).toBe(0);
    // on fire: the straight pays the multiplier, other bets don't change
    const f = Roulette.settleRoulette(17, [{ bet: { kind: 'straight', numbers: [17] }, amount: 10 }, { bet: { kind: 'black' }, amount: 20 }], [{ n: 17, m: 200 }, { n: 3, m: 50 }]);
    expect(f.payout).toBe(10 * 201 + 40);
    expect(f.fireHit).toBe(200);
    expect(Roulette.settleRoulette(16, [{ bet: { kind: 'split', numbers: [16, 17] }, amount: 10 }], [{ n: 16, m: 500 }]).payout).toBe(180);
  });
  it('fire numbers: 1–5 distinct numbers, multipliers from the table, frequencies as published', () => {
    const rng = seededRng(77);
    const counts: Record<number, number> = {};
    let k = 0, sum = 0, n = 0;
    for (let i = 0; i < 40000; i++) {
      const f = Roulette.drawFire(rng);
      expect(f.length).toBeGreaterThanOrEqual(1);
      expect(f.length).toBeLessThanOrEqual(5);
      expect(new Set(f.map((x) => x.n)).size).toBe(f.length);
      k += f.length;
      for (const x of f) {
        expect(x.n).toBeGreaterThanOrEqual(0);
        expect(x.n).toBeLessThanOrEqual(36);
        counts[x.m] = (counts[x.m] ?? 0) + 1;
        sum += x.m;
        n++;
      }
    }
    expect(k / 40000).toBeCloseTo(3, 1);
    expect(sum / n).toBeGreaterThan(Roulette.FIRE_MEAN - 4);
    expect(sum / n).toBeLessThan(Roulette.FIRE_MEAN + 4);
    for (const [m, p] of Roulette.FIRE_MULTS) expect(Math.abs(counts[m] / n - p)).toBeLessThan(0.01);
  });
  it('a simulated straight returns what the formula says', () => {
    const rng = seededRng(5);
    const N = 400000;
    let paid = 0;
    for (let i = 0; i < N; i++) paid += Roulette.playRoulette(rng, [{ bet: { kind: 'straight', numbers: [17] }, amount: 1 }]).payout;
    expect(Math.abs(paid / N - Roulette.rouletteExpectedReturn({ kind: 'straight', numbers: [17] }))).toBeLessThan(0.06);
  });
  it('call bets cover the right sectors of the wheel', () => {
    expect(Roulette.callChips('voisins')).toBe(9);
    expect(Roulette.callChips('tiers')).toBe(6);
    expect(Roulette.callChips('orphelins')).toBe(5);
    expect(Roulette.callChips('zero')).toBe(4);
    expect(Roulette.callNumbers('voisins')).toHaveLength(17);
    expect(Roulette.callNumbers('tiers')).toHaveLength(12);
    expect(Roulette.callNumbers('orphelins')).toHaveLength(8);
    expect(Roulette.callNumbers('zero')).toHaveLength(7);
    // voisins, tiers and orphelins split the wheel exactly
    const all = [...Roulette.callNumbers('voisins'), ...Roulette.callNumbers('tiers'), ...Roulette.callNumbers('orphelins')].sort((a, b) => a - b);
    expect(all).toEqual([...Array(37).keys()]);
    expect(Roulette.callNumbers('tiers').sort((a, b) => a - b)).toEqual([5, 8, 10, 11, 13, 16, 23, 24, 27, 30, 33, 36]);
    expect(Roulette.neighbours(0, 2)).toEqual([3, 26, 0, 32, 15]);
    expect(Roulette.expandCall({ neighbours: 26, k: 1 }, 10).map((b) => b.bet)).toEqual([{ kind: 'straight', numbers: [3] }, { kind: 'straight', numbers: [26] }, { kind: 'straight', numbers: [0] }]);
    expect(Roulette.expandCall('voisins', 10).reduce((a, b) => a + b.amount, 0)).toBe(90);
    // tiers pays 17:1 on one chip whichever of its numbers comes up
    for (const n of Roulette.callNumbers('tiers')) expect(Roulette.settleRoulette(n, Roulette.expandCall('tiers', 10)).payout).toBe(180);
    expect(() => Roulette.coveredNumbers({ kind: 'trio', numbers: [0, 1, 3] })).toThrow();
  });
  it('spins uniformly', () => {
    const rng = seededRng(23);
    const c = new Array(37).fill(0);
    for (let i = 0; i < 74000; i++) c[Roulette.spinRoulette(rng)]++;
    c.forEach((x) => expect(Math.abs(x - 2000)).toBeLessThan(250));
  });
});

describe('Sic Bo', () => {
  const er = (b: SicBo.SicBoBet) => SicBo.sicBoExpectedReturn(b);
  it('matches the known house edges', () => {
    expect(er({ kind: 'small' })).toBeCloseTo(1 - 0.0278, 3);
    expect(er({ kind: 'big' })).toBeCloseTo(1 - 0.0278, 3);
    expect(er({ kind: 'odd' })).toBeCloseTo(1 - 0.0278, 3);
    expect(er({ kind: 'total', total: 4 })).toBeCloseTo(61 * 3 / 216, 10);
    expect(er({ kind: 'total', total: 10 })).toBeCloseTo(7 * 27 / 216, 10);
    expect(er({ kind: 'triple', face: 6 })).toBeCloseTo(181 / 216, 10);
    expect(er({ kind: 'anyTriple' })).toBeCloseTo(31 * 6 / 216, 10);
    expect(er({ kind: 'single', face: 3 })).toBeCloseTo(1 - 0.0787, 3);
    expect(er({ kind: 'combo', faces: [1, 2] })).toBeCloseTo(6 * 30 / 216, 10);
    expect(er({ kind: 'double', face: 2 })).toBeCloseTo(11 * 16 / 216, 10);
  });
  it('triples beat small/big', () => {
    expect(SicBo.sicBoReturn({ kind: 'small' }, [2, 2, 2], 10)).toBe(0);
    expect(SicBo.sicBoReturn({ kind: 'big' }, [5, 5, 5], 10)).toBe(0);
    expect(SicBo.sicBoReturn({ kind: 'single', face: 5 }, [5, 5, 5], 10)).toBe(40);
  });
  it('plays several bets at once', () => {
    const r = SicBo.playSicBo(seededRng(24), [{ bet: { kind: 'small' }, amount: 10 }, { bet: { kind: 'total', total: 9 }, amount: 5 }]);
    expect(r.dice).toHaveLength(3);
    expect(r.totalBet).toBe(15);
    expect(() => SicBo.validateSicBo({ kind: 'total', total: 3 })).toThrow();
    expect(() => SicBo.validateSicBo({ kind: 'combo', faces: [2, 2] })).toThrow();
  });
});
