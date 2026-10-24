# Technical Design Document: Obsidian-Style Note System (Supabase)

> **Document Type**: **T**echnical **D**esign **D**ocument (TDD) / Architecture Document  
> **Feature**: Notes & Wiki-Link Knowledge Engine  
> **Status**: Approved for Implementation  

---

## 1. Executive Summary & Goals

This system provides a bidirectional wiki-linked note-taking engine with a hierarchical folder tree and an explicit relational graph in Supabase (PostgreSQL + PostgREST + Auth).

### Updated Requirements
* **Soft-Delete Architecture**: Folders, notes, and graph edges are never hard-deleted on initial removal. Instead, they carry a `deleted_at` timestamp and can be restored or purged via a Recycle Bin.
* **Granular Folder Deletion Strategies**:
  * **Option A (Cascade / Delete with Children)**: Soft-deletes the target folder and cascades the soft-delete down the entire descendant subtree (all nested child folders and notes).
  * **Option B (Orphan / Delete Parent Only)**: Soft-deletes only the target folder. Immediate child folders and notes are promoted to root level (`parent_id = null` and `folder_id = null`).
* **Graph Lifecycle on Soft Delete**: When a note is soft-deleted, its edges in `note_connections` are deactivated so they disappear from backlink lists and graph views, while preserving textual references (`[[Title]]`) as ghost links until restored or permanently purged.

---

## 2. Architecture & Data Flow

```text
+--------------------------------------------------------------------------+
|                               Client Layer                               |
|   +-----------------------+  +-------------------+  +----------------+   |
|   | Explorer (Active Tree)|  | Recycle Bin Modal |  | Graph View     |   |
|   +-----------------------+  +-------------------+  +----------------+   |
+------------------------------------|-------------------------------------+
                                     | (RPC / PostgREST)
+------------------------------------v-------------------------------------+
|                          Supabase / PostgreSQL                           |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |                       Storage Tables                             |   |
|   |   [ public.folders ]          [ public.notes ]                   |   |
|   |   (deleted_at)                (deleted_at)                       |   |
|   +------------------------------------------------------------------+   |
|                                     |                                    |
|   +---------------------------------v--------------------------------+   |
|   |                  Relational Graph Engine                         |   |
|   |   [ public.note_connections ] (deleted_at)                       |   |
|   |   * Maintained via trigger on note save                          |   |
|   |   * Filtered where deleted_at IS NULL for active views           |   |
|   +------------------------------------------------------------------+   |
|                                     |                                    |
|   +---------------------------------v--------------------------------+   |
|   |                       Stored Procedures                          |   |
|   |   * delete_folder(folder_id, cascade_children)                   |   |
|   |   * restore_folder(folder_id) / restore_note(note_id)            |   |
|   |   * purge_permanently(item_type, item_id)                        |   |
|   +------------------------------------------------------------------+   |
+--------------------------------------------------------------------------+
```

---

## 3. Database Schema & Data Integrity

### 3.1 Entity Relationship Model

| Table | Primary Key | Foreign Keys | Key Constraints & Flags |
| :--- | :--- | :--- | :--- |
| `folders` | `id (UUID)` | `parent_id -> folders(id)`, `user_id -> auth.users(id)` | `deleted_at (timestamptz, nullable)` |
| `notes` | `id (UUID)` | `folder_id -> folders(id)`, `user_id -> auth.users(id)` | `deleted_at (timestamptz, nullable)`, `unique (user_id, lower(title))` where `deleted_at is null` |
| `note_connections` | `id (UUID)` | `source_note_id -> notes(id)`, `target_note_id -> notes(id)` | `deleted_at (timestamptz, nullable)`, `unique (source, target)` |

### 3.2 SQL Migration

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- 1. FOLDERS TABLE
create table public.folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid() not null,
  parent_id uuid references public.folders(id) on delete set null,
  name text not null check (char_length(name) > 0 and name !~ '[/\\:]'),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  deleted_at timestamptz default null
);

-- 2. NOTES TABLE
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid() not null,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null check (char_length(title) > 0),
  content text default '' not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  deleted_at timestamptz default null
);

-- Unique title per active note (allowing deleted notes to release the title)
create unique index uq_active_user_note_title 
  on public.notes (user_id, lower(title)) 
  where deleted_at is null;

