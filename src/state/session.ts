import { create } from 'zustand';
import { supabase } from '@/services/supabase';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar: string;
  level: number;
  xp: number;
  created_at: string;
}

interface SessionState {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  /** Server wallet balance (authoritative) when signed in. */
  balance: number | null;
  connected: boolean;
  ready: boolean;
  setSession: (userId: string | null, email: string | null) => void;
  setProfile: (p: Profile | null) => void;
  setBalance: (b: number | null) => void;
  setConnected: (c: boolean) => void;
  refresh: () => Promise<void>;
}

export const useSession = create<SessionState>()((set, get) => ({
  userId: null,
  email: null,
  profile: null,
  balance: null,
  connected: true,
  ready: !supabase,
  setSession: (userId, email) => set({ userId, email, ready: true, ...(userId ? {} : { profile: null, balance: null }) }),
  setProfile: (profile) => set({ profile }),
  setBalance: (balance) => set({ balance }),
  setConnected: (connected) => set({ connected }),
  refresh: async () => {
    const id = get().userId;
    if (!supabase || !id) return;
    const [{ data: profile }, { data: wallet }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('wallets').select('balance').eq('user_id', id).maybeSingle(),
    ]);
    set({ profile: (profile as Profile) ?? null, balance: wallet ? Number((wallet as { balance: number }).balance) : null });
  },
}));

export const isSignedIn = () => !!useSession.getState().userId;
