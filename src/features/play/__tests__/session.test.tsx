import { act, renderHook } from '@testing-library/react-native';
import { useGameSession, useActiveRounds } from '../session';
import { useRooms } from '../rooms';
import { ECONOMY } from '@/engine/meta/economy.ts';
import { useWallet } from '@/state/wallet';
import { useProgress } from '@/state/progress';
import { useFairness } from '@/state/fairness';
import { hashServerSeed } from '@/engine/rng/rng.ts';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('expo-crypto', () => ({ getRandomValues: (b: Uint8Array) => require('node:crypto').randomFillSync(b) }));

describe('useGameSession (local modes)', () => {
  beforeEach(() => {
    useWallet.getState().resetAll();
    useProgress.getState().resetAll();
    useActiveRounds.setState({ rounds: {} });
    useRooms.setState({ byGame: {} });
  });

  it('rejects a bet below the room minimum', async () => {
    const { result } = await renderHook(() => useGameSession('dice'));
    await expect(result.current.op('play', { bet: 10, mode: 'under', target: 50 })).rejects.toThrow('stake_outside_room');
    expect(useWallet.getState().balance).toBe(ECONOMY.startingBalance);
  });

  it('plays a dice round with guest coins and records a verifiable proof', async () => {
    const { result } = await renderHook(() => useGameSession('dice'));
    expect(result.current.mode).toBe('coins');
    let out: Awaited<ReturnType<typeof result.current.op>> | undefined;
    await act(async () => {
      out = await result.current.op('play', { bet: 100, mode: 'under', target: 50 });
    });
    expect(out!.done).toBe(true);
    expect(useWallet.getState().balance).toBe(ECONOMY.startingBalance - 100 + out!.payout);
    expect(result.current.room.id).toBe('r1');
    const h = useProgress.getState().history[0];
    expect(h.game).toBe('dice');
    expect(h.fair?.hash).toBe(hashServerSeed(useFairness.getState().serverSeed));
  });

  it('uses practice chips in the practice room and rejects stakes outside the room', async () => {
    useRooms.getState().choose('limbo', 'practice');
    const { result } = await renderHook(() => useGameSession('limbo'));
    expect(result.current.mode).toBe('practice');
    await act(async () => {
      await result.current.op('play', { bet: 50, target: 2 });
    });
    expect(useWallet.getState().balance).toBe(ECONOMY.startingBalance);
    expect(useWallet.getState().practice).not.toBe(ECONOMY.practiceBalance);
    await expect(result.current.op('play', { bet: 5_000, target: 2 })).rejects.toThrow('stake_outside_room');
  });

  it('keeps a multi-step round active (persisted) until cash out', async () => {
    const { result } = await renderHook(() => useGameSession('mines'));
    await act(async () => {
      await result.current.op('start', { bet: 20, mines: 1 });
    });
    expect(useActiveRounds.getState().rounds.mines).toBeDefined();
    expect((useActiveRounds.getState().rounds.mines!.view as { minePositions: unknown }).minePositions).toBeNull();
    const mine = (useActiveRounds.getState().rounds.mines!.state as { minePositions: number[] }).minePositions[0];
    const safe = mine === 0 ? 1 : 0;
    await act(async () => {
      await result.current.op('reveal', { tile: safe });
    });
    let cash: Awaited<ReturnType<typeof result.current.op>> | undefined;
    await act(async () => {
      cash = await result.current.op('cashout');
    });
    expect(cash!.done).toBe(true);
    expect(useActiveRounds.getState().rounds.mines).toBeUndefined();
    expect(useWallet.getState().balance).toBe(ECONOMY.startingBalance - 20 + cash!.payout);
  });
});