-- 3. EXPLICIT CONNECTIONS / GRAPH TABLE
create table public.note_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid() not null,
  source_note_id uuid references public.notes(id) on delete cascade not null,
  target_note_id uuid references public.notes(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  deleted_at timestamptz default null,

  constraint uq_note_connection unique (source_note_id, target_note_id),
  constraint ck_no_self_link check (source_note_id <> target_note_id)
);

-- Performance Indexes
create index idx_folders_active on public.folders (user_id, parent_id) where deleted_at is null;
create index idx_notes_active on public.notes (user_id, folder_id) where deleted_at is null;
create index idx_conn_active_src on public.note_connections (source_note_id) where deleted_at is null;
create index idx_conn_active_tgt on public.note_connections (target_note_id) where deleted_at is null;
create index idx_notes_title_trgm on public.notes using gin (lower(title) gin_trgm_ops);
```

### 3.3 Graph Synchronization Engine
When an active note is modified, synchronize the edges. If a note is marked deleted, its edges are automatically soft-deleted.

```sql
create or replace function public.handle_note_connections()
returns trigger as $$
declare
  target_rec record;
begin
  -- If note was soft-deleted, soft-delete all its outgoing and incoming connections
  if NEW.deleted_at is not null and OLD.deleted_at is null then
    update public.note_connections
    set deleted_at = NEW.deleted_at
    where (source_note_id = NEW.id or target_note_id = NEW.id)
      and deleted_at is null;
    return NEW;
  end if;

  -- If note was restored, reactivate connections where target is also not deleted
  if NEW.deleted_at is null and OLD.deleted_at is not null then
    update public.note_connections nc
    set deleted_at = null
    where nc.source_note_id = NEW.id
      and exists (
        select 1 from public.notes target_n
        where target_n.id = nc.target_note_id
          and target_n.deleted_at is null
      );
    return NEW;
  end if;

  -- Normal content edit on active note: purge and re-extract
  delete from public.note_connections where source_note_id = NEW.id;

  if NEW.deleted_at is null then
    for target_rec in
      with extracted_tokens as (
        select distinct lower(trim(m[1])) as token_title
        from regexp_matches(NEW.content, '\[\[(.*?)\]\]', 'g') as m
        where trim(m[1]) <> ''
      )
      select n.id as matched_id
      from extracted_tokens t
      inner join public.notes n 
        on lower(n.title) = t.token_title
       and n.user_id = NEW.user_id
      where n.id <> NEW.id 
        and n.deleted_at is null
    loop
      insert into public.note_connections (user_id, source_note_id, target_note_id)
      values (NEW.user_id, NEW.id, target_rec.matched_id)
      on conflict (source_note_id, target_note_id) 
      do update set deleted_at = null;
    end loop;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

create trigger tr_sync_note_connections
after insert or update of content, deleted_at on public.notes
for each row execute function public.handle_note_connections();
```

---

## 4. Deletion, Restoration & Recycle Bin Stored Procedures
All complex tree modifications run inside atomic Postgres stored procedures (`SECURITY DEFINER` scoped to `auth.uid()`).

### 4.1 Folder Deletion RPC (With Two Strategies)

```sql
create or replace function public.delete_folder(
  target_folder_id uuid,
  cascade_children boolean
)
returns void as $$
declare
  current_user_id uuid := auth.uid();
  now_ts timestamptz := timezone('utc'::text, now());
begin
  if cascade_children then
    -- OPTION 1: Recursive cascade soft-delete
    with recursive folder_tree as (
      select id from public.folders 
      where id = target_folder_id and user_id = current_user_id
      union all
      select f.id from public.folders f
      inner join folder_tree ft on f.parent_id = ft.id
      where f.user_id = current_user_id
    )
    -- Soft-delete all notes inside the subtree
    update public.notes
    set deleted_at = now_ts
    where folder_id in (select id from folder_tree)
      and deleted_at is null;

    with recursive folder_tree as (
      select id from public.folders 
      where id = target_folder_id and user_id = current_user_id
      union all
      select f.id from public.folders f
      inner join folder_tree ft on f.parent_id = ft.id
      where f.user_id = current_user_id
    )
    -- Soft-delete all folders in the subtree
    update public.folders
    set deleted_at = now_ts
    where id in (select id from folder_tree)
      and deleted_at is null;

  else
    -- OPTION 2: Orphan immediate children (move to root level)
    update public.folders
    set parent_id = null
    where parent_id = target_folder_id 
      and user_id = current_user_id;

    update public.notes
    set folder_id = null
    where folder_id = target_folder_id 
      and user_id = current_user_id;

    -- Soft-delete only this folder
    update public.folders
    set deleted_at = now_ts
    where id = target_folder_id 
      and user_id = current_user_id;
  end if;
