import { classify, dealVP, drawVP, suggestHold, VP_PAYS } from '../games/videopoker.ts';
import { parseCards } from '../cards/cards.ts';
import { seededRng } from '../rng/rng.ts';
import { runOp } from '../protocol.ts';

const h = (s: string) => parseCards(s);

describe('video poker (jacks or better 9/6)', () => {
  it('classifies every paying hand', () => {
    expect(classify(h('Ts Js Qs Ks As'))).toBe('royal');
    expect(classify(h('5h 6h 7h 8h 9h'))).toBe('straightFlush');
    expect(classify(h('Ah 2h 3h 4h 5h'))).toBe('straightFlush');
    expect(classify(h('9c 9d 9h 9s 2c'))).toBe('quads');
    expect(classify(h('3c 3d 3h Ks Kc'))).toBe('fullHouse');
    expect(classify(h('2d 7d 9d Jd Kd'))).toBe('flush');
    expect(classify(h('Ac 2d 3h 4s 5c'))).toBe('straight');
    expect(classify(h('Tc Jd Qh Ks Ac'))).toBe('straight');
    expect(classify(h('7c 7d 7h Ks 2c'))).toBe('trips');
    expect(classify(h('4c 4d 9h 9s Ac'))).toBe('twoPair');
    expect(classify(h('Jc Jd 2h 5s 8c'))).toBe('jacks');
    expect(classify(h('Tc Td 2h 5s 8c'))).toBe('nothing');
    expect(classify(h('Qc 3d 6h 9s Ac'))).toBe('nothing');
  });

  it('draw only replaces cards that are not held, from the same deck', () => {
    const st = dealVP(seededRng(7), 10);
    const r = drawVP(st, [true, false, true, false, false]);
    expect(r.hand[0]).toEqual(st.hand[0]);
    expect(r.hand[2]).toEqual(st.hand[2]);
    expect(r.hand[1]).toEqual(st.deck[0]);
    expect(r.hand[3]).toEqual(st.deck[1]);
    expect(r.hand[4]).toEqual(st.deck[2]);
    expect(r.payout).toBe(10 * VP_PAYS[r.result]);
  });

  it('suggested holds follow the basic strategy', () => {
    expect(suggestHold(h('Ts Js Qs Ks 2c'))).toEqual([true, true, true, true, false]);
    expect(suggestHold(h('Jc Jd 2h 5s 8c'))).toEqual([true, true, false, false, false]);
    expect(suggestHold(h('2d 7d 9d Jd 4c'))).toEqual([true, true, true, true, false]);
    expect(suggestHold(h('2d 7c 9h 3s 4c')).filter(Boolean).length).toBe(0);
  });

  it('simplified strategy returns close to the published 99.5 % over many hands', () => {
    const rng = seededRng(2024);
    let staked = 0, back = 0;
    const N = 120_000;
    for (let i = 0; i < N; i++) {
      const st = dealVP(rng, 1);
      const r = drawVP(st, suggestHold(st.hand));
      staked += 1;
      back += VP_PAYS[r.result];
    }
    // standard error ≈ 0.013 at this N (the royal is rare), so the band is wide on purpose
    expect(back / staked).toBeGreaterThan(0.95);
    expect(back / staked).toBeLessThan(1.04);
  });

  it('runs through the protocol: deal then draw', () => {
    const rng = seededRng(3);
    const a = runOp('videopoker', null, 'deal', { bet: 20 }, { rng, now: 0 });
    expect(a.stake).toBe(20);
    expect(a.done).toBe(false);
    expect((a.view.hand as string[]).length).toBe(5);
    expect(a.view).not.toHaveProperty('deck');
    const b = runOp('videopoker', a.state, 'draw', { hold: [true, true, false, false, false] }, { rng, now: 0 });
    expect(b.done).toBe(true);
    expect(() => runOp('videopoker', a.state, 'draw', { hold: [true] }, { rng, now: 0 })).toThrow();
  });
});
