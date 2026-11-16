-- Unlocks: games, live tables, the sportsbook and each sport are bought with play chips (Blackjack and
-- Poker are free). The price is computed by the `shop` function with the shared engine
-- (src/engine/meta/unlocks.ts) from the number of unlocks owned and the highest balance ever held.
create table public.unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item text not null,
  price bigint not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item)
);
alter table public.unlocks enable row level security;
create policy "unlocks: self read" on public.unlocks for select to authenticated using (user_id = auth.uid());

alter table public.coin_ledger drop constraint if exists coin_ledger_kind_check;
alter table public.coin_ledger add constraint coin_ledger_kind_check check (kind in ('signup', 'bet', 'payout', 'daily', 'refill', 'mission', 'level', 'achievement', 'migration', 'buyin', 'cashout', 'tournament', 'adjust', 'shop', 'live_bet', 'live_payout', 'sports_bet', 'sports_payout', 'pass', 'sports_cashout', 'unlock', 'weekly_prize'));

/** Highest balance ever held (from the ledger; the starting balance counts). */
create or replace function public.peak_balance(p_user uuid) returns bigint language sql stable security definer set search_path = public as $$
  select greatest(coalesce((select max(balance_after) from coin_ledger where user_id = p_user), 0), (select balance from wallets where user_id = p_user))
$$;
revoke execute on function public.peak_balance(uuid) from public, anon, authenticated;
grant execute on function public.peak_balance(uuid) to service_role;

/** Buys one unlock atomically; the caller passes the price it computed and the count it was computed for. */
create or replace function public.unlock_buy(p_user uuid, p_item text, p_price bigint, p_count int)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  perform 1 from wallets where user_id = p_user for update; -- one purchase at a time per player
  if exists (select 1 from unlocks where user_id = p_user and item = p_item) then raise exception 'already_owned' using errcode = 'P0001'; end if;
  if (select count(*) from unlocks where user_id = p_user) <> p_count then raise exception 'price_changed' using errcode = 'P0001'; end if;
  v_balance := wallet_apply(p_user, -p_price, 'unlock', p_item, 'unlock:' || p_user || ':' || p_item);
  insert into unlocks (user_id, item, price) values (p_user, p_item, p_price);
  return v_balance;
end $$;
revoke execute on function public.unlock_buy(uuid, text, bigint, int) from public, anon, authenticated;
grant execute on function public.unlock_buy(uuid, text, bigint, int) to service_role;
