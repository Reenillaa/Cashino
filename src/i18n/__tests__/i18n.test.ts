import es from '../es';
import en from '../en';

function keys(o: unknown, prefix = ''): string[] {
  if (o && typeof o === 'object' && !Array.isArray(o)) return Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe('i18n dictionaries', () => {
  it('Spanish and English have exactly the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(es).sort());
  });
  it('no empty translations and interpolation variables match', () => {
    const flat = (o: unknown) => Object.fromEntries(keys(o).map((k) => [k, k.split('.').reduce((a: unknown, p) => (a as Record<string, unknown>)[p], o)]));
    const fe = flat(es), fn = flat(en);
    for (const k of Object.keys(fe)) {
      const a = String(fe[k]), b = String(fn[k]);
      expect(a.length).toBeGreaterThan(0);
      expect(b.length).toBeGreaterThan(0);
      const vars = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort().join();
      expect(`${k}:${vars(b)}`).toBe(`${k}:${vars(a)}`);
    }
  });
});
