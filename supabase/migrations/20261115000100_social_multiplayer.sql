-- ═══════════════════════════════ Social, teams, tournaments, online poker ═══════════════════════════════
-- No text chat exists anywhere: social interaction is limited to a closed set of reactions.

-- ─────────────────────────────── Friends & blocks ───────────────────────────────
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index friendships_pair_uidx on public.friendships (least(requester, addressee), greatest(requester, addressee));
alter table public.friendships enable row level security;

create table public.blocks (
  blocker uuid not null references public.profiles (id) on delete cascade,
  blocked uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
alter table public.blocks enable row level security;
create policy "blocks: own" on public.blocks for all to authenticated using (blocker = auth.uid()) with check (blocker = auth.uid());

create or replace function public.is_blocked(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a))
$$;
create or replace function public.are_friends(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where status = 'accepted' and ((requester = a and addressee = b) or (requester = b and addressee = a)))
$$;

create policy "friendships: participants read" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
create policy "friendships: request" on public.friendships for insert to authenticated
  with check (requester = auth.uid() and status = 'pending' and not public.is_blocked(requester, addressee)
    and exists (select 1 from public.profiles p where p.id = addressee and p.allow_invites));
create policy "friendships: addressee responds" on public.friendships for update to authenticated
  using (addressee = auth.uid() and status = 'pending') with check (addressee = auth.uid() and status in ('accepted', 'declined'));
create policy "friendships: either removes" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

/** Username search for adding friends (public profiles, never blocked users). */
create or replace function public.search_profiles(q text) returns table (id uuid, username text, display_name text, avatar text, level int)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar, p.level from profiles p
  where p.is_public and p.id <> auth.uid() and char_length(q) >= 2 and p.username ilike q || '%' and not is_blocked(auth.uid(), p.id)
  order by p.username limit 20
$$;
revoke all on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;

-- ─────────────────────────────── Teams ───────────────────────────────
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name extensions.citext not null unique check (char_length(name) between 3 and 24 and name ~ '^[A-Za-z0-9 _\-]+$'),
  owner uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;
create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.team_members enable row level security;
create policy "teams: readable" on public.teams for select to authenticated using (true);
create policy "teams: create own" on public.teams for insert to authenticated with check (owner = auth.uid());
create policy "teams: owner deletes" on public.teams for delete to authenticated using (owner = auth.uid());
create policy "members: readable" on public.team_members for select to authenticated using (true);
create policy "members: join self" on public.team_members for insert to authenticated
  with check (user_id = auth.uid() and (select count(*) from public.team_members m where m.team_id = team_members.team_id) < 20
    and (role = 'member' or exists (select 1 from public.teams t where t.id = team_id and t.owner = auth.uid())));
create policy "members: leave self" on public.team_members for delete to authenticated using (user_id = auth.uid());

-- ─────────────────────────────── Activity & notifications ───────────────────────────────
create table public.activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('level', 'achievement', 'tournament', 'bigwin', 'team', 'friend')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_user_idx on public.activity (user_id, created_at desc);
alter table public.activity enable row level security;
create policy "activity: self and friends" on public.activity for select to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications: own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications: mark read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null references public.profiles (id) on delete cascade,
  reported uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('cheating', 'harassment', 'username', 'other')),
  context jsonb,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reports: create own" on public.reports for insert to authenticated with check (reporter = auth.uid());

-- Friend events → notifications (trigger keeps clients simple and consistent)
create or replace function public.notify_friendship() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, kind, payload) values (new.addressee, 'friend_request', jsonb_build_object('from', new.requester, 'id', new.id));
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status = 'pending' then
    insert into notifications (user_id, kind, payload) values (new.requester, 'friend_accepted', jsonb_build_object('by', new.addressee));
    insert into activity (user_id, kind, payload) values (new.requester, 'friend', jsonb_build_object('with', new.addressee));
  end if;
  return new;
end $$;
create trigger friendships_notify after insert or update on public.friendships for each row execute function public.notify_friendship();

