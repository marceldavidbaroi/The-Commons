-- ==============================================================================
-- Migration: 20261005000000_replace_tag_junction_tables_with_array_ids.sql
-- Description: Drop junction tables (task_tags, goal_tags, diary_entry_tags, document_tags)
--              and add/standardize tag_ids bigint[] on tasks, goals, diary_entries.
-- ==============================================================================

-- 1. Add tag_ids BIGINT[] column to tasks
alter table public.tasks 
  add column if not exists tag_ids bigint[] not null default '{}';

-- 2. Add tag_ids BIGINT[] column to goals
alter table public.goals 
  add column if not exists tag_ids bigint[] not null default '{}';

-- 3. Add tag_ids BIGINT[] column to diary_entries
alter table public.diary_entries 
  add column if not exists tag_ids bigint[] not null default '{}';

-- 4. Backfill existing junction data into the array columns if any existed
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'task_tags') then
    update public.tasks t
    set tag_ids = coalesce((
      select array_agg(tt.tag_id order by tt.tag_id)
      from public.task_tags tt
      where tt.task_id = t.id
    ), '{}')
    where tag_ids = '{}' or tag_ids is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'goal_tags') then
    update public.goals g
    set tag_ids = coalesce((
      select array_agg(gt.tag_id order by gt.tag_id)
      from public.goal_tags gt
      where gt.goal_id = g.id
    ), '{}')
    where tag_ids = '{}' or tag_ids is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'diary_entry_tags') then
    update public.diary_entries de
    set tag_ids = coalesce((
      select array_agg(det.tag_id order by det.tag_id)
      from public.diary_entry_tags det
      where det.entry_id = de.id
    ), '{}')
    where tag_ids = '{}' or tag_ids is null;
  end if;
end $$;

-- 5. Create GIN indexes for fast tag array membership queries (e.g. tag_ids @> array[123]::bigint[])
create index if not exists idx_tasks_tag_ids on public.tasks using gin (tag_ids);
create index if not exists idx_goals_tag_ids on public.goals using gin (tag_ids);
create index if not exists idx_diary_entries_tag_ids on public.diary_entries using gin (tag_ids);

-- 6. Drop the obsolete junction tables
drop table if exists public.task_tags cascade;
drop table if exists public.goal_tags cascade;
drop table if exists public.diary_entry_tags cascade;
drop table if exists public.document_tags cascade;