end;
$$ language plpgsql security definer;
```

### 4.2 Restoration and Permanent Purge RPCs

```sql
-- Restore a single note
create or replace function public.restore_note(target_note_id uuid)
returns void as $$
begin
  update public.notes
  set deleted_at = null
  where id = target_note_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- Restore a folder (and optionally restore all descendant items)
create or replace function public.restore_folder(target_folder_id uuid)
returns void as $$
declare
  target_parent_id uuid;
begin
  -- Verify if parent is also deleted; if so, promote to root
  select parent_id into target_parent_id 
  from public.folders 
  where id = target_folder_id and user_id = auth.uid();

  if target_parent_id is not null and exists (
    select 1 from public.folders where id = target_parent_id and deleted_at is not null
  ) then
    target_parent_id := null;
  end if;

  update public.folders
  set deleted_at = null, parent_id = target_parent_id
  where id = target_folder_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- Permanently purge an item from the recycle bin
create or replace function public.purge_item(item_type text, item_id uuid)
returns void as $$
begin
  if item_type = 'note' then
    delete from public.notes 
    where id = item_id and user_id = auth.uid() and deleted_at is not null;
  elsif item_type = 'folder' then
    delete from public.folders 
    where id = item_id and user_id = auth.uid() and deleted_at is not null;
  end if;
end;
$$ language plpgsql security definer;
```

---

## 5. Security & Row Level Security (RLS)

Active views only retrieve rows where `deleted_at is null`. Recycle bin views explicitly query `deleted_at is not null`.

```sql
alter table public.folders enable row level security;
alter table public.notes enable row level security;
alter table public.note_connections enable row level security;

create policy "Users manage own folders" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own connections" on public.note_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## 6. Client API & UI Integration

```ts
import { getSupabaseClient } from '$lib/supabase';

// Delete folder with strategy dialog
export async function deleteFolderModalAction(
  folderId: string,
  cascadeChildren: boolean
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('delete_folder', {
    target_folder_id: folderId,
    cascade_children: cascadeChildren
  });
  if (error) throw error;
}

// Fetch soft-deleted items for Recycle Bin
export async function getRecycleBinItems() {
  const supabase = getSupabaseClient();
  const [{ data: trashedNotes }, { data: trashedFolders }] = await Promise.all([
    supabase.from('notes').select('id, title, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    supabase.from('folders').select('id, name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
  ]);

  return { trashedNotes: trashedNotes || [], trashedFolders: trashedFolders || [] };
}

// Restore a note
export async function restoreNoteAction(noteId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('restore_note', { target_note_id: noteId });
  if (error) throw error;
}

// Restore a folder
export async function restoreFolderAction(folderId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('restore_folder', { target_folder_id: folderId });
  if (error) throw error;
}

// Permanent hard delete
export async function permanentlyPurgeAction(type: 'note' | 'folder', id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc('purge_item', { item_type: type, item_id: id });
  if (error) throw error;
}
```

---

## 7. Test-Driven Development (TDD) Specification

All scenarios must be covered by automated end-to-end integration tests using Vitest.

### 7.1 Test Matrix

| Test ID | Domain | Action | Expected State |
| :--- | :--- | :--- | :--- |
| **TC-01** | Folder Soft-Delete (Orphan) | Delete parent with `cascade_children = false` | Parent has `deleted_at != null`. Child folder `parent_id` becomes `null`. Child notes `folder_id` becomes `null`. |
| **TC-02** | Folder Soft-Delete (Cascade) | Delete parent with `cascade_children = true` | Parent, child folders, and descendant notes all receive `deleted_at != null`. |
| **TC-03** | Graph Inactivation | Soft-delete a linked note | All edges in `note_connections` connected to note receive `deleted_at != null`. Active backlink query returns 0. |
| **TC-04** | Graph Restoration | Restore soft-deleted note via `restore_note()` | Note `deleted_at` becomes `null`. Connections restore if the connected counterpart is also active. |
| **TC-05** | Permanent Hard-Delete | Run `purge_item('note', id)` | Record permanently deleted from PostgreSQL; connected edges hard-deleted by foreign key cascade. |
| **TC-06** | Title Re-use Guard | Soft-delete note "Idea", create new note "Idea" | Permitted, because partial unique index applies only where `deleted_at is null`. |

