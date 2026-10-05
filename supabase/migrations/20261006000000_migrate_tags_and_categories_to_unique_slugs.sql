-- ==============================================================================
-- Migration: 20261006000000_migrate_tags_and_categories_to_unique_slugs.sql
-- Description:
--   1. Add slug column to tag_groups, tag_categories, and tags.
--   2. Backfill existing slugs deterministically from names.
--   3. Add unique constraints:
--        - tag_groups: uq_user_feature_tag_group_slug (user_id, feature, slug)
--        - tag_categories: uq_user_feature_tag_category_slug (user_id, feature, slug)
--        - tags: uq_user_tag_slug_in_category (category_id, slug)
--   4. Migrate user_items, tasks, goals, diary_entries:
--        - user_items: add category_slug text, tag_slugs text[] (default '{}')
--        - tasks: add tag_slugs text[] (default '{}')
--        - goals: add tag_slugs text[] (default '{}')
--        - diary_entries: add tag_slugs text[] (default '{}')
--   5. Backfill category_slug & tag_slugs from existing category_id & tag_ids.
--   6. Create GIN and BTree indexes on slug fields.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- Helper function to generate clean URL/database safe slugs
-- -----------------------------------------------------------------------------
create or replace function public.slugify_text(v text)
returns text
language plpgsql
immutable
as $$
begin
  return lower(regexp_replace(regexp_replace(trim(v), '[^a-zA-Z0-9\s_-]', '', 'g'), '[\s_]+', '-', 'g'));
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. Alter tag_groups: add slug column and populate
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tag_groups' and column_name = 'slug'
  ) then
    alter table public.tag_groups add column slug text;
  end if;
end $$;

update public.tag_groups
set slug = public.slugify_text(name)
where slug is null or slug = '';

alter table public.tag_groups alter column slug set not null;

create index if not exists idx_tag_groups_slug on public.tag_groups(slug);
create index if not exists idx_tag_groups_user_feature_slug on public.tag_groups(user_id, feature, slug);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_user_feature_tag_group_slug'
  ) then
    alter table public.tag_groups
      add constraint uq_user_feature_tag_group_slug unique (user_id, feature, slug);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Alter tag_categories: add slug column and populate
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tag_categories' and column_name = 'slug'
  ) then
    alter table public.tag_categories add column slug text;
  end if;
end $$;

update public.tag_categories
set slug = public.slugify_text(name)
where slug is null or slug = '';

alter table public.tag_categories alter column slug set not null;

create index if not exists idx_tag_categories_slug on public.tag_categories(slug);
create index if not exists idx_tag_categories_user_feature_slug on public.tag_categories(user_id, feature, slug);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_user_feature_tag_category_slug'
  ) then
    alter table public.tag_categories
      add constraint uq_user_feature_tag_category_slug unique (user_id, feature, slug);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Alter tags: add slug column and populate
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tags' and column_name = 'slug'
  ) then
    alter table public.tags add column slug text;
  end if;
end $$;

update public.tags
set slug = public.slugify_text(name)
where slug is null or slug = '';

alter table public.tags alter column slug set not null;

create index if not exists idx_tags_slug on public.tags(slug);
create index if not exists idx_tags_category_slug on public.tags(category_id, slug);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_user_tag_slug_in_category'
  ) then
    alter table public.tags
      add constraint uq_user_tag_slug_in_category unique (category_id, slug);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Alter user_items: add category_slug and tag_slugs
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'user_items' and column_name = 'category_slug'
  ) then
    alter table public.user_items add column category_slug text;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'user_items' and column_name = 'tag_slugs'
  ) then
    alter table public.user_items add column tag_slugs text[] not null default '{}';
  end if;
end $$;

-- Backfill user_items category_slug & tag_slugs
update public.user_items ui
set category_slug = tc.slug
from public.tag_categories tc
where ui.category_id = tc.id and (ui.category_slug is null or ui.category_slug = '');

update public.user_items ui
set tag_slugs = coalesce((
  select array_agg(t.slug order by t.slug)
  from public.tags t
  where t.id = any(ui.tag_ids)
), '{}')
where (ui.tag_slugs = '{}' or ui.tag_slugs is null) and array_length(ui.tag_ids, 1) > 0;

create index if not exists idx_user_items_category_slug on public.user_items(category_slug);
create index if not exists idx_user_items_tag_slugs on public.user_items using gin (tag_slugs);

-- -----------------------------------------------------------------------------
-- 5. Alter tasks, goals, diary_entries: add tag_slugs text[]
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'tag_slugs'
  ) then
    alter table public.tasks add column tag_slugs text[] not null default '{}';
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'goals' and column_name = 'tag_slugs'
  ) then
    alter table public.goals add column tag_slugs text[] not null default '{}';
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'diary_entries' and column_name = 'tag_slugs'
  ) then
    alter table public.diary_entries add column tag_slugs text[] not null default '{}';
  end if;
end $$;

-- Backfill tag_slugs from tag_ids
update public.tasks t
set tag_slugs = coalesce((
  select array_agg(tag.slug order by tag.slug)
  from public.tags tag
  where tag.id = any(t.tag_ids)
), '{}')
where (t.tag_slugs = '{}' or t.tag_slugs is null) and array_length(t.tag_ids, 1) > 0;

update public.goals g
set tag_slugs = coalesce((
  select array_agg(tag.slug order by tag.slug)
  from public.tags tag
  where tag.id = any(g.tag_ids)
), '{}')
where (g.tag_slugs = '{}' or g.tag_slugs is null) and array_length(g.tag_ids, 1) > 0;

update public.diary_entries de
set tag_slugs = coalesce((
  select array_agg(tag.slug order by tag.slug)
  from public.tags tag
  where tag.id = any(de.tag_ids)
), '{}')
where (de.tag_slugs = '{}' or de.tag_slugs is null) and array_length(de.tag_ids, 1) > 0;

create index if not exists idx_tasks_tag_slugs on public.tasks using gin (tag_slugs);
create index if not exists idx_goals_tag_slugs on public.goals using gin (tag_slugs);
create index if not exists idx_diary_entries_tag_slugs on public.diary_entries using gin (tag_slugs);
