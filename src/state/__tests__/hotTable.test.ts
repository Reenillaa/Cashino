import { useHotTable, isHot, hotRoom, HOT_NET, HOT_STREAK } from '../hotTable';
import { ROOMS } from '@/engine/meta/rooms.ts';

const day = Date.UTC(2026, 10, 16, 12);
describe('hot table', () => {
  beforeEach(() => useHotTable.getState().reset());

  it('turns hot after winning a lot today in one game, only for that game', () => {
    const r = useHotTable.getState().record;
    r('dice', 100, 100 + HOT_NET - 1, day);
    expect(isHot('dice', day)).toBe(false);
    r('dice', 100, 200, day);
    expect(isHot('dice', day)).toBe(true);
    expect(isHot('mines', day)).toBe(false);
  });

  it('turns hot after a long winning streak, and losses reset the streak', () => {
    const r = useHotTable.getState().record;
    for (let i = 0; i < HOT_STREAK - 1; i++) r('slots', 10, 20, day);
    r('slots', 10, 0, day);
    expect(isHot('slots', day)).toBe(false);
    for (let i = 0; i < HOT_STREAK; i++) r('slots', 10, 20, day);
    expect(isHot('slots', day)).toBe(true);
  });

  it('cools down the next day', () => {
    useHotTable.getState().record('dice', 100, 100 + HOT_NET, day);
    expect(isHot('dice', day + 86_400_000)).toBe(false);
  });

  it('keeps the minimum and cuts the maximum to about a quarter', () => {
    for (const room of ROOMS) {
      const h = hotRoom(room);
      expect(h.min).toBe(room.min);
      expect(h.max).toBeGreaterThanOrEqual(room.min);
      expect(h.max).toBeLessThanOrEqual(Math.max(room.min, room.max * 0.25));
    }
  });
});
