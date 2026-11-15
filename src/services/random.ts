import * as ExpoCrypto from 'expo-crypto';
import { cryptoRng, fairRng, hashServerSeed, newSeed, type FairSeed, type Rng } from '@/engine/rng/rng.ts';

/** Cryptographically secure bytes (expo-crypto on native, WebCrypto on web/tests). */
export function secureFill(buf: Uint8Array): void {
  const g = (globalThis as { crypto?: Crypto }).crypto;
  if (g?.getRandomValues) {
    g.getRandomValues(buf as Uint8Array<ArrayBuffer>);
    return;
  }
  ExpoCrypto.getRandomValues(buf as Uint8Array<ArrayBuffer>);
}

export const secureRng: Rng = cryptoRng(secureFill);
export const createSeed = () => newSeed(secureFill);
export { fairRng, hashServerSeed, type FairSeed };
