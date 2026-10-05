-- ==============================================================================
-- Migration: 20271006210000_drop_item_type_from_user_items.sql
-- Description: Drop item_type column and related indexes from public.user_items
-- ==============================================================================

-- 1. Drop check constraint that depends on item_type if present
alter table public.user_items drop constraint if exists check_consumable_fields;

-- 2. Drop partial indexes using item_type
drop index if exists public.idx_user_items_user_type;
drop index if exists public.idx_user_items_reorder;
drop index if exists public.idx_user_items_expiring;

-- 3. Drop item_type column
alter table public.user_items drop column if exists item_type;
