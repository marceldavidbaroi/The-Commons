-- Migration: 20271024000001_fix_bidirectional_note_restoration.sql
-- Description: Ensure handle_note_connections restores both outgoing and incoming connections when target/source notes are active

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

  -- If note was restored, reactivate connections where the other counterpart is also not deleted
  if NEW.deleted_at is null and OLD.deleted_at is not null then
    -- Reactivate outgoing connections where target note is active
    update public.note_connections nc
    set deleted_at = null
    where nc.source_note_id = NEW.id
      and exists (
        select 1 from public.notes target_n
        where target_n.id = nc.target_note_id
          and target_n.deleted_at is null
      );

    -- Reactivate incoming connections where source note is active
    update public.note_connections nc
    set deleted_at = null
    where nc.target_note_id = NEW.id
      and exists (
        select 1 from public.notes source_n
        where source_n.id = nc.source_note_id
          and source_n.deleted_at is null
      );

    return NEW;
  end if;

  -- Normal content edit on active note: purge and re-extract outgoing connections
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
