-- Table: public.profiles
-- Core user entity scoped per authenticated user with citizen passport metadata, sorting & preferences

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  username text unique,
  avatar_url text,
  bio text,
  role text not null default 'member' check (role in ('admin', 'member', 'guest')),
  
  -- Sorting & Display Preferences (determines how user views and sorts their personal data)
  sort_preferences jsonb not null default jsonb_build_object(
    'default_sort_by', 'created_at',
    'default_sort_order', 'desc',
    'custom_order', '[]'::jsonb,
    'pinned_items', '[]'::jsonb,
    'filter_favorites_first', true
  ),

  -- Email & Communication Preferences
  email_preferences jsonb not null default jsonb_build_object(
    'marketing', false,
    'transactional', true,
    'newsletter', true,
    'product_updates', true,
    'digest_frequency', 'weekly'
  ),

  -- UI & Layout Settings
  display_settings jsonb not null default jsonb_build_object(
    'theme', 'system',
    'density', 'comfortable',
    'view_mode', 'grid'
  ),

  -- Citizen Passport & Sanctuary Metadata (stamps, titles, streaks, residence)
  metadata jsonb not null default jsonb_build_object(
    'residence', 'Archival Broadside',
    'clearance_title', 'Level II Scribe',
    'ritual_streak_days', 0,
    'unlocked_stamps', jsonb_build_array('founding_scribe')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comments
comment on table public.profiles is 'Stores user profile information, citizen passport credentials, sorting preferences, and sanctuary configuration.';
comment on column public.profiles.sort_preferences is 'User-defined default sorting order, pinned items, and custom order arrays.';
comment on column public.profiles.metadata is 'Stores citizen passport metadata, unlocked stamps, residence, and clearance credentials.';
