# Data Model: Daily Diary & Journal Entries

## 1. Database Schema (PostgreSQL / Supabase)

### Table: `public.diaries`
```sql
create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

-- Indexes
create index idx_diaries_user_sort on public.diaries (user_id, is_favorite desc, sort_order asc, created_at desc);

-- RLS
alter table public.diaries enable row level security;

create policy "Users can view own diaries" on public.diaries for select using (auth.uid() = user_id);
create policy "Users can insert own diaries" on public.diaries for insert with check (auth.uid() = user_id);
create policy "Users can update own diaries" on public.diaries for update using (auth.uid() = user_id);
create policy "Users can delete own diaries" on public.diaries for delete using (auth.uid() = user_id);
```

### Table: `public.diary_entries`
```sql
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  page_number integer not null default 1,
  entry_date date not null default current_date,
  date_str text not null,
  day_of_week text not null,
  year_str text not null,
  title text not null default '',
  description text not null default '',
  gratitude text[] not null default array['', '', '']::text[],
  energy_level integer not null default 3 check (energy_level between 1 and 5),
  start_time text default '09:00',
  end_time text default '17:00',
  mood text not null default '🌿 Calm',
  weather text not null default 'sunny',
  is_hearted boolean not null default false,
  tags text[] not null default '{}',
  word_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint unique_diary_page_number unique (diary_id, page_number)
);

-- Indexes
create index idx_diary_entries_diary_page on public.diary_entries (diary_id, page_number desc);
create index idx_diary_entries_user_date on public.diary_entries (user_id, entry_date desc);
create index idx_diary_entries_tags on public.diary_entries using gin (tags);

-- RLS
alter table public.diary_entries enable row level security;

create policy "Users can view own entries" on public.diary_entries for select using (auth.uid() = user_id);
create policy "Users can insert own entries" on public.diary_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own entries" on public.diary_entries for update using (auth.uid() = user_id);
create policy "Users can delete own entries" on public.diary_entries for delete using (auth.uid() = user_id);
```

## 2. Zod Validation Schemas
```typescript
import { z } from "zod";

export const diarySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(280).optional(),
  theme: z.enum(["vintage", "classic", "modern"]).default("vintage"),
  coverColor: z.string().default("#8C3A27"),
});

export const diaryEntrySchema = z.object({
  diaryId: z.string().uuid(),
  title: z.string().max(140),
  description: z.string(),
  gratitude: z.tuple([z.string(), z.string(), z.string()]),
  energyLevel: z.number().int().min(1).max(5),
  mood: z.string(),
  weather: z.string(),
  isHearted: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export type CreateDiaryInput = z.infer<typeof diarySchema>;
export type CreateEntryInput = z.infer<typeof diaryEntrySchema>;
```
