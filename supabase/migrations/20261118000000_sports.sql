-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Sports betting with play chips on real events (data: ESPN public scoreboards).
-- Events are public; bets are private; coins only move through these service-role functions.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.coin_ledger'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%' loop
    execute format('alter table public.coin_ledger drop constraint %I', c);
  end loop;
end $$;
alter table public.coin_ledger add constraint coin_ledger_kind_check check (kind in ('signup', 'bet', 'payout', 'daily', 'refill', 'mission', 'level', 'achievement', 'migration', 'buyin', 'cashout', 'tournament', 'adjust', 'shop', 'live_bet', 'live_payout', 'sports_bet', 'sports_payout'));

create table public.sports_events (
  id text primary key,
  sport text not null,
  league text not null,
  starts_at timestamptz not null,
  status text not null check (status in ('pre', 'live', 'final', 'void')),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create index sports_events_start_idx on public.sports_events (starts_at);
alter table public.sports_events enable row level security;
-- fixtures, scores and prices are public, even without an account
create policy "sports events: public" on public.sports_events for select to anon, authenticated using (true);
grant select on public.sports_events to anon, authenticated;

create table public.sports_meta (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);
alter table public.sports_meta enable row level security; -- server only

create table public.sports_bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stake bigint not null check (stake > 0),
  odds numeric not null check (odds >= 1),
  legs jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'won', 'lost', 'void')),
  payout bigint,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index sports_bets_user_idx on public.sports_bets (user_id, created_at desc);
create index sports_bets_pending_idx on public.sports_bets (status) where status = 'pending';
alter table public.sports_bets enable row level security;
create policy "sports bets: self read" on public.sports_bets for select to authenticated using (user_id = auth.uid());

create or replace function public.sports_place(p_user uuid, p_stake bigint, p_odds numeric, p_legs jsonb, p_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  if exists (select 1 from sports_bets where idempotency_key = p_key) then
    return (select balance from wallets where user_id = p_user);
  end if;
  v_balance := wallet_apply(p_user, -p_stake, 'sports_bet', null, 'sportsbet:' || p_key);
  insert into sports_bets (user_id, stake, odds, legs, idempotency_key) values (p_user, p_stake, p_odds, p_legs, p_key);
  return v_balance;
end $$;
revoke execute on function public.sports_place(uuid, bigint, numeric, jsonb, text) from public, anon, authenticated;
grant execute on function public.sports_place(uuid, bigint, numeric, jsonb, text) to service_role;

create or replace function public.sports_settle(p_bet uuid, p_status text, p_payout bigint, p_legs jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v sports_bets;
begin
  select * into v from sports_bets where id = p_bet for update;
  if not found or v.status <> 'pending' then return; end if;
  update sports_bets set status = p_status, payout = p_payout, legs = p_legs, settled_at = now() where id = p_bet;
  if p_payout > 0 then perform wallet_apply(v.user_id, p_payout, 'sports_payout', p_bet::text, 'sports:' || p_bet); end if;
end $$;
revoke execute on function public.sports_settle(uuid, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.sports_settle(uuid, text, bigint, jsonb) to service_role;
