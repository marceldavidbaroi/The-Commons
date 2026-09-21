-- ==============================================================================
-- The Commons: Development & Initial Data Seeder
-- Seeds default tag taxonomies and sample data for Goals, Diary, and Documents
-- ==============================================================================

-- 1. Helper function to seed feature tags for all existing profiles (or a specific user)
create or replace function public.seed_default_tags_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat_id bigint;
begin
  -- ----------------------------------------------------------------------------
  -- GOALS FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- 1. Domain Category (Indigo)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'goals', 'Domain', '#6366F1', 1, true)
  on conflict (user_id, feature, name) do update set color = excluded.color
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and name = 'Domain';
  end if;

  insert into public.tags (category_id, user_id, name)
  values 
    (v_cat_id, p_user_id, 'Civic & Guild'),
    (v_cat_id, p_user_id, 'Knowledge & Craft'),
    (v_cat_id, p_user_id, 'Health & Vitality'),
    (v_cat_id, p_user_id, 'Finance & Capital'),
    (v_cat_id, p_user_id, 'Home & Hearth'),
    (v_cat_id, p_user_id, 'Creative & Venture')
  on conflict (category_id, name) do nothing;

  -- 2. Energy & Bandwidth Category (Emerald)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'goals', 'Energy & Bandwidth', '#10B981', 2, true)
  on conflict (user_id, feature, name) do update set color = excluded.color
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and name = 'Energy & Bandwidth';
  end if;

  insert into public.tags (category_id, user_id, name)
  values 
    (v_cat_id, p_user_id, 'Deep Focus'),
    (v_cat_id, p_user_id, 'Quick Win'),
    (v_cat_id, p_user_id, 'Administrative'),
    (v_cat_id, p_user_id, 'Collaborative')
  on conflict (category_id, name) do nothing;

  -- 3. Impact & Leverage Category (Amber)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'goals', 'Impact & Leverage', '#F59E0B', 3, true)
  on conflict (user_id, feature, name) do update set color = excluded.color
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and name = 'Impact & Leverage';
  end if;

  insert into public.tags (category_id, user_id, name)
  values 
    (v_cat_id, p_user_id, 'High Leverage'),
    (v_cat_id, p_user_id, 'Foundational / Enabler'),
    (v_cat_id, p_user_id, 'Maintenance')
  on conflict (category_id, name) do nothing;

  -- 4. Horizon & Cycle Category (Sky)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'goals', 'Horizon & Cycle', '#0EA5E9', 4, true)
  on conflict (user_id, feature, name) do update set color = excluded.color
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and name = 'Horizon & Cycle';
  end if;

  insert into public.tags (category_id, user_id, name)
  values 
    (v_cat_id, p_user_id, 'Immediate Focus'),
    (v_cat_id, p_user_id, 'Quarterly Milestone'),
    (v_cat_id, p_user_id, 'Long-term Horizon')
  on conflict (category_id, name) do nothing;

  -- 5. Execution Archetype Category (Violet)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'goals', 'Execution Archetype', '#8B5CF6', 5, true)
  on conflict (user_id, feature, name) do update set color = excluded.color
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and name = 'Execution Archetype';
  end if;

  insert into public.tags (category_id, user_id, name)
  values 
    (v_cat_id, p_user_id, 'Project Deliverable'),
    (v_cat_id, p_user_id, 'Ritual & Habit'),
    (v_cat_id, p_user_id, 'Research & Discovery')
  on conflict (category_id, name) do nothing;

  -- ----------------------------------------------------------------------------
  -- DIARY FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- Context (Blue)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'diary', 'Context', '#3B82F6', 1, true)
  on conflict (user_id, feature, name) do nothing
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'diary' and name = 'Context';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name)
    values 
      (v_cat_id, p_user_id, 'Deep Work'),
      (v_cat_id, p_user_id, 'Reflections'),
      (v_cat_id, p_user_id, 'Planning')
    on conflict (category_id, name) do nothing;
  end if;

  -- Energy Level (Emerald)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'diary', 'Energy Level', '#10B981', 2, true)
  on conflict (user_id, feature, name) do nothing
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'diary' and name = 'Energy Level';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name)
    values 
      (v_cat_id, p_user_id, 'High Vitality'),
      (v_cat_id, p_user_id, 'Medium Vitality'),
      (v_cat_id, p_user_id, 'Rest & Recovery')
    on conflict (category_id, name) do nothing;
  end if;

  -- ----------------------------------------------------------------------------
  -- DOCUMENT FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- Department (Violet)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'document', 'Department', '#8B5CF6', 1, true)
  on conflict (user_id, feature, name) do nothing
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'document' and name = 'Department';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name)
    values 
      (v_cat_id, p_user_id, 'Engineering'),
      (v_cat_id, p_user_id, 'Research'),
      (v_cat_id, p_user_id, 'Governance')
    on conflict (category_id, name) do nothing;
  end if;

  -- Document Type (Amber)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'document', 'Document Type', '#F59E0B', 2, true)
  on conflict (user_id, feature, name) do nothing
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'document' and name = 'Document Type';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name)
    values 
      (v_cat_id, p_user_id, 'Report'),
      (v_cat_id, p_user_id, 'Charter'),
      (v_cat_id, p_user_id, 'Dispatch')
    on conflict (category_id, name) do nothing;
  end if;
end;
$$;

-- 2. Execute seeder across all existing profiles
do $$
declare
  r record;
begin
  for r in (select id from public.profiles) loop
    perform public.seed_default_tags_for_user(r.id);
  end loop;
end $$;
