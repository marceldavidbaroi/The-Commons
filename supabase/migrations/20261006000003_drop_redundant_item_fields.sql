-- ==============================================================================
-- Migration: 20261006000003_drop_redundant_item_fields.sql
-- Description:
--   Drop hardcoded consumable columns (quantity, unit_of_measure, reorder_threshold,
--   expiration_date) from public.user_items in favor of dynamic schema_blueprint attributes
--   stored directly in the metadata JSONB column.
-- ==============================================================================

-- 1. Drop check constraint if present that references consumable columns
alter table public.user_items drop constraint if exists check_consumable_fields;

-- 2. Drop redundant consumable columns
alter table public.user_items 
  drop column if exists quantity,
  drop column if exists unit_of_measure,
  drop column if exists reorder_threshold,
  drop column if exists expiration_date;
