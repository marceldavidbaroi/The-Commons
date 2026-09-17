-- Migration: 20260917000000_citizen_passport_schema.sql
-- Adds citizen passport metadata, metrics RPC, and credential updates

-- 1. Ensure Profile Defaults & Columns
alter table public.profiles alter column metadata set default jsonb_build_object(
  'residence', 'Archival Broadside',
  'clearance_title', 'Level II Scribe',
  'ritual_streak_days', 0,
  'unlocked_stamps', jsonb_build_array('founding_scribe')
);

-- 2. RPC: get_citizen_passport_metrics
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

  select * into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Citizen profile not found';
  end if;

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

-- 3. RPC: update_citizen_passport
create or replace function public.update_citizen_passport(
  p_full_name text default null,
  p_username text default null,
  p_bio text default null,
  p_avatar_url text default null,
  p_metadata jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_updated_profile record;
  v_current_metadata jsonb;
  v_new_username text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_username is not null then
    v_new_username := lower(trim(regexp_replace(p_username, '[^a-zA-Z0-9_]', '', 'g')));
    if length(v_new_username) < 3 then
      raise exception 'Username must be at least 3 characters';
    end if;

    if exists (
      select 1 from public.profiles
      where username = v_new_username and id != v_user_id
    ) then
      raise exception 'Username is already taken';
    end if;
  end if;

  select metadata into v_current_metadata from public.profiles where id = v_user_id;
  if p_metadata is not null then
    v_current_metadata := coalesce(v_current_metadata, '{}'::jsonb) || p_metadata;
  end if;

  update public.profiles
  set
    full_name = coalesce(trim(p_full_name), full_name),
    username = coalesce(v_new_username, username),
    bio = coalesce(trim(p_bio), bio),
    avatar_url = coalesce(trim(p_avatar_url), avatar_url),
    metadata = coalesce(v_current_metadata, metadata),
    updated_at = now()
  where id = v_user_id
  returning * into v_updated_profile;

  return to_jsonb(v_updated_profile);
end;
$$;

-- 4. Permissions & Grants
grant execute on function public.get_citizen_passport_metrics() to authenticated;
grant execute on function public.update_citizen_passport(text, text, text, text, jsonb) to authenticated;
