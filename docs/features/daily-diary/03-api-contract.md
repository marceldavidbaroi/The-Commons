# API Contract: Daily Diary & Journal RPCs

> [!TIP]
> For an exhaustive, view-by-view and event-by-event table mapping every UI trigger to its endpoint, see the [Page-to-API Matrix](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/daily-diary/05-page-to-api-matrix.md).

---

## 1. Database Procedures & Table Operations

### A. Tome Gallery & Management (`/my-diaries`)
| Action / Endpoint | Type | Parameters | Description | Database Return / Response |
|---|---|---|---|---|
| `get_user_diaries_overview()` | **RPC** (PostgreSQL) | `void` | Returns all user tomes with aggregated metrics (`entries_count`, `highest_page_number`, `latest_entry_date`) sorted by favorite, sort_order, and created_at | `Json` (`DiaryRowWithMetrics[]`) |
| `get_diary_stats(p_diary_id)` | **RPC** (PostgreSQL) | `p_diary_id?: uuid = null` | Computes global (if null) or diary-scoped streak, word count, average vitality, hearted count, mood breakdown, and tags | `Json` (`DiaryStats`) |
| `create_diary_with_first_page(...)` | **RPC** (PostgreSQL) | `p_name: text, p_description?: text, p_theme?: text, p_cover_color?: text` | Atomically creates new tome + initializes leaf 1 in 1 single transaction | `Json` (`{ id, name, ..., first_entry_id }`) |
| `update_diary` | **Table Mutation** (`public.diaries`) | `id: uuid, name?, description?, theme?, cover_color?, is_favorite?, is_archived?, sort_order?` | Modifies an existing tome metadata or state via Supabase Table Update | `DiaryRow` |
| `delete_diary` | **Table Mutation** (`public.diaries`) | `id: uuid` | Permanently removes diary book and cascades entry deletions via Supabase Table Delete | `{ success: boolean, id: string }` |
| `reorder_diaries(p_diary_ids)` | **RPC** (PostgreSQL) | `p_diary_ids: uuid[]` | Batch updates tome order index (`sort_order`) | `void` |

### B. Diary Details Tabs (`/my-diaries/[diaryId]/pages/[entryId]`)
| Tab / Feature | Action / Endpoint | Type | Parameters | Description | Database Return / Response |
|---|---|---|---|---|---|
| **Journal Tab** | `get_diary_entry` / Table Select | **Table Query** (`public.diary_entries`) | `id: uuid` | Fetches active single page reflection, gratitude ritual, energy, mood, & metadata | `DiaryEntryRow` |
| **Journal Tab** | `save_diary_entry` / Upsert | **Table Mutation** (`public.diary_entries`) | `id, diary_id, title, description, gratitude, energy_level, start_time, end_time, mood, weather, is_hearted, tags, word_count` | Saves or autosaves active reflection | `DiaryEntryRow` |
| **Index Tab** | `get_diary_entries_index` / Table Select | **Table Query** (`public.diary_entries`) | `diary_id: uuid, order: page_number DESC` | Fetches table of contents (TOC) list for navigation | `DiaryIndexEntry[]` |
| **Summary Tab** | `get_diary_stats(p_diary_id)` | **RPC** (PostgreSQL) | `p_diary_id: uuid` | Computes tome-specific analytics (word count, streaks, mood distribution, hearted count) | `DiaryStats` |
| **Entry Actions** | `create_diary_entry(...)` | **RPC** (PostgreSQL) | `p_diary_id: uuid, p_title?: text, p_description?: text, p_gratitude?: text[], p_energy_level?: int, p_start_time?: text, p_end_time?: text, p_mood?: text, p_weather?: text, p_is_hearted?: bool, p_tags?: text[]` | Atomically calculates next page number and creates a new sequential page | `DiaryEntryRow` |
| **Entry Actions** | `delete_diary_entry` | **Table Mutation** (`public.diary_entries`) | `id: uuid` | Removes an entry page from tome via Supabase Table Delete | `{ success: boolean, id: string }` |

---

## 2. Database vs Client Field Mapping

To ensure seamless data flow between PostgreSQL (`snake_case`) and the TypeScript frontend (`camelCase`), the application maps records through typed query adapters:

| Database Column (`snake_case`) | TypeScript Property (`camelCase`) | Type |
|---|---|---|
| `user_id` | `userId` | `string` |
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
| `longest_streak` | `longestStreak` | `number` |
| `mood_breakdown` | `moodBreakdown` | `Record<string, number>` |

---

## 3. Payload Shapes & RPC Definitions

### 1. `get_user_diaries_overview` (Tome Gallery List RPC)
- **Request Arguments**: `void`
- **PostgreSQL RPC Response (JSONB Array)**:
  ```json
  [
    {
      "id": "b8f0607d-5a9e-4b77-a8a2-2b6d193d56ef",
      "name": "The Antiquarian Codex",
      "description": "Morning thoughts and philosophical reflections",
      "theme": "vintage",
      "cover_color": "#8C3A27",
      "is_favorite": true,
      "is_archived": false,
      "sort_order": 0,
      "entries_count": 42,
      "highest_page_number": 42,
      "latest_entry_date": "2026-09-17",
      "created_at": "2026-09-01T12:00:00Z",
      "updated_at": "2026-09-17T14:00:00Z"
    }
  ]
  ```

---

