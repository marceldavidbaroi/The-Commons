-- ==============================================================================
-- Migration: Update System Tag Categories & Tags for Tasks
-- Updates the default system taxonomy for tasks to be daily-life and productivity oriented:
-- 1. Life Area (Projects, Chores, Market & Shopping, Personal Care, Finance & Bills)
-- 2. Effort & Pace (Quick (<15m), Deep Focus, Routine / Habit)
-- 3. Context / Location (Home, Work & Desk, Out & Errands, Online / Calls)
-- ==============================================================================

-- 1. Update the provision_feature_tag_categories function for new users
create or replace function public.provision_feature_tag_categories(p_feature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_count int;
  v_cat_id bigint;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'User not authenticated');
  end if;

  select count(*) into v_count
  from public.tag_categories
  where user_id = v_user_id and feature = p_feature;

  if v_count = 0 then
    if p_feature = 'diary' then
      -- Context category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'diary', 'Context', '#3B82F6', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;
      
      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Deep Work'),
          (v_cat_id, v_user_id, 'Reflections'),
          (v_cat_id, v_user_id, 'Planning')
        on conflict (category_id, name) do nothing;
      end if;

      -- Energy Level category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'diary', 'Energy Level', '#10B981', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'High Vitality'),
          (v_cat_id, v_user_id, 'Medium Vitality'),
          (v_cat_id, v_user_id, 'Rest & Recovery')
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'document' then
      -- Department category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'document', 'Department', '#8B5CF6', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Engineering'),
          (v_cat_id, v_user_id, 'Research'),
          (v_cat_id, v_user_id, 'Governance')
        on conflict (category_id, name) do nothing;
      end if;

      -- Document Type category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'document', 'Document Type', '#F59E0B', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Report'),
          (v_cat_id, v_user_id, 'Charter'),
          (v_cat_id, v_user_id, 'Dispatch')
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'goals' then
      -- 1. Domain Category (Indigo)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Domain', '#6366F1', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'goals' and name = 'Domain';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Civic & Guild'),
          (v_cat_id, v_user_id, 'Knowledge & Craft'),
          (v_cat_id, v_user_id, 'Health & Vitality'),
          (v_cat_id, v_user_id, 'Finance & Capital'),
          (v_cat_id, v_user_id, 'Home & Hearth'),
          (v_cat_id, v_user_id, 'Creative & Venture')
        on conflict (category_id, name) do nothing;
      end if;

      -- 2. Energy & Bandwidth Category (Emerald)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Energy & Bandwidth', '#10B981', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'goals' and name = 'Energy & Bandwidth';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Deep Focus'),
          (v_cat_id, v_user_id, 'Quick Win'),
          (v_cat_id, v_user_id, 'Administrative'),
          (v_cat_id, v_user_id, 'Collaborative')
        on conflict (category_id, name) do nothing;
      end if;

      -- 3. Impact & Leverage Category (Amber)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Impact & Leverage', '#F59E0B', 3, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'goals' and name = 'Impact & Leverage';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'High Leverage'),
          (v_cat_id, v_user_id, 'Foundational / Enabler'),
          (v_cat_id, v_user_id, 'Maintenance')
        on conflict (category_id, name) do nothing;
      end if;

      -- 4. Horizon & Cycle Category (Sky)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Horizon & Cycle', '#0EA5E9', 4, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'goals' and name = 'Horizon & Cycle';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Immediate Focus'),
          (v_cat_id, v_user_id, 'Quarterly Milestone'),
          (v_cat_id, v_user_id, 'Long-term Horizon')
        on conflict (category_id, name) do nothing;
      end if;

      -- 5. Execution Archetype Category (Violet)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Execution Archetype', '#8B5CF6', 5, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'goals' and name = 'Execution Archetype';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Project Deliverable'),
          (v_cat_id, v_user_id, 'Ritual & Habit'),
          (v_cat_id, v_user_id, 'Research & Discovery')
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'tasks' then
      -- 1. Life Area Category (Indigo)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'tasks', 'Life Area', '#6366F1', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'tasks' and name = 'Life Area';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Projects'),
          (v_cat_id, v_user_id, 'Chores'),
          (v_cat_id, v_user_id, 'Market & Shopping'),
          (v_cat_id, v_user_id, 'Personal Care'),
          (v_cat_id, v_user_id, 'Finance & Bills')
        on conflict (category_id, name) do nothing;
      end if;

      -- 2. Effort & Pace Category (Emerald)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'tasks', 'Effort & Pace', '#10B981', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'tasks' and name = 'Effort & Pace';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Quick (<15m)'),
          (v_cat_id, v_user_id, 'Deep Focus'),
          (v_cat_id, v_user_id, 'Routine / Habit')
        on conflict (category_id, name) do nothing;
      end if;

      -- 3. Context / Location Category (Sky)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'tasks', 'Context / Location', '#0EA5E9', 3, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'tasks' and name = 'Context / Location';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Home'),
          (v_cat_id, v_user_id, 'Work & Desk'),
          (v_cat_id, v_user_id, 'Out & Errands'),
          (v_cat_id, v_user_id, 'Online / Calls')
        on conflict (category_id, name) do nothing;
      end if;

    else
      -- Default custom category for other features
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, p_feature, 'General', '#6B7280', 1, false)
      on conflict (user_id, feature, name) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'feature', p_feature,
    'provisioned', (v_count = 0)
  );
