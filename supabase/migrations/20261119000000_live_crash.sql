-- Live rocket (multiplayer crash): a third live game. Its crash point is kept in live_secrets
-- (server only) while the rocket flies and copied to live_rounds.result only once it has exploded.
alter table public.live_rounds drop constraint if exists live_rounds_game_check;
alter table public.live_rounds add constraint live_rounds_game_check check (game in ('horses', 'roulette', 'crash'));
alter table public.live_secrets add column if not exists result jsonb;

create or replace function public.live_pay_bet(p_bet uuid, p_payout bigint)
returns void language plpgsql security definer set search_path = public as $$
declare v live_bets;
begin
  select * into v from live_bets where id = p_bet for update;
  if not found or v.payout is not null then return; end if;
  update live_bets set payout = p_payout where id = p_bet;
  if p_payout > 0 then perform wallet_apply(v.user_id, p_payout, 'live_payout', v.game || ':' || v.slot, 'live:' || p_bet); end if;
  insert into game_rounds (user_id, game, bet, payout, detail) values (v.user_id, v.game, v.amount, p_payout, 'live');
end $$;
revoke execute on function public.live_pay_bet(uuid, bigint) from public, anon, authenticated;
grant execute on function public.live_pay_bet(uuid, bigint) to service_role;
