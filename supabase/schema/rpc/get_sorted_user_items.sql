-- RPC: public.get_sorted_user_items
-- Returns the calling user's items sorted dynamically by their preferences or parameter overrides

create or replace function public.get_sorted_user_items(
  p_status text default null,
  p_sort_by text default null,
  p_ascending boolean default null
)
returns setof public.user_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_sort_field text;
  v_sort_asc boolean;
  v_prefs jsonb;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Load user sort preferences if not explicitly overridden
  select sort_preferences into v_prefs
  from public.profiles
  where id = v_user_id;

  v_sort_field := coalesce(p_sort_by, v_prefs->>'default_sort_by', 'created_at');
  v_sort_asc := coalesce(p_ascending, (v_prefs->>'default_sort_order') = 'asc', false);

  return query
  select *
  from public.user_items
  where user_id = v_user_id
    and (p_status is null or status = p_status)
  order by
    is_pinned desc,
    case when v_sort_field = 'sort_order' and v_sort_asc then sort_order end asc,
    case when v_sort_field = 'sort_order' and not v_sort_asc then sort_order end desc,
    case when v_sort_field = 'title' and v_sort_asc then title end asc,
    case when v_sort_field = 'title' and not v_sort_asc then title end desc,
    case when v_sort_field = 'created_at' and v_sort_asc then created_at end asc,
    case when v_sort_field = 'created_at' and not v_sort_asc then created_at end desc,
    created_at desc;
end;
$$;

comment on function public.get_sorted_user_items is 'Fetches user items sorted according to the user preferences and pinned status.';
