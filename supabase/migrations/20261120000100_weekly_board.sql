-- Weekly leaderboards with prizes: "points" (this week's season points, capped per day) and
-- "winner" (net chips won this week in casino rounds). The top 3 of each get chips when the week ends.
-- Settlement is idempotent and happens on the first request after the week ends (and on a schedule).
create table public.weekly_awards (
  week int not null,
  category text not null check (category in ('points', 'winner')),
  rank int not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  value bigint not null,
  prize bigint not null,
  created_at timestamptz not null default now(),
  primary key (week, category, rank)
);
alter table public.weekly_awards enable row level security;
create policy "weekly awards: readable" on public.weekly_awards for select to authenticated using (true);

create or replace function public.week_start(p_week int) returns timestamptz language sql immutable as $$
  select timestamptz '2026-01-05 00:00:00+00' + make_interval(days => (p_week - 1) * 7)
$$;

create or replace function public.weekly_board(p_week int, p_category text, p_limit int default 50)
returns table (user_id uuid, username text, avatar text, level int, value bigint, rank int)
language sql stable security definer set search_path = public as $$
  with v as (
    select w.user_id, w.points::bigint as value from weekly_scores w where w.week = p_week and p_category = 'points' and w.points > 0
    union all
    select r.user_id, sum(r.payout - r.bet)::bigint from game_rounds r
      where p_category = 'winner' and r.created_at >= week_start(p_week) and r.created_at < week_start(p_week + 1)
      group by r.user_id having sum(r.payout - r.bet) > 0
  )
  select v.user_id, p.username::text, coalesce(p.cosmetics ->> 'avatar', p.avatar), p.level, v.value,
         (rank() over (order by v.value desc))::int
  from v join profiles p on p.id = v.user_id
  where p.is_public
  order by v.value desc, p.username
  limit greatest(1, least(p_limit, 100));
$$;
revoke execute on function public.weekly_board(int, text, int) from public, anon;
grant execute on function public.weekly_board(int, text, int) to authenticated, service_role;

create or replace function public.settle_weekly(p_week int) returns int
language plpgsql security definer set search_path = public as $$
declare r record; v_cat text; v_prizes bigint[] := array[10000, 5000, 2500]; n int := 0; v_pos int;
begin
  if now() < week_start(p_week + 1) then return 0; end if; -- the week is not over yet
  perform pg_advisory_xact_lock(hashtext('settle_weekly'), p_week);
  if exists (select 1 from weekly_awards where week = p_week) then return 0; end if;
  foreach v_cat in array array['points', 'winner'] loop
    v_pos := 0;
    for r in select * from weekly_board(p_week, v_cat, 3) loop
      v_pos := v_pos + 1;
      insert into weekly_awards (week, category, rank, user_id, value, prize) values (p_week, v_cat, v_pos, r.user_id, r.value, v_prizes[v_pos]);
      perform wallet_apply(r.user_id, v_prizes[v_pos], 'weekly_prize', 'w' || p_week || ':' || v_cat, 'weekly:' || p_week || ':' || v_cat || ':' || v_pos);
      n := n + 1;
    end loop;
  end loop;
  -- an empty week still gets a marker row-free result; nothing to pay
  return n;
end $$;
revoke execute on function public.settle_weekly(int) from public, anon, authenticated;
grant execute on function public.settle_weekly(int) to service_role;
