-- Allow manual movies without a TMDB ID
alter table public.movies alter column tmdb_id drop not null;

alter table public.movies drop constraint if exists uq_user_tmdb;

create unique index uq_user_tmdb
  on public.movies (user_id, tmdb_id)
  where tmdb_id is not null;
