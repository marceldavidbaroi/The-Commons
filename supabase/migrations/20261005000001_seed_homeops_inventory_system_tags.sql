-- ==============================================================================
-- Migration: 20261005000001_seed_homeops_inventory_system_tags.sql
-- Description: Provision and seed default system tag categories and tags for
--              HomeOps (Household Inventory & Asset Ledger) across all users.
-- ==============================================================================

-- 1. Helper function or update provision_feature_tag_categories for 'homeops' / 'inventory'
create or replace function public.provision_feature_tag_categories(p_feature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id bigint;
  v_count int;
  v_cat_id bigint;
begin
  select id into v_profile_id from public.profiles where auth_user_id = auth.uid();
  if v_profile_id is null then
    return jsonb_build_object('success', false, 'error', 'User not authenticated');
  end if;

  select count(*) into v_count
  from public.tag_categories
  where user_id = v_profile_id and feature = p_feature;

  if v_count = 0 then
    if p_feature = 'diary' then
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'diary', 'Context', '#3B82F6', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;
      
      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'diary' and name = 'Context';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'Deep Work', true),
          (v_cat_id, v_profile_id, 'Reflections', true),
          (v_cat_id, v_profile_id, 'Planning', true)
        on conflict (category_id, name) do nothing;
      end if;

      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'diary', 'Energy Level', '#10B981', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'diary' and name = 'Energy Level';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'High Vitality', true),
          (v_cat_id, v_profile_id, 'Medium Vitality', true),
          (v_cat_id, v_profile_id, 'Rest & Recovery', true)
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'document' then
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'document', 'Department', '#8B5CF6', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'document' and name = 'Department';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'Engineering', true),
          (v_cat_id, v_profile_id, 'Research', true),
          (v_cat_id, v_profile_id, 'Governance', true)
        on conflict (category_id, name) do nothing;
      end if;

      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'document', 'Document Type', '#F59E0B', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'document' and name = 'Document Type';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'Report', true),
          (v_cat_id, v_profile_id, 'Charter', true),
          (v_cat_id, v_profile_id, 'Dispatch', true)
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'goals' then
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'goals', 'Domain', '#6366F1', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'goals' and name = 'Domain';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'Civic & Guild', true),
          (v_cat_id, v_profile_id, 'Knowledge & Craft', true),
          (v_cat_id, v_profile_id, 'Health & Vitality', true),
          (v_cat_id, v_profile_id, 'Finance & Capital', true),
          (v_cat_id, v_profile_id, 'Home & Hearth', true),
          (v_cat_id, v_profile_id, 'Creative & Venture', true)
        on conflict (category_id, name) do nothing;
      end if;

      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'goals', 'Energy & Bandwidth', '#10B981', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'goals' and name = 'Energy & Bandwidth';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'Deep Focus', true),
          (v_cat_id, v_profile_id, 'Quick Win', true),
          (v_cat_id, v_profile_id, 'Administrative', true),
          (v_cat_id, v_profile_id, 'Collaborative', true)
        on conflict (category_id, name) do nothing;
      end if;

      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'goals', 'Impact & Leverage', '#F59E0B', 3, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'goals' and name = 'Impact & Leverage';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'High Leverage', true),
          (v_cat_id, v_profile_id, 'Foundational / Enabler', true),
          (v_cat_id, v_profile_id, 'Maintenance', true)
        on conflict (category_id, name) do nothing;
      end if;

      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'goals', 'Horizon & Cycle', '#0EA5E9', 4, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'goals' and name = 'Horizon & Cycle';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'Immediate Focus', true),
          (v_cat_id, v_profile_id, 'Quarterly Milestone', true),
          (v_cat_id, v_profile_id, 'Long-term Horizon', true)
        on conflict (category_id, name) do nothing;
      end if;

      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'goals', 'Execution Archetype', '#8B5CF6', 5, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'goals' and name = 'Execution Archetype';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'Project Deliverable', true),
          (v_cat_id, v_profile_id, 'Ritual & Habit', true),
          (v_cat_id, v_profile_id, 'Research & Discovery', true)
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'tasks' then
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'tasks', 'Area of Life', '#6366F1', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'tasks' and name = 'Area of Life';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'Chores', true),
          (v_cat_id, v_profile_id, 'Cleaning', true),
          (v_cat_id, v_profile_id, 'Groceries', true),
          (v_cat_id, v_profile_id, 'Home Maintenance', true),
          (v_cat_id, v_profile_id, 'Workout & Fitness', true),
          (v_cat_id, v_profile_id, 'Health & Medical', true),
          (v_cat_id, v_profile_id, 'Hygiene & Self-Care', true),
          (v_cat_id, v_profile_id, 'Bills & Finance', true),
          (v_cat_id, v_profile_id, 'Work & Career', true),
          (v_cat_id, v_profile_id, 'Learning & Study', true),
          (v_cat_id, v_profile_id, 'Family & Relationships', true)
        on conflict (category_id, name) do nothing;
      end if;

      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'tasks', 'Location & Context', '#2563EB', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'tasks' and name = 'Location & Context';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, '@home', true),
          (v_cat_id, v_profile_id, '@desk', true),
          (v_cat_id, v_profile_id, '@errand', true),
          (v_cat_id, v_profile_id, '@outdoors', true),
          (v_cat_id, v_profile_id, '@phone', true)
        on conflict (category_id, name) do nothing;
      end if;

      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'tasks', 'Energy & Focus', '#F59E0B', 3, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'tasks' and name = 'Energy & Focus';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, '⚡ High Focus', true),
          (v_cat_id, v_profile_id, '⚡ Low Focus', true),
          (v_cat_id, v_profile_id, '⚡ Quick Hit (<5m)', true)
        on conflict (category_id, name) do nothing;
      end if;

      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_profile_id, 'tasks', 'Action Triggers', '#B91C1C', 4, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_profile_id and feature = 'tasks' and name = 'Action Triggers';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_profile_id, 'Today Must', true),
          (v_cat_id, v_profile_id, 'This Week', true),
          (v_cat_id, v_profile_id, 'Waiting On', true),
          (v_cat_id, v_profile_id, 'Someday / Maybe', true)
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'homeops' or p_feature = 'inventory' then
      perform public.seed_homeops_tags_for_user(v_profile_id);
    end if;

    return jsonb_build_object('success', true, 'provisioned', true, 'feature', p_feature);
  end if;

  return jsonb_build_object('success', true, 'provisioned', false, 'feature', p_feature, 'message', 'Categories already exist');
