import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { useSession } from '@/state/session';

export interface MiniProfile { id: string; username: string; display_name?: string | null; avatar: string; level?: number }
export interface FriendRow { id: string; requester: string; addressee: string; status: string; other: MiniProfile }

/** Friends + requests for the signed-in user (RLS limits rows to the participants). */
export function useFriends() {
  const userId = useSession((s) => s.userId);
  const [rows, setRows] = useState<FriendRow[]>([]);
  const load = useCallback(async () => {
    if (!supabase || !userId) return setRows([]);
    const { data } = await supabase.from('friendships').select('id, requester, addressee, status').order('created_at', { ascending: false });
    const list = data ?? [];
    const ids = [...new Set(list.map((f) => (f.requester === userId ? f.addressee : f.requester)))];
    const { data: profs } = ids.length ? await supabase.from('profiles').select('id, username, display_name, avatar, level').in('id', ids) : { data: [] };
    const byId = Object.fromEntries((profs ?? []).map((p) => [p.id, p as MiniProfile]));
    setRows(list.map((f) => ({ ...f, other: byId[f.requester === userId ? f.addressee : f.requester] ?? { id: '?', username: '…', avatar: 'a0' } })));
  }, [userId]);
  useEffect(() => void load(), [load]);
  const request = async (to: string) => {
    if (!supabase || !userId) return;
    const { error } = await supabase.from('friendships').insert({ requester: userId, addressee: to });
    if (error) throw new Error(error.message);
    await load();
  };
  const respond = async (id: string, accept: boolean) => {
    if (!supabase) return;
    await supabase.from('friendships').update({ status: accept ? 'accepted' : 'declined' }).eq('id', id);
    await load();
  };
  const remove = async (id: string) => {
    if (!supabase) return;
    await supabase.from('friendships').delete().eq('id', id);
    await load();
  };
  const block = async (other: string) => {
    if (!supabase || !userId) return;
    await supabase.from('blocks').insert({ blocker: userId, blocked: other });
    await supabase.from('friendships').delete().or(`requester.eq.${other},addressee.eq.${other}`);
    await load();
  };
  const report = async (other: string, reason: 'cheating' | 'harassment' | 'username' | 'other') => {
    if (!supabase || !userId) return;
    await supabase.from('reports').insert({ reporter: userId, reported: other, reason });
  };
  return {
    accepted: rows.filter((r) => r.status === 'accepted').map((r) => ({ ...r.other, friendshipId: r.id })),
    incoming: rows.filter((r) => r.status === 'pending' && r.addressee === userId),
    outgoing: rows.filter((r) => r.status === 'pending' && r.requester === userId),
    request, respond, remove, block, report, reload: load,
  };
}

export async function searchProfiles(q: string): Promise<MiniProfile[]> {
  if (!supabase || q.trim().length < 2) return [];
  const { data } = await supabase.rpc('search_profiles', { q: q.trim() });
  return (data as MiniProfile[]) ?? [];
}

export function useTeams() {
  const userId = useSession((s) => s.userId);
  const [mine, setMine] = useState<{ id: string; name: string; members: number } | null>(null);
  const [list, setList] = useState<{ id: string; name: string }[]>([]);
  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data: m } = await supabase.from('team_members').select('team_id, teams(name)').eq('user_id', userId).maybeSingle();
    if (m) {
      const { count } = await supabase.from('team_members').select('*', { count: 'exact', head: true }).eq('team_id', m.team_id);
      setMine({ id: m.team_id, name: (m.teams as unknown as { name: string })?.name ?? '', members: count ?? 1 });
    } else setMine(null);
    const { data: all } = await supabase.from('teams').select('id, name').order('created_at', { ascending: false }).limit(20);
    setList(all ?? []);
  }, [userId]);
  useEffect(() => void load(), [load]);
  const create = async (name: string) => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.from('teams').insert({ name, owner: userId }).select('id').single();
    if (error) throw new Error(error.message);
    await supabase.from('team_members').insert({ team_id: data.id, user_id: userId, role: 'owner' });
    await load();
  };
  const join = async (teamId: string) => {
    if (!supabase || !userId) return;
    const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id: userId });
    if (error) throw new Error(error.message);
    await load();
  };
  const leave = async () => {
    if (!supabase || !userId) return;
    await supabase.from('team_members').delete().eq('user_id', userId);
    await load();
  };
  return { mine, list, create, join, leave };
}

export function useTournaments() {
  const [list, setList] = useState<{ id: string; name: string; status: string; entry_fee: number; max_players: number; table_id: string | null }[]>([]);
  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('tournaments').select('id, name, status, entry_fee, max_players, table_id').in('status', ['registering', 'running']).order('created_at', { ascending: false }).limit(20);
    setList(data ?? []);
  }, []);
  useEffect(() => void load(), [load]);
  return { list, reload: load };
}

export function useActivity() {
  const userId = useSession((s) => s.userId);
  const [items, setItems] = useState<{ id: number; user_id: string; kind: string; payload: Record<string, unknown>; created_at: string }[]>([]);
  useEffect(() => {
    if (!supabase || !userId) return;
    void supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(30).then(({ data }) => setItems(data ?? []));
  }, [userId]);
  return items;
}

export function useInvites() {
  const userId = useSession((s) => s.userId);
  const [items, setItems] = useState<{ id: string; table_id: string; from_user: string; status: string }[]>([]);
  const load = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data } = await supabase.from('table_invites').select('id, table_id, from_user, status').eq('to_user', userId).eq('status', 'pending');
    setItems(data ?? []);
  }, [userId]);
  useEffect(() => void load(), [load]);
  const decline = async (id: string) => {
    if (!supabase) return;
    await supabase.from('table_invites').update({ status: 'declined' }).eq('id', id);
    await load();
  };
  return { items, decline, reload: load };
}
