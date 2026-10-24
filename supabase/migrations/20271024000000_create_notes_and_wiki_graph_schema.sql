-- Migration: 20271024000000_create_notes_and_wiki_graph_schema.sql
-- Description: Create folders, notes, note_connections tables with triggers and stored procedures

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- 1. FOLDERS TABLE
create table if not exists public.folders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid() not null,
  parent_id uuid references public.folders(id) on delete set null,
  name text not null check (char_length(name) > 0 and name !~ '[/\\:]'),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null,
  deleted_at timestamptz default null
);

-- 2. NOTES TABLE
create table if not exists public.notes (
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
create unique index if not exists uq_active_user_note_title 
  on public.notes (user_id, lower(title)) 
  where deleted_at is null;

-- 3. EXPLICIT CONNECTIONS / GRAPH TABLE
create table if not exists public.note_connections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade default auth.uid() not null,
  source_note_id uuid references public.notes(id) on delete cascade not null,
  target_note_id uuid references public.notes(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  deleted_at timestamptz default null,

  constraint uq_note_connection unique (source_note_id, target_note_id),
  constraint ck_no_self_link check (source_note_id <> target_note_id)
);

-- Performance & Foreign Key Indexes
create index if not exists idx_folders_active on public.folders (user_id, parent_id) where deleted_at is null;
create index if not exists idx_folders_user_id on public.folders (user_id);
create index if not exists idx_folders_parent_id on public.folders (parent_id);

create index if not exists idx_notes_active on public.notes (user_id, folder_id) where deleted_at is null;
create index if not exists idx_notes_user_id on public.notes (user_id);
create index if not exists idx_notes_folder_id on public.notes (folder_id);

create index if not exists idx_conn_active_src on public.note_connections (source_note_id) where deleted_at is null;
create index if not exists idx_conn_active_tgt on public.note_connections (target_note_id) where deleted_at is null;
create index if not exists idx_conn_user_id on public.note_connections (user_id);
create index if not exists idx_conn_target_note_id on public.note_connections (target_note_id);

create index if not exists idx_notes_title_trgm on public.notes using gin (lower(title) gin_trgm_ops);

-- Triggers for updated_at
create or replace trigger on_folders_updated
  before update on public.folders
  for each row
  execute function public.handle_updated_at();

create or replace trigger on_notes_updated
  before update on public.notes
  for each row
  execute function public.handle_updated_at();

-- Graph Synchronization Engine Trigger Function
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

drop trigger if exists tr_sync_note_connections on public.notes;
create trigger tr_sync_note_connections
after insert or update of content, deleted_at on public.notes
for each row execute function public.handle_note_connections();

-- 1. Folder Deletion RPC with Two Strategies
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

-- 2. Restore Note
create or replace function public.restore_note(target_note_id uuid)
returns void as $$
begin
  update public.notes
  set deleted_at = null
  where id = target_note_id and user_id = auth.uid();
end;
$$ language plpgsql security definer;

-- 3. Restore Folder
create or replace function public.restore_folder(target_folder_id uuid)
returns void as $$
declare
  target_parent_id uuid;
begin
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

-- 4. Purge Item Permanently
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

-- Row Level Security (RLS)
alter table public.folders enable row level security;
alter table public.notes enable row level security;
alter table public.note_connections enable row level security;

create policy "Users manage own folders" on public.folders
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage own notes" on public.notes
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users manage own connections" on public.note_connections
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
