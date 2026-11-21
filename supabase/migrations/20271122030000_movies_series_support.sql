-- Add series tracking support (media_type + series_progress JSONB)
alter table public.movies
  add column if not exists media_type text not null default 'movie'
    check (media_type in ('movie', 'series')),
  add column if not exists series_progress jsonb;

-- Replace unique index to scope by (user_id, media_type, tmdb_id)
drop index if exists public.uq_user_tmdb;
alter table public.movies drop constraint if exists uq_user_tmdb;

create unique index uq_user_media_tmdb
  on public.movies (user_id, media_type, tmdb_id)
  where tmdb_id is not null;
