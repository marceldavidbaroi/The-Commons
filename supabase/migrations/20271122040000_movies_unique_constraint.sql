-- Replace partial unique index with standard UNIQUE constraint so PostgREST ON CONFLICT works
drop index if exists public.uq_user_media_tmdb;

alter table public.movies
  add constraint uq_user_media_tmdb unique (user_id, media_type, tmdb_id);
