-- Migration: 20260917000001_diaries_and_entries_schema.sql
-- Adds user-scoped diaries (tomes), diary entries (pages), RLS policies, indexes, and statistical RPCs

-- ==============================================================================
-- 1. TABLES
-- ==============================================================================

-- 1.1 Diaries Table (User-Scoped Tome Containers)
create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  theme text not null default 'vintage' check (theme in ('vintage', 'classic', 'modern')),
  cover_color text default '#8C3A27',
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.2 Diary Entries Table (Pages with Reflections, Gratitude, Mood, & Vitality)
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  page_number integer not null default 1,
  entry_date date not null default current_date,
  date_str text not null,
  day_of_week text not null,
  year_str text not null,
  title text not null default '',
  description text not null default '',
  gratitude text[] not null default array['', '', '']::text[],
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

  constraint unique_diary_page_number unique (diary_id, page_number)
);

-- Comments
comment on table public.diaries is 'User tome containers representing distinct journals with specific themes and styling.';
comment on table public.diary_entries is 'Individual pages/entries inside a diary containing reflections, gratitude items, mood, weather, and energy tracking.';

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.diaries enable row level security;
alter table public.diary_entries enable row level security;

-- Drop existing policies if any to ensure clean idempotent migrations
drop policy if exists "Users can view their own diaries" on public.diaries;
drop policy if exists "Users can insert their own diaries" on public.diaries;
drop policy if exists "Users can update their own diaries" on public.diaries;
drop policy if exists "Users can delete their own diaries" on public.diaries;

drop policy if exists "Users can view their own diary entries" on public.diary_entries;
drop policy if exists "Users can insert their own diary entries" on public.diary_entries;
drop policy if exists "Users can update their own diary entries" on public.diary_entries;
drop policy if exists "Users can delete their own diary entries" on public.diary_entries;

-- Diaries Policies
create policy "Users can view their own diaries"
  on public.diaries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own diaries"
  on public.diaries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own diaries"
  on public.diaries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own diaries"
  on public.diaries for delete
  using (auth.uid() = user_id);

-- Diary Entries Policies
create policy "Users can view their own diary entries"
  on public.diary_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own diary entries"
  on public.diary_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own diary entries"
  on public.diary_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own diary entries"
  on public.diary_entries for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- 3. TRIGGERS
-- ==============================================================================
drop trigger if exists on_diaries_updated on public.diaries;
create trigger on_diaries_updated
  before update on public.diaries
  for each row
  execute function public.handle_updated_at();

drop trigger if exists on_diary_entries_updated on public.diary_entries;
create trigger on_diary_entries_updated
  before update on public.diary_entries
  for each row
  execute function public.handle_updated_at();

-- ==============================================================================
-- 4. INDEXES
-- ==============================================================================
create index if not exists idx_diaries_user_sort on public.diaries (user_id, is_favorite desc, sort_order asc, created_at desc);
create index if not exists idx_diaries_user_archived on public.diaries (user_id, is_archived);
create index if not exists idx_diary_entries_diary_page on public.diary_entries (diary_id, page_number desc);
create index if not exists idx_diary_entries_user_date on public.diary_entries (user_id, entry_date desc);
create index if not exists idx_diary_entries_user_hearted on public.diary_entries (user_id, is_hearted) where is_hearted = true;
create index if not exists idx_diary_entries_tags on public.diary_entries using gin (tags);
create index if not exists idx_diary_entries_mood on public.diary_entries (user_id, mood);

-- ==============================================================================
-- 5. RPC FUNCTIONS
-- ==============================================================================

