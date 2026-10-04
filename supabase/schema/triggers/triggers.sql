-- Triggers and Auth Hooks (Integer ID Model)

-- 1. Updated At Trigger Function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger on_profiles_updated
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

create or replace trigger on_user_items_updated
  before update on public.user_items
  for each row
  execute function public.handle_updated_at();

create or replace trigger on_diaries_updated
  before update on public.diaries
  for each row
  execute function public.handle_updated_at();

create or replace trigger on_diary_entries_updated
  before update on public.diary_entries
  for each row
  execute function public.handle_updated_at();

-- 2. New User Signup Hook (Creates Profile with Integer ID PK and Links auth.users via auth_user_id)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  is_whitelisted boolean;
begin
  select exists(select 1 from public.profiles where email = new.email and role = 'admin') into is_admin;
  select exists(select 1 from public.allowed_members where email = new.email and status = 'active') into is_whitelisted;

  insert into public.profiles (
    auth_user_id,
    email,
    full_name,
    avatar_url,
    role,
    sort_preferences,
    email_preferences
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    case when is_admin then 'admin' else 'member' end,
    jsonb_build_object(
      'default_sort_by', 'created_at',
      'default_sort_order', 'desc',
      'filter_favorites_first', true
    ),
    jsonb_build_object(
      'marketing', false,
      'transactional', true,
      'newsletter', true,
      'product_updates', true,
      'digest_frequency', 'weekly'
    )
  )
  on conflict (auth_user_id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
