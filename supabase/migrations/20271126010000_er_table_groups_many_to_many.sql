-- Many-to-many membership between er_tables and er_groups
-- Allows one table (single source of truth) to appear in multiple feature groups with per-group canvas positions.

create table public.er_table_groups (
  table_id uuid not null references public.er_tables(id) on delete cascade,
  group_id uuid not null references public.er_groups(id) on delete cascade,
  diagram_id uuid not null references public.er_diagrams(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position jsonb,
  created_at timestamptz not null default now(),
  primary key (table_id, group_id)
);

create index idx_er_table_groups_cursor
  on public.er_table_groups (diagram_id, group_id, created_at desc, table_id desc);

alter table public.er_table_groups enable row level security;

create policy "er_table_groups_select_own" on public.er_table_groups
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "er_table_groups_insert_own" on public.er_table_groups
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "er_table_groups_update_own" on public.er_table_groups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "er_table_groups_delete_own" on public.er_table_groups
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Backfill existing single-group assignments into er_table_groups
insert into public.er_table_groups (table_id, group_id, diagram_id, user_id, position)
select id, group_id, diagram_id, user_id, position
from public.er_tables
where group_id is not null
on conflict (table_id, group_id) do nothing;

-- View for ungrouped tables (tables not in any er_table_groups row)
create or replace view public.er_ungrouped_tables
with (security_invoker = true) as
select
  t.id,
  t.diagram_id,
  t.group_id,
  t.user_id,
  t.name,
  t.columns,
  t.relations,
  t.position,
  t.created_at,
  t.updated_at
from public.er_tables t
where not exists (
  select 1
  from public.er_table_groups tg
  where tg.table_id = t.id
);

-- Updated server-side group table counts (grouped via er_table_groups + ungrouped via er_ungrouped_tables)
create or replace view public.er_group_table_counts
with (security_invoker = true) as
select
  diagram_id,
  group_id,
  user_id,
  count(*)::int as table_count
from public.er_table_groups
group by diagram_id, group_id, user_id
union all
select
  diagram_id,
  null::uuid as group_id,
  user_id,
  count(*)::int as table_count
from public.er_ungrouped_tables
group by diagram_id, user_id;
