-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- Titanium (provisional name) · core schema
-- Virtual currency only: coins have no monetary value and cannot be bought, sold or transferred.
-- Every table has RLS. Clients can only READ their own private data; all balance-changing writes go
-- through SECURITY DEFINER functions that only the service role (Edge Functions) may execute.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

-- ─────────────────────────────── Profiles ───────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique check (username ~ '^[A-Za-z0-9_\.]{3,20}$'),
  display_name text check (char_length(display_name) <= 40),
  avatar text not null default 'a0' check (avatar ~ '^a([0-9]|1[0-9]|2[0-3])$'),
  level int not null default 1,
  xp bigint not null default 0,
  is_public boolean not null default true,
  allow_invites boolean not null default true,
  show_online boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: public or self readable" on public.profiles for select to authenticated using (is_public or id = auth.uid());
create policy "profiles: self update cosmetic fields" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- Only cosmetic/privacy columns are client-updatable; level/xp are protected by column privileges.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar, is_public, allow_invites, show_online, last_seen_at, username) on public.profiles to authenticated;

-- ─────────────────────────────── Wallet & ledger ───────────────────────────────
create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance bigint not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
create policy "wallets: self read" on public.wallets for select to authenticated using (user_id = auth.uid());

create table public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null,
  kind text not null check (kind in ('signup', 'bet', 'payout', 'daily', 'refill', 'mission', 'level', 'achievement', 'migration', 'buyin', 'cashout', 'tournament', 'adjust')),
  ref text,
  idempotency_key text not null unique,
  balance_after bigint not null,
  created_at timestamptz not null default now()
);
create index coin_ledger_user_idx on public.coin_ledger (user_id, created_at desc);
alter table public.coin_ledger enable row level security;
create policy "ledger: self read" on public.coin_ledger for select to authenticated using (user_id = auth.uid());

/** Atomic, idempotent balance change. Replaying the same key returns the original result. */
create or replace function public.wallet_apply(p_user uuid, p_amount bigint, p_kind text, p_ref text, p_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_existing bigint;
  v_balance bigint;
begin
  select balance_after into v_existing from coin_ledger where idempotency_key = p_key;
  if found then return v_existing; end if;
  select balance into v_balance from wallets where user_id = p_user for update;
  if not found then raise exception 'wallet_not_found' using errcode = 'P0002'; end if;
  if v_balance + p_amount < 0 then raise exception 'insufficient' using errcode = 'P0001'; end if;
  update wallets set balance = balance + p_amount, updated_at = now() where user_id = p_user returning balance into v_balance;
  insert into coin_ledger (user_id, amount, kind, ref, idempotency_key, balance_after) values (p_user, p_amount, p_kind, p_ref, p_key, v_balance);
  return v_balance;
end $$;

-- ─────────────────────────────── Provably fair seeds ───────────────────────────────
create table public.user_seeds (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  server_seed text not null,
  server_seed_hash text not null,
  client_seed text not null,
  nonce bigint not null default 0,
  previous_server_seed text,
  previous_server_seed_hash text,
  previous_client_seed text,
  previous_last_nonce bigint
);
alter table public.user_seeds enable row level security; -- no client policies: only via Edge Function

-- ─────────────────────────────── Rounds, sessions, stats ───────────────────────────────
create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  bet bigint not null,
  payout bigint not null,
  detail text,
  server_seed_hash text,
  client_seed text,
  nonce bigint,
  created_at timestamptz not null default now()
);
create index game_rounds_user_idx on public.game_rounds (user_id, created_at desc);
alter table public.game_rounds enable row level security;
create policy "rounds: self read" on public.game_rounds for select to authenticated using (user_id = auth.uid());

create table public.game_sessions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  state jsonb not null,
  view jsonb not null,
  nonce bigint not null,
  draws int not null default 0,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);
alter table public.game_sessions enable row level security; -- hidden state: no client access

