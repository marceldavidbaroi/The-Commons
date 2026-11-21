-- Convert language, genre, and version from text to text[] for multi-value support
drop index if exists idx_songs_queue;

alter table public.songs
  alter column language drop default,
  alter column language type text[] using array[language],
  alter column language set default '{bangla}',
  alter column genre drop default,
  alter column genre type text[] using array[genre],
  alter column genre set default '{pop}',
  alter column version drop default,
  alter column version type text[] using array[version],
  alter column version set default '{original}';

create index idx_songs_language on public.songs using gin (language);
create index idx_songs_genre on public.songs using gin (genre);
create index idx_songs_version on public.songs using gin (version);
create index idx_songs_queue on public.songs (user_id, is_active, energy, last_played);

-- Update get_shuffled_queue to match array columns with ANY(...)
drop function if exists public.get_shuffled_queue(text, text, text, text, smallint, smallint, smallint, int, int);

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
  language text[],
  version text[],
  genre text[],
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
    and (p_language is null or p_language = any(s.language))
    and (p_genre is null or p_genre = any(s.genre))
    and (p_version is null or p_version = any(s.version))
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
