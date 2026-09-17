# API Contract: Daily Diary & Journal RPCs

## 1. Database Procedures & API Endpoints

| RPC / Action | Parameters | Description | Response Type |
|---|---|---|---|
| `get_user_diaries_overview()` | None | Returns all user tomes with entry counts & latest page date | `DiaryOverviewRow[]` |
| `create_diary_with_first_page(...)` | `name, description, theme, cover_color` | Atomically creates new tome + initializes page 1 | `CreateDiaryResult` |
| `create_diary_entry(...)` | `p_diary_id, p_title, ...` | Atomically calculates sequential `page_number` & saves entry | `DiaryEntryRow` |
| `get_diary_stats(p_diary_id)` | `p_diary_id: uuid (optional)` | Calculates streaks, word count totals, mood breakdown | `DiaryStatsResponse` |
| `reorder_diaries(p_diary_ids)` | `p_diary_ids: uuid[]` | Batch updates tome order | `void` |

---

## 2. Payload Shapes

### `create_diary_with_first_page`
- **Request Body**:
  ```json
  {
    "name": "The Antiquarian Codex",
    "description": "Morning thoughts and philosophical reflections",
    "theme": "vintage",
    "coverColor": "#8C3A27"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "diary": {
      "id": "b8f0607d-5a9e-4b77-a8a2-2b6d193d56ef",
      "name": "The Antiquarian Codex",
      "theme": "vintage",
      "coverColor": "#8C3A27",
      "isFavorite": false,
      "createdAt": "2026-09-17T12:00:00Z"
    },
    "entry": {
      "id": "f29b48f9-...",
      "pageNumber": 1,
      "dateStr": "September 17",
      "title": "Opening Leaf",
      "description": ""
    }
  }
  ```

---

### `get_diary_stats`
- **Response Shape**:
  ```json
  {
    "total_entries": 42,
    "total_words": 8620,
    "average_energy": 3.85,
    "current_streak": 7,
    "longest_streak": 14,
    "mood_breakdown": {
      "🌿 Calm": 15,
      "✨ Inspired": 12,
      "🎯 Focused": 10
    },
    "tags": ["Architecture", "Reflection", "Deep Work"]
  }
  ```
