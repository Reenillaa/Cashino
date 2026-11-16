-- Sign-up with just a username and a password: the app turns the username into an internal address
-- (<username>@cashino.invalid, a reserved domain that never receives mail). Such accounts keep exactly the
-- username they chose (no random suffix) whenever it is free.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare
  login text := lower(coalesce(new.raw_user_meta_data->>'login', ''));
  base text := regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'player'), '[^A-Za-z0-9_]', '', 'g');
  uname text;
  seed text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if login ~ '^[a-z0-9_.]{3,20}$' and new.email = login || '@cashino.invalid'
     and not exists (select 1 from profiles where lower(username::text) = replace(login, '.', '_')) then
    uname := replace(login, '.', '_');
  else
    if char_length(base) < 3 then base := 'player'; end if;
    uname := left(base, 14) || '_' || substr(md5(new.id::text), 1, 4);
  end if;
  insert into profiles (id, username, avatar) values (new.id, uname, 'a' || (abs(hashtext(new.id::text)) % 24));
  insert into wallets (user_id, balance) values (new.id, 0);
  perform wallet_apply(new.id, 1000, 'signup', null, 'signup:' || new.id);
  insert into progress (user_id) values (new.id);
  insert into poker_ratings (user_id) values (new.id);
  insert into user_seeds (user_id, server_seed, server_seed_hash, client_seed)
    values (new.id, seed, encode(extensions.digest(seed, 'sha256'), 'hex'), substr(md5(random()::text), 1, 16));
  return new;
end $$;
