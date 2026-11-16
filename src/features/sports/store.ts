import { create } from 'zustand';
import { callFn, OnlineError, supabase } from '@/services/supabase';
import { useSession } from '@/state/session';
import { SLIP, type SlipSel, type SportEvent } from '@/engine/sports/sports.ts';

export interface SportsBet { id: string; stake: number; odds: number; legs: SlipSel[]; status: 'pending' | 'won' | 'lost' | 'void' | 'cashout'; payout: number | null; created_at: string }

interface SportsState {
  events: SportEvent[];
  loading: boolean;
  loadedAt: number;
  slip: SlipSel[];
  mode: 'single' | 'combo';
  bets: SportsBet[];
  load: () => Promise<void>;
  loadBets: () => Promise<void>;
  toggle: (s: SlipSel) => void;
  remove: (eventId: string, market: string) => void;
  clear: () => void;
  setMode: (m: 'single' | 'combo') => void;
  place: (stake: number) => Promise<{ ok: true } | { ok: false; code: string }>;
  cashOut: (betId: string, expect: number) => Promise<number>;
}

/** Real fixtures + our prices (read straight from the database, refreshed by the server), the bet slip and my bets. */
export const useSports = create<SportsState>()((set, get) => ({
  events: [],
  loading: false,
  loadedAt: 0,
  slip: [],
  mode: 'single',
  bets: [],
  load: async () => {
    if (!supabase || get().loading) return;
    set({ loading: true });
    try {
      // signed-in players also ask the server to pull fresh scores (throttled there)
      if (useSession.getState().userId) await callFn('sports', { action: 'refresh' }).catch(() => undefined);
      const since = new Date(Date.now() - 30 * 3600_000).toISOString();
      const { data } = await supabase.from('sports_events').select('data').gte('starts_at', since).order('starts_at', { ascending: true }).limit(600);
      set({ events: (data ?? []).map((r) => r.data as SportEvent), loadedAt: Date.now() });
    } finally {
      set({ loading: false });
    }
  },
  loadBets: async () => {
    if (!supabase || !useSession.getState().userId) return set({ bets: [] });
    const { data } = await supabase.from('sports_bets').select('id, stake, odds, legs, status, payout, created_at').order('created_at', { ascending: false }).limit(100);
    set({ bets: (data as SportsBet[]) ?? [] });
  },
  toggle: (s) =>
    set((st) => {
      const same = st.slip.find((x) => x.eventId === s.eventId && x.market === s.market && x.sel === s.sel);
      if (same) return { slip: st.slip.filter((x) => x !== same) };
      // one pick per market of an event (picking another selection replaces it)
      const rest = st.slip.filter((x) => !(x.eventId === s.eventId && x.market === s.market));
      if (rest.length >= SLIP.maxSelections) return {};
      return { slip: [...rest, s] };
    }),
  remove: (eventId, market) => set((st) => ({ slip: st.slip.filter((x) => !(x.eventId === eventId && x.market === market)) })),
  clear: () => set({ slip: [] }),
  setMode: (mode) => set({ mode }),
  cashOut: async (betId, expect) => {
    try {
      const r = await callFn<{ ok: boolean; value: number; balance: number }>('sports', { action: 'cashout', betId, expect });
      useSession.getState().setBalance(Number(r.balance));
      await get().loadBets();
      return r.value;
    } catch (e) {
      // prices moved or the event started: refresh so the card shows the new quote (or none)
      await Promise.all([get().load(), get().loadBets()]);
      throw e;
    }
  },
  place: async (stake) => {
    const { slip, mode } = get();
    try {
      const r = await callFn<{ ok: boolean; balance: number }>('sports', { action: 'bet', mode, stake, legs: slip.map((l) => ({ eventId: l.eventId, market: l.market, sel: l.sel, odds: l.odds })), requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      useSession.getState().setBalance(Number(r.balance));
      set({ slip: [] });
      void get().loadBets();
      return { ok: true };
    } catch (e) {
      const code = e instanceof OnlineError ? e.code : 'error';
      // prices moved: refresh the slip with the server's odds so the player can confirm again
      if (code === 'odds_changed') await get().load();
      const events = get().events;
      if (code === 'odds_changed') {
        const { findSelection } = await import('@/engine/sports/sports.ts');
        set((st) => ({ slip: st.slip.map((l) => { const ev = events.find((x) => x.id === l.eventId); const s = ev ? findSelection(ev, l.market, l.sel) : null; return s ? { ...l, odds: s.odds } : l; }) }));
      }
      return { ok: false, code };
    }
  },
}));

/** Combined odds of the slip (combo) and whether a combo is allowed (no two picks from one event). */
export function slipOdds(slip: SlipSel[]): { odds: number; comboOk: boolean } {
  const comboOk = slip.length >= 2 && new Set(slip.map((s) => s.eventId)).size === slip.length;
  return { odds: Math.min(SLIP.maxOdds, slip.reduce((o, s) => o * s.odds, 1)), comboOk };
}
