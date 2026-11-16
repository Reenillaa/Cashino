-- Admin (developer) accounts: everything unlocked and a panel to gift chips. Being an admin is set only by
-- the project owner (SQL / service role): the table has no policies, so players can neither read nor write it.
create table public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create table public.admin_gifts (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount > 0 and amount <= 10000000),
  note text,
  created_at timestamptz not null default now()
);
alter table public.admin_gifts enable row level security;
create index admin_gifts_admin_idx on public.admin_gifts (admin_id, created_at desc);

/** Gifts chips to a player (called by the `admin` function after checking the caller is an admin). */
create or replace function public.admin_gift(p_admin uuid, p_user uuid, p_amount bigint, p_note text, p_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_balance bigint;
begin
  if not exists (select 1 from admins where user_id = p_admin) then raise exception 'not_admin' using errcode = 'P0001'; end if;
  if p_amount <= 0 or p_amount > 10000000 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  -- a retried request (same key) is paid only once
  if exists (select 1 from coin_ledger where idempotency_key = 'gift:' || p_key) then
    return (select balance from wallets where user_id = p_user);
  end if;
  v_balance := wallet_apply(p_user, p_amount, 'adjust', 'gift', 'gift:' || p_key);
  insert into admin_gifts (admin_id, user_id, amount, note) values (p_admin, p_user, p_amount, p_note);
  insert into notifications (user_id, kind, payload) values (p_user, 'gift', jsonb_build_object('amount', p_amount, 'note', p_note));
  return v_balance;
end $$;
revoke execute on function public.admin_gift(uuid, uuid, bigint, text, text) from public, anon, authenticated;
grant execute on function public.admin_gift(uuid, uuid, bigint, text, text) to service_role;
