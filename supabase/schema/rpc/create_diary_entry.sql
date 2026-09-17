-- RPC: create_diary_entry
-- Atomically creates a fresh diary entry / leaf in a single transaction, computing the next page number securely.

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

  -- Determine next page number atomically
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

grant execute on function public.create_diary_entry(uuid, text, text, text[], integer, text, text, text, text, boolean, text[]) to authenticated;
