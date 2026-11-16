import { useCosmetics } from '../cosmetics';
import { useWallet } from '../wallet';

describe('cosmetics shop', () => {
  beforeEach(() => {
    useWallet.getState().resetAll();
    useCosmetics.getState().reset();
  });

  it('starts with the free items equipped', () => {
    const s = useCosmetics.getState();
    expect(s.owned).toEqual(['back:classic', 'felt:green']);
    expect(s.equipped).toEqual({ back: 'classic', felt: 'green', avatar: null });
  });

  it('buying spends chips once, records it and equips the item', () => {
    const before = useWallet.getState().balance;
    expect(useCosmetics.getState().buy('back', 'royal', 800)).toBe(true);
    expect(useWallet.getState().balance).toBe(before - 800);
    expect(useWallet.getState().ledger[0].kind).toBe('shop');
    expect(useCosmetics.getState().equipped.back).toBe('royal');
    // second purchase of the same thing is refused and costs nothing
    expect(useCosmetics.getState().buy('back', 'royal', 800)).toBe(false);
    expect(useWallet.getState().balance).toBe(before - 800);
  });

  it('cannot buy without enough chips', () => {
    const bal = useWallet.getState().balance;
    expect(useCosmetics.getState().buy('felt', 'black', bal + 1)).toBe(false);
    expect(useWallet.getState().balance).toBe(bal);
    expect(useCosmetics.getState().owned).not.toContain('felt:black');
  });

  it('only owned items can be equipped', () => {
    useCosmetics.getState().equip('felt', 'blue');
    expect(useCosmetics.getState().equipped.felt).toBe('green');
    useCosmetics.getState().buy('avatar', 'p0', 0);
    useCosmetics.getState().equip('avatar', null);
    expect(useCosmetics.getState().equipped.avatar).toBeNull();
    useCosmetics.getState().equip('avatar', 'p0');
    expect(useCosmetics.getState().equipped.avatar).toBe('p0');
  });
});
