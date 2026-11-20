-- Drop legacy goals table and its enums before implementing the new Goals schema
drop table if exists public.goals cascade;

drop type if exists public.goal_priority cascade;
drop type if exists public.goal_status cascade;
drop type if exists public.goal_type cascade;
