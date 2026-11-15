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
  it('every bet type returns 36/37', () => {
    const bets: Roulette.RouletteBet[] = [
      { kind: 'straight', numbers: [17] }, { kind: 'split', numbers: [0, 2] }, { kind: 'split', numbers: [5, 8] }, { kind: 'street', row: 4 },
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
    expect(o.payout).toBe(360 + 40);
    expect(Roulette.settleRoulette(0, [{ bet: { kind: 'red' }, amount: 10 }]).payout).toBe(0);
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
