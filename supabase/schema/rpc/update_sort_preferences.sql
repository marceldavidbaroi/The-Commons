-- RPC: public.update_sort_preferences
-- Updates the sorting and display preferences for the authenticated user

create or replace function public.update_sort_preferences(
  p_sort_by text,
  p_sort_order text default 'asc',
  p_filter_favorites_first boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_updated_prefs jsonb;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_sort_order not in ('asc', 'desc') then
    raise exception 'Invalid sort order: must be asc or desc';
  end if;

  update public.profiles
  set sort_preferences = jsonb_set(
        jsonb_set(
          jsonb_set(sort_preferences, '{default_sort_by}', to_jsonb(p_sort_by)),
          '{default_sort_order}', to_jsonb(p_sort_order)
        ),
        '{filter_favorites_first}', to_jsonb(p_filter_favorites_first)
      ),
      updated_at = now()
  where id = v_user_id
  returning sort_preferences into v_updated_prefs;

  return v_updated_prefs;
end;
$$;

comment on function public.update_sort_preferences is 'Updates default sorting preferences on the authenticated user profile.';
