-- Drop legacy task tables, foreign keys, triggers, policies, types, and task RPCs
-- 1. Drop task triggers if exist
drop trigger if exists set_tasks_updated_at on public.tasks;

-- 2. Drop legacy tables (cascades foreign keys, constraints, and RLS policies)
drop table if exists public.task_tags cascade;
drop table if exists public.tasks cascade;

-- 3. Drop legacy enum types if exist
drop type if exists public.task_status cascade;
drop type if exists public.task_priority cascade;

-- 4. Clean up legacy tag categories, tags, and tag groups scoped to 'tasks'
delete from public.tags
where category_id in (
  select id from public.tag_categories where feature = 'tasks'
);

delete from public.tag_categories
where feature = 'tasks';

delete from public.tag_groups
where feature = 'tasks';

-- 5. Update provision_feature_tag_categories to remove legacy 'tasks' provisioning branch
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

    elsif p_feature = 'homeops' or p_feature = 'inventory' then
      perform public.seed_homeops_tags_for_user(v_profile_id);
    end if;

    return jsonb_build_object('success', true, 'provisioned', true, 'feature', p_feature);
  end if;

  return jsonb_build_object('success', true, 'provisioned', false, 'feature', p_feature, 'message', 'Categories already exist');
end;
$$;

grant execute on function public.provision_feature_tag_categories(text) to authenticated, service_role;
