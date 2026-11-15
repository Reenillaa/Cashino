import { act, renderHook } from '@testing-library/react-native';
import { useGameSession, usePlayModes, useActiveRounds } from '../session';
import { useWallet } from '@/state/wallet';
import { useProgress } from '@/state/progress';
import { useFairness } from '@/state/fairness';
import { hashServerSeed } from '@/engine/rng/rng.ts';

jest.mock('expo-crypto', () => ({ getRandomValues: (b: Uint8Array) => require('node:crypto').randomFillSync(b) }));

describe('useGameSession (local modes)', () => {
  beforeEach(() => {
    useWallet.getState().resetAll();
    useProgress.getState().resetAll();
    useActiveRounds.setState({ rounds: {} });
    usePlayModes.setState({ practice: {} });
  });

  it('plays a dice round with guest coins and records a verifiable proof', async () => {
    const { result } = await renderHook(() => useGameSession('dice'));
    expect(result.current.mode).toBe('coins');
    let out: Awaited<ReturnType<typeof result.current.op>> | undefined;
    await act(async () => {
      out = await result.current.op('play', { bet: 100, mode: 'under', target: 50 });
    });
    expect(out!.done).toBe(true);
    expect(useWallet.getState().balance).toBe(10000 - 100 + out!.payout);
    const h = useProgress.getState().history[0];
    expect(h.game).toBe('dice');
    expect(h.fair?.hash).toBe(hashServerSeed(useFairness.getState().serverSeed));
  });

  it('uses practice chips when practice mode is on and rejects overspending', async () => {
    usePlayModes.getState().setPractice('limbo', true);
    const { result } = await renderHook(() => useGameSession('limbo'));
    expect(result.current.mode).toBe('practice');
    await act(async () => {
      await result.current.op('play', { bet: 50, target: 2 });
    });
    expect(useWallet.getState().balance).toBe(10000);
    await expect(result.current.op('play', { bet: 10_000_000, target: 2 })).rejects.toThrow();
  });

  it('keeps a multi-step round active (persisted) until cash out', async () => {
    const { result } = await renderHook(() => useGameSession('mines'));
    await act(async () => {
      await result.current.op('start', { bet: 10, mines: 1 });
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
    expect(useWallet.getState().balance).toBe(10000 - 10 + cash!.payout);
  });
});
