-- RPC: public.update_citizen_passport
-- Updates core citizen credentials, moniker, bio, handle, and sanctuary metadata atomically

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

  -- Format username if supplied
  if p_username is not null then
    v_new_username := lower(trim(regexp_replace(p_username, '[^a-zA-Z0-9_]', '', 'g')));
    if length(v_new_username) < 3 then
      raise exception 'Username must be at least 3 characters';
    end if;

    -- Check for uniqueness if changing
    if exists (
      select 1 from public.profiles
      where username = v_new_username and id != v_user_id
    ) then
      raise exception 'Username is already taken';
    end if;
  end if;

  -- Merge metadata
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

comment on function public.update_citizen_passport is 'Updates citizen credentials, alias handle, moniker, and metadata.';

-- Explicit Grants
grant execute on function public.update_citizen_passport(text, text, text, text, jsonb) to authenticated;
