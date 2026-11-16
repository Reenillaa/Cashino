-- Sports cash out: a pending bet can be closed early for the value the server computes.
alter table public.sports_bets drop constraint if exists sports_bets_status_check;
alter table public.sports_bets add constraint sports_bets_status_check check (status in ('pending', 'won', 'lost', 'void', 'cashout'));

create or replace function public.sports_cashout(p_bet uuid, p_amount bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare v sports_bets; v_balance bigint;
begin
  select * into v from sports_bets where id = p_bet for update;
  if not found or v.status <> 'pending' then raise exception 'cashout_unavailable' using errcode = 'P0001'; end if;
  update sports_bets set status = 'cashout', payout = p_amount, settled_at = now() where id = p_bet;
  v_balance := wallet_apply(v.user_id, p_amount, 'sports_cashout', p_bet::text, 'sportscash:' || p_bet);
  return v_balance;
end $$;
revoke execute on function public.sports_cashout(uuid, bigint) from public, anon, authenticated;
grant execute on function public.sports_cashout(uuid, bigint) to service_role;
