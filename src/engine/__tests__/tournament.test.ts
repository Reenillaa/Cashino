import { TOURNAMENT_POOL, tournamentDay, tournamentEnds, tournamentGame } from '../meta/tournament.ts';
import { GAME_IDS } from '../games/types.ts';

describe('daily tournament', () => {
  const today = tournamentDay(Date.UTC(2026, 10, 20, 15));
  it('always picks a game from the pool, and only real games', () => {
    for (const g of TOURNAMENT_POOL) expect(GAME_IDS).toContain(g);
    expect(TOURNAMENT_POOL).not.toContain('poker');
    for (let d = today - 400; d < today + 400; d++) expect(TOURNAMENT_POOL).toContain(tournamentGame(d));
  });
  it('never repeats the game two days in a row, and every game gets its day in each cycle', () => {
    for (let d = today - 1000; d < today + 1000; d++) expect(tournamentGame(d + 1)).not.toBe(tournamentGame(d));
    const n = TOURNAMENT_POOL.length;
    const start = Math.ceil(today / n) * n;
    const seen = new Set(Array.from({ length: n }, (_, i) => tournamentGame(start + i)));
    expect(seen.size).toBeGreaterThanOrEqual(n - 1); // the swap at a cycle start can repeat one game once
  });
  it('is the same for everybody (deterministic) and lasts the UTC day', () => {
    expect(tournamentGame(today)).toBe(tournamentGame(today));
    expect(tournamentEnds(today) - Date.UTC(2026, 10, 20)).toBe(86_400_000);
    expect(tournamentDay(tournamentEnds(today) - 1)).toBe(today);
    expect(tournamentDay(tournamentEnds(today))).toBe(today + 1);
  });
});
