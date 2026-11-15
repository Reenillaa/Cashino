import { runOp, ProtocolError } from '../protocol.ts';
import { seededRng } from '../rng/rng.ts';
import * as Crash from '../games/crash.ts';

const ctx = (seed = 1, now = 0) => ({ rng: seededRng(seed), now });

describe('game protocol', () => {
  it('settles single-shot games with stake and payout', () => {
    const r = runOp('dice', null, 'play', { bet: 100, mode: 'under', target: 50 }, ctx());
    expect(r.done).toBe(true);
    expect(r.stake).toBe(100);
    expect([0, 198]).toContain(r.payout);
    expect(r.summary?.bet).toBe(100);
  });
  it('rejects invalid parameters and ops', () => {
    expect(() => runOp('dice', null, 'play', { bet: -1, mode: 'under', target: 50 }, ctx())).toThrow(ProtocolError);
    expect(() => runOp('dice', null, 'play', { bet: 1.5, mode: 'under', target: 50 }, ctx())).toThrow(ProtocolError);
    expect(() => runOp('dice', null, 'cheat', {}, ctx())).toThrow(ProtocolError);
    expect(() => runOp('limbo', null, 'play', { bet: 1, target: 0.5 }, ctx())).toThrow(ProtocolError);
    expect(() => runOp('mines', null, 'reveal', { tile: 3 }, ctx())).toThrow('no_round');
    expect(() => runOp('baccarat', null, 'play', { bets: { banker: 10, house: 5 } }, ctx())).toThrow(ProtocolError);
  });
  it('hides mines from the view until the round ends', () => {
    const start = runOp('mines', null, 'start', { bet: 10, mines: 5 }, ctx(3));
    expect((start.view as { minePositions: unknown }).minePositions).toBeNull();
    expect(() => runOp('mines', start.state, 'start', { bet: 10, mines: 5 }, ctx())).toThrow('round_active');
    const hidden = (start.state as { minePositions: number[] }).minePositions;
    const boom = runOp('mines', start.state, 'reveal', { tile: hidden[0] }, ctx());
    expect(boom.done).toBe(true);
    expect((boom.view as { minePositions: number[] }).minePositions).toEqual(hidden);
  });
  it('runs a blackjack round to settlement with extra stakes', () => {
    let r = runOp('blackjack', null, 'deal', { bet: 10 }, ctx(5));
    let stake = r.stake;
    let guard = 0;
    while (!r.done && guard++ < 20) {
      r = runOp('blackjack', r.state, 'action', { action: 'stand' }, ctx());
      stake += r.stake;
    }
    expect(r.done).toBe(true);
    expect(stake).toBe(10);
    expect((r.view as { holeHidden: boolean }).holeHidden).toBe(false);
  });
  it('crash: server clock decides cash-outs, never the client', () => {
    const start = runOp('crash', null, 'start', { bet: 100 }, ctx(9, 1000));
    const crash = (start.state as { crash: number }).crash;
    const tCrash = Crash.timeFor(crash);
    if (crash > 1.2) {
      const early = runOp('crash', start.state, 'cashout', {}, ctx(0, 1000 + Crash.timeFor(1.1)));
      expect(early.payout).toBe(Math.floor(100 * (early.view as { cashout: number }).cashout));
    }
    const late = runOp('crash', start.state, 'cashout', {}, ctx(0, 1000 + tCrash + 50));
    expect(late.payout).toBe(0);
    const pending = runOp('crash', start.state, 'settle', {}, ctx(0, 1000));
    if (crash > 1) expect(pending.done).toBe(false);
  });
  it('crash auto cash-out pays the target when it is below the crash point', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = runOp('crash', null, 'start', { bet: 100, autoCashout: 1.5 }, ctx(seed, 0));
      const crash = (s.state as { crash: number }).crash;
      const end = runOp('crash', s.state, 'settle', {}, ctx(0, Crash.timeFor(Math.max(crash, 1.5)) + 10));
      expect(end.payout).toBe(crash >= 1.5 ? 150 : 0);
    }
  });
});
