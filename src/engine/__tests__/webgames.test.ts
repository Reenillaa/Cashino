import * as C from '../games/cascade.ts';
import { wheelLayout, wheelRtp, playWheel, WHEEL_SEGMENTS } from '../games/wheel.ts';
import { startTower, pickTower, cashoutTower, towerMultiplier, TOWER_SHAPE, TOWER_FLOORS } from '../games/towers.ts';
import { diamondHand, diamondStats, DIAMOND_PAYS } from '../games/diamonds.ts';
import { startPump, pump, cashoutPump, pumpMultiplier, PUMP_POP, PUMP_MAX } from '../games/pump.ts';
import { dtStats, playDragonTiger } from '../games/dragontiger.ts';
import { parseCard } from '../cards/cards.ts';
import { seededRng } from '../rng/rng.ts';
import { runOp } from '../protocol.ts';

describe('wheel', () => {
  it.each(['low', 'medium', 'high'] as const)('%s risk: 30 segments and 99 %% return', (risk) => {
    expect(wheelLayout(risk)).toHaveLength(WHEEL_SEGMENTS);
    expect(wheelRtp(risk)).toBeCloseTo(0.99, 10);
    const sum = wheelLayout(risk).reduce((a, b) => a + b, 0);
    expect(sum / WHEEL_SEGMENTS).toBeCloseTo(0.99, 10);
  });
  it('pays the multiplier of the segment it lands on', () => {
    const r = playWheel(seededRng(1), 100, 'medium');
    expect(r.payout).toBe(Math.floor(100 * r.layout[r.segment] + 1e-9));
  });
});

describe('dragon tower', () => {
  it('each floor hides the right number of eggs and multipliers give 99 %', () => {
    for (const level of ['easy', 'medium', 'hard', 'expert'] as const) {
      const st = startTower(seededRng(5), 10, level);
      expect(st.bad).toHaveLength(TOWER_FLOORS);
      for (const row of st.bad) expect(new Set(row).size).toBe(TOWER_SHAPE[level].bad);
      const { tiles, bad } = TOWER_SHAPE[level];
      const p = (tiles - bad) / tiles;
      for (let k = 1; k <= TOWER_FLOORS; k++) expect(towerMultiplier(level, k) * p ** k).toBeLessThanOrEqual(0.99 + 1e-9);
      expect(towerMultiplier(level, 1) * p).toBeGreaterThan(0.98);
    }
  });
  it('safe door climbs, egg door loses, cash out pays', () => {
    let st = startTower(seededRng(9), 10, 'medium');
    const safe = [0, 1, 2].find((d) => !st.bad[0].includes(d))!;
    st = pickTower(st, safe);
    expect(st.status).toBe('active');
    expect(cashoutTower(st).payout).toBe(Math.floor(10 * towerMultiplier('medium', 1)));
    const egg = st.bad[1][0];
    expect(pickTower(st, egg).status).toBe('lost');
  });
  it('climbing every floor via the protocol ends the round automatically', () => {
    const rng = seededRng(4);
    let r = runOp('towers', null, 'start', { bet: 10, level: 'easy' }, { rng, now: 0 });
    let floor = 0;
    while (!r.done) {
      const st = r.state as { bad: number[][] };
      const door = [0, 1, 2, 3].find((d) => !st.bad[floor].includes(d))!;
      r = runOp('towers', r.state, 'pick', { door }, { rng, now: 0 });
      floor++;
    }
    expect(floor).toBe(TOWER_FLOORS);
    expect(r.payout).toBe(Math.floor(10 * towerMultiplier('easy', TOWER_FLOORS)));
    expect(r.view.bad).not.toBeNull();
  });
});

