-- Behavioural tests for the schema (run after migrations). Any failed assertion aborts with an error.
\set ON_ERROR_STOP on
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', '{"username":"ana"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'eve@example.com', '{}');

do $$ begin
  assert (select count(*) from public.profiles) = 3, 'profiles created';
  assert (select balance from public.wallets where user_id = '11111111-1111-1111-1111-111111111111') = 10000, 'signup balance';
  assert (select count(*) from public.user_seeds) = 3, 'seeds created';
  assert (select length(server_seed_hash) from public.user_seeds limit 1) = 64, 'seed hash';
end $$;

-- ── Service role: atomic, idempotent game commits ──
set role service_role;
select public.game_commit('11111111-1111-1111-1111-111111111111', 'dice', 100, 198, true, null, '{"roll":12}', 1, 2,
  '{"bet":100,"payout":198,"detail":"12.00","multiStep":false}', 'hash', 'client', 'req-1', null);
do $$ begin
  assert (select balance from public.wallets where user_id = '11111111-1111-1111-1111-111111111111') = 10098, 'win applied';
  assert (select rounds from public.game_stats where user_id = '11111111-1111-1111-1111-111111111111' and game = 'dice') = 1, 'stats';
  assert (select xp from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 10, 'xp awarded';
  assert (select points from public.season_scores where user_id = '11111111-1111-1111-1111-111111111111') = 2, 'season points';
end $$;
-- Replaying the same request is rejected (no double payout)
do $$ begin
  begin
    perform public.game_commit('11111111-1111-1111-1111-111111111111', 'dice', 100, 198, true, null, '{}', 1, 2, '{"bet":100,"payout":198}', 'h', 'c', 'req-1', null);
    raise exception 'duplicate request was accepted';
  exception when unique_violation then null;
  end;
  assert (select balance from public.wallets where user_id = '11111111-1111-1111-1111-111111111111') = 10098, 'no double payout';
end $$;
-- Insufficient balance aborts the whole operation
do $$ begin
  begin
    perform public.game_commit('22222222-2222-2222-2222-222222222222', 'dice', 999999, 0, true, null, '{}', 1, 1, '{"bet":999999,"payout":0}', 'h', 'c', 'req-2', null);
    raise exception 'overdraft accepted';
  exception when others then
    if sqlerrm <> 'insufficient' then raise; end if;
  end;
  assert (select balance from public.wallets where user_id = '22222222-2222-2222-2222-222222222222') = 10000, 'balance untouched';
  assert (select count(*) from public.processed_requests where key = 'req-2') = 0, 'rolled back';
end $$;
-- Multi-step session with optimistic versioning
select public.game_commit('22222222-2222-2222-2222-222222222222', 'mines', 50, 0, false, '{"mines":[1,2,3]}', '{"revealed":[]}', 5, 3, null, 'h', 'c', 'm-1', null);
do $$ begin
  assert (select version from public.game_sessions where user_id = '22222222-2222-2222-2222-222222222222' and game = 'mines') = 1, 'session v1';
  begin
    perform public.game_commit('22222222-2222-2222-2222-222222222222', 'mines', 0, 0, false, '{}', '{}', 5, 4, null, 'h', 'c', 'm-2', 7);
    raise exception 'stale version accepted';
  exception when others then if sqlerrm <> 'conflict' then raise; end if;
  end;
end $$;
select public.game_commit('22222222-2222-2222-2222-222222222222', 'mines', 0, 115, true, null, '{}', 5, 4, '{"bet":50,"payout":115,"multiStep":true}', 'h', 'c', 'm-3', 1);
do $$ begin
  assert (select count(*) from public.game_sessions where user_id = '22222222-2222-2222-2222-222222222222') = 0, 'session cleared';
  assert (select balance from public.wallets where user_id = '22222222-2222-2222-2222-222222222222') = 10065, 'multi-step net';
end $$;
-- Rewards cannot be claimed twice
select public.claim_reward('22222222-2222-2222-2222-222222222222', 'daily', '2026-11-15', 500);
do $$ begin
  begin
    perform public.claim_reward('22222222-2222-2222-2222-222222222222', 'daily', '2026-11-15', 500);
    raise exception 'double claim accepted';
  exception when others then if sqlerrm <> 'already_claimed' then raise; end if;
  end;
  assert (select balance from public.wallets where user_id = '22222222-2222-2222-2222-222222222222') = 10565, 'single daily';
end $$;
-- Guest migration is capped and one-time
select public.migrate_guest('33333333-3333-3333-3333-333333333333', 'device-x', 999999);
do $$ begin
  assert (select balance from public.wallets where user_id = '33333333-3333-3333-3333-333333333333') = 60000, 'migration capped at 50k';
  begin
    perform public.migrate_guest('33333333-3333-3333-3333-333333333333', 'device-y', 10);
    raise exception 'second migration accepted';
  exception when others then if sqlerrm <> 'already_migrated' then raise; end if;
  end;
end $$;
-- Daily round XP cap
do $$ declare i int; begin
  for i in 1..130 loop perform public.award_progress('33333333-3333-3333-3333-333333333333', 10, 2, true); end loop;
  assert (select xp from public.profiles where id = '33333333-3333-3333-3333-333333333333') = 1200, 'xp capped';
  assert (select points from public.season_scores where user_id = '33333333-3333-3333-3333-333333333333') = 200, 'sp capped';
end $$;
reset role;

-- ── Authenticated clients: RLS and privileges ──
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin
  assert (select count(*) from public.wallets) = 1, 'only own wallet visible';
  assert (select count(*) from public.user_seeds) = 0, 'seeds hidden';
  assert (select count(*) from public.game_sessions) = 0, 'sessions hidden';
  assert (select count(*) from public.poker_private) = 0, 'poker private hidden';
end $$;
do $$ begin
  begin
    perform public.wallet_apply('11111111-1111-1111-1111-111111111111', 1000000, 'adjust', null, 'hack');
    raise exception 'client could mint coins';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.wallets set balance = 99999999;
    if (select balance from public.wallets) = 99999999 then raise exception 'client updated wallet'; end if;
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set xp = 999999 where id = auth.uid();
    raise exception 'client edited xp';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.profiles set avatar = 'a7', display_name = 'Ana' where id = auth.uid();
-- Learning sync: union merge + lesson XP once
select public.sync_learning('{"dice_tutorial_completed": true, "bad key": true}', '{"dice.probability": 1, "crash.basics": 2}');
select public.sync_learning('{}', '{"dice.probability": 1}');
reset role;
do $$ begin
  assert (select tutorials ? 'dice_tutorial_completed' and not tutorials ? 'bad key' from public.progress where user_id = '11111111-1111-1111-1111-111111111111'), 'tutorial merged & filtered';
  assert (select xp from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 10 + 120, 'lesson xp once';
end $$;

-- Friends: request → accept → activity visible; blocked users cannot request
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.friendships (requester, addressee) values (auth.uid(), '22222222-2222-2222-2222-222222222222');
do $$ begin
  begin
    insert into public.friendships (requester, addressee, status) values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'accepted');
    raise exception 'forged friendship';
  exception when insufficient_privilege or check_violation then null;
  end;
  assert (select count(*) from public.search_profiles('bo')) = 1, 'search works';
end $$;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.friendships set status = 'accepted' where addressee = auth.uid();
do $$ begin
  assert (select count(*) from public.notifications) = 1, 'friend request notification';
end $$;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.blocks (blocker, blocked) values (auth.uid(), '11111111-1111-1111-1111-111111111111');
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin
  begin
    insert into public.friendships (requester, addressee) values (auth.uid(), '33333333-3333-3333-3333-333333333333');
    raise exception 'blocked request accepted';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.search_profiles('eve')) = 0, 'blocked hidden from search';
  assert (select count(*) from public.activity) >= 1, 'friend activity';
