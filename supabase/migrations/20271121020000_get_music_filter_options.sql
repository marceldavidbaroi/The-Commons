create or replace function public.get_music_filter_options()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'language', coalesce((select array_agg(distinct val order by val) from public.songs, unnest(language) as val where user_id = auth.uid()), '{}'::text[]),
    'genre', coalesce((select array_agg(distinct val order by val) from public.songs, unnest(genre) as val where user_id = auth.uid()), '{}'::text[]),
    'version', coalesce((select array_agg(distinct val order by val) from public.songs, unnest(version) as val where user_id = auth.uid()), '{}'::text[]),
    'vibe', coalesce((select array_agg(distinct val order by val) from public.songs, unnest(vibe) as val where user_id = auth.uid()), '{}'::text[])
  );
$$;
