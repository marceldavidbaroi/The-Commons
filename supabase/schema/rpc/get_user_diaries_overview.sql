-- RPC: get_user_diaries_overview
-- Fetches all user diaries with aggregated metrics (page count, highest page, latest reflection date)

create or replace function public.get_user_diaries_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'description', d.description,
        'theme', d.theme,
        'cover_color', d.cover_color,
        'is_favorite', d.is_favorite,
        'is_archived', d.is_archived,
        'sort_order', d.sort_order,
        'entries_count', coalesce(stats.entries_count, 0),
        'highest_page_number', coalesce(stats.highest_page_number, 0),
        'latest_entry_date', stats.latest_entry_date,
        'created_at', d.created_at,
        'updated_at', d.updated_at
      ) order by d.is_favorite desc, d.sort_order asc, d.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.diaries d
  left join lateral (
    select
      count(*)::int as entries_count,
      max(page_number)::int as highest_page_number,
      max(entry_date) as latest_entry_date
    from public.diary_entries e
    where e.diary_id = d.id and e.user_id = v_user_id
  ) stats on true
  where d.user_id = v_user_id;

  return v_result;
end;
$$;

grant execute on function public.get_user_diaries_overview() to authenticated;
