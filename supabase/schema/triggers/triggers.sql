-- Triggers and Auth Hooks

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

-- 2. New User Signup Hook
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    sort_preferences,
    email_preferences
  )
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
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
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
