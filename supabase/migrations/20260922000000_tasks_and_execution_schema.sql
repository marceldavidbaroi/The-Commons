-- Migration: 20260922000000_tasks_and_execution_schema.sql
-- Standalone Day-to-Day Task Ledger & Execution Architecture
-- Supports subtasks, status/priority matrix, day agenda scheduling, time tracking metrics, and Universal Tagging integration

-- ==============================================================================
-- 1. ENUMS FOR TASKS
-- ==============================================================================
do $$ begin
    create type public.task_status as enum (
        'todo', 
        'in_progress', 
        'completed', 
        'cancelled', 
        'deferred'
    );
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type public.task_priority as enum (
        'low', 
        'normal', 
        'high', 
        'urgent'
    );
exception
    when duplicate_object then null;
end $$;

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- 2.1 Tasks Table
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    parent_id uuid references public.tasks(id) on delete cascade,
    
    -- Content
    title varchar(255) not null,
    description text,
    status public.task_status not null default 'todo',
    priority public.task_priority not null default 'normal',
    
    -- Scheduling & Execution
    scheduled_date date,
    due_date timestamptz,
    completed_at timestamptz,
    
    time_estimate_minutes integer check (time_estimate_minutes is null or time_estimate_minutes >= 0),
    actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
    sort_order integer not null default 0,
    
    -- Auditing
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2.2 Task Tags Junction Table (Universal Tagging Integration)
create table if not exists public.task_tags (
    task_id uuid not null references public.tasks(id) on delete cascade,
    tag_id bigint not null references public.tags(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),

    primary key (task_id, tag_id)
);

-- Comments
comment on table public.tasks is 'Day-to-day actionable task ledger, checklists, and execution agenda.';
comment on table public.task_tags is 'Junction table associating universal tags with specific user tasks.';

-- ==============================================================================
-- 3. TRIGGERS (Updated At)
-- ==============================================================================
drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
    before update on public.tasks
    for each row
    execute function public.handle_updated_at();

-- ==============================================================================
-- 4. PERFORMANCE INDEXES
-- ==============================================================================
create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_parent_id on public.tasks(parent_id);
create index if not exists idx_tasks_user_scheduled on public.tasks(user_id, scheduled_date);
create index if not exists idx_tasks_user_status on public.tasks(user_id, status);
create index if not exists idx_tasks_user_priority on public.tasks(user_id, priority);
create index if not exists idx_tasks_created_at on public.tasks(user_id, created_at desc);

create index if not exists idx_task_tags_tag_id on public.task_tags(tag_id, user_id);
create index if not exists idx_task_tags_user_id on public.task_tags(user_id);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.tasks enable row level security;
alter table public.task_tags enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can delete own tasks" on public.tasks;

drop policy if exists "Users can view own task tags" on public.task_tags;
drop policy if exists "Users can insert own task tags" on public.task_tags;
drop policy if exists "Users can delete own task tags" on public.task_tags;

-- Tasks Policies (Strict Tenant Isolation, wrap auth.uid() in SELECT for performance)
create policy "Users can view own tasks"
    on public.tasks for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can insert own tasks"
    on public.tasks for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can update own tasks"
    on public.tasks for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

create policy "Users can delete own tasks"
    on public.tasks for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- Task Tags Junction Policies
create policy "Users can view own task tags"
    on public.task_tags for select
    to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can insert own task tags"
    on public.task_tags for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create policy "Users can delete own task tags"
    on public.task_tags for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- ==============================================================================
-- 6. EXTEND PROVISION FEATURE TAG CATEGORIES RPC FOR TASKS
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

    elsif p_feature = 'tasks' then
      -- 1. Context Category (Blue)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'tasks', 'Context', '#3B82F6', 1, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'tasks' and name = 'Context';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Desk'),
          (v_cat_id, v_user_id, 'Call'),
          (v_cat_id, v_user_id, 'Errand'),
          (v_cat_id, v_user_id, 'Terminal')
        on conflict (category_id, name) do nothing;
      end if;

      -- 2. Energy & Focus Category (Emerald)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'tasks', 'Energy & Focus', '#10B981', 2, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'tasks' and name = 'Energy & Focus';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Deep Focus'),
          (v_cat_id, v_user_id, 'Quick Win'),
          (v_cat_id, v_user_id, 'Administrative')
        on conflict (category_id, name) do nothing;
      end if;

      -- 3. Domain Category (Violet)
      insert into public.tag_categories (user_id, feature, name, color, display_order, is_system)
      values (v_user_id, 'tasks', 'Domain', '#8B5CF6', 3, true)
      on conflict (user_id, feature, name) do nothing
      returning id into v_cat_id;

      if v_cat_id is null then
        select id into v_cat_id from public.tag_categories where user_id = v_user_id and feature = 'tasks' and name = 'Domain';
      end if;

      if v_cat_id is not null then
        insert into public.tags (category_id, user_id, name)
        values 
          (v_cat_id, v_user_id, 'Work'),
          (v_cat_id, v_user_id, 'Personal'),
          (v_cat_id, v_user_id, 'Civic'),
          (v_cat_id, v_user_id, 'Health')
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
