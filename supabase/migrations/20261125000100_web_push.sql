-- Web push (installed web app): who wants which notifications, and a queue the `push` function drains.
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  prefs jsonb not null default '{"daily": true, "social": true, "tournaments": true}'::jsonb,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security; -- only the `push` function (service role) touches it

create table public.push_queue (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('daily', 'social', 'tournaments')),
  dedupe text not null unique, -- one notification per thing (e.g. 'daily:2026-11-20:<user>')
  title text not null,
  body text not null,
  url text not null default '/',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index push_queue_pending_idx on public.push_queue (created_at) where sent_at is null;
alter table public.push_queue enable row level security;

-- chips from a friend: tell the friend who received them
create or replace function public.queue_transfer_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_from text;
begin
  if new.kind <> 'transfer_in' then return new; end if;
  select username into v_from from profiles where id::text = new.ref;
  insert into push_queue (user_id, kind, dedupe, title, body, url)
  values (new.user_id, 'social', 'xfer:' || new.id, '🎁 ' || coalesce(v_from, 'Un amigo') || ' te ha enviado fichas', '+' || new.amount || ' fichas en tu cartera', '/')
  on conflict (dedupe) do nothing;
  return new;
end $$;
create trigger coin_ledger_transfer_push after insert on public.coin_ledger for each row execute function public.queue_transfer_push();
