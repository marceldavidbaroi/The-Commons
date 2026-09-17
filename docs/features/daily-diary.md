# Feature: Daily Diary & Multi-Tome Journaling

## Overview
The **Daily Diary** system provides members of *The Commons* with a mindful, tactile sanctuary for daily journaling, reflections, mood tracking, and vitality logging. 

Users can maintain multiple styled journal tomes (e.g. vintage antiquarian codex, mid-century clothbound ledger, or modern minimalist studio notebook) and record sequential daily pages with rich metadata (3-item gratitude rituals, vitality energy scores, weather, timestamps, tags, and favorites).

---

## 🎨 Themes & Visual Aesthetics

The diary system supports three visual presentation themes mapped directly to CSS themes and SVG book cover renderers:

| Theme ID | Display Name | Subtitle & Aesthetic | Cover Palette |
| :--- | :--- | :--- | :--- |
| `vintage` | **Old Book** | Aged parchment, walnut ink, deckled torn edges, wax seals | `#8C3A27` (Terra cotta / walnut) |
| `classic` | **Classic Notebook** | Mid-century clothbound ledger, navy fountain ink, gold corners, ivory ruled lines | `#1E3A5F` (Navy cloth / gold) |
| `modern` | **Modern Book** | Matte minimalist studio chronicle, contemporary pill chips, ambient dark glow | `#172330` (Matte slate / cyan) |

---

## 📱 Page Architecture & Routing

| Route | Purpose | Store / State Key |
| :--- | :--- | :--- |
| `/my-diaries` | Tome collection gallery, 3D interactive book covers, new diary creation modal. | `diaries`, `activeDiaryId` |
| `/my-diaries/[diaryId]` | Page index table of contents, search, mood filters, and page creation. | `activeDiaryId`, `entries` |
| `/my-diaries/[diaryId]/pages/[entryId]` | Two-page tactile open-book reader and editor with live ink autosave. | `currentEntryId`, `currentPageIndex` |
| `/daily-diary` | Fast redirect to the user's active / latest daily journal page. | `currentEntryId` |
| `/daily-diary/[id]` | Direct entry canvas by entry ID or sequential page number. | `currentEntryId` |

---

## 🗄️ PostgreSQL Database Schema

### 1. Table: `public.diaries`
Stores the user-scoped journal tome containers.

```sql
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
```

### 2. Table: `public.diary_entries`
Stores individual pages and reflections inside a diary.

```sql
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diaries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  page_number integer not null default 1,
  entry_date date not null default current_date,
  date_str text not null,                                       -- e.g. "September 16"
  day_of_week text not null,                                    -- e.g. "Tuesday"
  year_str text not null,                                       -- e.g. "Anno 2026"
  title text not null default '',
  description text not null default '',                         -- Journal reflection content
  gratitude text[] not null default array['', '', '']::text[],  -- 3 daily gratitude items
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

  -- Unique page number per diary
  constraint unique_diary_page_number unique (diary_id, page_number)
);
```

---

## 🔒 Row Level Security (RLS)

Strict user isolation is enforced on both tables. Users can only access, create, mutate, or delete their own diaries and entries:

```sql
alter table public.diaries enable row level security;
alter table public.diary_entries enable row level security;

-- Diaries Policies
create policy "Users can view their own diaries"
  on public.diaries for select using (auth.uid() = user_id);

create policy "Users can insert their own diaries"
  on public.diaries for insert with check (auth.uid() = user_id);

create policy "Users can update their own diaries"
  on public.diaries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own diaries"
  on public.diaries for delete using (auth.uid() = user_id);

-- Diary Entries Policies
create policy "Users can view their own diary entries"
  on public.diary_entries for select using (auth.uid() = user_id);

create policy "Users can insert their own diary entries"
  on public.diary_entries for insert with check (auth.uid() = user_id);

create policy "Users can update their own diary entries"
  on public.diary_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own diary entries"
  on public.diary_entries for delete using (auth.uid() = user_id);
```

---

## ⚡ Stored Procedures & RPCs

### 1. `public.get_diary_stats(p_diary_id uuid default null)`
Calculates analytics including daily writing streaks, word counts, average vitality scores, mood breakdown, and tags:

- **Parameters**: `p_diary_id` (optional UUID to filter stats to a specific diary).
- **Security**: `security definer`, `set search_path = public`, granted to `authenticated`.
- **Response Format**:
```json
{
  "total_entries": 42,
  "total_words": 8620,
  "average_energy": 3.85,
  "hearted_entries": 12,
  "current_streak": 7,
  "longest_streak": 14,
  "mood_breakdown": {
    "🌿 Calm": 15,
    "✨ Inspired": 12,
    "🎯 Focused": 10,
    "☕ Cozy": 5
  },
  "tags": ["Architecture", "Reflection", "Deep Work", "Planning", "Craft"]
}
```

### 2. `public.get_user_diaries_overview()`
Returns all user diaries enriched with runtime aggregates (`entries_count`, `highest_page_number`, `latest_entry_date`), ordered by favorite status and user sort order.

- **Response Format**:
```json
[
  {
    "id": "b8f0607d-5a9e-4b77-a8a2-2b6d193d56ef",
    "name": "The Antiquarian Codex",
    "description": "Aged parchment, walnut ink reflections, and intimate morning thoughts.",
    "theme": "vintage",
    "cover_color": "#8C3A27",
    "is_favorite": true,
    "is_archived": false,
    "sort_order": 1,
    "entries_count": 142,
    "highest_page_number": 142,
    "latest_entry_date": "2026-09-17",
    "created_at": "2026-09-14T08:00:00Z",
    "updated_at": "2026-09-17T08:00:00Z"
  }
]
```

### 3. `public.reorder_diaries(p_diary_ids uuid[])`
Batch updates the `sort_order` sequence of the user's diaries based on drag-and-drop or custom sorting.

---

## ⚡ Performance & Indexes

- `idx_diaries_user_sort`: `(user_id, is_favorite desc, sort_order asc, created_at desc)` for instantaneous book gallery loading.
- `idx_diary_entries_diary_page`: `(diary_id, page_number desc)` for sequential book flipping and table of contents pagination.
- `idx_diary_entries_user_date`: `(user_id, entry_date desc)` for calendar heatmaps and activity feeds.
- `idx_diary_entries_tags`: GIN index on `tags` for tag search.
- `idx_diary_entries_user_hearted`: Partial index on `(user_id, is_hearted) where is_hearted = true` for favorites filtering.

---

## 💻 TypeScript Type Contract (`src/types/diary.ts`)

```typescript
export type DiaryTheme = "vintage" | "classic" | "modern";

export interface Diary {
  id: string;
  userId?: string;
  name: string;
  description: string;
  theme: DiaryTheme;
  coverColor?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry {
  id: string;
  diaryId: string;
  userId?: string;
  pageNumber: number;
  entryDate?: string;
  dateStr: string;
  dayOfWeek: string;
  yearStr: string;
  title: string;
  description: string;
  gratitude: [string, string, string];
  energyLevel: number; // 1 to 5
  startTime: string;
  endTime: string;
  mood: string;
  weather: string;
  isHearted: boolean;
  tags?: string[];
  wordCount?: number;
  createdAt: string;
  updatedAt?: string;
}
```
