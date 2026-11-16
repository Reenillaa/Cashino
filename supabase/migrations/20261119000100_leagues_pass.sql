-- Friend leagues (private, joined with a code) ranked by this week's season points, and season pass claims.
-- Weekly points come from award_progress, so they keep its daily caps: a league rewards playing and
-- learning a bit every day, never betting more or winning more.

create or replace function public.current_week(ts timestamptz default now()) returns int language sql immutable as $$
  select floor(extract(epoch from (ts - timestamptz '2026-01-05 00:00:00+00')) / (7 * 86400))::int + 1
$$;

create table public.weekly_scores (
  week int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  points int not null default 0,
  primary key (week, user_id)
);
alter table public.weekly_scores enable row level security;
create policy "weekly: self read" on public.weekly_scores for select to authenticated using (user_id = auth.uid());

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
    insert into weekly_scores (week, user_id, points) values (current_week(), p_user, v_sp)
      on conflict (week, user_id) do update set points = weekly_scores.points + excluded.points;
  end if;
end $$;

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (char_length(name) between 3 and 28),
  owner uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index league_members_user_idx on public.league_members (user_id);
-- No direct access: everything goes through the functions below (members only see their own leagues).
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

create or replace function public.create_league(p_name text) returns table (id uuid, code text)
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_code text; v_id uuid; v_name text := btrim(p_name);
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 28 then raise exception 'invalid_name' using errcode = 'P0001'; end if;
  if (select count(*) from league_members m where m.user_id = v_user) >= 10 then raise exception 'too_many_leagues' using errcode = 'P0001'; end if;
  if (select count(*) from leagues l where l.owner = v_user) >= 3 then raise exception 'too_many_leagues' using errcode = 'P0001'; end if;
  loop
    -- 6 characters without look-alikes (no 0/O, 1/I/L)
    v_code := (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from leagues l where l.code = v_code);
  end loop;
  insert into leagues (code, name, owner) values (v_code, v_name, v_user) returning leagues.id into v_id;
  insert into league_members (league_id, user_id) values (v_id, v_user);
  return query select v_id, v_code;
end $$;

create or replace function public.join_league(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  select l.id into v_id from leagues l where l.code = upper(btrim(p_code));
  if v_id is null then raise exception 'league_not_found' using errcode = 'P0001'; end if;
  if exists (select 1 from league_members m where m.league_id = v_id and m.user_id = v_user) then return v_id; end if;
  if (select count(*) from league_members m where m.league_id = v_id) >= 30 then raise exception 'league_full' using errcode = 'P0001'; end if;
  if (select count(*) from league_members m where m.user_id = v_user) >= 10 then raise exception 'too_many_leagues' using errcode = 'P0001'; end if;
  insert into league_members (league_id, user_id) values (v_id, v_user);
  return v_id;
end $$;

create or replace function public.leave_league(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_next uuid;
begin
  delete from league_members m where m.league_id = p_id and m.user_id = v_user;
  if exists (select 1 from leagues l where l.id = p_id and l.owner = v_user) then
    select m.user_id into v_next from league_members m where m.league_id = p_id order by m.joined_at limit 1;
    if v_next is null then delete from leagues l where l.id = p_id;
    else update leagues set owner = v_next where leagues.id = p_id; end if;
  end if;
end $$;

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
    where m.league_id = p_id
    order by 5 desc, m.joined_at;
end $$;

revoke execute on function public.create_league(text), public.join_league(text), public.leave_league(uuid), public.my_leagues(), public.league_table(uuid, int) from public, anon;
grant execute on function public.create_league(text), public.join_league(text), public.leave_league(uuid), public.my_leagues(), public.league_table(uuid, int) to authenticated;

-- Ledger kinds for the season pass and the sports cash-out.
alter table public.coin_ledger drop constraint if exists coin_ledger_kind_check;
alter table public.coin_ledger add constraint coin_ledger_kind_check check (kind in ('signup', 'bet', 'payout', 'daily', 'refill', 'mission', 'level', 'achievement', 'migration', 'buyin', 'cashout', 'tournament', 'adjust', 'shop', 'live_bet', 'live_payout', 'sports_bet', 'sports_payout', 'pass', 'sports_cashout'));
