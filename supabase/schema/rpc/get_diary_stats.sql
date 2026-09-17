-- RPC: get_diary_stats
-- Calculates summary statistics for a user's journaling activity:
-- streak count, total entries, words, average energy, hearted count, mood breakdown, and recent tags

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

grant execute on function public.get_diary_stats(uuid) to authenticated;
