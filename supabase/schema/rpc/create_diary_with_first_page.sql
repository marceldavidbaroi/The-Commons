-- RPC: create_diary_with_first_page
-- Atomically creates a new diary tome and initializes its first leaf (page 1) in a single transaction.

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

grant execute on function public.create_diary_with_first_page(text, text, text, text) to authenticated;
