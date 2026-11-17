-- One free unlock per player instead of two. Players keep what they already opened; whoever had used one
-- has none left, whoever had used none keeps one.
alter table public.profiles alter column free_unlocks set default 1;
update public.profiles set free_unlocks = greatest(0, free_unlocks - 1);
