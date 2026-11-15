import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameId } from '@/engine/games/types.ts';
import { runOp, type OpResult } from '@/engine/protocol.ts';
import { fairRng, type Rng } from '@/engine/rng/rng.ts';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import { useWallet } from '@/state/wallet';
import { useProgress } from '@/state/progress';
import { useLearning } from '@/state/learning';
import { useFairness } from '@/state/fairness';
import { useSession } from '@/state/session';
import { callFn, OnlineError } from '@/services/supabase';
import { useRoom } from './rooms';

export type PlayMode = 'coins' | 'practice' | 'online';

interface SeedInfo {
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  hash: string;
}
interface ActiveRound {
  state: unknown;
  view: Record<string, unknown>;
  mode: PlayMode;
  seed?: SeedInfo & { draws: number };
}

/** Active local rounds survive app restarts (the stake is already taken). */
interface ActiveStore {
  rounds: Partial<Record<GameId, ActiveRound>>;
  put: (g: GameId, r: ActiveRound | null) => void;
}
export const useActiveRounds = create<ActiveStore>()(
  persist(
    (set) => ({
      rounds: {},
      put: (g, r) => set((s) => {
        const rounds = { ...s.rounds };
        if (r) rounds[g] = r;
        else delete rounds[g];
        return { rounds };
      }),
    }),
    { name: `${STORAGE_PREFIX}active`, storage: persistStorage },
  ),
);

export class PlayError extends Error {}

function countingRng(base: Rng & { draws?: () => number }, skip: number): Rng & { draws: () => number } {
  let n = 0;
  for (let i = 0; i < skip; i++) {
    base.float();
    n++;
  }
  return {
    float() {
      n++;
      return base.float();
    },
    draws: () => n,
  };
}

export interface OpOutcome extends OpResult {
  balance: number;
  mode: PlayMode;
  xp?: number;
}

/**
 * Runs game operations in the selected room against the right wallet:
 *  - practice: unlimited practice chips (no value, no rankings)
 *  - coins: guest wallet on device, provably-fair local RNG
 *  - online: Edge Function `game` (server RNG, server wallet, hidden state on the server)
 */
export function useGameSession(game: GameId) {
  const room = useRoom(game);
  const practicePref = room.practice;
  const signedIn = useSession((s) => !!s.userId);
  const connected = useSession((s) => s.connected);
  const serverBalance = useSession((s) => s.balance);
  const guestBalance = useWallet((s) => s.balance);
  const practiceBalance = useWallet((s) => s.practice);
  const mode: PlayMode = practicePref || (signedIn && !connected) ? 'practice' : signedIn ? 'online' : 'coins';
  const balance = mode === 'practice' ? practiceBalance : mode === 'online' ? serverBalance ?? 0 : guestBalance;
  const active = useActiveRounds((s) => s.rounds[game]);
  const rngRef = useRef<(Rng & { draws: () => number }) | null>(null);
  const seedRef = useRef<SeedInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // Restore a local round's RNG position after a restart.
  useEffect(() => {
    if (active?.seed && !rngRef.current) {
      const { draws, ...seed } = active.seed;
      seedRef.current = seed;
      rngRef.current = countingRng(fairRng(seed), draws);
    }
  }, [active]);

  const op = useCallback(
    async (name: string, params: Record<string, unknown> = {}): Promise<OpOutcome> => {
      if (busyRef.current) throw new PlayError('busy');
      busyRef.current = true;
      setBusy(true);
      try {
        const current = useActiveRounds.getState().rounds[game];
        const roundMode: PlayMode = current?.mode ?? mode;
        // Rounds are always played in the selected room; the protocol checks its limits.
        if (!current && !('room' in params)) params = { ...params, room: room.id };
        if (roundMode === 'online') {
          const res = await callFn<OpResult & { balance: number }>('game', { game, op: name, params, requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
          useSession.getState().setBalance(res.balance);
          useActiveRounds.getState().put(game, res.done ? null : { state: null, view: res.view, mode: 'online' });
          if (res.done && res.summary) afterRound(game, res.summary, false);
          return { ...res, mode: 'online' };
        }
        // Local: start a provably fair stream for a new round.
        if (!current || !rngRef.current) {
          if (!current) {
            const next = useFairness.getState().nextRound();
            const st = useFairness.getState();
            seedRef.current = { serverSeed: st.serverSeed, clientSeed: next.proof.clientSeed, nonce: next.proof.nonce, hash: next.proof.hash };
            rngRef.current = countingRng(fairRng(seedRef.current), 0);
          } else if (current.seed) {
            const { draws, ...seed } = current.seed;
            seedRef.current = seed;
            rngRef.current = countingRng(fairRng(seed), draws);
          } else {
            throw new PlayError('cannot_resume');
          }
        }
        const rng = rngRef.current!;
        const res = runOp(game, current?.state ?? null, name, params, { rng, now: Date.now() });
        const wallet = useWallet.getState();
        if (res.stake > 0) {
          const ok = roundMode === 'practice' ? wallet.practiceDebit(res.stake) : wallet.debit(res.stake, 'bet', game);
          if (!ok) {
            if (!current) {
              rngRef.current = null;
              seedRef.current = null;
            }
            throw new PlayError('insufficient');
          }
        }
        if (res.payout > 0) {
          if (roundMode === 'practice') wallet.practiceCredit(res.payout);
          else wallet.credit(res.payout, 'payout', game);
        }
        const seed = seedRef.current;
        useActiveRounds.getState().put(game, res.done ? null : { state: res.state, view: res.view, mode: roundMode, seed: seed ? { ...seed, draws: rng.draws() } : undefined });
        let xp: number | undefined;
        if (res.done && res.summary) {
          xp = afterRound(game, res.summary, roundMode === 'practice', seed ? { hash: seed.hash, clientSeed: seed.clientSeed, nonce: seed.nonce } : undefined);
          rngRef.current = null;
          seedRef.current = null;
        }
        const bal = roundMode === 'practice' ? useWallet.getState().practice : useWallet.getState().balance;
        return { ...res, balance: bal, mode: roundMode, xp };
      } catch (e) {
        if (e instanceof OnlineError || e instanceof PlayError) throw e;
        throw new PlayError(e instanceof Error ? e.message : 'error');
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [game, mode, room.id],
  );

  return { mode, balance, op, busy, active, practice: practicePref, room };
}

function afterRound(
  game: GameId,
  s: NonNullable<OpResult['summary']>,
  practice: boolean,
  fair?: { hash: string; clientSeed: string; nonce: number },
): number {
  const p = useProgress.getState();
  const { xp } = p.recordRound({ game, ts: Date.now(), bet: s.bet, payout: s.payout, practice, detail: s.detail, fair }, { multiStep: s.multiStep });
  if (!practice) {
    const l = useLearning.getState();
    p.checkAchievements({ lessons: Object.keys(l.lessons).length, tutorials: Object.values(l.tutorials).filter(Boolean).length });
  }
  return xp;
}
