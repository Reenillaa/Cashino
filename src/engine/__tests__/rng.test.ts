import { sha256Hex, hmacSha256, toHex, utf8 } from '../rng/sha256.ts';
import { fairRng, hashServerSeed, randomInt, sampleDistinct, seededRng, shuffle, cryptoRng, newSeed } from '../rng/rng.ts';

describe('SHA-256 / HMAC (official test vectors)', () => {
  it('hashes FIPS 180-4 vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });
  it('matches Node crypto on multi-block and unicode input', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('node:crypto');
    for (const input of ['a'.repeat(1000), 'ñ€😀 titanium', 'x'.repeat(55), 'y'.repeat(64)]) {
      expect(sha256Hex(input)).toBe(nodeCrypto.createHash('sha256').update(input, 'utf8').digest('hex'));
      expect(toHex(hmacSha256(utf8('k'.repeat(70)), utf8(input)))).toBe(
        nodeCrypto.createHmac('sha256', 'k'.repeat(70)).update(input, 'utf8').digest('hex'),
      );
    }
  });
  it('computes RFC 4231 HMAC test case 2', () => {
    expect(toHex(hmacSha256(utf8('Jefe'), utf8('what do ya want for nothing?')))).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
  });
});

describe('provably fair RNG', () => {
  const seed = { serverSeed: 'server-seed', clientSeed: 'client', nonce: 1 };
  it('is deterministic and verifiable', () => {
    const a = fairRng(seed), b = fairRng(seed);
    const xs = Array.from({ length: 20 }, () => a.float());
    expect(xs).toEqual(Array.from({ length: 20 }, () => b.float()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(hashServerSeed('server-seed')).toBe(sha256Hex('server-seed'));
  });
  it('changes completely with the nonce', () => {
    expect(fairRng(seed).float()).not.toBe(fairRng({ ...seed, nonce: 2 }).float());
  });
  it('produces uniform output (chi-square, 16 buckets)', () => {
    const r = fairRng({ serverSeed: 'x', clientSeed: 'y', nonce: 0 });
    const buckets = new Array(16).fill(0);
    const N = 32000;
    for (let i = 0; i < N; i++) buckets[Math.floor(r.float() * 16)]++;
    const e = N / 16;
    const chi = buckets.reduce((s, o) => s + (o - e) ** 2 / e, 0);
    expect(chi).toBeLessThan(37.7); // p = 0.001 for 15 dof
  });
});

describe('integer helpers', () => {
  const rng = seededRng(42);
  it('randomInt stays in range and is unbiased', () => {
    const counts = new Array(7).fill(0);
    for (let i = 0; i < 70000; i++) counts[randomInt(rng, 7)]++;
    counts.forEach((c) => expect(Math.abs(c - 10000)).toBeLessThan(450));
    expect(() => randomInt(rng, 0)).toThrow();
  });
  it('shuffle is a permutation', () => {
    const a = Array.from({ length: 52 }, (_, i) => i);
    const s = shuffle(rng, a);
    expect([...s].sort((x, y) => x - y)).toEqual(a);
    expect(s).not.toEqual(a);
  });
  it('sampleDistinct gives distinct values', () => {
    const s = sampleDistinct(rng, 40, 10);
    expect(new Set(s).size).toBe(10);
    s.forEach((v) => expect(v >= 0 && v < 40).toBe(true));
  });
  it('cryptoRng and newSeed use the provided byte source', () => {
    let k = 0;
    const fill = (b: Uint8Array) => b.forEach((_, i) => (b[i] = (k++ * 37) & 255));
    expect(newSeed(fill)).toHaveLength(64);
    const r = cryptoRng(fill);
    expect(r.float()).toBeGreaterThanOrEqual(0);
  });
});
