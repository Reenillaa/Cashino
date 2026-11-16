import { useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useCosmetics } from '@/state/cosmetics';
import { accountShop } from '@/features/shop/accountShop';
import { useUnlocks } from '@/state/unlocks';

/** Keeps the session store in sync with Supabase Auth and tracks connectivity. */
export function useAuthListener() {
  useEffect(() => {
    if (!supabase) return;
    const s = useSession.getState();
    supabase.auth.getSession().then(({ data }) => {
      s.setSession(data.session?.user.id ?? null, data.session?.user.email ?? null);
      if (data.session) {
        void useSession.getState().refresh().catch(() => useSession.getState().setConnected(false));
        void accountShop.sync().catch(() => undefined);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      useSession.getState().setSession(session?.user.id ?? null, session?.user.email ?? null);
      if (session) {
        void useSession.getState().refresh().catch(() => undefined);
        void accountShop.sync().catch(() => undefined);
      } else {
        useCosmetics.getState().leaveAccount();
        useUnlocks.getState().leaveAccount();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);
}
