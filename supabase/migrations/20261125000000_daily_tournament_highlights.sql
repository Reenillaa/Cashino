-- Round 26: daily tournament, highlights strip (big wins and win streaks), admin stats, admins out of leagues.

-- ─────────────────────────────── Daily tournament ───────────────────────────────
-- Every UTC day one game is the tournament game (chosen by the shared engine, src/engine/meta/tournament.ts).
-- Whoever wins the most net chips in that game during the day wins; the top 3 are paid when the day ends.
create table public.daily_awards (
  day int not null,
  rank int not null,
  game text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  value bigint not null,
  prize bigint not null,
  created_at timestamptz not null default now(),
  primary key (day, rank)
);
alter table public.daily_awards enable row level security;
create policy "daily awards: readable" on public.daily_awards for select to authenticated using (true);
create index if not exists game_rounds_game_idx on public.game_rounds (game, created_at);

create or replace function public.daily_board(p_day int, p_game text, p_limit int default 50)
returns table (user_id uuid, username text, avatar text, level int, value bigint, rounds int, rank int)
language sql stable security definer set search_path = public as $$
  with v as (
    select r.user_id, sum(r.payout - r.bet)::bigint as value, count(*)::int as rounds
    from game_rounds r
    where r.game = p_game
      and r.created_at >= to_timestamp(p_day::bigint * 86400) and r.created_at < to_timestamp((p_day::bigint + 1) * 86400)
    group by r.user_id having sum(r.payout - r.bet) > 0
  )
  select v.user_id, p.username::text, coalesce(p.cosmetics ->> 'avatar', p.avatar), p.level, v.value, v.rounds,
         (rank() over (order by v.value desc))::int
  from v join profiles p on p.id = v.user_id
  where p.is_public and not exists (select 1 from admins a where a.user_id = p.id)
  order by v.value desc, p.username
  limit greatest(1, least(p_limit, 100));
$$;
revoke execute on function public.daily_board(int, text, int) from public, anon;
grant execute on function public.daily_board(int, text, int) to authenticated, service_role;

create or replace function public.settle_daily(p_day int, p_game text) returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_prizes bigint[] := array[5000, 2500, 1000]; v_pos int := 0;
begin
  if now() < to_timestamp((p_day::bigint + 1) * 86400) then return 0; end if; -- the day is not over yet
  perform pg_advisory_xact_lock(hashtext('settle_daily'), p_day);
  if exists (select 1 from daily_awards where day = p_day) then return 0; end if;
  for r in select * from daily_board(p_day, p_game, 3) loop
    v_pos := v_pos + 1;
    insert into daily_awards (day, rank, game, user_id, value, prize) values (p_day, v_pos, p_game, r.user_id, r.value, v_prizes[v_pos]);
    perform wallet_apply(r.user_id, v_prizes[v_pos], 'tournament', 'd' || p_day, 'daily:' || p_day || ':' || v_pos);
  end loop;
  return v_pos;
end $$;
revoke execute on function public.settle_daily(int, text) from public, anon, authenticated;
grant execute on function public.settle_daily(int, text) to service_role;

-- ─────────────────────────────── Highlights ───────────────────────────────
-- Big wins and good win streaks of public players, for the strip on the ranking screen.
create table public.highlights (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('bigwin', 'streak')),
  game text not null,
  value numeric not null, -- the multiplier (big win) or the streak length
  amount bigint not null default 0, -- net chips won in that round
  created_at timestamptz not null default now()
);
create index highlights_time_idx on public.highlights (created_at desc);
alter table public.highlights enable row level security; -- read only through recent_highlights()

create table public.win_streaks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game text not null,
  streak int not null default 0,
  primary key (user_id, game)
);
alter table public.win_streaks enable row level security;

