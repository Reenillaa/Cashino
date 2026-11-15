import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useSession } from '@/state/session';

/** Keeps the session store in sync with Supabase Auth and tracks connectivity. */
export function useAuthListener() {
  useEffect(() => {
    if (!supabase) return;
    const s = useSession.getState();
    supabase.auth.getSession().then(({ data }) => {
      s.setSession(data.session?.user.id ?? null, data.session?.user.email ?? null);
      if (data.session) void useSession.getState().refresh().catch(() => useSession.getState().setConnected(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      useSession.getState().setSession(session?.user.id ?? null, session?.user.email ?? null);
      if (session) void useSession.getState().refresh().catch(() => undefined);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
}
