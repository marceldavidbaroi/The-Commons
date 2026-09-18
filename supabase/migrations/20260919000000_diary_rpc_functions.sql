-- Migration: 20260919000000_diary_rpc_functions.sql
-- Adds/updates atomic PostgreSQL RPC functions for The Commons Diary System

-- ==============================================================================
-- 1. RPC: create_diary_with_first_page
-- ==============================================================================
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

  -- 2. Insert First Page Leaf
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

  -- 3. Return combined payload
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

grant execute on function public.create_diary_with_first_page(text, text, text, text) to authenticated;

-- ==============================================================================
-- 2. RPC: create_diary_entry
-- ==============================================================================
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

  -- Determine next page number atomically for this diary
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
    tags,
    word_count
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
    coalesce(p_tags, array['Daily Reflection']::text[]),
    case when p_description is not null and trim(p_description) != ''
      then array_length(regexp_split_to_array(trim(p_description), '\s+'), 1)
      else 0
    end
  )
  returning * into v_entry;

  return to_jsonb(v_entry);
end;
$$;

grant execute on function public.create_diary_entry(uuid, text, text, text[], integer, text, text, text, text, boolean, text[]) to authenticated;

-- ==============================================================================
-- 3. RPC: get_user_diaries_overview
-- ==============================================================================
create or replace function public.get_user_diaries_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_result jsonb;
  v_count int;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Auto-provision initial starter tome if user has 0 diaries
  select count(*) into v_count from public.diaries where user_id = v_user_id;
  if v_count = 0 then
    perform public.create_diary_with_first_page(
      'Chronicles & Inquiries',
      'Daily recollections, quiet morning thoughts, and philosophical inquiries in walnut ink.',
      'vintage',
      '#8C3A27'
    );
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

grant execute on function public.get_user_diaries_overview() to authenticated;

-- ==============================================================================
-- 4. RPC: get_diary_stats
-- ==============================================================================
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
  v_hearted_entries integer := 0;
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_mood_breakdown jsonb := '{}'::jsonb;
  v_tags text[] := array[]::text[];
  v_dates date[];
  v_prev_date date;
  v_curr_streak integer := 0;
  v_max_streak integer := 0;
  d date;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Base Aggregations
  select
    coalesce(count(*), 0),
    coalesce(sum(word_count), 0),
    coalesce(round(avg(energy_level)::numeric, 2), 0),
    coalesce(count(*) filter (where is_hearted = true), 0)
  into
    v_total_entries,
    v_total_words,
    v_avg_energy,
    v_hearted_entries
  from public.diary_entries
  where user_id = v_user_id
    and (p_diary_id is null or diary_id = p_diary_id);

  -- 2. Mood Breakdown Aggregation
  select coalesce(
    jsonb_object_agg(mood, count),
    '{}'::jsonb
  )
  into v_mood_breakdown
  from (
    select mood, count(*) as count
    from public.diary_entries
    where user_id = v_user_id
      and (p_diary_id is null or diary_id = p_diary_id)
      and mood is not null and mood != ''
    group by mood
  ) m;

  -- 3. Unique Tags Aggregation
  select coalesce(array_agg(distinct t), array[]::text[])
  into v_tags
  from (
    select unnest(tags) as t
    from public.diary_entries
    where user_id = v_user_id
      and (p_diary_id is null or diary_id = p_diary_id)
  ) sub
  where t is not null and t != '';

  -- 4. Streak Calculation
  select array_agg(distinct entry_date order by entry_date desc)
  into v_dates
  from public.diary_entries
  where user_id = v_user_id
    and (p_diary_id is null or diary_id = p_diary_id);

  if v_dates is not null and array_length(v_dates, 1) > 0 then
    -- Current Streak check
    if v_dates[1] = current_date or v_dates[1] = current_date - interval '1 day' then
      v_curr_streak := 1;
      for i in 2 .. array_length(v_dates, 1) loop
        if v_dates[i] = v_dates[i-1] - interval '1 day' then
          v_curr_streak := v_curr_streak + 1;
        else
          exit;
        end if;
      end loop;
      v_current_streak := v_curr_streak;
    end if;

    -- Longest Streak
    v_curr_streak := 1;
    v_max_streak := 1;
    for i in 2 .. array_length(v_dates, 1) loop
      if v_dates[i] = v_dates[i-1] - interval '1 day' then
        v_curr_streak := v_curr_streak + 1;
      else
        v_curr_streak := 1;
      end if;
      if v_curr_streak > v_max_streak then
        v_max_streak := v_curr_streak;
      end if;
    end loop;
    v_longest_streak := v_max_streak;
  end if;

  return jsonb_build_object(
    'total_entries', v_total_entries,
    'total_words', v_total_words,
    'average_energy', v_avg_energy,
    'hearted_entries', v_hearted_entries,
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'mood_breakdown', v_mood_breakdown,
    'tags', v_tags
  );
end;
$$;

grant execute on function public.get_diary_stats(uuid) to authenticated;

-- ==============================================================================
-- 5. RPC: reorder_diaries
-- ==============================================================================
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

grant execute on function public.reorder_diaries(uuid[]) to authenticated;
