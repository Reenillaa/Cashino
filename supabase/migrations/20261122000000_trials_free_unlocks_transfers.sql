-- Trials, free unlocks and chip transfers between friends.
-- 1) Every account (new and existing) gets 2 free unlocks to open any two games of their choice.
--    Free unlocks are stored with price 0 and do not push up the price ladder of paid unlocks.
-- 2) Every locked game can be tried for 3 rounds before buying it (counted per account and game).
-- 3) Accepted friends can send each other chips, with daily limits so it cannot be used to farm accounts.

-- ───────────── free unlocks ─────────────
alter table public.profiles add column if not exists free_unlocks int not null default 2 check (free_unlocks >= 0);

/** Opens a game with one of the player's free unlocks. Returns the free unlocks left. */
create or replace function public.unlock_free(p_user uuid, p_item text)
returns int language plpgsql security definer set search_path = public as $$
declare v_left int;
begin
  if p_item not like 'game:%' then raise exception 'games_only' using errcode = 'P0001'; end if;
  select free_unlocks into v_left from profiles where id = p_user for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_left <= 0 then raise exception 'no_free_unlocks' using errcode = 'P0001'; end if;
  if exists (select 1 from unlocks where user_id = p_user and item = p_item) then raise exception 'already_owned' using errcode = 'P0001'; end if;
  insert into unlocks (user_id, item, price) values (p_user, p_item, 0);
  update profiles set free_unlocks = free_unlocks - 1 where id = p_user returning free_unlocks into v_left;
  return v_left;
end $$;
revoke execute on function public.unlock_free(uuid, text) from public, anon, authenticated;
grant execute on function public.unlock_free(uuid, text) to service_role;

/** Paid unlocks only set the price of the next one (free unlocks never make it more expensive). */
create or replace function public.unlock_buy(p_user uuid, p_item text, p_price bigint, p_count int)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  perform 1 from wallets where user_id = p_user for update; -- one purchase at a time per player
  if exists (select 1 from unlocks where user_id = p_user and item = p_item) then raise exception 'already_owned' using errcode = 'P0001'; end if;
  if (select count(*) from unlocks where user_id = p_user and price > 0) <> p_count then raise exception 'price_changed' using errcode = 'P0001'; end if;
  v_balance := wallet_apply(p_user, -p_price, 'unlock', p_item, 'unlock:' || p_user || ':' || p_item);
  insert into unlocks (user_id, item, price) values (p_user, p_item, p_price);
  return v_balance;
end $$;
revoke execute on function public.unlock_buy(uuid, text, bigint, int) from public, anon, authenticated;
grant execute on function public.unlock_buy(uuid, text, bigint, int) to service_role;

-- ───────────── trials ─────────────
create table if not exists public.unlock_trials (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item text not null,
  used int not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table public.unlock_trials enable row level security;
create policy "unlock_trials: self read" on public.unlock_trials for select to authenticated using (user_id = auth.uid());

/** Counts one trial round; refuses when the trial is used up. Returns the trial rounds used. */
create or replace function public.use_trial(p_user uuid, p_item text, p_max int)
returns int language plpgsql security definer set search_path = public as $$
declare v_used int;
begin
  insert into unlock_trials (user_id, item, used) values (p_user, p_item, 0) on conflict do nothing;
  update unlock_trials set used = used + 1, updated_at = now() where user_id = p_user and item = p_item and used < p_max returning used into v_used;
  if v_used is null then raise exception 'trial_used' using errcode = 'P0001'; end if;
  return v_used;
end $$;
revoke execute on function public.use_trial(uuid, text, int) from public, anon, authenticated;
grant execute on function public.use_trial(uuid, text, int) to service_role;

-- ───────────── chips between friends ─────────────
alter table public.coin_ledger drop constraint if exists coin_ledger_kind_check;
alter table public.coin_ledger add constraint coin_ledger_kind_check check (kind in ('signup', 'bet', 'payout', 'daily', 'refill', 'mission', 'level', 'achievement', 'migration', 'buyin', 'cashout', 'tournament', 'adjust', 'shop', 'live_bet', 'live_payout', 'sports_bet', 'sports_payout', 'pass', 'sports_cashout', 'unlock', 'weekly_prize', 'transfer_out', 'transfer_in'));

create table if not exists public.chip_transfers (
  id bigint generated always as identity primary key,
  sender uuid not null references public.profiles (id) on delete cascade,
  recipient uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount > 0),
  note text check (char_length(note) <= 80),
  created_at timestamptz not null default now(),
  check (sender <> recipient)
);
alter table public.chip_transfers enable row level security;
create policy "chip_transfers: participants read" on public.chip_transfers for select to authenticated using (auth.uid() in (sender, recipient));
create index if not exists chip_transfers_sender_idx on public.chip_transfers (sender, created_at desc);
create index if not exists chip_transfers_recipient_idx on public.chip_transfers (recipient, created_at desc);

/**
 * Sends chips to an accepted friend. Limits (per UTC day): at most 10.000 sent per player and 20.000
 * received per player; between 10 and 10.000 per transfer. Retrying with the same key never pays twice.
 * Returns the sender's new balance.
 */
create or replace function public.send_chips(p_to uuid, p_amount bigint, p_note text, p_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_from uuid := auth.uid();
  v_day timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_sent bigint;
  v_got bigint;
  v_balance bigint;
  v_name text;
begin
  if v_from is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if p_to = v_from then raise exception 'self' using errcode = 'P0001'; end if;
  if p_amount < 10 or p_amount > 10000 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  if p_key is null or char_length(p_key) < 8 or char_length(p_key) > 80 then raise exception 'invalid_key' using errcode = 'P0001'; end if;
  if not are_friends(v_from, p_to) or is_blocked(v_from, p_to) then raise exception 'not_friends' using errcode = 'P0001'; end if;
  -- a retried request (same key) is applied only once
  if exists (select 1 from coin_ledger where idempotency_key = 'xfer-out:' || v_from || ':' || p_key) then
    return (select balance from wallets where user_id = v_from);
  end if;
  perform 1 from wallets where user_id = v_from for update; -- one transfer at a time per sender
  select coalesce(sum(amount), 0) into v_sent from chip_transfers where sender = v_from and created_at >= v_day;
  if v_sent + p_amount > 10000 then raise exception 'daily_send_limit' using errcode = 'P0001'; end if;
  select coalesce(sum(amount), 0) into v_got from chip_transfers where recipient = p_to and created_at >= v_day;
  if v_got + p_amount > 20000 then raise exception 'daily_receive_limit' using errcode = 'P0001'; end if;
  v_balance := wallet_apply(v_from, -p_amount, 'transfer_out', p_to::text, 'xfer-out:' || v_from || ':' || p_key);
  perform wallet_apply(p_to, p_amount, 'transfer_in', v_from::text, 'xfer-in:' || v_from || ':' || p_key);
  insert into chip_transfers (sender, recipient, amount, note) values (v_from, p_to, p_amount, nullif(trim(p_note), ''));
  select coalesce(display_name, username::text) into v_name from profiles where id = v_from;
  insert into notifications (user_id, kind, payload) values (p_to, 'transfer', jsonb_build_object('amount', p_amount, 'from', v_name, 'note', nullif(trim(p_note), '')));
  return v_balance;
end $$;
revoke execute on function public.send_chips(uuid, bigint, text, text) from public, anon;
grant execute on function public.send_chips(uuid, bigint, text, text) to authenticated;