create or replace function public.track_highlights() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_streak int; v_net bigint := new.payout - new.bet; v_mult numeric;
begin
  if new.bet <= 0 or exists (select 1 from admins a where a.user_id = new.user_id) then return new; end if;
  v_mult := new.payout::numeric / new.bet;
  if new.payout > new.bet then
    insert into win_streaks (user_id, game, streak) values (new.user_id, new.game, 1)
      on conflict (user_id, game) do update set streak = win_streaks.streak + 1
      returning streak into v_streak;
    -- every 5 wins in a row (5, 10, 15…) is worth a mention
    if v_streak >= 5 and v_streak % 5 = 0 then
      insert into highlights (user_id, kind, game, value, amount) values (new.user_id, 'streak', new.game, v_streak, v_net);
    end if;
  else
    update win_streaks set streak = 0 where user_id = new.user_id and game = new.game and streak <> 0;
  end if;
  if (v_mult >= 20 and v_net >= 300) or v_net >= 10000 then
    insert into highlights (user_id, kind, game, value, amount) values (new.user_id, 'bigwin', new.game, round(v_mult, 2), v_net);
  end if;
  return new;
end $$;
create trigger game_rounds_highlights after insert on public.game_rounds for each row execute function public.track_highlights();

create or replace function public.recent_highlights(p_limit int default 30)
returns table (id bigint, username text, avatar text, kind text, game text, value numeric, amount bigint, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select h.id, p.username::text, coalesce(p.cosmetics ->> 'avatar', p.avatar), h.kind, h.game, h.value, h.amount, h.created_at
  from highlights h join profiles p on p.id = h.user_id
  where p.is_public and h.created_at > now() - interval '7 days' and not exists (select 1 from admins a where a.user_id = p.id)
  order by h.created_at desc
  limit greatest(1, least(p_limit, 60));
$$;
revoke execute on function public.recent_highlights(int) from public, anon;
grant execute on function public.recent_highlights(int) to authenticated;

-- ─────────────────────────────── A player's public card ───────────────────────────────
-- What friends (and anyone, for public profiles) see: level, favourite game, best win, streaks, achievements.
create or replace function public.player_card(p_user uuid)
returns table (username text, avatar text, level int, since timestamptz, rounds bigint, games int, favourite text,
               best_win bigint, best_game text, best_mult numeric, best_streak int, achievements int, highlights int)
language sql stable security definer set search_path = public as $$
  select p.username::text, coalesce(p.cosmetics ->> 'avatar', p.avatar), p.level, p.created_at,
         (select coalesce(sum(g.rounds), 0)::bigint from game_stats g where g.user_id = p.id),
         (select count(*)::int from game_stats g where g.user_id = p.id and g.rounds > 0),
         (select g.game from game_stats g where g.user_id = p.id order by g.rounds desc limit 1),
         (select max(r.payout - r.bet) from game_rounds r where r.user_id = p.id),
         (select r.game from game_rounds r where r.user_id = p.id order by r.payout - r.bet desc limit 1),
         (select max(round(r.payout::numeric / nullif(r.bet, 0), 2)) from game_rounds r where r.user_id = p.id and r.payout > 0),
         (select coalesce(max(h.value), 0)::int from highlights h where h.user_id = p.id and h.kind = 'streak'),
         (select coalesce(jsonb_array_length(case when jsonb_typeof(pr.achievements) = 'array' then pr.achievements else '[]'::jsonb end), 0)
                 + coalesce((select count(*) from jsonb_object_keys(case when jsonb_typeof(pr.achievements) = 'object' then pr.achievements else '{}'::jsonb end)), 0)
            from progress pr where pr.user_id = p.id)::int,
         (select count(*)::int from highlights h where h.user_id = p.id)
  from profiles p
  where p.id = p_user and (p.is_public or p.id = auth.uid() or public.are_friends(auth.uid(), p.id));
$$;
revoke execute on function public.player_card(uuid) from public, anon;
grant execute on function public.player_card(uuid) to authenticated;

-- ─────────────────────────────── Admin statistics ───────────────────────────────
create or replace function public.admin_stats() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'players', (select count(*) from profiles),
    'new7', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'active1', (select count(distinct user_id) from game_rounds where created_at > now() - interval '1 day'),
    'active7', (select count(distinct user_id) from game_rounds where created_at > now() - interval '7 days'),
    'rounds7', (select count(*) from game_rounds where created_at > now() - interval '7 days'),
    'chips', (select coalesce(sum(balance), 0) from wallets),
    'games', (select coalesce(jsonb_agg(x order by x.rounds desc), '[]'::jsonb) from (
       select game, count(*) as rounds, count(distinct user_id) as players, sum(bet) as wagered, sum(payout) as paid
       from game_rounds where created_at > now() - interval '7 days' group by game) x),
    'scratch', (select coalesce(jsonb_agg(x order by x.sold desc), '[]'::jsonb) from (
       select detail as card, count(*) as sold, sum(bet) as wagered, sum(payout) as paid
       from game_rounds where game = 'scratch' and created_at > now() - interval '30 days' group by detail) x),
    'days', (select coalesce(jsonb_agg(x order by x.day), '[]'::jsonb) from (
       select to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, count(distinct user_id) as players, count(*) as rounds
       from game_rounds where created_at > now() - interval '14 days' group by 1) x)
  );