-- 5.1 RPC: get_diary_stats
create or replace function public.get_diary_stats(
  p_diary_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_total_entries integer := 0;
  v_total_words integer := 0;
  v_avg_energy numeric := 0;
  v_hearted_count integer := 0;
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_mood_breakdown jsonb := '{}'::jsonb;
  v_all_tags text[] := '{}'::text[];
  v_prev_date date;
  v_curr_streak_calc integer := 0;
  v_r record;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Aggregates (filtered by diary if p_diary_id is provided)
  select
    count(*),
    coalesce(sum(word_count), 0),
    coalesce(round(avg(energy_level), 2), 0),
    count(*) filter (where is_hearted = true)
  into
    v_total_entries,
    v_total_words,
    v_avg_energy,
    v_hearted_count
  from public.diary_entries
  where user_id = v_user_id
    and (p_diary_id is null or diary_id = p_diary_id);

  -- 2. Mood breakdown
  select jsonb_object_agg(mood, mood_count)
  into v_mood_breakdown
  from (
    select mood, count(*) as mood_count
    from public.diary_entries
    where user_id = v_user_id
      and (p_diary_id is null or diary_id = p_diary_id)
    group by mood
  ) moods;

  -- 3. Unique tag cloud
  select coalesce(array_agg(distinct tag), '{}'::text[])
  into v_all_tags
  from public.diary_entries,
       unnest(tags) as tag
  where user_id = v_user_id
    and (p_diary_id is null or diary_id = p_diary_id);

  -- 4. Streak Calculation across unique entry dates
  v_prev_date := null;
  for v_r in (
    select distinct entry_date
    from public.diary_entries
    where user_id = v_user_id
    order by entry_date desc
  ) loop
    if v_prev_date is null then
      if v_r.entry_date = current_date or v_r.entry_date = current_date - 1 then
        v_curr_streak_calc := 1;
        v_current_streak := 1;
      else
        v_curr_streak_calc := 1;
      end if;
    elsif v_prev_date - v_r.entry_date = 1 then
      v_curr_streak_calc := v_curr_streak_calc + 1;
      if v_current_streak > 0 then
        v_current_streak := v_curr_streak_calc;
      end if;
    else
      v_curr_streak_calc := 1;
    end if;

    if v_curr_streak_calc > v_longest_streak then
      v_longest_streak := v_curr_streak_calc;
    end if;

    v_prev_date := v_r.entry_date;
  end loop;

  return jsonb_build_object(
    'total_entries', v_total_entries,
    'total_words', v_total_words,
    'average_energy', v_avg_energy,
    'hearted_entries', v_hearted_count,
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'mood_breakdown', coalesce(v_mood_breakdown, '{}'::jsonb),
    'tags', v_all_tags
  );
end;
$$;

-- 5.2 RPC: get_user_diaries_overview
create or replace function public.get_user_diaries_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'description', d.description,
        'theme', d.theme,
        'cover_color', d.cover_color,
        'is_favorite', d.is_favorite,
        'is_archived', d.is_archived,
        'sort_order', d.sort_order,
        'entries_count', coalesce(stats.entries_count, 0),
        'highest_page_number', coalesce(stats.highest_page_number, 0),
        'latest_entry_date', stats.latest_entry_date,
        'created_at', d.created_at,
        'updated_at', d.updated_at
      ) order by d.is_favorite desc, d.sort_order asc, d.created_at desc
    ),
    '[]'::jsonb
  )
  into v_result
  from public.diaries d
  left join lateral (
    select
      count(*)::int as entries_count,
      max(page_number)::int as highest_page_number,
      max(entry_date) as latest_entry_date
    from public.diary_entries e
    where e.diary_id = d.id and e.user_id = v_user_id
  ) stats on true
  where d.user_id = v_user_id;

  return v_result;
end;
$$;

