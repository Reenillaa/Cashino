import { supabase, callFn } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useLearning } from '@/state/learning';
import { useWallet } from '@/state/wallet';
import { kv } from '@/services/storage';
import { createSeed } from '@/services/random';

/**
 * Offline → account synchronisation (docs/05-SYNC.md):
 *  - Learning (tutorials, lessons): union merge both ways via the `sync_learning` RPC. Completed never
 *    becomes incomplete, so there are no conflicts.
 *  - Coins: the guest wallet is migrated ONCE per account (capped server-side). It is never merged again,
 *    so coins cannot be duplicated by switching devices or signing in/out.
 *  - Stats/XP/achievements: server values are authoritative for ranked play; local guest stats stay on
 *    the device for display.
 */
let timer: ReturnType<typeof setTimeout> | null = null;

export function syncLearningSoon() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncLearning(), 1500);
}

export async function syncLearning(): Promise<void> {
  if (!supabase || !useSession.getState().userId) return;
  const { tutorials, lessons } = useLearning.getState();
  const { data, error } = await supabase.rpc('sync_learning', { p_tutorials: tutorials, p_lessons: lessons });
  if (error) return;
  const merged = data as { tutorials: Record<string, boolean>; lessons: Record<string, number> };
  useLearning.getState().mergeRemote(merged);
  useLearning.getState().markSynced();
}

export function deviceId(): string {
  const k = 'ti.v1.device';
  let id = kv.getItem(k) as string | null;
  if (!id) {
    id = createSeed().slice(0, 24);
    kv.setItem(k, id);
  }
  return id;
}

/** One-time guest wallet migration into the signed-in account. */
export async function migrateGuest(): Promise<{ amount: number } | null> {
  const s = useSession.getState();
  const w = useWallet.getState();
  if (!s.userId || w.migratedToAccount) return null;
  try {
    const r = await callFn<{ amount: number; balance: number }>('account', { action: 'migrate_guest', deviceId: deviceId(), balance: w.balance });
    s.setBalance(r.balance);
    w.markMigrated(s.userId);
    return { amount: r.amount };
  } catch (e) {
    if ((e as { code?: string }).code === 'already_migrated') w.markMigrated(s.userId);
    throw e;
  }
}