### 7.2 Executable Vitest Test Suite

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_TEST_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Obsidian Folder Hierarchy & Soft-Delete Engine', () => {
  const testUserId = '00000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    await supabase.from('note_connections').delete().eq('user_id', testUserId);
    await supabase.from('notes').delete().eq('user_id', testUserId);
    await supabase.from('folders').delete().eq('user_id', testUserId);
  });

  it('TC-01: Soft-deletes parent folder only and orphans children', async () => {
    // 1. Arrange: Parent folder with child folder and note
    const { data: parent } = await supabase
      .from('folders')
      .insert({ user_id: testUserId, name: 'Parent' })
      .select().single();

    const { data: child } = await supabase
      .from('folders')
      .insert({ user_id: testUserId, parent_id: parent!.id, name: 'Child' })
      .select().single();

    const { data: note } = await supabase
      .from('notes')
      .insert({ user_id: testUserId, folder_id: parent!.id, title: 'Parent Note' })
      .select().single();

    // 2. Act: Delete parent with cascade_children = false
    await supabase.rpc('delete_folder', {
      target_folder_id: parent!.id,
      cascade_children: false
    });

    // 3. Assert
    const { data: updatedParent } = await supabase.from('folders').select('*').eq('id', parent!.id).single();
    expect(updatedParent!.deleted_at).not.toBeNull();

    const { data: updatedChild } = await supabase.from('folders').select('*').eq('id', child!.id).single();
    expect(updatedChild!.deleted_at).toBeNull();
    expect(updatedChild!.parent_id).toBeNull(); // Orphaned to root

    const { data: updatedNote } = await supabase.from('notes').select('*').eq('id', note!.id).single();
    expect(updatedNote!.deleted_at).toBeNull();
    expect(updatedNote!.folder_id).toBeNull(); // Orphaned to root
  });

  it('TC-02: Recursively soft-deletes folder subtree when cascade_children = true', async () => {
    const { data: root } = await supabase.from('folders').insert({ user_id: testUserId, name: 'Root' }).select().single();
    const { data: sub } = await supabase.from('folders').insert({ user_id: testUserId, parent_id: root!.id, name: 'Sub' }).select().single();
    const { data: note } = await supabase.from('notes').insert({ user_id: testUserId, folder_id: sub!.id, title: 'Sub Note' }).select().single();

    // Act
    await supabase.rpc('delete_folder', {
      target_folder_id: root!.id,
      cascade_children: true
    });

    // Assert
    const { data: trashedFolders } = await supabase.from('folders').select('id, deleted_at').eq('user_id', testUserId);
    const { data: trashedNotes } = await supabase.from('notes').select('id, deleted_at').eq('user_id', testUserId);

    expect(trashedFolders?.every(f => f.deleted_at !== null)).toBe(true);
    expect(trashedNotes?.every(n => n.deleted_at !== null)).toBe(true);
  });

  it('TC-03 & TC-04: Disables graph connections on soft delete and restores them', async () => {
    // 1. Arrange: Note A links to Note B
    const { data: noteB } = await supabase.from('notes').insert({ user_id: testUserId, title: 'Note B', content: 'Target' }).select().single();
    const { data: noteA } = await supabase.from('notes').insert({ user_id: testUserId, title: 'Note A', content: 'See [[Note B]]' }).select().single();

    // Verify active edge exists
    let { data: edges } = await supabase.from('note_connections').select('*').eq('source_note_id', noteA!.id).is('deleted_at', null);
    expect(edges?.length).toBe(1);

    // 2. Act: Soft-delete Note B
    await supabase.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', noteB!.id);

    // 3. Assert: Edge is deactivated
    let { data: activeEdges } = await supabase.from('note_connections').select('*').eq('source_note_id', noteA!.id).is('deleted_at', null);
    expect(activeEdges?.length).toBe(0);

    // 4. Restore Note B
    await supabase.rpc('restore_note', { target_note_id: noteB!.id });

    // Assert: Edge is active again
    let { data: restoredEdges } = await supabase.from('note_connections').select('*').eq('source_note_id', noteA!.id).is('deleted_at', null);
    expect(restoredEdges?.length).toBe(1);
  });

  it('TC-05: Permanently purges items from database', async () => {
    const { data: note } = await supabase.from('notes').insert({ user_id: testUserId, title: 'Temporary', deleted_at: new Date().toISOString() }).select().single();

    await supabase.rpc('purge_item', { item_type: 'note', item_id: note!.id });

    const { data: check } = await supabase.from('notes').select('*').eq('id', note!.id);
    expect(check?.length).toBe(0);
  });
});
```
