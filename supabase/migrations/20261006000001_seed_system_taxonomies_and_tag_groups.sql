-- ==============================================================================
-- Migration: 20261006000001_seed_system_taxonomies_and_tag_groups.sql
-- Description:
--   1. Seed system tag_groups for all existing user profiles with unique slugs.
--   2. Link all system tag_categories to their appropriate tag_groups.
--   3. Ensure idempotent upserts with updated_at timestamps.
-- ==============================================================================

-- 1. Helper function to seed system tag groups and link categories for a user
create or replace function public.seed_system_taxonomies_for_user(p_user_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grp_food bigint;
  v_grp_clean bigint;
  v_grp_electronics bigint;
  v_grp_appliances bigint;
  v_grp_tools bigint;
  v_grp_diy bigint;
  v_grp_health bigint;
  v_grp_living bigint;
  v_grp_admin bigint;

  v_grp_tasks_core bigint;
  v_grp_goals_core bigint;
  v_grp_diary_core bigint;
  v_grp_doc_core bigint;
begin
  -- ----------------------------------------------------------------------------
  -- A. HOMEOPS DOMAIN GROUPS & CATEGORY LINKING
  -- ----------------------------------------------------------------------------

  -- 1. Food, Pantry & Beverages
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Food, Pantry & Beverages', 'food-pantry-beverages', 'utensils', '#D97706', 1, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_food;

  if v_grp_food is null then
    select id into v_grp_food from public.tag_groups where user_id = p_user_id and feature = 'homeops' and slug = 'food-pantry-beverages';
  end if;

  update public.tag_categories
  set group_id = v_grp_food, updated_at = now()
  where user_id = p_user_id and feature = 'homeops' and slug in (
    'pantry-dry-goods',
    'oils-sauces-condiments',
    'spices-seasonings',
    'fresh-perishables',
    'freezer-reserves',
    'beverages-brew-bar',
    'snacks-confectionery'
  );

  -- 2. Household & Cleaning Supplies
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Household & Cleaning Supplies', 'household-cleaning-supplies', 'sparkles', '#059669', 2, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_clean;

  if v_grp_clean is null then
    select id into v_grp_clean from public.tag_groups where user_id = p_user_id and feature = 'homeops' and slug = 'household-cleaning-supplies';
  end if;

  update public.tag_categories
  set group_id = v_grp_clean, updated_at = now()
  where user_id = p_user_id and feature = 'homeops' and slug in (
    'kitchen-cleaning-disposables',
    'laundry-fabric-care',
    'surface-bath-sanitation',
    'paper-sanitary-goods'
  );

  -- 3. Electronics, Computing & Smart Tech
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Electronics, Computing & Smart Tech', 'electronics-computing-smart-tech', 'cpu', '#4F46E5', 3, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_electronics;

  if v_grp_electronics is null then
    select id into v_grp_electronics from public.tag_groups where user_id = p_user_id and feature = 'homeops' and slug = 'electronics-computing-smart-tech';
  end if;

  update public.tag_categories
  set group_id = v_grp_electronics, updated_at = now()
  where user_id = p_user_id and feature = 'homeops' and slug in (
    'computing-workstation',
    'mobile-personal-gadgets',
    'audio-entertainment',
    'networking-smart-home'
  );

  -- 4. Appliances & Climate Control
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Appliances & Climate Control', 'appliances-climate-control', 'tv', '#0284C7', 4, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_appliances;

  if v_grp_appliances is null then
    select id into v_grp_appliances from public.tag_groups where user_id = p_user_id and feature = 'homeops' and slug = 'appliances-climate-control';
  end if;

  update public.tag_categories
  set group_id = v_grp_appliances, updated_at = now()
  where user_id = p_user_id and feature = 'homeops' and slug in (
    'major-home-appliances',
    'small-kitchen-appliances'
  );

  -- 5. Tools, Hardware & Workshop
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Tools, Hardware & Workshop', 'tools-hardware-workshop', 'wrench', '#C2410C', 5, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_tools;

  if v_grp_tools is null then
    select id into v_grp_tools from public.tag_groups where user_id = p_user_id and feature = 'homeops' and slug = 'tools-hardware-workshop';
  end if;

  update public.tag_categories
  set group_id = v_grp_tools, updated_at = now()
  where user_id = p_user_id and feature = 'homeops' and slug in (
    'hand-tools',
    'power-tools-accessories',
    'fixings-fasteners',
    'home-hardware-utility-spares'
  );

  -- 6. DIY Craft, Electronics & Chemicals
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'homeops', 'DIY Craft, Electronics & Chemicals', 'diy-craft-electronics-chemicals', 'zap', '#8B5CF6', 6, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_diy;

  if v_grp_diy is null then
    select id into v_grp_diy from public.tag_groups where user_id = p_user_id and feature = 'homeops' and slug = 'diy-craft-electronics-chemicals';
  end if;

  update public.tag_categories
  set group_id = v_grp_diy, updated_at = now()
  where user_id = p_user_id and feature = 'homeops' and slug in (
    'diy-electronics-soldering',
    'adhesives-lubricants-chemicals'
  );

  -- 7. Personal Care, Health & First Aid
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Personal Care, Health & First Aid', 'personal-care-health-first-aid', 'heart-pulse', '#DC2626', 7, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_health;

  if v_grp_health is null then
    select id into v_grp_health from public.tag_groups where user_id = p_user_id and feature = 'homeops' and slug = 'personal-care-health-first-aid';
  end if;

  update public.tag_categories
  set group_id = v_grp_health, updated_at = now()
  where user_id = p_user_id and feature = 'homeops' and slug in (
    'first-aid-medicine-cabinet',
    'personal-grooming-toiletries'
  );

  -- 8. Living Spaces, Linens & Outdoors
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Living Spaces, Linens & Outdoors', 'living-spaces-linens-outdoors', 'compass', '#0284C7', 8, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_living;

  if v_grp_living is null then
    select id into v_grp_living from public.tag_groups where user_id = p_user_id and feature = 'homeops' and slug = 'living-spaces-linens-outdoors';
  end if;

  update public.tag_categories
  set group_id = v_grp_living, updated_at = now()
  where user_id = p_user_id and feature = 'homeops' and slug in (
    'home-textiles-linens',
    'travel-camping-luggage'
  );

  -- 9. Documents, Archive & Media
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Documents, Archive & Media', 'documents-archive-media', 'archive', '#475569', 9, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_admin;

  if v_grp_admin is null then
    select id into v_grp_admin from public.tag_groups where user_id = p_user_id and feature = 'homeops' and slug = 'documents-archive-media';
  end if;

  update public.tag_categories
  set group_id = v_grp_admin, updated_at = now()
  where user_id = p_user_id and feature = 'homeops' and slug in (
    'documents-archival-media'
  );

  -- ----------------------------------------------------------------------------
  -- B. TASKS DOMAIN GROUP
  -- ----------------------------------------------------------------------------
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'tasks', 'Action & Execution Taxonomy', 'action-execution-taxonomy', 'check-square', '#6366F1', 1, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_tasks_core;

  if v_grp_tasks_core is null then
    select id into v_grp_tasks_core from public.tag_groups where user_id = p_user_id and feature = 'tasks' and slug = 'action-execution-taxonomy';
  end if;

  update public.tag_categories
  set group_id = v_grp_tasks_core, updated_at = now()
  where user_id = p_user_id and feature = 'tasks';

  -- ----------------------------------------------------------------------------
  -- C. GOALS DOMAIN GROUP
  -- ----------------------------------------------------------------------------
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'goals', 'Strategic Horizons & Domains', 'strategic-horizons-domains', 'target', '#6366F1', 1, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_goals_core;

  if v_grp_goals_core is null then
    select id into v_grp_goals_core from public.tag_groups where user_id = p_user_id and feature = 'goals' and slug = 'strategic-horizons-domains';
  end if;

  update public.tag_categories
  set group_id = v_grp_goals_core, updated_at = now()
  where user_id = p_user_id and feature = 'goals';

  -- ----------------------------------------------------------------------------
  -- D. DIARY DOMAIN GROUP
  -- ----------------------------------------------------------------------------
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'diary', 'Reflections & Vitality', 'reflections-vitality', 'book-open', '#3B82F6', 1, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_diary_core;

  if v_grp_diary_core is null then
    select id into v_grp_diary_core from public.tag_groups where user_id = p_user_id and feature = 'diary' and slug = 'reflections-vitality';
  end if;

  update public.tag_categories
  set group_id = v_grp_diary_core, updated_at = now()
  where user_id = p_user_id and feature = 'diary';

  -- ----------------------------------------------------------------------------
  -- E. DOCUMENT DOMAIN GROUP
  -- ----------------------------------------------------------------------------
  insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system)
  values (p_user_id, 'document', 'Codex & Registry Index', 'codex-registry-index', 'file-text', '#8B5CF6', 1, true)
  on conflict (user_id, feature, slug) do update
    set name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, updated_at = now()
  returning id into v_grp_doc_core;

  if v_grp_doc_core is null then
    select id into v_grp_doc_core from public.tag_groups where user_id = p_user_id and feature = 'document' and slug = 'codex-registry-index';
  end if;

  update public.tag_categories
  set group_id = v_grp_doc_core, updated_at = now()
  where user_id = p_user_id and feature = 'document';
end;
$$;

-- 2. Execute seeder across all existing profiles
do $$
declare
  r record;
begin
  for r in (select id from public.profiles) loop
    perform public.seed_system_taxonomies_for_user(r.id);
  end loop;
end $$;

-- 3. Grant execute permissions
grant execute on function public.seed_system_taxonomies_for_user(bigint) to authenticated, service_role;
