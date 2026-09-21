-- Migration: 20260921000000_goals_and_objectives_schema.sql
-- Archival-Grade Goals & Objectives Ledger Schema
-- Supports recursive hierarchies, status/priority matrices, lifecycle auditing, and Universal Tagging integration

-- ==============================================================================
-- 1. ENUMS FOR GOALS
-- ==============================================================================
do $$ begin
    create type public.goal_type as enum (
        'daily', 
        'weekly', 
        'monthly', 
        'quarterly', 
        'yearly', 
        'milestone', 
        'habit'
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.goal_status as enum (
        'draft', 
        'pending', 
        'in_progress', 
        'completed', 
        'cancelled', 
        'deferred'
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.goal_priority as enum (
        'low', 
        'normal', 
        'high', 
        'critical'
    );
exception
    when duplicate_object then null;
end $$;

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- 2.1 Goals Table
create table if not exists public.goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    parent_id uuid references public.goals(id) on delete cascade,
    
    -- Core fields
    title varchar(255) not null,
    description text,
    type public.goal_type not null default 'daily',
    status public.goal_status not null default 'draft',
    priority public.goal_priority not null default 'normal',
    
    -- Scheduling & Lifecycle
    start_date timestamptz,
    due_date timestamptz,
    achieved_at timestamptz,
    cancelled_at timestamptz,
    cancel_reason text,
    
    -- Metadata & Auditing
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2.2 Goal Tags Junction Table (Universal Tagging Integration)
create table if not exists public.goal_tags (
    goal_id uuid not null references public.goals(id) on delete cascade,
    tag_id bigint not null references public.tags(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),

    primary key (goal_id, tag_id)
);

-- Comments
comment on table public.goals is 'Hierarchical archival goals, objectives, milestones, and habit directives.';
comment on table public.goal_tags is 'Junction table associating universal tags with specific user goals.';

-- ==============================================================================
-- 3. TRIGGERS (Updated At)
-- ==============================================================================
drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
    before update on public.goals
    for each row
    execute function public.handle_updated_at();

-- ==============================================================================
-- 4. PERFORMANCE INDEXES
-- ==============================================================================
create index if not exists idx_goals_user_id on public.goals(user_id);
create index if not exists idx_goals_parent_id on public.goals(parent_id);
create index if not exists idx_goals_status_due on public.goals(status, due_date);
create index if not exists idx_goals_priority on public.goals(user_id, priority);
create index if not exists idx_goals_type on public.goals(user_id, type);
create index if not exists idx_goals_created_at on public.goals(user_id, created_at desc);

create index if not exists idx_goal_tags_tag_id on public.goal_tags(tag_id, user_id);
create index if not exists idx_goal_tags_user_id on public.goal_tags(user_id);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.goals enable row level security;
alter table public.goal_tags enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can view own goals" on public.goals;
drop policy if exists "Users can insert own goals" on public.goals;
drop policy if exists "Users can update own goals" on public.goals;
drop policy if exists "Users can delete own goals" on public.goals;

drop policy if exists "Users can view own goal tags" on public.goal_tags;
drop policy if exists "Users can insert own goal tags" on public.goal_tags;
drop policy if exists "Users can delete own goal tags" on public.goal_tags;

-- Goals Policies (Strict Tenant Isolation)
create policy "Users can view own goals"
    on public.goals for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can insert own goals"
    on public.goals for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can update own goals"
    on public.goals for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users can delete own goals"
    on public.goals for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- Goal Tags Junction Policies
create policy "Users can view own goal tags"
    on public.goal_tags for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can insert own goal tags"
    on public.goal_tags for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can delete own goal tags"
    on public.goal_tags for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- ==============================================================================
-- 6. EXTEND PROVISION FEATURE TAG CATEGORIES RPC
-- ==============================================================================
create or replace function public.provision_feature_tag_categories(p_feature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cat_id bigint;
  v_count int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check if user already has categories for this feature
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
