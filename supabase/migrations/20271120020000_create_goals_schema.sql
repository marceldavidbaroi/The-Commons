-- Goals Module Schema: 5 tables, indexes, updated_at trigger, summary view, and RLS policies

-- 1. Tables
create table public.goals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  north_star text,
  final_outcome text,
  start_date date,
  target_end_date date,
  weekly_hours_budget numeric(4,1),
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id bigint generated always as identity primary key,
  goal_id bigint not null references public.goals(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  start_date date,
  due_date date,
  status text not null default 'locked' check (status in ('locked', 'in_progress', 'passed', 'slipped')),
  passed_at timestamptz,
  retrospective_note text
);

create table public.definition_of_done_items (
  id bigint generated always as identity primary key,
  goal_id bigint not null references public.goals(id) on delete cascade,
  milestone_id bigint references public.milestones(id) on delete cascade,
  criterion text not null,
  sort_order integer not null default 0
);

create table public.goal_modules (
  id bigint generated always as identity primary key,
  milestone_id bigint not null references public.milestones(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'deferred'))
);

create table public.goal_tasks (
  id bigint generated always as identity primary key,
  module_id bigint not null references public.goal_modules(id) on delete cascade,
  title text not null,
  acceptance_note text,
  estimated_minutes integer not null default 60 check (estimated_minutes between 15 and 240),
  actual_minutes integer default 0,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cut')),
  due_date date,
  completed_at timestamptz,
  sort_order integer not null default 0
);

-- 2. updated_at trigger on goals
create or replace function public.set_goals_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_goals_updated_at
  before update on public.goals
  for each row
  execute function public.set_goals_updated_at();

-- 3. Composite keyset-pagination & ordering indexes
create index idx_goals_user_created_id
  on public.goals (user_id, created_at desc, id desc);

create index idx_milestones_goal_sort_id
  on public.milestones (goal_id, sort_order asc, id asc);

create index idx_dod_items_goal_milestone_sort_id
  on public.definition_of_done_items (goal_id, milestone_id, sort_order asc, id asc);

create index idx_goal_modules_milestone_sort_id
  on public.goal_modules (milestone_id, sort_order asc, id asc);

create index idx_goal_tasks_module_sort_id
  on public.goal_tasks (module_id, sort_order asc, id asc);

-- 4. Summary View for /goals directory
create or replace view public.goal_summaries
with (security_invoker = true) as
select
  g.id,
  g.user_id,
  g.title,
  g.north_star,
  g.start_date,
  g.target_end_date,
  g.weekly_hours_budget,
  g.status,
  g.created_at,
  g.updated_at,
  count(m.id)::integer as total_milestones,
  count(m.id) filter (where m.status = 'passed')::integer as passed_milestones
from public.goals g
left join public.milestones m on m.goal_id = g.id
group by g.id;

-- 5. Row Level Security
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.definition_of_done_items enable row level security;
alter table public.goal_modules enable row level security;
alter table public.goal_tasks enable row level security;

-- goals policies
create policy "goals_select_own"
  on public.goals for select
  using ((select auth.uid()) = user_id);

create policy "goals_insert_own"
  on public.goals for insert
  with check ((select auth.uid()) = user_id);

create policy "goals_update_own"
  on public.goals for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "goals_delete_own"
  on public.goals for delete
  using ((select auth.uid()) = user_id);

-- milestones policies
create policy "milestones_select_own"
  on public.milestones for select
  using (
    exists (
      select 1 from public.goals g
      where g.id = milestones.goal_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "milestones_insert_own"
  on public.milestones for insert
  with check (
    exists (
      select 1 from public.goals g
      where g.id = milestones.goal_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "milestones_update_own"
  on public.milestones for update
  using (
    exists (
      select 1 from public.goals g
      where g.id = milestones.goal_id
        and g.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.goals g
      where g.id = milestones.goal_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "milestones_delete_own"
  on public.milestones for delete
  using (
    exists (
      select 1 from public.goals g
      where g.id = milestones.goal_id
        and g.user_id = (select auth.uid())
    )
  );

-- definition_of_done_items policies
create policy "dod_items_select_own"
  on public.definition_of_done_items for select
  using (
    exists (
      select 1 from public.goals g
      where g.id = definition_of_done_items.goal_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "dod_items_insert_own"
  on public.definition_of_done_items for insert
  with check (
    exists (
      select 1 from public.goals g
      where g.id = definition_of_done_items.goal_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "dod_items_update_own"
  on public.definition_of_done_items for update
  using (
    exists (
      select 1 from public.goals g
      where g.id = definition_of_done_items.goal_id
        and g.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.goals g
      where g.id = definition_of_done_items.goal_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "dod_items_delete_own"
  on public.definition_of_done_items for delete
  using (
    exists (
      select 1 from public.goals g
      where g.id = definition_of_done_items.goal_id
        and g.user_id = (select auth.uid())
    )
  );

-- goal_modules policies
create policy "goal_modules_select_own"
  on public.goal_modules for select
  using (
    exists (
      select 1 from public.milestones m
      join public.goals g on g.id = m.goal_id
      where m.id = goal_modules.milestone_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "goal_modules_insert_own"
  on public.goal_modules for insert
  with check (
    exists (
      select 1 from public.milestones m
      join public.goals g on g.id = m.goal_id
      where m.id = goal_modules.milestone_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "goal_modules_update_own"
  on public.goal_modules for update
  using (
    exists (
      select 1 from public.milestones m
      join public.goals g on g.id = m.goal_id
      where m.id = goal_modules.milestone_id
        and g.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.milestones m
      join public.goals g on g.id = m.goal_id
      where m.id = goal_modules.milestone_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "goal_modules_delete_own"
  on public.goal_modules for delete
  using (
    exists (
      select 1 from public.milestones m
      join public.goals g on g.id = m.goal_id
      where m.id = goal_modules.milestone_id
        and g.user_id = (select auth.uid())
    )
  );

-- goal_tasks policies
create policy "goal_tasks_select_own"
  on public.goal_tasks for select
  using (
    exists (
      select 1 from public.goal_modules gm
      join public.milestones m on m.id = gm.milestone_id
      join public.goals g on g.id = m.goal_id
      where gm.id = goal_tasks.module_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "goal_tasks_insert_own"
  on public.goal_tasks for insert
  with check (
    exists (
      select 1 from public.goal_modules gm
      join public.milestones m on m.id = gm.milestone_id
      join public.goals g on g.id = m.goal_id
      where gm.id = goal_tasks.module_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "goal_tasks_update_own"
  on public.goal_tasks for update
  using (
    exists (
      select 1 from public.goal_modules gm
      join public.milestones m on m.id = gm.milestone_id
      join public.goals g on g.id = m.goal_id
      where gm.id = goal_tasks.module_id
        and g.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.goal_modules gm
      join public.milestones m on m.id = gm.milestone_id
      join public.goals g on g.id = m.goal_id
      where gm.id = goal_tasks.module_id
        and g.user_id = (select auth.uid())
    )
  );

create policy "goal_tasks_delete_own"
  on public.goal_tasks for delete
  using (
    exists (
      select 1 from public.goal_modules gm
      join public.milestones m on m.id = gm.milestone_id
      join public.goals g on g.id = m.goal_id
      where gm.id = goal_tasks.module_id
        and g.user_id = (select auth.uid())
    )
  );
