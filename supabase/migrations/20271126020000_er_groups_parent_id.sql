-- Add hierarchical sub-group support to er_groups
alter table public.er_groups
  add column if not exists parent_id uuid references public.er_groups(id) on delete cascade;

create index if not exists idx_er_groups_parent
  on public.er_groups (diagram_id, parent_id, created_at desc, id desc);
