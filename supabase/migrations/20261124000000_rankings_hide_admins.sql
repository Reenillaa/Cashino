-- Developer (admin) accounts have every unlock and can gift themselves chips, so they never appear in the
-- public rankings (season, poker, per-game mastery and the weekly boards) nor win the weekly prizes.
-- Same definitions as before, plus "not an admin". Private friend leagues are unchanged (joined on purpose).

create or replace view public.leaderboard_season with (security_invoker = false) as
  select s.season, s.user_id, p.username::text, p.avatar, p.level, s.points,
         rank() over (partition by s.season order by s.points desc) as rank
  from public.season_scores s join public.profiles p on p.id = s.user_id
  where p.is_public and not exists (select 1 from public.admins a where a.user_id = p.id);

create or replace view public.leaderboard_poker with (security_invoker = false) as
  select r.user_id, p.username::text, p.avatar, r.rating, r.games, rank() over (order by r.rating desc) as rank
  from public.poker_ratings r join public.profiles p on p.id = r.user_id
  where p.is_public and r.games >= 3 and not exists (select 1 from public.admins a where a.user_id = p.id);

create or replace view public.leaderboard_games with (security_invoker = false) as
  select g.game, g.user_id, p.username::text, p.avatar,
    round(400 * least(1, log(10, 1 + g.rounds) / 3)
      + 350 * least(1, (select count(*) from jsonb_object_keys(pr.lessons) k where k like g.game || '.%')::numeric / 3)
      + case when pr.tutorials ? (g.game || '_tutorial_completed') then 50 else 0 end)::int as score,
    case when g.game = 'blackjack' and pr.bj_total > 0 then
      round(1000 * ((pr.bj_correct::numeric / pr.bj_total + 1.9208 / pr.bj_total
        - 1.96 * sqrt((pr.bj_correct::numeric / pr.bj_total * (1 - pr.bj_correct::numeric / pr.bj_total) + 0.9604 / pr.bj_total) / pr.bj_total))
        / (1 + 3.8416 / pr.bj_total)))::int end as skill
  from public.game_stats g join public.profiles p on p.id = g.user_id join public.progress pr on pr.user_id = g.user_id
  where p.is_public and not exists (select 1 from public.admins a where a.user_id = p.id);

grant select on public.leaderboard_season, public.leaderboard_poker, public.leaderboard_games to authenticated;
revoke all on public.leaderboard_season, public.leaderboard_poker, public.leaderboard_games from anon, public;

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
  where p.is_public and not exists (select 1 from admins a where a.user_id = p.id)
  order by v.value desc, p.username
  limit greatest(1, least(p_limit, 100));
$$;
revoke execute on function public.weekly_board(int, text, int) from public, anon;
grant execute on function public.weekly_board(int, text, int) to authenticated, service_role;
