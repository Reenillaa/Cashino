import { useEffect } from 'react';
import { create } from 'zustand';
import { callFn, supabase } from '@/services/supabase';
import { useSession } from '@/state/session';
import { useProgress } from '@/state/progress';
import i18n from '@/i18n';

/** Whether the signed-in account is a developer (admin) account — decided by the server only. */
export const useAdmin = create<{ admin: boolean; userId: string | null; check: () => Promise<void> }>()((set, get) => ({
  admin: false,
  userId: null,
  check: async () => {
    const uid = useSession.getState().userId;
    if (!uid) return set({ admin: false, userId: null });
    if (get().userId === uid) return;
    try {
      const r = await callFn<{ admin: boolean }>('admin', { action: 'me' });
      set({ admin: r.admin, userId: uid });
    } catch {
      set({ admin: false, userId: null });
    }
  },
}));

/** Checks admin status on sign-in and shows chip gifts the player received ("🎁 +10.000 fichas"). */
export function useAdminAndGifts() {
  const uid = useSession((s) => s.userId);
  useEffect(() => {
    if (!uid || !supabase) {
      useAdmin.setState({ admin: false, userId: null });
      return;
    }
    void useAdmin.getState().check();
    const look = async () => {
      const { data } = await supabase!.from('notifications').select('id, payload').eq('kind', 'gift').is('read_at', null).limit(10);
      if (!data?.length) return;
      for (const n of data) {
        const p = n.payload as { amount: number; note?: string | null };
        useProgress.getState().pushToast({ kind: 'info', title: i18n.t('admin.received', { amount: p.amount.toLocaleString('es-ES') }), body: p.note ?? undefined });
      }
      await supabase!.from('notifications').update({ read_at: new Date().toISOString() }).in('id', data.map((n) => n.id));
      void useSession.getState().refresh().catch(() => undefined);
    };
    const first = setTimeout(() => void look(), 1500);
    const every = setInterval(() => void look(), 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [uid]);
}