/** Request de-duplication: a retried request returns the stored response instead of replaying. */
create table public.processed_requests (
  key text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  response jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.processed_requests enable row level security; -- service role only

create table public.game_stats (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  rounds int not null default 0,
  wins int not null default 0,
  wagered bigint not null default 0,
  returned bigint not null default 0,
  best_multiplier numeric not null default 0,
  primary key (user_id, game)
);
alter table public.game_stats enable row level security;
create policy "stats: public profiles readable" on public.game_stats for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from profiles p where p.id = user_id and p.is_public));

create table public.daily_counters (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  round_xp int not null default 0,
  round_sp int not null default 0,
  refills int not null default 0,
  primary key (user_id, day)
);
alter table public.daily_counters enable row level security;
create policy "daily: self read" on public.daily_counters for select to authenticated using (user_id = auth.uid());

-- ─────────────────────────────── Progression & seasons ───────────────────────────────
create table public.progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  tutorials jsonb not null default '{}'::jsonb,
  lessons jsonb not null default '{}'::jsonb,
  achievements jsonb not null default '{}'::jsonb,
  bj_correct int not null default 0,
  bj_total int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
create policy "progress: self read" on public.progress for select to authenticated using (user_id = auth.uid());

create table public.season_scores (
  season int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  points int not null default 0,
  primary key (season, user_id)
);
create index season_scores_rank_idx on public.season_scores (season, points desc);
alter table public.season_scores enable row level security;
create policy "season: readable" on public.season_scores for select to authenticated using (true);

create table public.poker_ratings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rating int not null default 1200,
  games int not null default 0
);
alter table public.poker_ratings enable row level security;
create policy "ratings: readable" on public.poker_ratings for select to authenticated using (true);

create table public.reward_claims (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  period text not null,
  amount bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, period)
);
alter table public.reward_claims enable row level security;
create policy "claims: self read" on public.reward_claims for select to authenticated using (user_id = auth.uid());

create or replace function public.current_season(ts timestamptz default now()) returns int language sql immutable as $$
  select floor(extract(epoch from (ts - timestamptz '2026-01-05 00:00:00+00')) / (56 * 86400))::int + 1
$$;

/** XP → level (mirrors src/engine/meta/progression.ts: xpToNext(L) = round(150 · L^1.35)). */
create or replace function public.level_from_xp(p_xp bigint) returns int language plpgsql immutable as $$
declare l int := 1; rem bigint := greatest(p_xp, 0);
begin
  while l < 100 and rem >= round(150 * power(l, 1.35)) loop
    rem := rem - round(150 * power(l, 1.35));
    l := l + 1;
  end loop;
  return l;
end $$;

