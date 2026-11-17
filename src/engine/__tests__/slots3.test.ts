import { seededRng } from '../rng/rng.ts';
import { REELS, ROWS } from '../games/lineslot.ts';
import * as G from '../games/goldmine.ts';
import * as F from '../games/fruits.ts';
import * as P from '../games/pirate.ts';

describe('Mina de Oro (hold and win)', () => {
  it('starts respins with 5+ nuggets, keeps nuggets, resets to 3 and pays every nugget', () => {
    const rng = seededRng(5);
    let checked = 0;
    for (let i = 0; i < 40000 && checked < 25; i++) {
      const r = G.playGoldmine(rng, 100);
      if (!r.respins.length) {
        expect(r.nuggets).toBeLessThan(G.MINE_BONUS.trigger);
        expect(r.bonus).toBe(0);
        continue;
      }
      checked++;
      expect(r.nuggets).toBeGreaterThanOrEqual(G.MINE_BONUS.trigger);
      let prev = r.grid.map((col) => col.map((c) => (G.isNugget(c) ? c : 0)));
      let left = G.MINE_BONUS.respins;
      for (const rs of r.respins) {
        // nuggets never move or change
        for (let reel = 0; reel < REELS; reel++) for (let row = 0; row < ROWS; row++) if (prev[reel][row]) expect(rs.board[reel][row]).toBe(prev[reel][row]);
        const filled = rs.board.flat().filter(Boolean).length;
        left = filled === REELS * ROWS ? 0 : rs.fresh.length ? G.MINE_BONUS.respins : left - 1;
        expect(rs.left).toBe(left);
        prev = rs.board;
      }
      expect(left).toBe(0);
      const sum = prev.flat().reduce((a, c) => a + (c ? G.nuggetValue(c) : 0), 0);
      expect(r.bonus).toBe(sum + (r.grand ? G.GRAND : 0));
    }
    expect(checked).toBe(25);
  });
  it('returns roughly its simulated RTP', () => {
    const s = G.goldmineStats(seededRng(21), 150000);
    expect(s.rtp).toBeGreaterThan(0.8);
    expect(s.rtp).toBeLessThan(1.1);
  });
});

describe('Fuego Frutal (multiplier wilds)', () => {
  it('multiplies a line by the sum of its wild multipliers', () => {
    const line = (cells: number[]) => cells.map((c) => [0, c, 1]); // middle row = payline 0
    const w = F.fruitLines(line([7, F.WILD + 2, F.WILD + 3, 2, 2])).find((l) => l.line === 0);
    expect(w?.count).toBe(3);
    expect(w?.mult).toBe(5);
    expect(w?.pay).toBeCloseTo(F.FRUIT_PAYS[7][0] * 5);
    const plain = F.fruitLines(line([6, 6, 6, 6, 3])).find((l) => l.line === 0);
    expect(plain?.pay).toBeCloseTo(F.FRUIT_PAYS[6][1]);
    expect(F.fruitLines(line([F.STAR, F.STAR, F.STAR, 2, 2])).find((l) => l.line === 0)).toBeUndefined();
  });
  it('returns roughly its simulated RTP', () => {
    const s = F.fruitsStats(seededRng(22), 150000);
    expect(s.rtp).toBeGreaterThan(0.85);
    expect(s.rtp).toBeLessThan(1.1);
  });
});

describe('Noche Pirata (walking wilds)', () => {
  it('never lands a parrot on reel 1 by itself, and parrots walk one reel left each respin', () => {
    const rng = seededRng(9);
    let walks = 0;
    for (let i = 0; i < 3000; i++) {
      const r = P.playPirate(rng, 100);
      expect(r.spins[0].grid[0]).not.toContain(P.PARROT);
      for (let k = 1; k < r.spins.length; k++) {
        const before = r.spins[k - 1].grid, after = r.spins[k].grid;
        for (let reel = 1; reel < REELS; reel++) for (let row = 0; row < ROWS; row++) {
          if (before[reel][row] === P.PARROT) {
            expect(after[reel - 1][row]).toBe(P.PARROT);
            walks++;
          }
        }
      }
      // the chain stops only when no parrot is left (or at the safety caps)
      const last = r.spins[r.spins.length - 1];
      if (!r.capped && r.spins.length <= P.PIRATE_MAX_STEPS) expect(last.parrots).toBe(0);
    }
    expect(walks).toBeGreaterThan(100);
  });
  it('returns roughly its simulated RTP', () => {
    const s = P.pirateStats(seededRng(23), 100000);
    expect(s.rtp).toBeGreaterThan(0.88);
    expect(s.rtp).toBeLessThan(1.03);
  });
});
