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
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Domain', 'domain', '#6366F1', 1, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'domain';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Civic & Guild', 'civic-guild', true),
    (v_cat_id, p_user_id, 'Knowledge & Craft', 'knowledge-craft', true),
    (v_cat_id, p_user_id, 'Health & Vitality', 'health-vitality', true),
    (v_cat_id, p_user_id, 'Finance & Capital', 'finance-capital', true),
    (v_cat_id, p_user_id, 'Home & Hearth', 'home-hearth', true),
    (v_cat_id, p_user_id, 'Creative & Venture', 'creative-venture', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- 2. Energy & Bandwidth Category (Emerald)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Energy & Bandwidth', 'energy-bandwidth', '#10B981', 2, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'energy-bandwidth';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Deep Focus', 'deep-focus', true),
    (v_cat_id, p_user_id, 'Quick Win', 'quick-win', true),
    (v_cat_id, p_user_id, 'Administrative', 'administrative', true),
    (v_cat_id, p_user_id, 'Collaborative', 'collaborative', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- 3. Impact & Leverage Category (Amber)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Impact & Leverage', 'impact-leverage', '#F59E0B', 3, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'impact-leverage';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'High Leverage', 'high-leverage', true),
    (v_cat_id, p_user_id, 'Foundational / Enabler', 'foundational-enabler', true),
    (v_cat_id, p_user_id, 'Maintenance', 'maintenance', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- 4. Horizon & Cycle Category (Sky)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Horizon & Cycle', 'horizon-cycle', '#0EA5E9', 4, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'horizon-cycle';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Immediate Focus', 'immediate-focus', true),
    (v_cat_id, p_user_id, 'Quarterly Milestone', 'quarterly-milestone', true),
    (v_cat_id, p_user_id, 'Long-term Horizon', 'long-term-horizon', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- 5. Execution Archetype Category (Violet)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'goals', 'Execution Archetype', 'execution-archetype', '#8B5CF6', 5, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'goals' and slug = 'execution-archetype';
  end if;

  insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Project Deliverable', 'project-deliverable', true),
    (v_cat_id, p_user_id, 'Ritual & Habit', 'ritual-habit', true),
    (v_cat_id, p_user_id, 'Research & Discovery', 'research-discovery', true)
  on conflict (category_id, slug) do update set name = excluded.name;

  -- ----------------------------------------------------------------------------
  -- DIARY FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- Context (Blue)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'diary', 'Context', 'context', '#3B82F6', 1, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'diary' and slug = 'context';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Deep Work', 'deep-work', true),
    (v_cat_id, p_user_id, 'Reflections', 'reflections', true),
    (v_cat_id, p_user_id, 'Planning', 'planning', true)
  on conflict (category_id, slug) do update set name = excluded.name;
  end if;

  -- Energy Level (Emerald)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'diary', 'Energy Level', 'energy-level', '#10B981', 2, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'diary' and slug = 'energy-level';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'High Vitality', 'high-vitality', true),
    (v_cat_id, p_user_id, 'Medium Vitality', 'medium-vitality', true),
    (v_cat_id, p_user_id, 'Rest & Recovery', 'rest-recovery', true)
  on conflict (category_id, slug) do update set name = excluded.name;
  end if;

  -- ----------------------------------------------------------------------------
  -- DOCUMENT FEATURE TAGS
  -- ----------------------------------------------------------------------------
  
  -- Department (Violet)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'document', 'Department', 'department', '#8B5CF6', 1, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'document' and slug = 'department';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Engineering', 'engineering', true),
    (v_cat_id, p_user_id, 'Research', 'research', true),
    (v_cat_id, p_user_id, 'Governance', 'governance', true)
  on conflict (category_id, slug) do update set name = excluded.name;
  end if;

  -- Document Type (Amber)
  insert into public.tag_categories (user_id, feature, name, slug, color, display_order, is_system)
  values (p_user_id, 'document', 'Document Type', 'document-type', '#F59E0B', 2, true)
  on conflict (user_id, feature, slug) do update set name = excluded.name, color = excluded.color, display_order = excluded.display_order
  returning id into v_cat_id;

  if v_cat_id is null then
    select id into v_cat_id from public.tag_categories where user_id = p_user_id and feature = 'document' and slug = 'document-type';
  end if;

  if v_cat_id is not null then
    insert into public.tags (category_id, user_id, name, slug, is_system)
  values 
    (v_cat_id, p_user_id, 'Report', 'report', true),
    (v_cat_id, p_user_id, 'Charter', 'charter', true),
    (v_cat_id, p_user_id, 'Dispatch', 'dispatch', true)
  on conflict (category_id, slug) do update set name = excluded.name;
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
