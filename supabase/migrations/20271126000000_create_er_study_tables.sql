-- ER Diagram Study & Grouping (er-study) Phase 1 Schema

-- 1. Diagrams (project metadata only — lightweight for 100+ table schemas)
create table public.er_diagrams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  source_type text not null default 'ddl' check (source_type in ('live', 'ddl', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_er_diagrams_user_cursor
  on public.er_diagrams (user_id, created_at desc, id desc);

alter table public.er_diagrams enable row level security;

create policy "er_diagrams_select_own" on public.er_diagrams
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "er_diagrams_insert_own" on public.er_diagrams
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "er_diagrams_update_own" on public.er_diagrams
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "er_diagrams_delete_own" on public.er_diagrams
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 2. Table Groups (1 row per group)
create table public.er_groups (
  id uuid primary key default gen_random_uuid(),
  diagram_id uuid not null references public.er_diagrams(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  color text not null default 'slate',
  position jsonb not null default '{"x":0,"y":0,"width":480,"height":360}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_er_groups_diagram_cursor
  on public.er_groups (diagram_id, created_at desc, id desc);

alter table public.er_groups enable row level security;

create policy "er_groups_select_own" on public.er_groups
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "er_groups_insert_own" on public.er_groups
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "er_groups_update_own" on public.er_groups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "er_groups_delete_own" on public.er_groups
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 3. Tables (1 row per table — lazy-loaded by group_id)
create table public.er_tables (
  id uuid primary key default gen_random_uuid(),
  diagram_id uuid not null references public.er_diagrams(id) on delete cascade,
  group_id uuid references public.er_groups(id) on delete set null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  columns jsonb not null default '[]'::jsonb,
  relations jsonb not null default '[]'::jsonb,
  position jsonb not null default '{"x":0,"y":0}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_er_tables_group_cursor
  on public.er_tables (diagram_id, group_id, created_at desc, id desc);

alter table public.er_tables enable row level security;

create policy "er_tables_select_own" on public.er_tables
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "er_tables_insert_own" on public.er_tables
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "er_tables_update_own" on public.er_tables
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "er_tables_delete_own" on public.er_tables
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 4. Study Notes (attached to tables, groups, or canvas)
create table public.er_notes (
  id uuid primary key default gen_random_uuid(),
  diagram_id uuid not null references public.er_diagrams(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('canvas', 'group', 'table')),
  target_id text not null,
  content text not null default '',
  position jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_er_notes_diagram_cursor
  on public.er_notes (diagram_id, created_at desc, id desc);

alter table public.er_notes enable row level security;

create policy "er_notes_select_own" on public.er_notes
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "er_notes_insert_own" on public.er_notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "er_notes_update_own" on public.er_notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "er_notes_delete_own" on public.er_notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- 5. Updated-at trigger for er_diagrams, er_tables, er_notes
create or replace function public.er_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_er_diagrams_updated_at
  before update on public.er_diagrams
  for each row execute function public.er_touch_updated_at();

create trigger trg_er_tables_updated_at
  before update on public.er_tables
  for each row execute function public.er_touch_updated_at();

create trigger trg_er_notes_updated_at
  before update on public.er_notes
  for each row execute function public.er_touch_updated_at();

-- 6. Server-side group table counts (respects RLS via security_invoker)
create or replace view public.er_group_table_counts
with (security_invoker = true) as
select
  diagram_id,
  group_id,
  user_id,
  count(*)::int as table_count
from public.er_tables
group by diagram_id, group_id, user_id;

-- 7. Read-only RPC for Live Public Schema Introspection
create or replace function public.get_public_schema_metadata()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return jsonb_build_object(
    'tables', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', c.table_name,
        'columns', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'name', col.column_name,
            'type', col.data_type,
            'nullable', col.is_nullable = 'YES'
          ) order by col.ordinal_position), '[]'::jsonb)
          from information_schema.columns col
          where col.table_schema = 'public' and col.table_name = c.table_name
        )
      ) order by c.table_name), '[]'::jsonb)
      from information_schema.tables c
      where c.table_schema = 'public' and c.table_type = 'BASE TABLE'
    ),
    'relations', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'from_table', kcu.table_name,
        'from_column', kcu.column_name,
        'to_table', ccu.table_name,
        'to_column', ccu.column_name
      )), '[]'::jsonb)
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
    )
  );
end;
$$;

revoke all on function public.get_public_schema_metadata() from public;
grant execute on function public.get_public_schema_metadata() to authenticated;
