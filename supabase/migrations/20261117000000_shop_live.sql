-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Cosmetic shop for accounts + live (shared, timed) multiplayer rounds.
-- Prices and rules live in the shared engine; these functions only move coins atomically and are
-- callable by the service role (Edge Functions) only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

-- New ledger kinds
do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.coin_ledger'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%' loop
    execute format('alter table public.coin_ledger drop constraint %I', c);
  end loop;
end $$;
alter table public.coin_ledger add constraint coin_ledger_kind_check check (kind in ('signup', 'bet', 'payout', 'daily', 'refill', 'mission', 'level', 'achievement', 'migration', 'buyin', 'cashout', 'tournament', 'adjust', 'shop', 'live_bet', 'live_payout'));

-- ─────────────────────────────── Shop ───────────────────────────────
create table public.cosmetics_owned (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item text not null check (item ~ '^(back|felt|avatar|frame|title):[a-z0-9]{1,20}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table public.cosmetics_owned enable row level security;
create policy "cosmetics: self read" on public.cosmetics_owned for select to authenticated using (user_id = auth.uid());

-- What each player has equipped (others see it at the poker table and in rankings). Not client-writable.
alter table public.profiles add column if not exists cosmetics jsonb not null default '{}'::jsonb;

create or replace function public.shop_buy(p_user uuid, p_item text, p_price bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  if p_price < 0 then raise exception 'invalid_price'; end if;
  insert into cosmetics_owned (user_id, item) values (p_user, p_item) on conflict do nothing;
  if not found then raise exception 'already_owned' using errcode = 'P0001'; end if;
  -- raises 'insufficient' (and rolls everything back) when the player cannot afford it
  v_balance := wallet_apply(p_user, -p_price, 'shop', p_item, 'shop:' || p_user || ':' || p_item);
  return v_balance;
end $$;
revoke execute on function public.shop_buy(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.shop_buy(uuid, text, bigint) to service_role;

-- ─────────────────────────────── Live rounds ───────────────────────────────
-- One row per game and time slot. `card` is public before betting closes (e.g. the horses);
-- `result` is created only after betting closes, with a server-side random seed.
create table public.live_rounds (
  game text not null check (game in ('horses', 'roulette')),
  slot bigint not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  ends_at timestamptz not null,
  card jsonb,
  result jsonb,
  settled boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (game, slot)
);
alter table public.live_rounds enable row level security;
create policy "live rounds: readable" on public.live_rounds for select to authenticated using (true);

create table public.live_secrets (
  game text not null,
  slot bigint not null,
  seed text not null,
  primary key (game, slot)
);
alter table public.live_secrets enable row level security; -- server only

create table public.live_bets (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  slot bigint not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  username text not null,
  avatar text not null,
  bet jsonb not null,
  amount bigint not null check (amount > 0),
  payout bigint,
  created_at timestamptz not null default now(),
  foreign key (game, slot) references public.live_rounds (game, slot) on delete cascade
);
create index live_bets_round_idx on public.live_bets (game, slot);
create index live_bets_user_idx on public.live_bets (user_id, created_at desc);
alter table public.live_bets enable row level security;
-- Live tables are social: everyone signed in sees who bet what in the current round.
create policy "live bets: readable" on public.live_bets for select to authenticated using (true);

create or replace function public.live_place_bet(p_user uuid, p_game text, p_slot bigint, p_bet jsonb, p_amount bigint, p_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_round live_rounds; v_balance bigint; v_profile profiles;
begin
  -- retried request: the bet is already placed, just report the balance
  if exists (select 1 from coin_ledger where idempotency_key = p_key) then
    return (select balance from wallets where user_id = p_user);
  end if;
  select * into v_round from live_rounds where game = p_game and slot = p_slot;
  if not found then raise exception 'no_round' using errcode = 'P0001'; end if;
  if now() >= v_round.closes_at then raise exception 'betting_closed' using errcode = 'P0001'; end if;
  if (select count(*) from live_bets where game = p_game and slot = p_slot and user_id = p_user) >= 20 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  select * into v_profile from profiles where id = p_user;
  v_balance := wallet_apply(p_user, -p_amount, 'live_bet', p_game || ':' || p_slot, p_key);
  insert into live_bets (game, slot, user_id, username, avatar, bet, amount)
  values (p_game, p_slot, p_user, v_profile.username, coalesce(v_profile.cosmetics ->> 'avatar', v_profile.avatar), p_bet, p_amount);
  return v_balance;
end $$;
revoke execute on function public.live_place_bet(uuid, text, bigint, jsonb, bigint, text) from public, anon, authenticated;
grant execute on function public.live_place_bet(uuid, text, bigint, jsonb, bigint, text) to service_role;

-- Pays one bet once (idempotent on the bet id).
create or replace function public.live_pay_bet(p_bet uuid, p_payout bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v live_bets;
begin
  select * into v from live_bets where id = p_bet for update;
  if not found or v.payout is not null then return; end if;
  update live_bets set payout = p_payout where id = p_bet;
  if p_payout > 0 then perform wallet_apply(v.user_id, p_payout, 'live_payout', v.game || ':' || v.slot, 'live:' || p_bet); end if;
  insert into game_rounds (user_id, game, bet, payout, detail) values (v.user_id, case when v.game = 'horses' then 'horses' else 'roulette' end, v.amount, p_payout, 'live');
end $$;
revoke execute on function public.live_pay_bet(uuid, bigint) from public, anon, authenticated;
grant execute on function public.live_pay_bet(uuid, bigint) to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.live_bets, public.live_rounds;
  end if;
end $$;