end;
$$;

-- 2. Migrate existing users' task categories and tags
do $$
declare
  u record;
  v_cat_id bigint;
begin
  for u in select id from public.profiles loop
    -- Delete legacy system categories for tasks if they exist and are empty/system-managed
    -- Note: If we want to replace the old default categories 'Context', 'Energy & Focus', 'Domain' for tasks:
    -- 1. Life Area
    insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
    values (u.id, 'tasks', 'Life Area', '#6366F1', 1, true)
    on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
    returning id into v_cat_id;

    if v_cat_id is null then
      select id into v_cat_id from public.tag_categories where user_id = u.id and feature = 'tasks' and name = 'Life Area';
    end if;

    if v_cat_id is not null then
      insert into public.tags (category_id, user_id, name)
      values 
        (v_cat_id, u.id, 'Projects'),
        (v_cat_id, u.id, 'Chores'),
        (v_cat_id, u.id, 'Market & Shopping'),
        (v_cat_id, u.id, 'Personal Care'),
        (v_cat_id, u.id, 'Finance & Bills')
      on conflict (category_id, name) do nothing;
    end if;

    -- 2. Effort & Pace
    insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
    values (u.id, 'tasks', 'Effort & Pace', '#10B981', 2, true)
    on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
    returning id into v_cat_id;

    if v_cat_id is null then
      select id into v_cat_id from public.tag_categories where user_id = u.id and feature = 'tasks' and name = 'Effort & Pace';
    end if;

    if v_cat_id is not null then
      insert into public.tags (category_id, user_id, name)
      values 
        (v_cat_id, u.id, 'Quick (<15m)'),
        (v_cat_id, u.id, 'Deep Focus'),
        (v_cat_id, u.id, 'Routine / Habit')
      on conflict (category_id, name) do nothing;
    end if;

    -- 3. Context / Location
    insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
    values (u.id, 'tasks', 'Context / Location', '#0EA5E9', 3, true)
    on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
    returning id into v_cat_id;

    if v_cat_id is null then
      select id into v_cat_id from public.tag_categories where user_id = u.id and feature = 'tasks' and name = 'Context / Location';
    end if;

    if v_cat_id is not null then
      insert into public.tags (category_id, user_id, name)
      values 
        (v_cat_id, u.id, 'Home'),
        (v_cat_id, u.id, 'Work & Desk'),
        (v_cat_id, u.id, 'Out & Errands'),
        (v_cat_id, u.id, 'Online / Calls')
      on conflict (category_id, name) do nothing;
    end if;
  end loop;
end $$;
