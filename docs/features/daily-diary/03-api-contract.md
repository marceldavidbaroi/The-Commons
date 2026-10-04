# API Contract: Daily Diary & Journal RPCs

> [!TIP]
> For an exhaustive, view-by-view and event-by-event table mapping every UI trigger to its endpoint, see the [Page-to-API Matrix](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/daily-diary/05-page-to-api-matrix.md).
> All diaries and entries use numeric identifiers (`BIGINT` / `number`).

---

## 1. Database Procedures & Table Operations

### A. Tome Gallery & Management (`/my-diaries`)
| Action / Endpoint | Type | Parameters | Description | Database Return / Response |
|---|---|---|---|---|
| `get_user_diaries_overview()` | **RPC** (PostgreSQL) | `void` | Returns all user tomes with aggregated metrics (`entries_count`, `highest_page_number`, `latest_entry_date`) sorted by favorite, sort_order, and created_at | `Json` (`DiaryRowWithMetrics[]`) |
| `get_diary_stats(p_diary_id)` | **RPC** (PostgreSQL) | `p_diary_id?: bigint = null` | Computes global (if null) or diary-scoped streak, word count, average vitality, hearted count, mood breakdown, and tags | `Json` (`DiaryStats`) |
| `create_diary_with_first_page(...)` | **RPC** (PostgreSQL) | `p_name: text, p_description?: text, p_theme?: text, p_cover_color?: text` | Atomically creates new tome + initializes leaf 1 in 1 single transaction | `Json` (`{ id, name, ..., first_entry_id }`) |
| `update_diary` | **Table Mutation** (`public.diaries`) | `id: bigint, name?, description?, theme?, cover_color?, is_favorite?, is_archived?, sort_order?` | Modifies an existing tome metadata or state via Supabase Table Update | `DiaryRow` |
| `delete_diary` | **Table Mutation** (`public.diaries`) | `id: bigint` | Permanently removes diary book and cascades entry deletions via Supabase Table Delete | `{ success: boolean, id: number }` |
| `reorder_diaries(p_diary_ids)` | **RPC** (PostgreSQL) | `p_diary_ids: bigint[]` | Batch updates tome order index (`sort_order`) | `void` |

### B. Diary Details Tabs (`/my-diaries/[diaryId]/pages/[entryId]`)
| Tab / Feature | Action / Endpoint | Type | Parameters | Description | Database Return / Response |
|---|---|---|---|---|---|
| **Journal Tab** | `get_diary_entry` / Table Select | **Table Query** (`public.diary_entries`) | `id: bigint` | Fetches active single page reflection, gratitude ritual, energy, mood, & metadata | `DiaryEntryRow` |
| **Journal Tab** | `save_diary_entry` / Upsert | **Table Mutation** (`public.diary_entries`) | `id, diary_id, title, description, gratitude, energy_level, start_time, end_time, mood, weather, is_hearted, tags, word_count` | Saves or autosaves active reflection | `DiaryEntryRow` |
| **Index Tab** | `get_diary_entries_index` / Table Select | **Table Query** (`public.diary_entries`) | `diary_id: bigint, order: page_number DESC` | Fetches table of contents (TOC) list for navigation | `DiaryIndexEntry[]` |
| **Summary Tab** | `get_diary_stats(p_diary_id)` | **RPC** (PostgreSQL) | `p_diary_id: bigint` | Computes tome-specific analytics (word count, streaks, mood distribution, hearted count) | `DiaryStats` |
| **Entry Actions** | `create_diary_entry(...)` | **RPC** (PostgreSQL) | `p_diary_id: bigint, p_title?: text, p_description?: text, p_gratitude?: text[], p_energy_level?: int, p_start_time?: text, p_end_time?: text, p_mood?: text, p_weather?: text, p_is_hearted?: bool, p_tags?: text[]` | Atomically calculates next page number and creates a new sequential page | `DiaryEntryRow` |
| **Entry Actions** | `delete_diary_entry` | **Table Mutation** (`public.diary_entries`) | `id: bigint` | Removes an entry page from tome via Supabase Table Delete | `{ success: boolean, id: number }` |

---

## 2. Database vs Client Field Mapping

| Database Column (`snake_case`) | TypeScript Property (`camelCase`) | Type |
|---|---|---|
| `id` | `id` | `number` |
| `diary_id` | `diaryId` | `number` |
| `user_id` | `userId` | `number` |
| `cover_color` | `coverColor` | `string \| undefined` |
| `is_favorite` | `isFavorite` | `boolean` |
| `is_archived` | `isArchived` | `boolean` |
| `sort_order` | `sortOrder` | `number` |
| `entries_count` | `entriesCount` | `number` |
| `highest_page_number` | `highestPageNumber` | `number` |
| `latest_entry_date` | `latestEntryDate` | `string \| null` |
| `page_number` | `pageNumber` | `number` |
| `entry_date` | `entryDate` | `string` |
| `date_str` | `dateStr` | `string` |
| `day_of_week` | `dayOfWeek` | `string` |
| `year_str` | `yearStr` | `string` |
| `energy_level` | `energyLevel` | `number` |
| `start_time` | `startTime` | `string` |
| `end_time` | `endTime` | `string` |
| `is_hearted` | `isHearted` | `boolean` |
| `word_count` | `wordCount` | `number` |
| `total_entries` | `totalEntries` | `number` |
| `total_words` | `totalWords` | `number` |
| `average_energy` | `averageEnergy` | `number` |
| `hearted_entries` | `heartedEntries` | `number` |
| `current_streak` | `currentStreak` | `number` |
