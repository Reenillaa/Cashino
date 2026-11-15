import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { createSeed, fairRng, hashServerSeed } from '@/services/random';
import type { Rng } from '@/engine/rng/rng.ts';

interface FairState {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  previous: { serverSeed: string; serverSeedHash: string; clientSeed: string; lastNonce: number } | null;
  /** Returns an RNG for the next round and the data needed to verify it later. */
  nextRound: () => { rng: Rng; proof: { hash: string; clientSeed: string; nonce: number } };
  rotate: (clientSeed?: string) => void;
  setClientSeed: (s: string) => void;
}

const fresh = () => {
  const serverSeed = createSeed();
  return { serverSeed, serverSeedHash: hashServerSeed(serverSeed), clientSeed: createSeed().slice(0, 16), nonce: 0 };
};

export const useFairness = create<FairState>()(
  persist(
    (set, get) => ({
      ...fresh(),
      previous: null,
      nextRound: () => {
        const s = get();
        const nonce = s.nonce + 1;
        set({ nonce });
        return { rng: fairRng({ serverSeed: s.serverSeed, clientSeed: s.clientSeed, nonce }), proof: { hash: s.serverSeedHash, clientSeed: s.clientSeed, nonce } };
      },
      rotate: (clientSeed) => {
        const s = get();
        const f = fresh();
        set({
          previous: { serverSeed: s.serverSeed, serverSeedHash: s.serverSeedHash, clientSeed: s.clientSeed, lastNonce: s.nonce },
          ...f,
          clientSeed: clientSeed?.trim() || f.clientSeed,
        });
      },
      setClientSeed: (c) => {
        // Changing the client seed rotates the server seed too, so the old one is revealed.
        get().rotate(c);
      },
    }),
    { name: `${STORAGE_PREFIX}fair`, storage: persistStorage, version: 1 },
  ),
);
