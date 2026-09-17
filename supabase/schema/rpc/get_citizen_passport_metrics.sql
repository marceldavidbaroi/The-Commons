-- RPC: public.get_citizen_passport_metrics
-- Retrieves calculated stats (diaries, entries, word counts, ritual streak, stamps) for the authenticated citizen

create or replace function public.get_citizen_passport_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_profile record;
  v_total_items int;
  v_pinned_items int;
  v_favorite_items int;
  v_residence text;
  v_clearance_title text;
  v_streak int;
  v_stamps jsonb;
  v_passport_number text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Fetch user profile
  select * into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Citizen profile not found';
  end if;

  -- 2. Fetch user-scoped items aggregates
  select
    count(*),
    count(*) filter (where is_pinned = true),
    count(*) filter (where is_favorite = true)
  into
    v_total_items,
    v_pinned_items,
    v_favorite_items
  from public.user_items
  where user_id = v_user_id;

  -- 3. Extract passport specific metadata
  v_residence := coalesce(v_profile.metadata->>'residence', 'Archival Broadside');
  v_clearance_title := coalesce(v_profile.metadata->>'clearance_title', case when v_profile.role = 'admin' then 'Grand Chancellor' else 'Level II Scribe' end);
  v_streak := coalesce((v_profile.metadata->>'ritual_streak_days')::int, 0);
  v_stamps := coalesce(v_profile.metadata->'unlocked_stamps', jsonb_build_array('founding_scribe'));
  v_passport_number := 'CC-' || upper(substring(v_user_id::text from 1 for 4)) || '-' || upper(substring(v_user_id::text from length(v_user_id::text) - 3 for 4));

  return jsonb_build_object(
    'user_id', v_user_id,
    'full_name', v_profile.full_name,
    'username', v_profile.username,
    'avatar_url', v_profile.avatar_url,
    'bio', v_profile.bio,
    'role', v_profile.role,
    'passport_number', v_passport_number,
    'residence', v_residence,
    'clearance_title', v_clearance_title,
    'ritual_streak_days', v_streak,
    'unlocked_stamps', v_stamps,
    'total_items', coalesce(v_total_items, 0),
    'pinned_items', coalesce(v_pinned_items, 0),
    'favorite_items', coalesce(v_favorite_items, 0),
    'created_at', v_profile.created_at,
    'updated_at', v_profile.updated_at
  );
end;
$$;

comment on function public.get_citizen_passport_metrics is 'Returns aggregated metrics and credentials for the authenticated citizen passport.';

-- Explicit Grants
grant execute on function public.get_citizen_passport_metrics() to authenticated;
