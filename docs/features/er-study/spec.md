# Feature Spec: ER Diagram Study & Grouping (`er-study`)

## 1. User Goal & UX

**Problem:** Studying large relational schemas (100+ tables) in a single flat ER diagram is overwhelming and slow. Users need a way to import or sketch database tables, organize them into logical **Groups** (e.g., `Goals`, `Tasks`, `Auth`), **lazy-load and isolate** a single group at a time to study its relationships without visual noise, and attach persistent markdown notes to tables, groups, or the canvas.

### Primary User Flows
1. **Add Tables (3 Input Modes):**
   - **Paste SQL (`+ Import SQL`):** Paste one or more `CREATE TABLE` statements (including `PRIMARY KEY`, `REFERENCES`, and `FOREIGN KEY` constraints). A client-side parser extracts tables, columns, and relations and bulk-inserts them into `er_tables` (optionally directly into the active group).
   - **Sync from Live DB (`Sync Schema`):** Calls a read-only Postgres RPC to fetch `public` schema tables, columns, and foreign keys, letting the user pick which tables to pull into a group or ungrouped pool.
   - **Visual Quick-Add (`+ New Table`):** Compact modal to define a table name, columns (`name`, `type`, `is_pk`, `fk_target`), and optionally export back to PostgreSQL `CREATE TABLE` DDL.
2. **Group-First Lazy Loading & Isolation:**
   - Opening a project loads **only `er_groups`** (with server-computed table counts) — never all 100+ tables at once.
   - Selecting a group fetches **only** `er_tables` where `group_id = activeGroupId` (plus an `Ungrouped` view with keyset pagination of 20).
   - **Cross-Group FKs:** When a table references a table outside the active group, render a compact external-reference badge/handle instead of pulling in the entire external table.
   - Reassigning a table to another group updates only that table's `group_id`.
3. **Annotate with Notes:**
   - Click any **Table** or **Group** to open a compact side drawer for markdown study notes (e.g., RLS rules, pagination indexes, design trade-offs).
   - Drop free-form **Canvas Sticky Notes** directly onto the diagram workspace.

### Layout & UI Constraints
- **Navigation:** Added to the app side nav as **`ERD`** (`/erd`).
- **2-Tier Header (Max ~88px):**
  - **Tier 1:** Diagram title / switcher + primary actions (`+ Import SQL`, `+ New Table`, `+ Group`).
  - **Tier 2:** Inline group filter pills with table counts (e.g., `Goals (8)`, `Ungrouped (12)`) + **`Isolate`** toggle + `Sync Schema` / `Export SQL` actions.
- **Canvas Engine:** `@xyflow/svelte` (Svelte Flow) for draggable table nodes, FK edges, group bounding boxes, and canvas sticky notes.
- **Rendering:** Solid/alpha backgrounds and crisp borders only (no `backdrop-blur-*` or `filter: blur()`).

---

## 2. Data & Schema

New incremental migration: `supabase/migrations/<timestamp>_create_er_study_tables.sql`

```sql
-- 1. Diagrams (project metadata only — lightweight for 100+ table schemas)
create table public.er_diagrams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source_type text not null default 'ddl' check (source_type in ('live', 'ddl', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_er_diagrams_user_cursor
  on public.er_diagrams (user_id, created_at desc, id desc);

alter table public.er_diagrams enable row level security;

create policy "er_diagrams_select_own" on public.er_diagrams
  for select using (auth.uid() = user_id);
create policy "er_diagrams_insert_own" on public.er_diagrams
  for insert with check (auth.uid() = user_id);
create policy "er_diagrams_update_own" on public.er_diagrams
  for update using (auth.uid() = user_id);
create policy "er_diagrams_delete_own" on public.er_diagrams
  for delete using (auth.uid() = user_id);

-- 2. Table Groups (1 row per group)
create table public.er_groups (
  id uuid primary key default gen_random_uuid(),
  diagram_id uuid not null references public.er_diagrams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default 'slate',
  position jsonb not null default '{"x":0,"y":0,"width":480,"height":360}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_er_groups_diagram_cursor
  on public.er_groups (diagram_id, created_at desc, id desc);

alter table public.er_groups enable row level security;

create policy "er_groups_select_own" on public.er_groups
  for select using (auth.uid() = user_id);
create policy "er_groups_insert_own" on public.er_groups
  for insert with check (auth.uid() = user_id);
create policy "er_groups_update_own" on public.er_groups
  for update using (auth.uid() = user_id);
create policy "er_groups_delete_own" on public.er_groups
  for delete using (auth.uid() = user_id);

-- 3. Tables (1 row per table — lazy-loaded by group_id)
create table public.er_tables (
  id uuid primary key default gen_random_uuid(),
  diagram_id uuid not null references public.er_diagrams(id) on delete cascade,
  group_id uuid references public.er_groups(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
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
  for select using (auth.uid() = user_id);
create policy "er_tables_insert_own" on public.er_tables
  for insert with check (auth.uid() = user_id);
create policy "er_tables_update_own" on public.er_tables
  for update using (auth.uid() = user_id);
create policy "er_tables_delete_own" on public.er_tables
  for delete using (auth.uid() = user_id);

-- 4. Study Notes (attached to tables, groups, or canvas)
create table public.er_notes (
  id uuid primary key default gen_random_uuid(),
  diagram_id uuid not null references public.er_diagrams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
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
  for select using (auth.uid() = user_id);
create policy "er_notes_insert_own" on public.er_notes
  for insert with check (auth.uid() = user_id);
create policy "er_notes_update_own" on public.er_notes
  for update using (auth.uid() = user_id);
create policy "er_notes_delete_own" on public.er_notes
  for delete using (auth.uid() = user_id);

-- 5. Server-side group table counts (avoids fetching all tables to count in JS)
create or replace view public.er_group_table_counts as
select
  diagram_id,
  group_id,
  user_id,
  count(*)::int as table_count
from public.er_tables
group by diagram_id, group_id, user_id;

-- 6. Read-only RPC for Live Public Schema Introspection
create or replace function public.get_public_schema_metadata()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'tables', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', c.table_name,
        'columns', (
          select jsonb_agg(jsonb_build_object(
            'name', col.column_name,
            'type', col.data_type,
            'nullable', col.is_nullable = 'YES'
          ) order by col.ordinal_position)
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
$$;
```

