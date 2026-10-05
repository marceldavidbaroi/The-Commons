-- ==============================================================================
-- Migration: 20261006000002_ensure_schema_blueprint_columns.sql
-- Description:
--   Ensure schema_blueprint jsonb column exists on public.tag_groups and public.tag_categories
-- ==============================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'tag_groups' 
      and column_name = 'schema_blueprint'
  ) then
    alter table public.tag_groups 
    add column schema_blueprint jsonb not null default '[]'::jsonb;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'tag_categories' 
      and column_name = 'schema_blueprint'
  ) then
    alter table public.tag_categories 
    add column schema_blueprint jsonb not null default '[]'::jsonb;
  end if;
end $$;

create index if not exists idx_tag_groups_blueprint on public.tag_groups using gin (schema_blueprint);
create index if not exists idx_tag_categories_blueprint on public.tag_categories using gin (schema_blueprint);
