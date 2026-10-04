-- ==============================================================================
-- The Commons: Development & Initial Data Seeder (Integer ID Compatible)
-- Seeds default tag taxonomies and sample data for Goals, Diary, and Documents
-- ==============================================================================

-- 1. Helper function to seed feature tags for all existing profiles (or a specific user)
create or replace function public.seed_default_tags_for_user(p_user_id bigint)
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

  insert into public.tags (category_id, user_id, name, is_system)
  values 
    (v_cat_id, p_user_id, 'Civic & Guild', true),
    (v_cat_id, p_user_id, 'Knowledge & Craft', true),
    (v_cat_id, p_user_id, 'Health & Vitality', true),
    (v_cat_id, p_user_id, 'Finance & Capital', true),
    (v_cat_id, p_user_id, 'Home & Hearth', true),
    (v_cat_id, p_user_id, 'Creative & Venture', true)
  on conflict (category_id, name) do nothing;

  -- 2. Energy & Bandwidth Category (Emerald)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'goals', 'Energy & Bandwidth', '#10B981', 2, true)
  on conflict (user_id, feature, name) do update set color = excluded.color
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and name = 'Energy & Bandwidth';
  end if;

  insert into public.tags (category_id, user_id, name, is_system)
  values 
    (v_cat_id, p_user_id, 'Deep Focus', true),
    (v_cat_id, p_user_id, 'Quick Win', true),
    (v_cat_id, p_user_id, 'Administrative', true),
    (v_cat_id, p_user_id, 'Collaborative', true)
  on conflict (category_id, name) do nothing;

  -- 3. Impact & Leverage Category (Amber)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'goals', 'Impact & Leverage', '#F59E0B', 3, true)
  on conflict (user_id, feature, name) do update set color = excluded.color
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and name = 'Impact & Leverage';
  end if;

  insert into public.tags (category_id, user_id, name, is_system)
  values 
    (v_cat_id, p_user_id, 'High Leverage', true),
    (v_cat_id, p_user_id, 'Foundational / Enabler', true),
    (v_cat_id, p_user_id, 'Maintenance', true)
  on conflict (category_id, name) do nothing;

  -- 4. Horizon & Cycle Category (Sky)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'goals', 'Horizon & Cycle', '#0EA5E9', 4, true)
  on conflict (user_id, feature, name) do update set color = excluded.color
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and name = 'Horizon & Cycle';
  end if;

  insert into public.tags (category_id, user_id, name, is_system)
  values 
    (v_cat_id, p_user_id, 'Immediate Focus', true),
    (v_cat_id, p_user_id, 'Quarterly Milestone', true),
    (v_cat_id, p_user_id, 'Long-term Horizon', true)
  on conflict (category_id, name) do nothing;

  -- 5. Execution Archetype Category (Violet)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'goals', 'Execution Archetype', '#8B5CF6', 5, true)
  on conflict (user_id, feature, name) do update set color = excluded.color
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and name = 'Execution Archetype';
  end if;

  insert into public.tags (category_id, user_id, name, is_system)
  values 
    (v_cat_id, p_user_id, 'Project Deliverable', true),
    (v_cat_id, p_user_id, 'Ritual & Habit', true),
    (v_cat_id, p_user_id, 'Research & Discovery', true)
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
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Deep Work', true),
      (v_cat_id, p_user_id, 'Reflections', true),
      (v_cat_id, p_user_id, 'Planning', true)
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
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'High Vitality', true),
      (v_cat_id, p_user_id, 'Medium Vitality', true),
      (v_cat_id, p_user_id, 'Rest & Recovery', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- ----------------------------------------------------------------------------
  -- TASKS FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- 1. Life Area (Indigo)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'tasks', 'Life Area', '#6366F1', 1, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'tasks' and name = 'Life Area';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Projects', true),
      (v_cat_id, p_user_id, 'Chores', true),
      (v_cat_id, p_user_id, 'Market & Shopping', true),
      (v_cat_id, p_user_id, 'Personal Care', true),
      (v_cat_id, p_user_id, 'Finance & Bills', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 2. Effort & Pace (Emerald)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'tasks', 'Effort & Pace', '#10B981', 2, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'tasks' and name = 'Effort & Pace';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Quick (<15m)', true),
      (v_cat_id, p_user_id, 'Deep Focus', true),
      (v_cat_id, p_user_id, 'Routine / Habit', true)
    on conflict (category_id, name) do nothing;
  end if;

  -- 3. Context / Location (Sky)
  insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
  values (p_user_id, 'tasks', 'Context / Location', '#0EA5E9', 3, true)
  on conflict (user_id, feature, name) do update set color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'tasks' and name = 'Context / Location';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Home', true),
      (v_cat_id, p_user_id, 'Work & Desk', true),
      (v_cat_id, p_user_id, 'Out & Errands', true),
      (v_cat_id, p_user_id, 'Online / Calls', true)
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
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Engineering', true),
      (v_cat_id, p_user_id, 'Research', true),
      (v_cat_id, p_user_id, 'Governance', true)
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
    insert into public.tags (category_id, user_id, name, is_system)
    values 
      (v_cat_id, p_user_id, 'Report', true),
      (v_cat_id, p_user_id, 'Charter', true),
      (v_cat_id, p_user_id, 'Dispatch', true)
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

-- 3. Seed System Administrator & Allowed Member: marceldavidbaroi@gmail.com
do $$
declare
  v_admin_email text := 'marceldavidbaroi@gmail.com';
  v_auth_user_id uuid;
  v_profile_id bigint;
begin
  -- 1. Check if auth user exists for this email
  select id into v_auth_user_id from auth.users where email = v_admin_email;

  -- 2. If profile exists, ensure role is admin
  if exists (select 1 from public.profiles where email = v_admin_email) then
    update public.profiles
    set 
      role = 'admin',
      auth_user_id = coalesce(auth_user_id, v_auth_user_id),
      updated_at = now()
    where email = v_admin_email
    returning id into v_profile_id;
  else
    insert into public.profiles (auth_user_id, email, full_name, role)
    values (v_auth_user_id, v_admin_email, 'Marcel David Baroi', 'admin')
    on conflict (email) do update set role = 'admin', updated_at = now()
    returning id into v_profile_id;
  end if;

  -- 3. Ensure email is also whitelisted in allowed_members table
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' and table_name = 'allowed_members'
  ) then
    insert into public.allowed_members (email, status, notes, added_by)
    values (v_admin_email, 'active', 'System Administrator', v_profile_id)
    on conflict (email) do update set status = 'active', notes = 'System Administrator', updated_at = now();
  end if;
end $$;
