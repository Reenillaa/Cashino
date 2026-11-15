import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, callFn } from '@/services/supabase';
import { useSession } from '@/state/session';
import { parseCard } from '@/engine/cards/cards.ts';
import type { TableState, PokerAction } from '@/engine/poker/table.ts';

export interface TableRow {
  id: string;
  name: string;
  code: string | null;
  is_private: boolean;
  kind: 'cash' | 'sng';
  owner: string;
  status: string;
  version: number;
  config: { smallBlind: number; bigBlind: number; buyIn: number; maxSeats: number };
  public_state: TableState;
  action_deadline: string | null;
}

/**
 * Subscribes to a table via Realtime (public state + own hole cards + reactions) and exposes actions.
 * Reconnection: on every (re)subscribe the full row is refetched, so a dropped connection resumes
 * from the latest version. A periodic `tick` drives timeouts and the next hand.
 */
export function useOnlineTable(tableId: string) {
  const userId = useSession((s) => s.userId);
  const [row, setRow] = useState<TableRow | null>(null);
  const [hole, setHole] = useState<{ hand_no: number; cards: string[] } | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<TableRow | null>(null);
  rowRef.current = row;

  const refetch = useCallback(async () => {
    if (!supabase) return;
    const [{ data: r }, { data: h }] = await Promise.all([
      supabase.from('poker_tables').select('*').eq('id', tableId).single(),
      supabase.from('poker_hole_cards').select('hand_no, cards').eq('table_id', tableId).maybeSingle(),
    ]);
    if (r) setRow(r as TableRow);
    setHole(h ?? null);
  }, [tableId]);

  useEffect(() => {
    if (!supabase || !userId) return;
    void refetch();
    const ch = supabase
      .channel(`table:${tableId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'poker_tables', filter: `id=eq.${tableId}` }, (p) => setRow(p.new as TableRow))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poker_hole_cards', filter: `table_id=eq.${tableId}` }, (p) => {
        const n = p.new as { hand_no: number; cards: string[]; user_id: string };
        if (n?.user_id === userId) setHole({ hand_no: n.hand_no, cards: n.cards });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'table_reactions', filter: `table_id=eq.${tableId}` }, (p) => {
        const n = p.new as { user_id: string; emoji: string };
        setReactions((r) => ({ ...r, [n.user_id]: n.emoji }));
        setTimeout(() => setReactions((r) => {
          const c = { ...r };
          delete c[n.user_id];
          return c;
        }), 2500);
      })
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('live');
          void refetch();
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') setStatus('reconnecting');
      });
    const tick = setInterval(() => {
      const r = rowRef.current;
      if (!r) return;
      const h = r.public_state.hand;
      const due = (r.action_deadline && Date.parse(r.action_deadline) <= Date.now()) || h?.complete;
      if (due) void callFn('poker', { action: 'tick', tableId }).catch(() => undefined);
    }, 1500);
    return () => {
      clearInterval(tick);
      void supabase!.removeChannel(ch);
    };
  }, [tableId, userId, refetch]);

  const act = useCallback(
    async (move: PokerAction) => {
      try {
        setError(null);
        await callFn('poker', { action: 'act', tableId, move, version: rowRef.current?.version });
      } catch (e) {
        setError((e as Error).message);
        void refetch();
      }
    },
    [tableId, refetch],
  );
  const leave = useCallback(() => callFn('poker', { action: 'leave', tableId }), [tableId]);
  const start = useCallback(() => callFn('poker', { action: 'start', tableId }), [tableId]);
  const react = useCallback(
    async (emoji: string) => {
      if (!supabase || !userId) return;
      await supabase.from('table_reactions').insert({ table_id: tableId, user_id: userId, emoji });
    },
    [tableId, userId],
  );
  const invite = useCallback((friendId: string) => callFn('poker', { action: 'invite', tableId, userId: friendId }), [tableId]);

  // Merge my private hole cards into the public state for rendering.
  let table: TableState | null = row ? row.public_state : null;
  const heroSeat = table ? table.seats.findIndex((s) => s?.id === userId) : -1;
  if (table?.hand && hole && hole.hand_no === table.hand.number && heroSeat >= 0) {
    table = {
      ...table,
      hand: { ...table.hand, players: table.hand.players.map((p) => (p.seat === heroSeat && p.hole.length === 0 ? { ...p, hole: hole.cards.map(parseCard) } : p)) },
    };
  }
  return { row, table, heroSeat, status, error, reactions, act, leave, start, react, invite, refetch };
}

export const REACTIONS = ['👍', '👏', '😂', '😮', '😅', '🔥', '🤔', '🍀', 'GG', 'NH'] as const;
