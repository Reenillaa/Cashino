import { fairRng, seededRng } from '../rng/rng.ts';
import * as Crash from '../games/crash.ts';
import * as Limbo from '../games/limbo.ts';
import * as Dice from '../games/dice.ts';
import * as Coin from '../games/coinflip.ts';
import * as Mines from '../games/mines.ts';
import * as Crossing from '../games/crossing.ts';
import * as Hilo from '../games/hilo.ts';
import { payoutFor } from '../games/types.ts';

const N = 200_000;

describe('Crash', () => {
  it('P(crash ≥ x) ≈ 0.99/x', () => {
    const rng = seededRng(1);
    const pts = Array.from({ length: N }, () => Crash.crashPoint(rng));
    for (const x of [1.5, 2, 5, 10]) {
      const p = pts.filter((c) => c >= x).length / N;
      expect(Math.abs(p - 0.99 / x)).toBeLessThan(0.006);
    }
    expect(pts.reduce((a, b) => Math.min(a, b), Infinity)).toBeGreaterThanOrEqual(1);
    expect(pts.reduce((a, b) => Math.max(a, b), 0)).toBeLessThanOrEqual(Crash.CRASH_MAX);
  });
  it('curve and inverse are consistent', () => {
    expect(Crash.multiplierAt(0)).toBe(1);
    expect(Crash.multiplierAt(Crash.timeFor(2))).toBeCloseTo(2, 6);
  });
  it('settles cash-outs correctly', () => {
    expect(Crash.settleCrash(100, 3.5, 2)).toMatchObject({ payout: 200, won: true });
    expect(Crash.settleCrash(100, 1.9, 2)).toMatchObject({ payout: 0, won: false });
    expect(Crash.settleCrash(100, 3, null).payout).toBe(0);
    expect(Crash.settleCrash(100, 3, 3).won).toBe(true);
  });
  it('is reproducible from a fair seed', () => {
    const s = { serverSeed: 'a', clientSeed: 'b', nonce: 7 };
    expect(Crash.crashPoint(fairRng(s))).toBe(Crash.crashPoint(fairRng(s)));
  });
});

describe('Limbo', () => {
  it('win chance matches theory and RTP ≈ 99 %', () => {
    const rng = seededRng(2);
    let ret = 0;
    for (let i = 0; i < N; i++) ret += Limbo.playLimbo(rng, 100, 3).payout;
    expect(ret / (N * 100)).toBeGreaterThan(0.96);
    expect(ret / (N * 100)).toBeLessThan(1.02);
    expect(Limbo.limboWinChance(2)).toBeCloseTo(0.495);
  });
  it('rejects invalid targets', () => {
    expect(() => Limbo.validateTarget(1)).toThrow();
    expect(() => Limbo.validateTarget(2e6)).toThrow();
  });
});

describe('Dice', () => {
  it('has exact chance and RTP ≤ 99 % for every target', () => {
    for (let t = 2; t <= 98; t += 0.37) {
      const target = Math.round(t * 100) / 100;
      for (const mode of ['over', 'under'] as const) {
        const p = Dice.diceWinChance(mode, target);
        if (p < Dice.DICE_MIN_CHANCE || p > Dice.DICE_MAX_CHANCE) continue;
        const rtp = p * Dice.diceMultiplier(mode, target);
        expect(rtp).toBeLessThanOrEqual(0.99 + 1e-9);
        expect(rtp).toBeGreaterThan(0.9899);
      }
    }
  });
  it('roll is in [0, 99.99] and outcomes follow the rule', () => {
    const rng = seededRng(3);
    let wins = 0;
    for (let i = 0; i < 100000; i++) {
      const r = Dice.playDice(rng, 1, 'under', 25);
      expect(r.roll).toBeGreaterThanOrEqual(0);
      expect(r.roll).toBeLessThan(100);
      if (r.won) wins++;
      expect(r.won).toBe(r.roll < 25);
    }
    expect(Math.abs(wins / 100000 - 0.25)).toBeLessThan(0.005);
  });
  it('rejects chances out of range', () => {
    expect(() => Dice.validateDice('under', 99.5)).toThrow();
    expect(() => Dice.validateDice('over', 99.995)).toThrow();
  });
});

describe('Coinflip', () => {
  it('streak multipliers keep RTP at 99 %', () => {
    for (let k = 1; k <= 10; k++) expect(Coin.streakMultiplier(k) * 0.5 ** k).toBeCloseTo(0.99, 3);
  });
  it('runs the state machine', () => {
    const rng = seededRng(4);
    let s = Coin.startCoinflip(100);
    expect(() => Coin.cashoutCoinflip(s)).toThrow();
    let guard = 0;
    while (s.status === 'active' && s.wins < 2 && guard++ < 100) s = Coin.callFlip(s, 'heads', rng);
    if (s.status === 'active') {
      const c = Coin.cashoutCoinflip(s);
      expect(c.payout).toBe(payoutFor(100, Coin.streakMultiplier(2)));
      expect(() => Coin.callFlip(c, 'heads', rng)).toThrow();
    } else expect(s.status).toBe('lost');
  });
  it('is fair (≈50 %)', () => {
    const rng = seededRng(5);
    let h = 0;
    for (let i = 0; i < 100000; i++) if (Coin.flip(rng) === 'heads') h++;
    expect(Math.abs(h / 100000 - 0.5)).toBeLessThan(0.005);
  });
});

