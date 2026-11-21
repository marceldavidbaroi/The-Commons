create extension if not exists pg_trgm;

-- 1. Enums
create type public.movie_status as enum ('watchlist', 'watched', 'dropped');

create type public.recommend_audience as enum (
  'anyone',
  'partner',
  'friends',
  'family',
  'cinephiles',
  'solo_rewatch'
);

-- 2. Lean Movies Table
create table public.movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  imdb_id text,

  -- External Links
  imdb_url text,
  letterboxd_url text,

  -- Lean Cached TMDB Metadata
  title text not null,
  release_year smallint,
  original_language text,                        -- ISO 639-1, e.g. 'en', 'bn', 'hi', 'ko'
  origin_countries text[] not null default '{}', -- ISO 3166-1, e.g. {'US'}, {'IN'}, {'KR', 'US'}
  genres text[] not null default '{}',
  poster_path text,                              -- relative path only, e.g. '/x9yj...jpg'
  trailer_youtube_key text,

  -- Personal Layer
  status public.movie_status not null default 'watchlist',
  rating numeric(3,1) check (rating >= 0.5 and rating <= 10.0),
  tags text[] not null default '{}',
  recommend_to public.recommend_audience[] not null default '{}',
  notes text,
  watched_at date,
  rewatch_count smallint not null default 0,
  metadata_synced_at timestamptz default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_user_tmdb unique (user_id, tmdb_id)
);

-- 3. Indexes (GIN for array filters + trigram search, B-Tree for sorting/keyset pagination)
create index idx_movies_title_trgm on public.movies using gin (title gin_trgm_ops);
create index idx_movies_tags on public.movies using gin (tags);
create index idx_movies_genres on public.movies using gin (genres);
create index idx_movies_origin_countries on public.movies using gin (origin_countries);
create index idx_movies_recommend_to on public.movies using gin (recommend_to);
create index idx_movies_lang_year on public.movies (user_id, status, original_language, release_year);
create index idx_movies_status_cursor on public.movies (user_id, status, watched_at desc nulls last, id desc);
create index idx_movies_rating_cursor on public.movies (user_id, status, rating desc nulls last, id desc);
create index idx_movies_year_cursor on public.movies (user_id, status, release_year desc nulls last, id desc);
create index idx_movies_title_cursor on public.movies (user_id, status, title asc, id desc);

-- 4. Normalization Trigger
create or replace function public.handle_movie_before_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  select coalesce(array_agg(distinct lower(btrim(t))), '{}')
    into new.tags
    from unnest(new.tags) as t
   where btrim(t) <> '';

  if new.imdb_url is null and new.imdb_id is not null and new.imdb_id <> '' then
    new.imdb_url := 'https://www.imdb.com/title/' || new.imdb_id || '/';
  end if;

  if new.letterboxd_url is null and new.tmdb_id is not null then
    new.letterboxd_url := 'https://letterboxd.com/tmdb/' || new.tmdb_id::text || '/';
  end if;

  return new;
end;
$$;

create trigger trg_movies_before_write
  before insert or update on public.movies
  for each row execute function public.handle_movie_before_write();

-- 5. Row-Level Security
alter table public.movies enable row level security;

create policy "Owner full access"
  on public.movies
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
