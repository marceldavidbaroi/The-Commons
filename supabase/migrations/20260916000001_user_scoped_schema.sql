-- Migration: User-Scoped Profiles, Items & Sorting Functions

-- 1. Ensure Profiles Table & Columns Exist
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  username text unique,
  avatar_url text,
  bio text,
  role text not null default 'member' check (role in ('admin', 'member', 'guest')),
  sort_preferences jsonb not null default jsonb_build_object(
    'default_sort_by', 'created_at',
    'default_sort_order', 'desc',
    'filter_favorites_first', true
  ),
  email_preferences jsonb not null default jsonb_build_object(
    'marketing', false,
    'transactional', true,
    'newsletter', true,
    'product_updates', true,
    'digest_frequency', 'weekly'
  ),
  display_settings jsonb not null default jsonb_build_object(
    'theme', 'system',
    'density', 'comfortable',
    'view_mode', 'grid'
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safely add missing columns to profiles if the table was created by a previous migration
alter table public.profiles add column if not exists role text not null default 'member' check (role in ('admin', 'member', 'guest'));
alter table public.profiles add column if not exists sort_preferences jsonb not null default jsonb_build_object(
  'default_sort_by', 'created_at',
  'default_sort_order', 'desc',
  'filter_favorites_first', true
);
alter table public.profiles add column if not exists display_settings jsonb not null default jsonb_build_object(
  'theme', 'system',
  'density', 'comfortable',
  'view_mode', 'grid'
);

-- 2. User-Scoped Items Table
create table if not exists public.user_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  status text not null default 'active' check (status in ('active', 'archived', 'draft')),
  sort_order integer not null default 0,
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.user_items enable row level security;

-- Drop old / existing policies before recreating to avoid duplicate name errors
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

drop policy if exists "Users can view their own items" on public.user_items;
drop policy if exists "Users can insert their own items" on public.user_items;
drop policy if exists "Users can update their own items" on public.user_items;
drop policy if exists "Users can delete their own items" on public.user_items;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can view their own items"
  on public.user_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own items"
  on public.user_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own items"
  on public.user_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own items"
  on public.user_items for delete
  using (auth.uid() = user_id);

-- 4. Triggers
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

-- 5. RPC Functions
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

create or replace function public.reorder_user_items(
  p_item_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  i integer;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  for i in 1 .. array_length(p_item_ids, 1) loop
    update public.user_items
    set sort_order = i,
        updated_at = now()
    where id = p_item_ids[i]
      and user_id = v_user_id;
  end loop;
end;
$$;

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

-- 6. Indexes
create index if not exists idx_profiles_email_preferences on public.profiles using gin (email_preferences);
create index if not exists idx_profiles_sort_preferences on public.profiles using gin (sort_preferences);
create index if not exists idx_user_items_user_sort_order on public.user_items (user_id, sort_order asc);
create index if not exists idx_user_items_user_created_at on public.user_items (user_id, is_pinned desc, created_at desc);
create index if not exists idx_user_items_user_status on public.user_items (user_id, status);
