-- Create user profiles table linked to Supabase Auth
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  username text unique,
  avatar_url text,
  bio text,
  email_preferences jsonb not null default jsonb_build_object(
    'marketing', false,
    'transactional', true,
    'newsletter', true,
    'product_updates', true,
    'digest_frequency', 'weekly'
  ),
  notification_settings jsonb not null default jsonb_build_object(
    'in_app', true,
    'push', false
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- RLS Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Trigger to automatically update updated_at timestamp
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

-- Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Index for jsonb email_preferences queries
create index if not exists idx_profiles_email_preferences on public.profiles using gin (email_preferences);
