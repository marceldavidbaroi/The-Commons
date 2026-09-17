-- Table: public.diary_entries
-- Stores pages/entries within user diaries with reflections, moods, gratitude, and timings

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  page_number integer not null default 1,
  entry_date date not null default current_date,
  date_str text not null,                                       -- e.g. 'September 16'
  day_of_week text not null,                                    -- e.g. 'Tuesday'
  year_str text not null,                                       -- e.g. 'Anno 2026'
  title text not null default '',
  description text not null default '',                         -- Main journal entry content
  gratitude text[] not null default array['', '', '']::text[],  -- 3 daily gratitude reflections
  energy_level integer not null default 3 check (energy_level between 1 and 5),
  start_time text default '09:00',
  end_time text default '17:00',
  mood text not null default '🌿 Calm',
  weather text not null default 'sunny',
  is_hearted boolean not null default false,
  tags text[] not null default '{}',
  word_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Uniqueness constraint: each page number must be unique within a diary
  constraint unique_diary_page_number unique (diary_id, page_number)
);

-- Comments
comment on table public.diary_entries is 'Individual pages/entries inside a diary containing reflections, gratitude items, mood, weather, and energy tracking.';
comment on column public.diary_entries.gratitude is 'Array of three mindfulness/gratitude bullet items for the day.';
comment on column public.diary_entries.energy_level is 'Vitality score between 1 (Drained) and 5 (Peak flow).';
comment on column public.diary_entries.is_hearted is 'Flag for favorite/bookmarked entries.';