describe('Mines', () => {
  it('multiplier × survival ≈ 0.99 for every (mines, picks)', () => {
    for (let m = 1; m <= 24; m++) {
      for (let k = 1; k <= 25 - m; k++) {
        const ev = Mines.minesMultiplier(m, k) * Mines.surviveChance(m, k);
        expect(ev).toBeLessThanOrEqual(0.99 + 1e-9);
        expect(ev).toBeGreaterThan(0.9895);
      }
    }
  });
  it('places mines and plays a round', () => {
    const rng = seededRng(6);
    const s = Mines.startMines(rng, 100, 3);
    expect(s.minePositions).toHaveLength(3);
    expect(Mines.publicMines(s).minePositions).toBeNull();
    const safe = [...Array(25).keys()].find((i) => !s.minePositions.includes(i))!;
    const s2 = Mines.revealTile(s, safe);
    expect(s2.revealed).toEqual([safe]);
    expect(() => Mines.revealTile(s2, safe)).toThrow();
    const c = Mines.cashoutMines(s2);
    expect(c.payout).toBe(payoutFor(100, Mines.minesMultiplier(3, 1)));
    const boom = Mines.revealTile(s, s.minePositions[0]);
    expect(boom.status).toBe('lost');
    expect(() => Mines.cashoutMines(boom)).toThrow();
  });
  it('auto cashes out when every safe tile is found', () => {
    let s = Mines.startMines(seededRng(7), 10, 24);
    const safe = [...Array(25).keys()].find((i) => !s.minePositions.includes(i))!;
    s = Mines.revealTile(s, safe);
    expect(s.status).toBe('cashed');
  });
  it('mine positions are uniform', () => {
    const rng = seededRng(8);
    const counts = new Array(25).fill(0);
    for (let i = 0; i < 25000; i++) Mines.startMines(rng, 1, 1).minePositions.forEach((p) => counts[p]++);
    counts.forEach((c) => expect(Math.abs(c - 1000)).toBeLessThan(150));
  });
});

describe('Crossing', () => {
  it('multiplier × survival ≈ 0.99', () => {
    for (const d of Object.keys(Crossing.CROSSING_CONFIG) as Crossing.CrossingDifficulty[]) {
      for (let k = 1; k <= Crossing.CROSSING_CONFIG[d].lanes; k++) {
        const ev = Crossing.crossingMultiplier(d, k) * Crossing.crossingSurvival(d, k);
        expect(ev).toBeLessThanOrEqual(0.99 + 1e-9);
        expect(ev).toBeGreaterThan(0.9895);
      }
    }
  });
  it('advances until the hidden lane', () => {
    const rng = seededRng(9);
    for (let i = 0; i < 200; i++) {
      let s = Crossing.startCrossing(rng, 10, 'hard');
      expect(Crossing.publicCrossing(s).hitLane).toBeUndefined();
      while (s.status === 'active') s = Crossing.advance(s);
      if (s.status === 'lost') expect(s.lane).toBe(s.hitLane);
      else expect(s.lane).toBe(Crossing.CROSSING_CONFIG.hard.lanes);
    }
  });
  it('empirical hit rate per lane matches config', () => {
    const rng = seededRng(10);
    let firstLaneHits = 0;
    for (let i = 0; i < 50000; i++) if (Crossing.startCrossing(rng, 1, 'medium').hitLane === 1) firstLaneHits++;
    expect(Math.abs(firstLaneHits / 50000 - 0.1)).toBeLessThan(0.006);
  });
});

describe('Hi-Lo', () => {
  const card = (rank: number) => ({ rank: rank as never, suit: 's' as const });
  it('probabilities sum correctly and guesses are legal per card', () => {
    expect(Hilo.legalGuesses(card(14))).toEqual(['higher', 'same']);
    expect(Hilo.legalGuesses(card(13))).toEqual(['lower', 'same']);
    for (let r = 2; r <= 12; r++) {
      const c = card(r);
      expect(Hilo.guessProbability(c, 'higherOrSame') + Hilo.guessProbability(c, 'lowerOrSame')).toBeCloseTo(14 / 13);
    }
    expect(Hilo.guessProbability(card(14), 'higher')).toBeCloseTo(12 / 13);
  });
  it('one-step expected return is 0.99 for every card and guess', () => {
    for (let r = 2; r <= 14; r++) {
      const c = card(r);
      for (const g of Hilo.legalGuesses(c)) {
        let ev = 0;
        for (let n = 2; n <= 14; n++) {
          if (Hilo.guessWins(c, card(n), g)) ev += (1 / 13) * Hilo.hiloMultiplier({ fairFactor: 1 / Hilo.guessProbability(c, g), steps: [{ card: c, guess: g, probability: 0, correct: true }] });
        }
        expect(ev).toBeLessThanOrEqual(0.99 + 1e-9);
        expect(ev).toBeGreaterThan(0.9895);
      }
    }
  });
  it('plays a round with skips and cash out', () => {
    const rng = seededRng(11);
    let s = Hilo.startHilo(rng, 100);
    s = Hilo.skip(s, rng);
    expect(() => Hilo.cashoutHilo(s)).toThrow();
    const g = Hilo.legalGuesses(s.current)[0];
    s = Hilo.guess(s, g, rng);
    if (s.status === 'active') expect(Hilo.cashoutHilo(s).payout).toBeGreaterThan(0);
    expect(() => Hilo.guess({ ...s, status: 'lost' }, g, rng)).toThrow();
  });
});