end;
$$;

-- 2. Dedicated seeder function for HomeOps Household Inventory & Asset Ledger tags
create or replace function public.seed_homeops_tags_for_user(p_user_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat_id bigint;
begin
  -- 1. Pantry & Dry Goods (Amber / Orange)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Pantry & Dry Goods', '#F59E0B', 1, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Pantry & Dry Goods';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Grains', true),
      (v_cat_id, p_user_id, 'Rice', true),
      (v_cat_id, p_user_id, 'Pasta', true),
      (v_cat_id, p_user_id, 'Lentils', true),
      (v_cat_id, p_user_id, 'Beans', true),
      (v_cat_id, p_user_id, 'Flour', true),
      (v_cat_id, p_user_id, 'Baking Essentials', true),
      (v_cat_id, p_user_id, 'Breakfast Cereals', true),
      (v_cat_id, p_user_id, 'Noodles', true),
      (v_cat_id, p_user_id, 'Canned Goods', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 2. Oils, Sauces & Condiments (Amber)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Oils, Sauces & Condiments', '#D97706', 2, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Oils, Sauces & Condiments';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Cooking Oil', true),
      (v_cat_id, p_user_id, 'Vinegar', true),
      (v_cat_id, p_user_id, 'Soy Sauce', true),
      (v_cat_id, p_user_id, 'Hot Sauce', true),
      (v_cat_id, p_user_id, 'Mustard', true),
      (v_cat_id, p_user_id, 'Mayonnaise', true),
      (v_cat_id, p_user_id, 'Dressings', true),
      (v_cat_id, p_user_id, 'Marinades', true),
      (v_cat_id, p_user_id, 'Cooking Paste', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 3. Spices & Seasonings (Red-Orange)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Spices & Seasonings', '#EA580C', 3, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Spices & Seasonings';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Whole Spices', true),
      (v_cat_id, p_user_id, 'Ground Spices', true),
      (v_cat_id, p_user_id, 'Salt', true),
      (v_cat_id, p_user_id, 'Pepper', true),
      (v_cat_id, p_user_id, 'Bouillon Cubes', true),
      (v_cat_id, p_user_id, 'Extracts', true),
      (v_cat_id, p_user_id, 'Spice Blends', true),
      (v_cat_id, p_user_id, 'Dried Herbs', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 4. Fresh & Perishables (Emerald)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Fresh & Perishables', '#10B981', 4, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Fresh & Perishables';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Dairy', true),
      (v_cat_id, p_user_id, 'Milk', true),
      (v_cat_id, p_user_id, 'Eggs', true),
      (v_cat_id, p_user_id, 'Cheese', true),
      (v_cat_id, p_user_id, 'Fresh Vegetables', true),
      (v_cat_id, p_user_id, 'Fruits', true),
      (v_cat_id, p_user_id, 'Fresh Herbs', true),
      (v_cat_id, p_user_id, 'Bread', true),
      (v_cat_id, p_user_id, 'Tofu', true),
      (v_cat_id, p_user_id, 'Chilled Sauces', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 5. Freezer Reserves (Cyan / Sky)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Freezer Reserves', '#06B6D4', 5, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Freezer Reserves';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Frozen Meat', true),
      (v_cat_id, p_user_id, 'Frozen Poultry', true),
      (v_cat_id, p_user_id, 'Frozen Fish', true),
      (v_cat_id, p_user_id, 'Batch Meals', true),
      (v_cat_id, p_user_id, 'Frozen Vegetables', true),
      (v_cat_id, p_user_id, 'Frozen Dough', true),
      (v_cat_id, p_user_id, 'Ice Cream', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 6. Beverages & Brew Bar (Teal / Cyan)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Beverages & Brew Bar', '#0D9488', 6, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Beverages & Brew Bar';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Coffee Beans', true),
      (v_cat_id, p_user_id, 'Ground Coffee', true),
      (v_cat_id, p_user_id, 'Tea Leaves', true),
      (v_cat_id, p_user_id, 'Tea Bags', true),
      (v_cat_id, p_user_id, 'Syrups', true),
      (v_cat_id, p_user_id, 'Juices', true),
      (v_cat_id, p_user_id, 'Soda', true),
      (v_cat_id, p_user_id, 'Sparkling Water', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 7. Snacks & Confectionery (Rose / Pink)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Snacks & Confectionery', '#F43F5E', 7, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Snacks & Confectionery';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Nuts', true),
      (v_cat_id, p_user_id, 'Seeds', true),
      (v_cat_id, p_user_id, 'Chips', true),
      (v_cat_id, p_user_id, 'Crackers', true),
      (v_cat_id, p_user_id, 'Biscuits', true),
      (v_cat_id, p_user_id, 'Dried Fruits', true),
      (v_cat_id, p_user_id, 'Chocolates', true),
      (v_cat_id, p_user_id, 'Popcorn', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 8. Kitchen Cleaning & Disposables (Emerald / Green)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Kitchen Cleaning & Disposables', '#059669', 8, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Kitchen Cleaning & Disposables';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Dish Soap', true),
      (v_cat_id, p_user_id, 'Scrub Pads', true),
      (v_cat_id, p_user_id, 'Sponges', true),
      (v_cat_id, p_user_id, 'Dishwasher Pods', true),
      (v_cat_id, p_user_id, 'Trash Bags', true),
      (v_cat_id, p_user_id, 'Aluminum Foil', true),
      (v_cat_id, p_user_id, 'Parchment Paper', true),
      (v_cat_id, p_user_id, 'Cling Wrap', true),
      (v_cat_id, p_user_id, 'Ziploc Bags', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 9. Laundry & Fabric Care (Blue)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Laundry & Fabric Care', '#2563EB', 9, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Laundry & Fabric Care';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Laundry Detergent', true),
      (v_cat_id, p_user_id, 'Liquid Detergent', true),
      (v_cat_id, p_user_id, 'Stain Remover', true),
      (v_cat_id, p_user_id, 'Fabric Softener', true),
      (v_cat_id, p_user_id, 'Bleach', true),
      (v_cat_id, p_user_id, 'Dryer Sheets', true),
      (v_cat_id, p_user_id, 'Lint Roller', true),
      (v_cat_id, p_user_id, 'Washing Machine Cleaner', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 10. Surface & Bath Sanitation (Teal / Cyan)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Surface & Bath Sanitation', '#0891B2', 10, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Surface & Bath Sanitation';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Floor Cleaner', true),
      (v_cat_id, p_user_id, 'Disinfectant Spray', true),
      (v_cat_id, p_user_id, 'Bathroom Cleaner', true),
      (v_cat_id, p_user_id, 'Toilet Cleaner', true),
      (v_cat_id, p_user_id, 'Glass Cleaner', true),
      (v_cat_id, p_user_id, 'Microfiber Cloths', true),
      (v_cat_id, p_user_id, 'Descalers', true),
      (v_cat_id, p_user_id, 'Mop Refills', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 11. Paper & Sanitary Goods (Slate / Zinc)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Paper & Sanitary Goods', '#64748B', 11, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Paper & Sanitary Goods';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Toilet Paper', true),
      (v_cat_id, p_user_id, 'Paper Towels', true),
      (v_cat_id, p_user_id, 'Facial Tissues', true),
      (v_cat_id, p_user_id, 'Wet Wipes', true),
      (v_cat_id, p_user_id, 'Table Napkins', true),
      (v_cat_id, p_user_id, 'Cotton Swabs', true),
      (v_cat_id, p_user_id, 'Sanitary Pads', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 12. Home Hardware & Utility Spares (Zinc / Slate)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Home Hardware & Utility Spares', '#71717A', 12, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Home Hardware & Utility Spares';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Light Bulbs', true),
      (v_cat_id, p_user_id, 'AA Batteries', true),
      (v_cat_id, p_user_id, 'AAA Batteries', true),
      (v_cat_id, p_user_id, '9V Batteries', true),
      (v_cat_id, p_user_id, 'Coin Cells', true),
      (v_cat_id, p_user_id, 'Command Strips', true),
      (v_cat_id, p_user_id, 'Utility Fuses', true),
      (v_cat_id, p_user_id, 'Plumbing Washers', true),
      (v_cat_id, p_user_id, 'Cable Clips', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 13. Computing & Workstation (Indigo / Blue)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Computing & Workstation', '#4F46E5', 13, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Computing & Workstation';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Laptops', true),
      (v_cat_id, p_user_id, 'Desktop PCs', true),
      (v_cat_id, p_user_id, 'Monitors', true),
      (v_cat_id, p_user_id, 'Keyboards', true),
      (v_cat_id, p_user_id, 'Mice', true),
      (v_cat_id, p_user_id, 'Docking Stations', true),
      (v_cat_id, p_user_id, 'UPS Units', true),
      (v_cat_id, p_user_id, 'External Drives', true),
      (v_cat_id, p_user_id, 'NAS Storage', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 14. Mobile & Personal Gadgets (Violet / Purple)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Mobile & Personal Gadgets', '#7C3AED', 14, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Mobile & Personal Gadgets';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Smartphones', true),
      (v_cat_id, p_user_id, 'Tablets', true),
      (v_cat_id, p_user_id, 'Smartwatches', true),
      (v_cat_id, p_user_id, 'E-Readers', true),
      (v_cat_id, p_user_id, 'Power Banks', true),
      (v_cat_id, p_user_id, 'Wall Chargers', true),
      (v_cat_id, p_user_id, 'Charging Cables', true),
      (v_cat_id, p_user_id, 'Travel Adapters', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 15. Audio & Entertainment (Purple / Pink)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Audio & Entertainment', '#9333EA', 15, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Audio & Entertainment';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Televisions', true),
      (v_cat_id, p_user_id, 'Speakers', true),
      (v_cat_id, p_user_id, 'Soundbars', true),
      (v_cat_id, p_user_id, 'Headphones', true),
      (v_cat_id, p_user_id, 'IEMs', true),
      (v_cat_id, p_user_id, 'Gaming Consoles', true),
      (v_cat_id, p_user_id, 'Streaming Devices', true),
      (v_cat_id, p_user_id, 'DAC Amps', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 16. Major Home Appliances (Blue / Cyan)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Major Home Appliances', '#0284C7', 16, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Major Home Appliances';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Refrigerator', true),
      (v_cat_id, p_user_id, 'Washing Machine', true),
      (v_cat_id, p_user_id, 'Microwave Oven', true),
      (v_cat_id, p_user_id, 'Convection Oven', true),
      (v_cat_id, p_user_id, 'Air Conditioner', true),
      (v_cat_id, p_user_id, 'Water Purifier', true),
      (v_cat_id, p_user_id, 'Vacuum Cleaner', true),
      (v_cat_id, p_user_id, 'Geyser', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 17. Small Kitchen Appliances (Amber / Orange)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Small Kitchen Appliances', '#D97706', 17, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Small Kitchen Appliances';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Blender', true),
      (v_cat_id, p_user_id, 'Food Processor', true),
      (v_cat_id, p_user_id, 'Air Fryer', true),
      (v_cat_id, p_user_id, 'Electric Kettle', true),
      (v_cat_id, p_user_id, 'Coffee Grinder', true),
      (v_cat_id, p_user_id, 'Kitchen Scale', true),
      (v_cat_id, p_user_id, 'Toaster', true),
      (v_cat_id, p_user_id, 'Immersion Blender', true),
      (v_cat_id, p_user_id, 'Rice Cooker', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 18. Networking & Smart Home (Emerald / Teal)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Networking & Smart Home', '#059669', 18, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Networking & Smart Home';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Wi-Fi Routers', true),
      (v_cat_id, p_user_id, 'Ethernet Switches', true),
      (v_cat_id, p_user_id, 'Access Points', true),
      (v_cat_id, p_user_id, 'Smart Plugs', true),
      (v_cat_id, p_user_id, 'Smart Bulbs', true),
      (v_cat_id, p_user_id, 'Zigbee Gateways', true),
      (v_cat_id, p_user_id, 'Security Cameras', true),
      (v_cat_id, p_user_id, 'Smart Sensors', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 19. Hand Tools (Amber / Stone)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Hand Tools', '#B45309', 19, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Hand Tools';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Screwdrivers', true),
      (v_cat_id, p_user_id, 'Pliers', true),
      (v_cat_id, p_user_id, 'Socket Sets', true),
      (v_cat_id, p_user_id, 'Hammers', true),
      (v_cat_id, p_user_id, 'Utility Knives', true),
      (v_cat_id, p_user_id, 'Tape Measures', true),
      (v_cat_id, p_user_id, 'Hex Keys', true),
      (v_cat_id, p_user_id, 'Adjustable Wrenches', true),
      (v_cat_id, p_user_id, 'Spirit Levels', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 20. Power Tools & Accessories (Orange / Red)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Power Tools & Accessories', '#C2410C', 20, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Power Tools & Accessories';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Cordless Drills', true),
      (v_cat_id, p_user_id, 'Rotary Tools', true),
      (v_cat_id, p_user_id, 'Heat Guns', true),
      (v_cat_id, p_user_id, 'Drill Bits', true),
      (v_cat_id, p_user_id, 'Driver Bits', true),
      (v_cat_id, p_user_id, 'Sanding Pads', true),
      (v_cat_id, p_user_id, 'Tool Batteries', true),
      (v_cat_id, p_user_id, 'Battery Chargers', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 21. Fixings & Fasteners (Zinc / Neutral)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Fixings & Fasteners', '#52525B', 21, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Fixings & Fasteners';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Wood Screws', true),
      (v_cat_id, p_user_id, 'Machine Screws', true),
      (v_cat_id, p_user_id, 'Wall Anchors', true),
      (v_cat_id, p_user_id, 'Bolts', true),
      (v_cat_id, p_user_id, 'Nuts', true),
      (v_cat_id, p_user_id, 'Washers', true),
      (v_cat_id, p_user_id, 'Cable Ties', true),
      (v_cat_id, p_user_id, 'Nails', true),
      (v_cat_id, p_user_id, 'Rivets', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 22. DIY Electronics & Soldering (Indigo / Violet)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'DIY Electronics & Soldering', '#6366F1', 22, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'DIY Electronics & Soldering';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Soldering Iron', true),
      (v_cat_id, p_user_id, 'Solder Wire', true),
      (v_cat_id, p_user_id, 'Flux Paste', true),
      (v_cat_id, p_user_id, 'Digital Multimeter', true),
      (v_cat_id, p_user_id, 'Desoldering Pump', true),
      (v_cat_id, p_user_id, 'Wire Strippers', true),
      (v_cat_id, p_user_id, 'Heat Shrink Tubing', true),
      (v_cat_id, p_user_id, 'Breadboards', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 23. Adhesives, Lubricants & Chemicals (Rose / Orange)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Adhesives, Lubricants & Chemicals', '#E11D48', 23, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Adhesives, Lubricants & Chemicals';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'WD-40', true),
      (v_cat_id, p_user_id, 'Silicone Sealant', true),
      (v_cat_id, p_user_id, 'Epoxy Resin', true),
      (v_cat_id, p_user_id, 'Super Glue', true),
      (v_cat_id, p_user_id, 'Threadlocker', true),
      (v_cat_id, p_user_id, 'Isopropyl Alcohol', true),
      (v_cat_id, p_user_id, 'Contact Cleaner', true),
      (v_cat_id, p_user_id, 'Bearing Grease', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 24. First Aid & Medicine Cabinet (Rose / Red)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'First Aid & Medicine Cabinet', '#DC2626', 24, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'First Aid & Medicine Cabinet';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Pain Relievers', true),
      (v_cat_id, p_user_id, 'Antiseptics', true),
      (v_cat_id, p_user_id, 'Bandages', true),
      (v_cat_id, p_user_id, 'Gauze Pads', true),
      (v_cat_id, p_user_id, 'Prescription Meds', true),
      (v_cat_id, p_user_id, 'Thermometers', true),
      (v_cat_id, p_user_id, 'Allergy Relief', true),
      (v_cat_id, p_user_id, 'Antacids', true),
      (v_cat_id, p_user_id, 'Burn Cream', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 25. Personal Grooming & Toiletries (Pink / Rose)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Personal Grooming & Toiletries', '#DB2777', 25, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Personal Grooming & Toiletries';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Body Wash', true),
      (v_cat_id, p_user_id, 'Bar Soap', true),
      (v_cat_id, p_user_id, 'Shampoo', true),
      (v_cat_id, p_user_id, 'Conditioner', true),
      (v_cat_id, p_user_id, 'Toothpaste', true),
      (v_cat_id, p_user_id, 'Toothbrush Heads', true),
      (v_cat_id, p_user_id, 'Deodorant', true),
      (v_cat_id, p_user_id, 'Razor Blades', true),
      (v_cat_id, p_user_id, 'Sunscreen', true),
      (v_cat_id, p_user_id, 'Moisturizer', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 26. Home Textiles & Linens (Indigo / Cyan)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Home Textiles & Linens', '#0284C7', 26, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Home Textiles & Linens';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Bed Sheets', true),
      (v_cat_id, p_user_id, 'Pillowcases', true),
      (v_cat_id, p_user_id, 'Blankets', true),
      (v_cat_id, p_user_id, 'Duvets', true),
      (v_cat_id, p_user_id, 'Bath Towels', true),
      (v_cat_id, p_user_id, 'Hand Towels', true),
      (v_cat_id, p_user_id, 'Kitchen Towels', true),
      (v_cat_id, p_user_id, 'Mattress Protectors', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 27. Travel, Camping & Luggage (Amber / Emerald)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Travel, Camping & Luggage', '#D97706', 27, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Travel, Camping & Luggage';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Suitcases', true),
      (v_cat_id, p_user_id, 'Backpacks', true),
      (v_cat_id, p_user_id, 'Duffle Bags', true),
      (v_cat_id, p_user_id, 'Tents', true),
      (v_cat_id, p_user_id, 'Sleeping Bags', true),
      (v_cat_id, p_user_id, 'Camping Cookware', true),
      (v_cat_id, p_user_id, 'Flashlights', true),
      (v_cat_id, p_user_id, 'Dry Bags', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 28. Documents & Archival Media (Slate / Blue)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'homeops', 'Documents & Archival Media', '#475569', 28, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'homeops' and name = 'Documents & Archival Media';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Passports', true),
      (v_cat_id, p_user_id, 'National IDs', true),
      (v_cat_id, p_user_id, 'Property Deeds', true),
      (v_cat_id, p_user_id, 'Tax Returns', true),
      (v_cat_id, p_user_id, 'Vehicle Papers', true),
      (v_cat_id, p_user_id, 'Appliance Receipts', true),
      (v_cat_id, p_user_id, 'Backup Drives', true),
      (v_cat_id, p_user_id, 'M-DISC Media', true)
    on conflict (category_id, name) do nothing;
  end if;
end;
$$;

-- 3. Execute seeder across all existing user profiles
do $$
declare
  r record;
begin
  for r in (select id from public.profiles) loop
    perform public.seed_homeops_tags_for_user(r.id);
  end loop;
end $$;

-- 4. Grant execute permissions to authenticated role
grant execute on function public.seed_homeops_tags_for_user(bigint) to authenticated, service_role;
grant execute on function public.provision_feature_tag_categories(text) to authenticated, service_role;