### 2. `get_diary_stats` (Global or Tome-Specific Analytics RPC)
- **Request Arguments**:
  ```json
  { "p_diary_id": "b8f0607d-5a9e-4b77-a8a2-2b6d193d56ef" }
  ```
  *(Pass `null` or omit `p_diary_id` for user-wide global statistics)*
- **PostgreSQL RPC Response (JSONB Object)**:
  ```json
  {
    "total_entries": 42,
    "total_words": 8620,
    "average_energy": 3.85,
    "hearted_entries": 8,
    "current_streak": 7,
    "longest_streak": 14,
    "mood_breakdown": {
      "🌿 Calm": 15,
      "✨ Inspired": 12,
      "🎯 Focused": 10,
      "⚡ Energetic": 5
    },
    "tags": ["Architecture", "Reflection", "Deep Work"]
  }
  ```

---

### 3. `create_diary_with_first_page` (Atomic Create RPC)
- **Request Arguments**:
  ```json
  {
    "p_name": "The Antiquarian Codex",
    "p_description": "Morning thoughts and philosophical reflections",
    "p_theme": "vintage",
    "p_cover_color": "#8C3A27"
  }
  ```
- **PostgreSQL RPC Response (JSONB Object)**:
  ```json
  {
    "id": "b8f0607d-5a9e-4b77-a8a2-2b6d193d56ef",
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "The Antiquarian Codex",
    "description": "Morning thoughts and philosophical reflections",
    "theme": "vintage",
    "cover_color": "#8C3A27",
    "is_favorite": false,
    "is_archived": false,
    "sort_order": 0,
    "entries_count": 1,
    "highest_page_number": 1,
    "latest_entry_date": "2026-09-17",
    "created_at": "2026-09-17T12:00:00Z",
    "updated_at": "2026-09-17T12:00:00Z",
    "first_entry_id": "f29b48f9-4d62-4299-9238-6f68c34fba01"
  }
  ```

---

### 4. `create_diary_entry` (Atomic Add Page RPC)
- **Request Arguments**:
  ```json
  {
    "p_diary_id": "b8f0607d-5a9e-4b77-a8a2-2b6d193d56ef",
    "p_title": "Quiet Reflections on the Commons",
    "p_description": "The morning mist gave way to golden light across the courtyard...",
    "p_gratitude": [
      "Crisp autumn morning breeze",
      "Hot pour-over coffee",
      "Focused morning writing session"
    ],
    "p_energy_level": 4,
    "p_start_time": "08:30",
    "p_end_time": "09:45",
    "p_mood": "✨ Inspired",
    "p_weather": "sunny",
    "p_is_hearted": true,
    "p_tags": ["Reflection", "Morning Ritual"]
  }
  ```
- **PostgreSQL RPC Response (JSONB Object)**:
  ```json
  {
    "id": "f29b48f9-4d62-4299-9238-6f68c34fba01",
    "diary_id": "b8f0607d-5a9e-4b77-a8a2-2b6d193d56ef",
    "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "page_number": 43,
    "entry_date": "2026-09-17",
    "date_str": "September 17",
    "day_of_week": "Thursday",
    "year_str": "Anno 2026",
    "title": "Quiet Reflections on the Commons",
    "description": "The morning mist gave way to golden light across the courtyard...",
    "gratitude": [
      "Crisp autumn morning breeze",
      "Hot pour-over coffee",
      "Focused morning writing session"
    ],
    "energy_level": 4,
    "start_time": "08:30",
    "end_time": "09:45",
    "mood": "✨ Inspired",
    "weather": "sunny",
    "is_hearted": true,
    "tags": ["Reflection", "Morning Ritual"],
    "word_count": 12,
    "metadata": {},
    "created_at": "2026-09-17T08:30:00Z",
    "updated_at": "2026-09-17T08:30:00Z"
  }
  ```

---

### 5. `reorder_diaries` (Batch Reorder RPC)
- **Request Arguments**:
  ```json
  {
    "p_diary_ids": [
      "b8f0607d-5a9e-4b77-a8a2-2b6d193d56ef",
      "c19f508a-6b8f-4c88-b9a3-3c7d204e67fa"
    ]
  }
  ```
- **PostgreSQL RPC Response**: `void`

---

## 4. TypeScript Service Layer Interface (`DiaryService`)

Programmatic access to all daily diary operations is encapsulated in [`src/services/diary.service.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/services/diary.service.ts):

```typescript
export class DiaryService extends BaseService {
  static async getDiariesOverview(): Promise<Diary[]>;
  static async getDiaryEntries(diaryId?: string): Promise<DiaryEntry[]>;
  static async getDiaryStats(diaryId?: string): Promise<DiaryStats>;
  static async createDiary(input: CreateDiaryInput): Promise<Diary>;
  static async updateDiary(diaryId: string, updates: UpdateDiaryInput): Promise<Diary>;
  static async deleteDiary(diaryId: string): Promise<string>;
  static async createDiaryEntry(input: CreateDiaryEntryInput): Promise<DiaryEntry>;
  static async updateDiaryEntry(entryId: string, updates: Partial<DiaryEntry>): Promise<{ entryId: string; updates: Partial<DiaryEntry> }>;
  static async deleteDiaryEntry(entryId: string, diaryId: string): Promise<{ entryId: string; diaryId: string }>;
  static async reorderDiaries(diaryIds: string[]): Promise<string[]>;
  static async toggleHeart(entryId: string, isHearted: boolean, diaryId?: string): Promise<{ entryId: string; isHearted: boolean; diaryId?: string }>;
}
```