/** Awards XP and season points with the same daily caps as the client (anti-farming). */
create or replace function public.award_progress(p_user uuid, p_xp int, p_sp int, p_round boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  d date := (now() at time zone 'utc')::date;
  c daily_counters;
  v_xp int := p_xp;
  v_sp int := p_sp;
begin
  insert into daily_counters (user_id, day) values (p_user, d) on conflict do nothing;
  select * into c from daily_counters where user_id = p_user and day = d for update;
  if p_round then
    v_xp := greatest(0, least(p_xp, 1200 - c.round_xp));
    v_sp := greatest(0, least(p_sp, 200 - c.round_sp));
    update daily_counters set round_xp = round_xp + v_xp, round_sp = round_sp + v_sp where user_id = p_user and day = d;
  end if;
  if v_xp > 0 then
    update profiles set xp = profiles.xp + v_xp, level = level_from_xp(profiles.xp + v_xp) where id = p_user;
  end if;
  if v_sp > 0 then
    insert into season_scores (season, user_id, points) values (current_season(), p_user, v_sp)
      on conflict (season, user_id) do update set points = season_scores.points + excluded.points;
  end if;
end $$;

/**
 * One atomic transaction per game operation (called by the `game` Edge Function):
 * takes the stake, pays out, persists or clears the hidden session, and on settlement records the
 * round, stats, XP and season points. Idempotent per request key.
 */
create or replace function public.game_commit(
  p_user uuid, p_game text, p_stake bigint, p_payout bigint, p_done boolean,
  p_state jsonb, p_view jsonb, p_nonce bigint, p_draws int,
  p_summary jsonb, p_seed_hash text, p_client_seed text, p_key text, p_version bigint
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_balance bigint;
  v_bet bigint;
  v_pay bigint;
  v_mult numeric;
  v_cur bigint;
begin
  if p_stake < 0 or p_payout < 0 then raise exception 'invalid_amount'; end if;
  -- Serialise every operation of this user on the wallet row, then check the session version.
  select balance into v_balance from wallets where user_id = p_user for update;
  select version into v_cur from game_sessions where user_id = p_user and game = p_game for update;
  if (found and p_version is distinct from v_cur) or (not found and p_version is not null) then
    raise exception 'conflict' using errcode = 'P0001';
  end if;
  insert into processed_requests (key, user_id, response)
    values (p_key, p_user, jsonb_build_object('view', p_view, 'stake', p_stake, 'payout', p_payout, 'done', p_done, 'summary', p_summary));
  if p_stake > 0 then v_balance := wallet_apply(p_user, -p_stake, 'bet', p_game, p_key || ':stake'); end if;
  if p_payout > 0 then v_balance := wallet_apply(p_user, p_payout, 'payout', p_game, p_key || ':payout'); end if;
  if p_done then
    delete from game_sessions where user_id = p_user and game = p_game;
    v_bet := coalesce((p_summary->>'bet')::bigint, 0);
    v_pay := coalesce((p_summary->>'payout')::bigint, 0);
    v_mult := case when v_bet > 0 then v_pay::numeric / v_bet else 0 end;
    insert into game_rounds (user_id, game, bet, payout, detail, server_seed_hash, client_seed, nonce)
      values (p_user, p_game, v_bet, v_pay, p_summary->>'detail', p_seed_hash, p_client_seed, p_nonce);
    insert into game_stats as s (user_id, game, rounds, wins, wagered, returned, best_multiplier)
      values (p_user, p_game, 1, (v_pay > v_bet)::int, v_bet, v_pay, v_mult)
      on conflict (user_id, game) do update set rounds = s.rounds + 1, wins = s.wins + (v_pay > v_bet)::int,
        wagered = s.wagered + v_bet, returned = s.returned + v_pay, best_multiplier = greatest(s.best_multiplier, v_mult);
    perform award_progress(p_user, case when (p_summary->>'multiStep')::boolean then 14 else 10 end, 2, true);
  else
    insert into game_sessions (user_id, game, state, view, nonce, draws) values (p_user, p_game, p_state, p_view, p_nonce, p_draws)
      on conflict (user_id, game) do update set state = excluded.state, view = excluded.view, nonce = excluded.nonce, draws = excluded.draws,
        version = game_sessions.version + 1, updated_at = now();
  end if;
  return v_balance;
end $$;

/** Reward claims: one per (kind, period). Amount is decided by the Edge Function from server rules. */
create or replace function public.claim_reward(p_user uuid, p_kind text, p_period text, p_amount bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  insert into reward_claims (user_id, kind, period, amount) values (p_user, p_kind, p_period, p_amount);
  v_balance := wallet_apply(p_user, p_amount, p_kind, p_period, 'reward:' || p_user || ':' || p_kind || ':' || p_period);
  return v_balance;
exception when unique_violation then
  raise exception 'already_claimed' using errcode = 'P0001';
end $$;

/** Learning progress is merged as a union (a completed tutorial/lesson stays completed). */
create or replace function public.sync_learning(p_tutorials jsonb, p_lessons jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  new_lessons int;
  merged progress;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if jsonb_typeof(p_tutorials) <> 'object' or jsonb_typeof(p_lessons) <> 'object' then raise exception 'invalid'; end if;
  select count(*) into new_lessons from jsonb_object_keys(p_lessons) k
    where k ~ '^[a-z]+\.[a-z0-9-]+$' and not exists (select 1 from progress where user_id = me and lessons ? k);
  update progress set
    tutorials = tutorials || (select coalesce(jsonb_object_agg(k, true), '{}'::jsonb) from jsonb_each(p_tutorials) e(k, v) where k ~ '^[a-z]+_tutorial_completed$' and v = 'true'::jsonb),
    lessons = lessons || (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(p_lessons) e(k, v) where k ~ '^[a-z]+\.[a-z0-9-]+$'),
    updated_at = now()
  where user_id = me returning * into merged;
  -- Lesson XP/SP for newly completed lessons (at most 10 per sync to prevent abuse).
  if new_lessons > 0 then perform award_progress(me, 60 * least(new_lessons, 10), 30 * least(new_lessons, 10), false); end if;
  return jsonb_build_object('tutorials', merged.tutorials, 'lessons', merged.lessons);
end $$;

-- ─────────────────────────────── New users ───────────────────────────────
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text := regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'player'), '[^A-Za-z0-9_]', '', 'g');
  uname text;
  seed text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if char_length(base) < 3 then base := 'player'; end if;
  uname := left(base, 14) || '_' || substr(md5(new.id::text), 1, 4);
  insert into profiles (id, username, avatar) values (new.id, uname, 'a' || (abs(hashtext(new.id::text)) % 24));
  insert into wallets (user_id, balance) values (new.id, 0);
  perform wallet_apply(new.id, 10000, 'signup', null, 'signup:' || new.id);
  insert into progress (user_id) values (new.id);
  insert into poker_ratings (user_id) values (new.id);
  insert into user_seeds (user_id, server_seed, server_seed_hash, client_seed)
    values (new.id, seed, encode(extensions.digest(seed, 'sha256'), 'hex'), substr(md5(random()::text), 1, 16));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

/** One-time guest → account migration (capped), recorded so it can never be repeated. */
create table public.guest_migrations (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  device_id text not null,
  amount bigint not null,
  created_at timestamptz not null default now()
);
alter table public.guest_migrations enable row level security;
create policy "migrations: self read" on public.guest_migrations for select to authenticated using (user_id = auth.uid());

create or replace function public.migrate_guest(p_user uuid, p_device text, p_amount bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare amt bigint := greatest(0, least(p_amount, 50000));
begin
  insert into guest_migrations (user_id, device_id, amount) values (p_user, p_device, amt);
  return wallet_apply(p_user, amt, 'migration', p_device, 'migration:' || p_user);
exception when unique_violation then
  raise exception 'already_migrated' using errcode = 'P0001';
end $$;

-- Lock down privileged functions: only the service role (Edge Functions) may call them.
revoke all on function public.wallet_apply(uuid, bigint, text, text, text) from public, anon, authenticated;
revoke all on function public.award_progress(uuid, int, int, boolean) from public, anon, authenticated;
revoke all on function public.game_commit(uuid, text, bigint, bigint, boolean, jsonb, jsonb, bigint, int, jsonb, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.claim_reward(uuid, text, text, bigint) from public, anon, authenticated;
revoke all on function public.migrate_guest(uuid, text, bigint) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.wallet_apply(uuid, bigint, text, text, text) to service_role;
grant execute on function public.award_progress(uuid, int, int, boolean) to service_role;
grant execute on function public.game_commit(uuid, text, bigint, bigint, boolean, jsonb, jsonb, bigint, int, jsonb, text, text, text, bigint) to service_role;
grant execute on function public.claim_reward(uuid, text, text, bigint) to service_role;
grant execute on function public.migrate_guest(uuid, text, bigint) to service_role;
revoke all on function public.sync_learning(jsonb, jsonb) from public, anon;
grant execute on function public.sync_learning(jsonb, jsonb) to authenticated;