-- 5.3 RPC: reorder_diaries
create or replace function public.reorder_diaries(
  p_diary_ids uuid[]
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

  if p_diary_ids is null or array_length(p_diary_ids, 1) = 0 then
    return;
  end if;

  for i in 1 .. array_length(p_diary_ids, 1) loop
    update public.diaries
    set sort_order = i,
        updated_at = now()
    where id = p_diary_ids[i]
      and user_id = v_user_id;
  end loop;
end;
$$;

-- 5.4 RPC: create_diary_with_first_page
create or replace function public.create_diary_with_first_page(
  p_name text,
  p_description text default null,
  p_theme text default 'vintage',
  p_cover_color text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_diary_id uuid;
  v_entry_id uuid;
  v_today date := current_date;
  v_date_str text;
  v_day_of_week text;
  v_year_str text;
  v_cover_color text;
  v_result jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_cover_color := coalesce(p_cover_color, case 
    when p_theme = 'vintage' then '#8C3A27'
    when p_theme = 'classic' then '#1E3A5F'
    else '#172330'
  end);

  v_date_str := to_char(v_today, 'FMMonth FMDD');
  v_day_of_week := to_char(v_today, 'FMDay');
  v_year_str := 'Anno ' || to_char(v_today, 'YYYY');

  -- 1. Insert Diary
  insert into public.diaries (
    user_id,
    name,
    description,
    theme,
    cover_color,
    is_favorite,
    is_archived
  ) values (
    v_user_id,
    coalesce(nullif(trim(p_name), ''), 'Untitled Tome'),
    p_description,
    coalesce(p_theme, 'vintage'),
    v_cover_color,
    false,
    false
  )
  returning id into v_diary_id;

  -- 2. Insert First Page
  insert into public.diary_entries (
    diary_id,
    user_id,
    page_number,
    entry_date,
    date_str,
    day_of_week,
    year_str,
    title,
    description,
    gratitude,
    energy_level,
    start_time,
    end_time,
    mood,
    weather,
    is_hearted,
    tags
  ) values (
    v_diary_id,
    v_user_id,
    1,
    v_today,
    v_date_str,
    v_day_of_week,
    v_year_str,
    '',
    '',
    array['', '', '']::text[],
    3,
    '09:00',
    '17:00',
    '🌿 Calm',
    'sunny',
    false,
    array['Fresh Inscription']::text[]
  )
  returning id into v_entry_id;

  -- 3. Return full combined payload
  select jsonb_build_object(
    'id', d.id,
    'user_id', d.user_id,
    'name', d.name,
    'description', d.description,
    'theme', d.theme,
    'cover_color', d.cover_color,
    'is_favorite', d.is_favorite,
    'is_archived', d.is_archived,
    'sort_order', d.sort_order,
    'entries_count', 1,
    'highest_page_number', 1,
    'latest_entry_date', v_today,
    'created_at', d.created_at,
    'updated_at', d.updated_at,
    'first_entry_id', v_entry_id
  )
  into v_result
  from public.diaries d
  where d.id = v_diary_id;

  return v_result;
end;
$$;

-- 5.5 RPC: create_diary_entry
create or replace function public.create_diary_entry(
  p_diary_id uuid,
  p_title text default '',
  p_description text default '',
  p_gratitude text[] default array['', '', '']::text[],
  p_energy_level integer default 3,
  p_start_time text default '09:00',
  p_end_time text default '17:00',
  p_mood text default '🌿 Calm',
  p_weather text default 'sunny',
  p_is_hearted boolean default false,
  p_tags text[] default array['Daily Reflection']::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_next_page int;
  v_today date := current_date;
  v_date_str text;
  v_day_of_week text;
  v_year_str text;
  v_entry record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(max(page_number), 0) + 1
  into v_next_page
  from public.diary_entries
  where diary_id = p_diary_id and user_id = v_user_id;

  v_date_str := to_char(v_today, 'FMMonth FMDD');
  v_day_of_week := to_char(v_today, 'FMDay');
  v_year_str := 'Anno ' || to_char(v_today, 'YYYY');

  insert into public.diary_entries (
    diary_id,
    user_id,
    page_number,
    entry_date,
    date_str,
    day_of_week,
    year_str,
    title,
    description,
    gratitude,
    energy_level,
    start_time,
    end_time,
    mood,
    weather,
    is_hearted,
    tags
  ) values (
    p_diary_id,
    v_user_id,
    v_next_page,
    v_today,
    v_date_str,
    v_day_of_week,
    v_year_str,
    coalesce(p_title, ''),
    coalesce(p_description, ''),
    coalesce(p_gratitude, array['', '', '']::text[]),
    coalesce(p_energy_level, 3),
    coalesce(p_start_time, '09:00'),
    coalesce(p_end_time, '17:00'),
    coalesce(p_mood, '🌿 Calm'),
    coalesce(p_weather, 'sunny'),
    coalesce(p_is_hearted, false),
    coalesce(p_tags, array['Daily Reflection']::text[])
  )
  returning * into v_entry;

  return to_jsonb(v_entry);
end;
$$;

-- ==============================================================================
-- 6. PERMISSIONS & GRANTS
-- ==============================================================================
grant execute on function public.get_diary_stats(uuid) to authenticated;
grant execute on function public.get_user_diaries_overview() to authenticated;
grant execute on function public.reorder_diaries(uuid[]) to authenticated;
grant execute on function public.create_diary_with_first_page(text, text, text, text) to authenticated;
grant execute on function public.create_diary_entry(uuid, text, text, text[], integer, text, text, text, text, boolean, text[]) to authenticated;

