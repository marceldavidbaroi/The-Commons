-- ==========================================
-- 1. SINGLE TABLE & INDEXES
-- ==========================================
create extension if not exists pg_trgm;

create table public.songs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  artist text,

  -- Playback & Link Health
  youtube_id text not null,
  is_active boolean not null default true,
  needs_attention boolean not null default false,

  -- Filterable Classification & Taste
  language text not null default 'bangla',
  version text not null default 'original',
  genre text not null default 'pop',
  vibe text[] not null default '{}',
  energy smallint not null default 3 check (energy between 1 and 5),
  rating smallint not null default 3 check (rating between 1 and 5),

  -- Anti-Repeat Telemetry
  play_count int not null default 0,
  last_played timestamptz,
  created_at timestamptz not null default now(),

  unique (user_id, youtube_id)
);

create index idx_songs_vibe on public.songs using gin (vibe);
create index idx_songs_queue on public.songs (user_id, is_active, language, genre, version, energy, last_played);
create index idx_songs_cursor on public.songs (user_id, created_at desc, id desc);
create index idx_songs_needs_attention on public.songs (user_id, created_at desc, id desc) where needs_attention = true;
create index idx_songs_title_trgm on public.songs using gin (title gin_trgm_ops);
create index idx_songs_artist_trgm on public.songs using gin (artist gin_trgm_ops);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table public.songs enable row level security;

create policy "Users can view their own songs"
  on public.songs for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own songs"
  on public.songs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own songs"
  on public.songs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own songs"
  on public.songs for delete to authenticated
  using (auth.uid() = user_id);

-- ==========================================
-- 3. UNIFIED SHUFFLE & FILTER RPC
-- ==========================================
create or replace function public.get_shuffled_queue(
  p_language text default null,
  p_genre text default null,
  p_version text default null,
  p_vibe text default null,
  p_min_energy smallint default null,
  p_max_energy smallint default null,
  p_min_rating smallint default null,
  p_exclude_hours int default 12,
  p_limit int default 30
)
returns table (
  id bigint,
  title text,
  artist text,
  youtube_id text,
  language text,
  version text,
  genre text,
  vibe text[],
  energy smallint,
  rating smallint,
  play_count int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.title,
    s.artist,
    s.youtube_id,
    s.language,
    s.version,
    s.genre,
    s.vibe,
    s.energy,
    s.rating,
    s.play_count
  from public.songs s
  where s.user_id = auth.uid()
    and s.is_active = true
    and (p_language is null or s.language = p_language)
    and (p_genre is null or s.genre = p_genre)
    and (p_version is null or s.version = p_version)
    and (p_vibe is null or p_vibe = any(s.vibe))
    and (p_min_energy is null or s.energy >= p_min_energy)
    and (p_max_energy is null or s.energy <= p_max_energy)
    and (p_min_rating is null or s.rating >= p_min_rating)
    and (
      s.last_played is null
      or s.last_played < now() - make_interval(hours => p_exclude_hours)
    )
  order by (s.rating * random()) desc
  limit p_limit;
$$;

-- ==========================================
-- 4. ATOMIC PLAY TELEMETRY RPC
-- ==========================================
create or replace function public.record_song_play(p_song_id bigint)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.songs
  set
    play_count = play_count + 1,
    last_played = now()
  where id = p_song_id
    and user_id = auth.uid();
$$;
