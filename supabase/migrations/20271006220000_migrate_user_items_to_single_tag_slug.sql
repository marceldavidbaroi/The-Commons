-- ==============================================================================
-- Migration: 20271006220000_migrate_user_items_to_single_tag_slug.sql
-- Description: Replace tag_slugs text[] and tag_ids bigint[] in user_items with single tag_slug text column
-- ==============================================================================

-- 1. Add single tag_slug column to public.user_items if not exists
alter table public.user_items add column if not exists tag_slug text;

-- 2. Populate tag_slug from existing tag_slugs array or tag_ids if available
update public.user_items
set tag_slug = tag_slugs[1]
where tag_slug is null and array_length(tag_slugs, 1) > 0;

-- 3. Drop old gin index on tag_slugs and tag_ids if present
drop index if exists public.idx_user_items_tag_slugs;
drop index if exists public.idx_user_items_tag_ids;

-- 4. Drop tag_slugs and tag_ids columns
alter table public.user_items 
    drop column if exists tag_slugs,
    drop column if exists tag_ids;

-- 5. Create btree index on tag_slug
create index if not exists idx_user_items_tag_slug 
    on public.user_items(user_id, tag_slug) 
    where not is_archived;
