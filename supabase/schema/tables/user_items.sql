-- Table: public.user_items
-- User data table showcasing user-scoped data and custom sorting per user

create table if not exists public.user_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  status text not null default 'active' check (status in ('active', 'archived', 'draft')),
  
  -- Position index for user-defined drag-and-drop / custom sort ordering
  sort_order integer not null default 0,
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,

  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comments
comment on table public.user_items is 'User-scoped items demonstrating per-user sorting, pinning, and ordering.';
