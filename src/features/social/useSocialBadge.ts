import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useSession } from '@/state/session';

/** Number of pending friend requests + invites (0 when offline / guest). */
export function useSocialBadge(): number {
  const userId = useSession((s) => s.userId);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!supabase || !userId) {
      setN(0);
      return;
    }
    let alive = true;
    const load = async () => {
      const [{ count: req }, { count: inv }] = await Promise.all([
        supabase!.from('friendships').select('*', { count: 'exact', head: true }).eq('addressee', userId).eq('status', 'pending'),
        supabase!.from('invites').select('*', { count: 'exact', head: true }).eq('to_user', userId).eq('status', 'pending'),
      ]);
      if (alive) setN((req ?? 0) + (inv ?? 0));
    };
    void load().catch(() => undefined);
    const id = setInterval(() => void load().catch(() => undefined), 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [userId]);
  return n;
}
