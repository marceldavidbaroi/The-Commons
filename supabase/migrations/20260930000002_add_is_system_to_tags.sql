-- ==============================================================================
-- Migration: Add is_system Column to Tags Table and Enforce System Immutability
-- 1. Adds `is_system` (boolean not null default false) to public.tags
-- 2. Updates RLS policies so users can only UPDATE or DELETE their own NON-SYSTEM tags
-- 3. Marks existing system-seeded tags as `is_system = true`
-- 4. Updates `provision_feature_tag_categories` RPC to insert default tags with `is_system = true`
-- ==============================================================================

-- 1. Add column if it doesn't already exist
alter table public.tags 
add column if not exists is_system boolean not null default false;

-- 2. Update RLS policies on public.tags to prevent modifying or deleting system tags
drop policy if exists "Users can update own tags" on public.tags;
create policy "Users can update own tags"
  on public.tags for update
  to authenticated
  using ((select auth.uid()) = user_id and is_system = false)
  with check ((select auth.uid()) = user_id and is_system = false);

drop policy if exists "Users can delete own tags" on public.tags;
create policy "Users can delete own tags"
  on public.tags for delete
  to authenticated
  using ((select auth.uid()) = user_id and is_system = false);

-- 3. Update the provision_feature_tag_categories function with is_system = true for tags
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
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Deep Work', true),
          (v_cat_id, v_user_id, 'Reflections', true),
          (v_cat_id, v_user_id, 'Planning', true)
        on conflict (category_id, name) do nothing;
      end if;

      -- Energy Level category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'diary', 'Energy Level', '#10B981', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'High Vitality', true),
          (v_cat_id, v_user_id, 'Medium Vitality', true),
          (v_cat_id, v_user_id, 'Rest & Recovery', true)
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'document' then
      -- Department category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'document', 'Department', '#8B5CF6', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Engineering', true),
          (v_cat_id, v_user_id, 'Research', true),
          (v_cat_id, v_user_id, 'Governance', true)
        on conflict (category_id, name) do nothing;
      end if;

      -- Document Type category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'document', 'Document Type', '#F59E0B', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Report', true),
          (v_cat_id, v_user_id, 'Charter', true),
          (v_cat_id, v_user_id, 'Dispatch', true)
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'goals' then
      -- Domain category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Domain', '#6366F1', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Civic & Guild', true),
          (v_cat_id, v_user_id, 'Knowledge & Craft', true),
          (v_cat_id, v_user_id, 'Health & Vitality', true),
          (v_cat_id, v_user_id, 'Finance & Capital', true),
          (v_cat_id, v_user_id, 'Home & Hearth', true),
          (v_cat_id, v_user_id, 'Creative & Venture', true)
        on conflict (category_id, name) do nothing;
      end if;

      -- Energy & Bandwidth category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Energy & Bandwidth', '#10B981', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Deep Focus', true),
          (v_cat_id, v_user_id, 'Quick Win', true),
          (v_cat_id, v_user_id, 'Administrative', true),
          (v_cat_id, v_user_id, 'Collaborative', true)
        on conflict (category_id, name) do nothing;
      end if;

      -- Impact & Leverage category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Impact & Leverage', '#F59E0B', 3, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'High Leverage', true),
          (v_cat_id, v_user_id, 'Foundational / Enabler', true),
          (v_cat_id, v_user_id, 'Maintenance', true)
        on conflict (category_id, name) do nothing;
      end if;

      -- Horizon & Cycle category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Horizon & Cycle', '#0EA5E9', 4, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Immediate Focus', true),
          (v_cat_id, v_user_id, 'Quarterly Milestone', true),
          (v_cat_id, v_user_id, 'Long-term Horizon', true)
        on conflict (category_id, name) do nothing;
      end if;

      -- Execution Archetype category
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'goals', 'Execution Archetype', '#8B5CF6', 5, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Project Deliverable', true),
          (v_cat_id, v_user_id, 'Ritual & Habit', true),
          (v_cat_id, v_user_id, 'Research & Discovery', true)
        on conflict (category_id, name) do nothing;
      end if;

    elsif p_feature = 'tasks' then
      -- 1. Life Area (Indigo)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'tasks', 'Life Area', '#6366F1', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Projects', true),
          (v_cat_id, v_user_id, 'Chores', true),
          (v_cat_id, v_user_id, 'Market & Shopping', true),
          (v_cat_id, v_user_id, 'Personal Care', true),
          (v_cat_id, v_user_id, 'Finance & Bills', true)
        on conflict (category_id, name) do nothing;
      end if;

      -- 2. Effort & Pace (Emerald)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'tasks', 'Effort & Pace', '#10B981', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Quick (<15m)', true),
          (v_cat_id, v_user_id, 'Deep Focus', true),
          (v_cat_id, v_user_id, 'Routine / Habit', true)
        on conflict (category_id, name) do nothing;
      end if;

      -- 3. Context / Location (Sky)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'tasks', 'Context / Location', '#0EA5E9', 3, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name, is_system)
        values 
          (v_cat_id, v_user_id, 'Home', true),
          (v_cat_id, v_user_id, 'Work & Desk', true),
          (v_cat_id, v_user_id, 'Out & Errands', true),
          (v_cat_id, v_user_id, 'Online / Calls', true)
        on conflict (category_id, name) do nothing;
      end if;
    end if;

    return jsonb_build_object('success', true, 'provisioned', true, 'feature', p_feature);
  end if;

  return jsonb_build_object('success', true, 'provisioned', false, 'feature', p_feature);
end;
$$;

-- 4. Mark existing system-seeded tags as is_system = true across all profiles
update public.tags t
set is_system = true
from public.tag_categories tc
where t.category_id = tc.id
  and tc.is_system = true
  and t.name in (
    -- Diary
    'Deep Work', 'Reflections', 'Planning', 'High Vitality', 'Medium Vitality', 'Rest & Recovery',
    -- Documents
    'Engineering', 'Research', 'Governance', 'Report', 'Charter', 'Dispatch',
    -- Goals
    'Civic & Guild', 'Knowledge & Craft', 'Health & Vitality', 'Finance & Capital', 'Home & Hearth', 'Creative & Venture',
    'Deep Focus', 'Quick Win', 'Administrative', 'Collaborative',
    'High Leverage', 'Foundational / Enabler', 'Maintenance',
    'Immediate Focus', 'Quarterly Milestone', 'Long-term Horizon',
    'Project Deliverable', 'Ritual & Habit', 'Research & Discovery',
    -- Tasks
    'Projects', 'Chores', 'Market & Shopping', 'Personal Care', 'Finance & Bills',
    'Quick (<15m)', 'Routine / Habit',
    'Home', 'Work & Desk', 'Out & Errands', 'Online / Calls'
  );
