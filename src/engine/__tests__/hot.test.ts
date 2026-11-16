import { isHotFrom, hotRoom, HOT_NET, HOT_STREAK } from '../meta/hot.ts';
import { ROOMS } from '../meta/rooms.ts';
import { SHOP_PRICES, FREE_ITEMS } from '../meta/shop.ts';

describe('hot table (shared by app and server)', () => {
  it('turns hot by net winnings or by a winning streak', () => {
    expect(isHotFrom([{ bet: 100, payout: 100 + HOT_NET - 1 }])).toBe(false);
    expect(isHotFrom([{ bet: 100, payout: 100 + HOT_NET }])).toBe(true);
    const win = { bet: 10, payout: 20 }, loss = { bet: 10, payout: 0 };
    expect(isHotFrom([...Array(HOT_STREAK - 1).fill(win), loss, ...Array(HOT_STREAK - 1).fill(win)])).toBe(false);
    expect(isHotFrom(Array(HOT_STREAK).fill(win))).toBe(true);
  });
  it('a hot room keeps the minimum and caps the maximum near a quarter', () => {
    for (const r of ROOMS) {
      const h = hotRoom(r);
      expect(h.min).toBe(r.min);
      expect(h.max).toBeLessThanOrEqual(Math.max(r.min, r.max / 4));
    }
  });
  it('the shop catalogue the server charges from has a price for every paid item', () => {
    expect(Object.keys(SHOP_PRICES).length).toBeGreaterThan(30);
    for (const [k, v] of Object.entries(SHOP_PRICES)) {
      expect(k).toMatch(/^(back|felt|avatar|frame|title):[a-z0-9]{1,20}$/);
      if (!FREE_ITEMS.includes(k)) expect(v).toBeGreaterThan(0);
    }
  });
});
