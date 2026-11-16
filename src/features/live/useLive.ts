import { useCallback, useEffect, useRef, useState } from 'react';
import { callFn, supabase } from '@/services/supabase';
import { useSession } from '@/state/session';
import { LIVE_CONFIG, LIVE_LEAD, slotAt, type LiveBet, type LiveGame, type LiveResult } from '@/engine/meta/live.ts';
import type { RaceCard } from '@/engine/games/horses.ts';

export interface LiveRound { game: LiveGame; slot: number; opens_at: string; closes_at: string; ends_at: string; card: RaceCard | null; result: LiveResult | null; settled: boolean }
export interface LiveBetRow { id: string; user_id: string; username: string; avatar: string; bet: LiveBet; amount: number; payout: number | null; created_at: string }
export type LivePhase = 'betting' | 'waiting' | 'show' | 'results';

/**
 * Follows the live round of a game: the current round (created by the server on demand), everybody's bets
 * (read straight from the database, refreshed every few seconds) and the timeline. When betting closes it
 * asks the server to draw the result; when the slot ends it moves to the next round.
 */
export function useLive(game: LiveGame) {
  const [now, setNow] = useState(() => Date.now());
  const [round, setRound] = useState<LiveRound | null>(null);
  const [bets, setBets] = useState<LiveBetRow[]>([]);
  const [history, setHistory] = useState<LiveRound[]>([]);
  const [error, setError] = useState<string | null>(null);
  const skew = useRef(0); // server clock − device clock
  const asking = useRef(false);

  const fetchState = useCallback(async () => {
    if (asking.current) return;
    asking.current = true;
    try {
      const r = await callFn<{ now: number; round: LiveRound; balance: number }>('live', { action: 'state', game });
      skew.current = r.now - Date.now();
      setRound(r.round);
      useSession.getState().setBalance(Number(r.balance));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      asking.current = false;
    }
  }, [game]);

  const fetchBets = useCallback(async (slot: number) => {
    if (!supabase) return;
    const [{ data: b }, { data: rr }, { data: h }] = await Promise.all([
      supabase.from('live_bets').select('id,user_id,username,avatar,bet,amount,payout,created_at').eq('game', game).eq('slot', slot).order('created_at', { ascending: false }).limit(60),
      supabase.from('live_rounds').select('*').eq('game', game).eq('slot', slot).maybeSingle(),
      supabase.from('live_rounds').select('*').eq('game', game).lt('slot', slot).not('result', 'is', null).order('slot', { ascending: false }).limit(12),
    ]);
    setBets((b as LiveBetRow[]) ?? []);
    if (rr) setRound(rr as LiveRound);
    setHistory((h as LiveRound[]) ?? []);
  }, [game]);

  // clock; when betting closes it asks for the result, when the slot ends it moves to the next round
  const roundRef = useRef<LiveRound | null>(null);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);
  const lastAsk = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now() + skew.current;
      setNow(n);
      const r = roundRef.current;
      if (!r || n - lastAsk.current < 1500) return;
      const needResult = n >= new Date(r.closes_at).getTime() + 400 && !r.result;
      if (needResult || n >= new Date(r.ends_at).getTime()) {
        lastAsk.current = n;
        void fetchState();
      }
    }, 250);
    return () => clearInterval(id);
  }, [fetchState]);
  // first load
  useEffect(() => {
    const id = setTimeout(() => void fetchState(), 0);
    return () => clearTimeout(id);
  }, [fetchState]);
  // keep bets fresh
  const slot = round?.slot;
  useEffect(() => {
    if (slot === undefined) return;
    const first = setTimeout(() => void fetchBets(slot), 0);
    const id = setInterval(() => void fetchBets(slot), 3000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [slot, fetchBets]);

  const s = slotAt(game, now);
  const closesAt = round ? new Date(round.closes_at).getTime() : s.closesAt;
  const endsAt = round ? new Date(round.ends_at).getTime() : s.endsAt;
  const startsAt = closesAt + LIVE_LEAD;
  const showEnds = startsAt + LIVE_CONFIG[game].show;
  const phase: LivePhase = now < closesAt ? 'betting' : !round?.result || now < startsAt ? 'waiting' : now < showEnds ? 'show' : 'results';

  const placeBet = useCallback(
    async (bet: LiveBet) => {
      if (!round) return;
      const r = await callFn<{ ok: boolean; balance: number }>('live', { action: 'bet', game, slot: round.slot, bet, requestId: `${round.slot}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
      useSession.getState().setBalance(Number(r.balance));
      await fetchBets(round.slot);
    },
    [game, round, fetchBets],
  );

  return { now, round, bets, history, phase, closesAt, startsAt, endsAt, error, placeBet, myId: useSession.getState().userId };
}

export const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