$$;
revoke execute on function public.admin_stats() from public, anon, authenticated;
grant execute on function public.admin_stats() to service_role;

-- ─────────────────────────────── Leagues: admins don't compete ───────────────────────────────
-- An admin still sees their own row in their leagues, but nobody else sees them in the table.
create or replace function public.my_leagues() returns table (id uuid, name text, code text, members int, my_points int, my_rank int, leader text)
language sql stable security definer set search_path = public as $$
  with mine as (select m.league_id from league_members m where m.user_id = auth.uid()),
  t as (
    select m.league_id, m.user_id, p.username::text as username, coalesce(w.points, 0) as points,
           rank() over (partition by m.league_id order by coalesce(w.points, 0) desc) as rk,
           row_number() over (partition by m.league_id order by coalesce(w.points, 0) desc, m.joined_at) as rn
    from league_members m join mine on mine.league_id = m.league_id
    join profiles p on p.id = m.user_id
    left join weekly_scores w on w.user_id = m.user_id and w.week = current_week()
    where m.user_id = auth.uid() or not exists (select 1 from admins a where a.user_id = m.user_id)
  )
  select l.id, l.name, l.code,
         (select count(*)::int from t where t.league_id = l.id),
         (select t.points::int from t where t.league_id = l.id and t.user_id = auth.uid()),
         (select t.rk::int from t where t.league_id = l.id and t.user_id = auth.uid()),
         (select t.username from t where t.league_id = l.id and t.rn = 1)
  from leagues l join mine on mine.league_id = l.id
  order by l.created_at;
$$;

create or replace function public.league_table(p_id uuid, p_week int default null)
returns table (user_id uuid, username text, avatar text, level int, points int, rank int, is_owner boolean, league_name text, league_code text, week int)
language plpgsql stable security definer set search_path = public as $$
declare v_week int := coalesce(p_week, current_week());
begin
  if not exists (select 1 from league_members m where m.league_id = p_id and m.user_id = auth.uid()) then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;
  return query
    select m.user_id, p.username::text, coalesce(p.cosmetics ->> 'avatar', p.avatar), p.level, coalesce(w.points, 0)::int,
           (rank() over (order by coalesce(w.points, 0) desc))::int, m.user_id = l.owner, l.name, l.code, v_week
    from league_members m join leagues l on l.id = m.league_id join profiles p on p.id = m.user_id
    left join weekly_scores w on w.user_id = m.user_id and w.week = v_week
    where m.league_id = p_id and (m.user_id = auth.uid() or not exists (select 1 from admins a where a.user_id = m.user_id))
    order by 5 desc, m.joined_at;
end $$;
revoke execute on function public.my_leagues(), public.league_table(uuid, int) from public, anon;
grant execute on function public.my_leagues(), public.league_table(uuid, int) to authenticated;
