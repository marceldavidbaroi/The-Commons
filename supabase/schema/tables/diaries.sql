-- Table: public.diaries
-- Stores user tome containers (vintage, classic, modern notebooks)

create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  theme text not null default 'vintage' check (theme in ('vintage', 'classic', 'modern')),
  cover_color text default '#8C3A27',
  is_favorite boolean not null default false,
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table & Column Documentation
comment on table public.diaries is 'User tome containers representing distinct journals with specific themes and styling.';
comment on column public.diaries.theme is 'Visual aesthetic theme: vintage (Old Book), classic (Notebook Ledger), or modern (Matte Studio).';
comment on column public.diaries.cover_color is 'Hex color code for the book spine and accent tones.';