-- ─────────────────────────────── Online poker ───────────────────────────────
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 40),
  created_by uuid references public.profiles (id) on delete set null,
  is_private boolean not null default false,
  max_players int not null default 6 check (max_players between 2 and 6),
  entry_fee bigint not null default 0 check (entry_fee between 0 and 100000),
  starts_at timestamptz,
  status text not null default 'registering' check (status in ('registering', 'running', 'finished', 'cancelled')),
  table_id uuid,
  created_at timestamptz not null default now()
);
alter table public.tournaments enable row level security;
create table public.tournament_entries (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  place int,
  prize bigint,
  created_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
alter table public.tournament_entries enable row level security;

create table public.poker_tables (
  id uuid primary key default gen_random_uuid(),
  code text unique check (code ~ '^[A-Z0-9]{6}$'),
  name text not null,
  is_private boolean not null default false,
  owner uuid references public.profiles (id) on delete set null,
  kind text not null default 'cash' check (kind in ('cash', 'sng')),
  tournament_id uuid references public.tournaments (id) on delete cascade,
  config jsonb not null,
  public_state jsonb not null,
  version bigint not null default 0,
  status text not null default 'open' check (status in ('open', 'running', 'finished')),
  action_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.poker_tables enable row level security;
alter table public.tournaments add constraint tournaments_table_fk foreign key (table_id) references public.poker_tables (id) on delete set null;

create table public.poker_private (
  table_id uuid primary key references public.poker_tables (id) on delete cascade,
  state jsonb not null
);
alter table public.poker_private enable row level security; -- deck & hole cards: service role only

create table public.poker_seats (
  table_id uuid not null references public.poker_tables (id) on delete cascade,
  seat int not null check (seat between 0 and 5),
  user_id uuid references public.profiles (id) on delete cascade,
  is_bot boolean not null default false,
  bot_profile text,
  buy_in bigint not null default 0,
  connected boolean not null default true,
  timeouts int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (table_id, seat),
  unique (table_id, user_id),
  check (is_bot or user_id is not null)
);
alter table public.poker_seats enable row level security;

create table public.poker_hole_cards (
  table_id uuid not null references public.poker_tables (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  hand_no int not null,
  cards text[] not null,
  primary key (table_id, user_id)
);
alter table public.poker_hole_cards enable row level security;
create policy "hole cards: only mine" on public.poker_hole_cards for select to authenticated using (user_id = auth.uid());

create table public.table_invites (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.poker_tables (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (table_id, to_user)
);
alter table public.table_invites enable row level security;
create policy "invites: participants read" on public.table_invites for select to authenticated using (auth.uid() in (from_user, to_user));
create policy "invites: respond" on public.table_invites for update to authenticated using (to_user = auth.uid()) with check (to_user = auth.uid());
-- Generic view used by the tab badge (friend + table invites)
create view public.invites with (security_invoker = true) as
  select id, to_user, status, 'table'::text as kind, table_id as ref from public.table_invites;

create or replace function public.can_see_table(t uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from poker_tables pt where pt.id = t and not pt.is_private)
    or exists (select 1 from poker_seats s where s.table_id = t and s.user_id = auth.uid())
    or exists (select 1 from table_invites i where i.table_id = t and i.to_user = auth.uid())
    or exists (select 1 from poker_tables pt where pt.id = t and pt.owner = auth.uid())
$$;
create policy "tables: visible" on public.poker_tables for select to authenticated using (public.can_see_table(id));
create policy "seats: visible" on public.poker_seats for select to authenticated using (public.can_see_table(table_id));
create policy "tournaments: visible" on public.tournaments for select to authenticated using (not is_private or created_by = auth.uid()
  or exists (select 1 from public.tournament_entries e where e.tournament_id = id and e.user_id = auth.uid()));
create policy "entries: visible" on public.tournament_entries for select to authenticated using (true);

-- ─────────────────────────────── Reactions (closed set, rate-limited) ───────────────────────────────
create table public.table_reactions (
  id bigint generated always as identity primary key,
  table_id uuid not null references public.poker_tables (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('👍', '👏', '😂', '😮', '😅', '🔥', '🤔', '🍀', 'GG', 'NH')),
  created_at timestamptz not null default now()
);
create index table_reactions_idx on public.table_reactions (table_id, created_at desc);
alter table public.table_reactions enable row level security;
create policy "reactions: visible at table" on public.table_reactions for select to authenticated using (public.can_see_table(table_id));
create policy "reactions: seated players" on public.table_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.poker_seats s where s.table_id = table_reactions.table_id and s.user_id = auth.uid()));

create or replace function public.rate_limit_reactions() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from table_reactions where user_id = new.user_id and created_at > now() - interval '2 seconds') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger table_reactions_rate before insert on public.table_reactions for each row execute function public.rate_limit_reactions();

-- ─────────────────────────────── Leaderboards (balance is never used) ───────────────────────────────
create view public.leaderboard_season with (security_invoker = false) as
  select s.season, s.user_id, p.username::text, p.avatar, p.level, s.points,
         rank() over (partition by s.season order by s.points desc) as rank
  from public.season_scores s join public.profiles p on p.id = s.user_id
  where p.is_public;

create view public.leaderboard_poker with (security_invoker = false) as
  select r.user_id, p.username::text, p.avatar, r.rating, r.games, rank() over (order by r.rating desc) as rank
  from public.poker_ratings r join public.profiles p on p.id = r.user_id
  where p.is_public and r.games >= 3;

/** Per-game mastery for chance games: log-scaled participation + learning, never wagering size or luck. */
create view public.leaderboard_games with (security_invoker = false) as
  select g.game, g.user_id, p.username::text, p.avatar,
    round(400 * least(1, log(10, 1 + g.rounds) / 3)
      + 350 * least(1, (select count(*) from jsonb_object_keys(pr.lessons) k where k like g.game || '.%')::numeric / 3)
      + case when pr.tutorials ? (g.game || '_tutorial_completed') then 50 else 0 end)::int as score,
    case when g.game = 'blackjack' and pr.bj_total > 0 then
      round(1000 * ((pr.bj_correct::numeric / pr.bj_total + 1.9208 / pr.bj_total
        - 1.96 * sqrt((pr.bj_correct::numeric / pr.bj_total * (1 - pr.bj_correct::numeric / pr.bj_total) + 0.9604 / pr.bj_total) / pr.bj_total))
        / (1 + 3.8416 / pr.bj_total)))::int end as skill
  from public.game_stats g join public.profiles p on p.id = g.user_id join public.progress pr on pr.user_id = g.user_id
  where p.is_public;

grant select on public.leaderboard_season, public.leaderboard_poker, public.leaderboard_games to authenticated;
revoke all on public.leaderboard_season, public.leaderboard_poker, public.leaderboard_games from anon;

-- Realtime: clients subscribe to public table state, their own hole cards and reactions.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.poker_tables, public.poker_seats, public.poker_hole_cards, public.table_reactions, public.notifications;
  end if;
end $$;
