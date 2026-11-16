-- Hardening after the first deploy (Supabase security advisor).
-- Visitors without an account (anon) need none of these helpers; internal trigger functions are not
-- callable over the API at all. Helpers used inside RLS policies stay executable for signed-in users.
revoke execute on function public.are_friends(uuid, uuid) from anon, public;
revoke execute on function public.is_blocked(uuid, uuid) from anon, public;
revoke execute on function public.can_see_table(uuid) from anon, public;
grant execute on function public.are_friends(uuid, uuid), public.is_blocked(uuid, uuid), public.can_see_table(uuid) to authenticated;
revoke execute on function public.notify_friendship() from anon, authenticated, public;
revoke execute on function public.rate_limit_reactions() from anon, authenticated, public;
revoke execute on function public.search_profiles(text) from anon, public;
revoke execute on function public.sync_learning(jsonb, jsonb) from anon, public;
grant execute on function public.search_profiles(text), public.sync_learning(jsonb, jsonb) to authenticated;
-- Pure helpers: pin the search path.
alter function public.current_season(timestamptz) set search_path = public;
alter function public.level_from_xp(bigint) set search_path = public;
-- Leaderboards are for signed-in players only (they show username, avatar and score, nothing private).
revoke select on public.leaderboard_season, public.leaderboard_poker, public.leaderboard_games from anon, public;
