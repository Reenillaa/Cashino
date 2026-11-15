import { hmacSha256, sha256Hex, toHex, utf8 } from './sha256.ts';

/** Source of uniform randomness used by every game. */
export interface Rng {
  /** Uniform float in [0, 1) with 32 bits of resolution. */
  float(): number;
}

/** Uniform integer in [0, n) without modulo bias (rejection sampling on 32-bit words). */
export function randomInt(rng: Rng, n: number): number {
  if (!Number.isInteger(n) || n <= 0) throw new Error(`randomInt: invalid bound ${n}`);
  if (n === 1) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  for (;;) {
    const x = Math.floor(rng.float() * 0x100000000);
    if (x < limit) return x % n;
  }
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** Picks k distinct values from [0, n) (partial Fisher–Yates), in draw order. */
export function sampleDistinct(rng: Rng, n: number, k: number): number[] {
  if (k > n) throw new Error('sampleDistinct: k > n');
  const pool = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < k; i++) {
    const j = i + randomInt(rng, n - i);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, k);
}

export interface FairSeed {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
}

/**
 * Deterministic, verifiable RNG: bytes = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}:${cursor}`).
 * Each 32-byte block yields 8 floats (4 bytes each, big-endian / 2^32).
 */
export function fairRng(seed: FairSeed): Rng & { draws(): number } {
  const key = utf8(seed.serverSeed);
  let cursor = 0;
  let block: Uint8Array = new Uint8Array(0);
  let offset = 32;
  let count = 0;
  return {
    float() {
      if (offset >= 32) {
        block = hmacSha256(key, utf8(`${seed.clientSeed}:${seed.nonce}:${cursor}`));
        cursor++;
        offset = 0;
      }
      const v =
        ((block[offset] << 24) >>> 0) + (block[offset + 1] << 16) + (block[offset + 2] << 8) + block[offset + 3];
      offset += 4;
      count++;
      return v / 0x100000000;
    },
    draws: () => count,
  };
}

export function hashServerSeed(serverSeed: string): string {
  return sha256Hex(serverSeed);
}

/** Generates a 32-byte hex seed from any secure byte source (crypto.getRandomValues). */
export function newSeed(fill: (buf: Uint8Array) => void): string {
  const b = new Uint8Array(32);
  fill(b);
  return toHex(b);
}

/** Small fast PRNG (mulberry32) for bots, simulations and tests — never for real outcomes. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    float() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
    },
  };
}

/** RNG backed by a secure byte source (WebCrypto / expo-crypto). */
export function cryptoRng(fill: (buf: Uint8Array) => void): Rng {
  const buf = new Uint8Array(256);
  let off = 256;
  return {
    float() {
      if (off >= 256) {
        fill(buf);
        off = 0;
      }
      const v = ((buf[off] << 24) >>> 0) + (buf[off + 1] << 16) + (buf[off + 2] << 8) + buf[off + 3];
      off += 4;
      return v / 0x100000000;
    },
  };
}