describe('diamonds', () => {
  it('classifies colour hands', () => {
    expect(diamondHand([1, 1, 1, 1, 1])).toBe('five');
    expect(diamondHand([1, 1, 1, 1, 2])).toBe('four');
    expect(diamondHand([1, 1, 1, 2, 2])).toBe('full');
    expect(diamondHand([1, 1, 1, 2, 3])).toBe('three');
    expect(diamondHand([1, 1, 2, 2, 3])).toBe('twoPair');
    expect(diamondHand([1, 1, 2, 3, 4])).toBe('pair');
    expect(diamondHand([0, 1, 2, 3, 4])).toBe('none');
  });
  it('exact return is 99.0 % and probabilities add up to 1', () => {
    const { rtp, probs } = diamondStats();
    expect(rtp).toBeGreaterThan(0.989);
    expect(rtp).toBeLessThan(0.991);
    expect(Object.values(probs).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(probs.five).toBeCloseTo(7 / 16807, 12);
    expect(DIAMOND_PAYS.five).toBe(67);
  });
});

describe('pump', () => {
  it('multipliers give 99 % at every step', () => {
    for (const level of ['easy', 'medium', 'hard', 'expert'] as const) {
      for (let k = 1; k <= PUMP_MAX[level]; k++) {
        const ev = pumpMultiplier(level, k) * (1 - PUMP_POP[level]) ** k;
        expect(ev).toBeLessThanOrEqual(0.99 + 1e-9);
        expect(ev).toBeGreaterThan(0.95);
      }
    }
  });
  it('pops exactly at the pre-decided pump; survival rate matches the odds', () => {
    let survived = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      let st = startPump(seededRng(1000 + i), 1, 'medium');
      for (let k = 0; k < 3 && st.status === 'active'; k++) st = pump(st);
      if (st.status === 'active') survived++;
    }
    expect(survived / N).toBeGreaterThan(0.9 ** 3 - 0.015);
    expect(survived / N).toBeLessThan(0.9 ** 3 + 0.015);
    let st = startPump(seededRng(3), 10, 'easy');
    st = { ...st, popAt: 2 };
    st = pump(st);
    expect(cashoutPump(st).payout).toBe(Math.floor(10 * pumpMultiplier('easy', 1)));
    expect(pump(st).status).toBe('popped');
  });
});

describe('dragon tiger', () => {
  it('known 8-deck figures: tie 7.47 %, Dragon/Tiger return 96.27 %, Tie 89.6 %', () => {
    const s = dtStats();
    expect(s.tie).toBeCloseTo(0.0747, 4);
    expect(s.rtpSide).toBeCloseTo(0.9627, 4);
    expect(s.rtpTie).toBeCloseTo(0.8964, 4);
  });
  it('pays winners 1:1, halves side bets on a tie and pays tie 11:1', () => {
    const r = playDragonTiger(seededRng(2), { dragon: 10, tiger: 10, tie: 10 });
    if (r.winner === 'tie') expect(r.payout).toBe(5 + 5 + 120);
    else expect(r.payout).toBe(20);
    expect(parseCard('Ah').rank).toBe(14);
    expect(() => runOp('dragontiger', null, 'play', { bets: { banker: 10 } }, { rng: seededRng(1), now: 0 })).toThrow();
  });
});

describe('Dulce Cascada', () => {
  it('tumbles consistently: every step pays what is on its grid and the rest falls', () => {
    const rng = seededRng(42);
    for (let i = 0; i < 400; i++) {
      const r = C.playCascade(rng, 100);
      expect(r.multiplier).toBeLessThanOrEqual(C.CASCADE_MAX_WIN);
      expect(r.payout).toBe(Math.floor(100 * r.multiplier + 1e-9));
      for (const sp of r.spins) {
        for (let k = 0; k < sp.steps.length; k++) {
          const st = sp.steps[k];
          const counts = new Array(9).fill(0);
          for (const col of st.grid) { expect(col).toHaveLength(C.ROWS); for (const c of col) if (c < C.SCATTER) counts[c]++; }
          expect(st.wins.map((w) => w.sym)).toEqual(counts.map((n, s) => (n >= 8 ? s : -1)).filter((s) => s >= 0));
          if (st.wins.length) {
            const gone = new Set(st.wins.map((w) => w.sym));
            const next = sp.steps[k + 1].grid;
            st.grid.forEach((col, c) => {
              const keep = col.filter((x) => !gone.has(x));
              expect(next[c].slice(C.ROWS - keep.length)).toEqual(keep);
            });
          }
        }
        expect(sp.total).toBeCloseTo(sp.win > 0 && sp.bombs > 0 ? sp.win * sp.bombs : sp.win, 6);
      }
    }
  });
  it('returns about 96.5 % over many spins', () => {
    const s = C.cascadeStats(seededRng(7), 300_000);
    expect(s.rtp).toBeGreaterThan(0.9);
    expect(s.rtp).toBeLessThan(1.03);
    expect(s.hit).toBeGreaterThan(0.27);
    expect(s.hit).toBeLessThan(0.34);
    expect(s.bonus).toBeGreaterThan(0.0015);
  });
});