end $$;
reset role;

-- Reactions: closed set + rate limit
insert into public.poker_tables (id, name, config, public_state) values ('44444444-4444-4444-4444-444444444444', 'T', '{}', '{}');
insert into public.poker_seats (table_id, seat, user_id) values ('44444444-4444-4444-4444-444444444444', 0, '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444', 1, '22222222-2222-2222-2222-222222222222');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.table_reactions (table_id, user_id, emoji) values ('44444444-4444-4444-4444-444444444444', auth.uid(), '👍');
do $$ begin
  begin
    insert into public.table_reactions (table_id, user_id, emoji) values ('44444444-4444-4444-4444-444444444444', auth.uid(), '🔥');
    raise exception 'rate limit missing';
  exception when others then if sqlerrm <> 'rate_limited' then raise; end if;
  end;
  assert (select count(*) from public.leaderboard_season) >= 1, 'season leaderboard readable';
  assert (select count(*) from public.leaderboard_games where game = 'dice') >= 1, 'game leaderboard readable';
end $$;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin
  begin
    insert into public.table_reactions (table_id, user_id, emoji) values ('44444444-4444-4444-4444-444444444444', auth.uid(), 'hello there');
    raise exception 'free text accepted';
  exception when check_violation then null;
  end;
end $$;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
do $$ begin
  begin
    insert into public.table_reactions (table_id, user_id, emoji) values ('44444444-4444-4444-4444-444444444444', auth.uid(), '👍');
    raise exception 'non-seated user reacted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'ALL SCHEMA TESTS PASSED' as result;
