import { useWallet } from '@/state/wallet';
import { useSession } from '@/state/session';
import { useProgress } from '@/state/progress';
import { callFn } from '@/services/supabase';
import type { MissionDef } from '@/engine/meta/progression.ts';

/**
 * Reward claims. Guests use the local wallet; accounts call the `rewards` Edge Function, which applies
 * the same rules server-side with idempotency keys (one daily gift per UTC day, refill limits, missions
 * claimed once) — so rewards cannot be duplicated by replaying requests.
 */
export async function claimDailyReward(): Promise<number> {
  if (useSession.getState().userId) {
    const r = await callFn<{ amount: number; balance: number }>('rewards', { action: 'daily' });
    useSession.getState().setBalance(r.balance);
    useWallet.setState((s) => ({ daily: { lastClaimDay: Math.floor(Date.now() / 86_400_000), streak: Math.max(1, s.daily.streak + 1) } }));
    return r.amount;
  }
  return useWallet.getState().claimDaily();
}

export async function claimRefill(): Promise<number> {
  if (useSession.getState().userId) {
    const r = await callFn<{ amount: number; balance: number }>('rewards', { action: 'refill' });
    useSession.getState().setBalance(r.balance);
    return r.amount;
  }
  return useWallet.getState().refillNow();
}

/** Season pass tier. Accounts are checked by the server against their season points. */
export async function claimPassReward(tier: number): Promise<number> {
  if (useSession.getState().userId) {
    const r = await callFn<{ amount: number; balance: number }>('rewards', { action: 'pass', tier });
    useSession.getState().setBalance(r.balance);
    useProgress.getState().claimPass(tier, true);
    return r.amount;
  }
  const amount = useProgress.getState().claimPass(tier);
  if (!amount) return 0;
  useWallet.getState().credit(amount, 'pass');
  return amount;
}

export async function claimMissionReward(m: MissionDef): Promise<number> {
  const local = useProgress.getState().claimMission(m);
  if (!local) return 0;
  if (useSession.getState().userId) {
    const r = await callFn<{ amount: number; balance: number }>('rewards', { action: 'mission', missionId: m.id });
    useSession.getState().setBalance(r.balance);
    return r.amount;
  }
  useWallet.getState().credit(local.coins, 'mission');
  return local.coins;
}
