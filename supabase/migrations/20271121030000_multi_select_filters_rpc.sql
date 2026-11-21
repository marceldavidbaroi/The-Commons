drop function if exists public.get_shuffled_queue(text, text, text, text, smallint, smallint, smallint, int, int);

create or replace function public.get_shuffled_queue(
  p_language text[] default null,
  p_genre text[] default null,
  p_version text[] default null,
  p_vibe text[] default null,
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
    and (p_language is null or s.language && p_language)
    and (p_genre is null or s.genre && p_genre)
    and (p_version is null or s.version && p_version)
    and (p_vibe is null or s.vibe && p_vibe)
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
