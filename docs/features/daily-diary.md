# Feature: Daily Diary

## Overview
The **Daily Diary** feature provides users with a distraction-free, mindful daily reflection and journaling space. It allows members of *The Commons* to capture thoughts, track moods, document milestones, and cultivate a consistent daily writing habit with streak analytics.

---

## 🎯 Key User Stories & Capabilities

1. **Daily Journaling Canvas**:
   - Clean, minimalist editor supporting markdown formatting.
   - Auto-saving draft state with debouncing.
   - Word count and estimated read time.

2. **Daily Prompts & Guided Reflections**:
   - Curated rotating prompts (e.g., *"What gave you energy today?"*, *"One thing you learned"*).
   - Ability to skip or refresh prompts.

3. **Mood & Energy Tracking**:
   - Daily mood selector (Joyful, Calm, Focused, Tired, Anxious, Neutral).
   - Energy rating scale (1–5).

4. **Timeline & Calendar Heatmap**:
   - GitHub-style annual/monthly writing heatmap.
   - Calendar date-picker to easily jump to past entries.
   - Current streak and longest streak counters.

5. **Tagging & Organization**:
   - Custom tags (`#gratitude`, `#work`, `#ideas`, `#health`).
   - Full-text search across past reflections.
   - Pinned / favorite reflections.

6. **Privacy & Security**:
   - Strict per-user isolation enforced via Supabase Row Level Security (RLS).
   - Entries are only viewable, editable, and deletable by the owner (`auth.uid() = user_id`).

---

## 🗄️ Proposed Database Schema

### Table: `public.diary_entries`

```sql
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null default current_date,
  title text,
  content text not null,
  mood text check (mood in ('great', 'good', 'neutral', 'low', 'tough')),
  energy_level integer check (energy_level between 1 and 5),
  tags text[] not null default '{}',
  prompt_question text,
  word_count integer not null default 0,
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Ensure one primary entry per date per user (or composite index)
  constraint unique_user_entry_date unique (user_id, entry_date)
);

-- RLS
alter table public.diary_entries enable row level security;

create policy "Users can manage their own diary entries"
  on public.diary_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for fast timeline queries and tag filtering
create index idx_diary_entries_user_date on public.diary_entries (user_id, entry_date desc);
create index idx_diary_entries_tags on public.diary_entries using gin (tags);
```

---

## ⚡ Proposed RPC Functions

### 1. `public.get_diary_stats()`
Calculates the user's active streak, total entries written, total word count, and monthly breakdown:
```sql
create or replace function public.get_diary_stats()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_total_entries integer;
  v_total_words integer;
  v_current_streak integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select count(*), coalesce(sum(word_count), 0)
  into v_total_entries, v_total_words
  from public.diary_entries
  where user_id = v_user_id;

  return jsonb_build_object(
    'total_entries', v_total_entries,
    'total_words', v_total_words,
    'current_streak', v_current_streak
  );
end;
$$;
```

---

## 🎨 UI / Component Architecture

| Component | Purpose |
| :--- | :--- |
| `DiaryEditor` | Minimalist writing canvas with typography optimized for focus. |
| `MoodSelector` | Visual pill buttons for logging mood and energy level. |
| `PromptBanner` | Contextual prompt card with "Answer Prompt" and "New Prompt" buttons. |
| `CalendarHeatmap` | Visual grid illustrating writing consistency throughout the year. |
| `EntryTimeline` | Reverse-chronological feed with search, tag filters, and pinned entries. |

---

## 📱 User Workflow
1. User logs into *The Commons* and navigates to `/diary`.
2. System loads today's date and checks for an existing entry.
3. If no entry exists, a daily prompt is presented alongside mood options.
4. As the user types, the entry auto-saves every 2 seconds to Supabase.
5. Previous entries can be searched or filtered by tag from the sidebar.