---

## 3. Route & Action Matrix

Pure SPA layered architecture (no SSR, no `+page.server.ts`):

| Layer | File | Responsibility |
| :--- | :--- | :--- |
| **View** | `src/routes/(app)/erd/+page.svelte` | 2-tier header, group filter/isolate toolbar, `@xyflow/svelte` canvas |
| **Components** | `src/lib/components/er/TableNode.svelte` | Custom node rendering table name, columns, PK/FK badges, external FK chips, and note indicator |
| **Components** | `src/lib/components/er/GroupNode.svelte` | Resizable bounding box for grouped tables |
| **Components** | `src/lib/components/er/NoteDrawer.svelte` | Side sheet for editing markdown notes on selected table/group |
| **Components** | `src/lib/components/er/ImportSqlModal.svelte` | Modal for pasting `CREATE TABLE` SQL or picking tables from live DB |
| **Store** | `src/lib/stores/er.svelte.ts` | Svelte 5 runes (`diagrams`, `groups`, `tablesByGroup`, `notes`, `activeGroupId`, `isolateMode`) + zero-refetch CUD |
| **Service** | `src/lib/services/er-service.ts` | Typed Supabase SDK calls with explicit `select(...)` columns, group-scoped table queries, and `get_public_schema_metadata` RPC |
| **Utility** | `src/lib/utils/sql-er-parser.ts` | Pure TS parser converting `CREATE TABLE` DDL ↔ `{ tables, relations }` JSON |

---

## 4. Acceptance Criteria & Invariants

- **Strict RLS Isolation:** All `er_diagrams`, `er_groups`, `er_tables`, and `er_notes` rows are readable/writable only when `auth.uid() = user_id`.
- **Group-Scoped Lazy Loading:** Opening a diagram never fetches all `er_tables` rows; it loads `er_groups` + `er_group_table_counts` first, then fetches `er_tables` per `group_id` on demand (and caches loaded groups in `erStore`).
- **Zero-Refetch Mutations:** Creating, updating, moving, or deleting diagrams, groups, tables, or notes uses `.select().single()` and updates `erStore` in-place (never re-fetching list endpoints).
- **Explicit Column Selection & Keyset Pagination:** All Supabase queries name explicit columns (no `select('*')`) and paginate with cursor `(created_at, id)` and `limit(20)`.
- **No Blur Effects:** All modals, drawers, and node cards use solid/alpha surfaces without `backdrop-blur-*` or CSS `blur()`.

---

## 5. Implementation Phases

### Phase 1: Database & Service Foundation
- Create incremental migration `supabase/migrations/<timestamp>_create_er_study_tables.sql` (`er_diagrams`, `er_groups`, `er_tables`, `er_notes`, `er_group_table_counts` view, `get_public_schema_metadata()` RPC, RLS policies, composite indexes).
- Regenerate `src/lib/types/database.types.ts` (`pnpm types:db`).
- Implement `src/lib/services/er-service.ts` (explicit `select(...)`, keyset pagination, `.select().single()` CUD) and `src/lib/stores/er.svelte.ts` (Svelte 5 runes + zero-refetch updates).

### Phase 2: Route, Side Nav & Canvas Shell
- Install `@xyflow/svelte`.
- Add **`ERD`** link (`/erd`) to the app side nav in `src/routes/(app)/+layout.svelte`.
- Build `src/routes/(app)/erd/+page.svelte` with the 2-tier header, project/diagram switcher, and empty `@xyflow/svelte` canvas.
- Build `TableNode.svelte` (table header, columns, PK/FK badges, external FK chips) and persist node drag positions to `er_tables.position`.

### Phase 3: Table Input Modes (SQL, Live DB, Quick-Add)
- Build `src/lib/utils/sql-er-parser.ts` (`CREATE TABLE` DDL parser + SQL exporter).
- Build `ImportSqlModal.svelte` supporting **Paste SQL** and **Sync from Live DB** (table picker from `get_public_schema_metadata()`).
- Add **Visual Quick-Add (`+ New Table`)** modal and **Export SQL** action.

### Phase 4: Grouping, Lazy Loading & Isolation
- Build `GroupNode.svelte` and `+ Group` creation modal.
- Wire Tier 2 group filter pills with server counts (`er_group_table_counts`) so clicking a group lazy-loads only its `er_tables` rows.
- Add **`Isolate`** toggle (hides all nodes/edges outside the active group) and table-to-group reassignment.

### Phase 5: Study Notes (Drawer & Canvas Sticky Notes)
- Build `NoteDrawer.svelte` for markdown notes attached to a selected `table` or `group`.
- Add note indicator badges on `TableNode.svelte` and `GroupNode.svelte`.
- Support free-form **Canvas Sticky Notes** (`target_type = 'canvas'`) with draggable positions.
