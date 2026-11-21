create or replace function public.get_movie_facets()
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'counts_by_status', coalesce((
      select jsonb_object_agg(status, cnt)
      from (
        select status, count(*) as cnt
        from public.movies
        group by status
      ) s
    ), '{}'::jsonb),
    'recommendation_count', (
      select count(*)
      from public.movies
      where status = 'watched'
        and (cardinality(recommend_to) > 0 or rating >= 8.0)
    ),
    'languages', coalesce((
      select jsonb_agg(distinct original_language order by original_language)
      from public.movies
      where original_language is not null
    ), '[]'::jsonb),
    'origin_countries', coalesce((
      select jsonb_agg(distinct c order by c)
      from public.movies, unnest(origin_countries) as c
    ), '[]'::jsonb),
    'genres', coalesce((
      select jsonb_agg(distinct g order by g)
      from public.movies, unnest(genres) as g
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('tag', t, 'count', cnt) order by cnt desc, t asc)
      from (
        select unnest(tags) as t, count(*) as cnt
        from public.movies
        group by t
      ) sub
    ), '[]'::jsonb)
  );
$$;
