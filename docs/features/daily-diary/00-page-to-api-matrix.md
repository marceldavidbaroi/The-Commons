# Page-to-API Matrix: Daily Diary & Multi-Tome Journaling

> [!NOTE]
> This matrix provides an exhaustive, 1-to-1 mapping between every Page Route, UI View, Tab, Component, and the underlying PostgreSQL RPC / Supabase Table mutation, TanStack Query hook, and in-memory cache behavior.

---

## 1. Page-to-API Mapping Matrix

| Page Route | View / Tab | Component | User Trigger / Event | Target API / RPC | Method | TanStack Query Hook | Cache & Store Synchronization Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/my-diaries` | **Gallery Initial Load** | `MyDiariesPage`<br/>`single-diary-entry-client.tsx` | Page Mount | `get_user_diaries_overview()` | `POST` (RPC) | `useDiariesOverview()` | Fetches user tomes with joined counts (`entries_count`, `highest_page_number`, `latest_entry_date`). Cached under `['diaries', 'overview']`. |
| `/my-diaries` | **Overall Analytics** | `DiaryOverviewHeader` | Page Mount | `get_diary_stats(null)` | `POST` (RPC) | `useDiaryStats()` | Calculates global streak, total words, average vitality, hearted count, and mood breakdown. Cached under `['diaries', 'stats', 'global']`. |
| `/my-diaries` | **Tome Creation** | `CreateDiaryModal` | Submit New Tome Form | `create_diary_with_first_page(name, desc, theme, color)` | `POST` (RPC) | `useCreateDiaryMutation()` | **Zero refetch**. Optimistically creates in `useDiaryStore`, persists via RPC, and prepends to `['diaries', 'overview']` cache. |
| `/my-diaries` | **Tome Edit** | `EditDiaryModal` | Submit Tome Settings | `supabase.from('diaries').update(...)` | `PATCH` (Table) | `useUpdateDiaryMutation()` | **Zero refetch**. Surgically updates matching tome in `useDiaryStore` and `['diaries', 'overview']` cache in place. |
| `/my-diaries` | **Tome Delete** | `DeleteDiaryDialog` | Confirm Tome Deletion | `supabase.from('diaries').delete().eq('id', id)` | `DELETE` (Table) | `useDeleteDiaryMutation()` | **Zero refetch**. Cascades deletion in DB, filters out from store and `['diaries', 'overview']` cache. |
| `/my-diaries` | **Tome Reorder** | `MyDiariesPage` | Drag & Drop Tome Cover | `reorder_diaries(p_diary_ids)` | `POST` (RPC) | `useReorderDiariesMutation()` | Optimistically updates local array rank in `useDiaryStore`; persists array of UUIDs via RPC. |
| `/my-diaries/[diaryId]` | **Tome Entry Router** | `DiaryEntryRouter` | Route Navigate | Client-side Router | Next.js Navigation | Next.js Router | Resolves the latest/first page in the selected tome and routes to `/my-diaries/[diaryId]/pages/[entryId]`. |
| `/my-diaries/[diaryId]/pages/[entryId]` | **Journal Tab (Active Page)** | `MyDiaryEntryDetailsClient`<br/>`DiaryJournalTab` | Tab Select or Page Open | `supabase.from('diary_entries').select('*')` | `GET` (Table) | `useDiaryEntries(diaryId)` | Fetches page reflections, 3-bullet gratitude, vitality score, start/end time, mood, and weather. Cached under `['diaries', 'entries', diaryId]`. |
| `/my-diaries/[diaryId]/pages/[entryId]` | **Journal Tab (Autosave)** | `MyDiaryEntryDetailsClient`<br/>`DiaryRitualSidebar` | Debounced text/mood/gratitude edit | `supabase.from('diary_entries').update(...)` | `PATCH` (Table) | `useUpdateDiaryEntryMutation()` | **Zero refetch**. In-place updates active entry in `useDiaryStore` and TanStack cache; updates `isDirty` status. |
| `/my-diaries/[diaryId]/pages/[entryId]` | **Index Tab (TOC)** | `DiaryIndexTab` | Click "Index" Tab / Search TOC | `supabase.from('diary_entries').select('*').order('page_number', { ascending: false })` | `GET` (Table) | `useDiaryEntries(diaryId)` | Reuses cached entry index (`id`, `pageNumber`, `dateStr`, `title`, `description`, `mood`, `isHearted`, `wordCount`). |
| `/my-diaries/[diaryId]/pages/[entryId]` | **Summary Tab (Analytics)** | `DiarySummaryTab`<br/>`DiaryStatsCard` | Click "Summary" Tab | `get_diary_stats(p_diary_id)` | `POST` (RPC) | `useDiaryStats(diaryId)` | Fetches tome-specific streak, word total, average energy, hearted count, and mood distribution. Cached under `['diaries', 'stats', diaryId]`. |
| `/my-diaries/[diaryId]/pages/[entryId]` | **Add Page Action** | `DiaryDetailsTabs`<br/>`DiaryIndexTab` | Click "Add Page" / "New Leaf" | `create_diary_entry(p_diary_id, ...)` | `POST` (RPC) | `useCreateDiaryEntryMutation()` | **Zero refetch**. Atomically generates next sequential page number; prepends to store and entries cache; navigates to new leaf. |
| `/my-diaries/[diaryId]/pages/[entryId]` | **Delete Page Action** | `DiaryJournalTab`<br/>`DiaryIndexTab` | Confirm Delete Page | `supabase.from('diary_entries').delete().eq('id', id)` | `DELETE` (Table) | `useDeleteDiaryEntryMutation()` | **Zero refetch**. Removes page from store and entries cache; decrements counts; routes to adjacent page. |
| `/my-diaries/[diaryId]/pages/[entryId]` | **Bookmark / Heart Page** | `DiaryJournalTab`<br/>`DiaryIndexTab` | Click Heart icon | `supabase.from('diary_entries').update({ is_hearted })` | `PATCH` (Table) | `useToggleHeartEntryMutation()` | **Zero refetch**. Toggles `isHearted` state in `useDiaryStore` and entries cache in place. |
| `/daily-diary` | **Fast Redirect** | `DailyDiaryPage` | Route Navigate `/daily-diary` | `get_user_diaries_overview()` | `POST` (RPC) | Server-side / Client Router | Finds active/favorite diary and latest entry ID, redirecting to `/my-diaries/[diaryId]/pages/[entryId]`. |

---

## 2. Client State & Store Matrix (Zustand: `useDiaryStore`)

| Store State Variable | Modifying Action | Affected Views | Purpose |
| :--- | :--- | :--- | :--- |
| `diaries` | `setDiaries(diaries)`<br/>`createDiary(data)`<br/>`updateDiary(id, updates)`<br/>`deleteDiary(id)` | `MyDiariesPage`, Bookshelf grids | In-memory reactive array of user tomes with local persistence fallback. |
| `entries` | `setEntries(entries)`<br/>`createEntry(diaryId, data)`<br/>`updateEntry(idOrPage, updates)`<br/>`deleteEntry(idOrPage)`<br/>`toggleHeart(idOrPage)` | `MyDiaryEntryDetailsClient`, Journal editor, Index TOC | Reactive store of all loaded diary pages, gratitude items, and reflections. |
| `activeDiaryId` | `setActiveDiaryId(id)` | Tome header, breadcrumbs, book cover | Identifies the currently opened journal tome. |
| `currentEntryId` | `setCurrentEntryId(id)` | Journal canvas, two-page spread | Identifies the active leaf/page being viewed and edited. |
| `currentPageIndex` | `setCurrentPageIndex(index)` | Pagination controls, flip buttons | Zero-based index of the currently active spread. |
| `searchQuery` | `setSearchQuery(string)` | Index Tab, TOC list, Search Bar | Real-time substring filter for titles, tags, and entry reflections. |
| `activeFilter` | `setActiveFilter('all' \| 'favorites' \| 'high-vitality')` | Index Tab, Filter bar | Quick-filter presets for bookmarked entries or high-vitality reflections. |
| `activeMoodFilter` | `setActiveMoodFilter(string)` | Index Tab, Mood pill bar | Filters entries by mood descriptor (e.g. "🌿 Calm", "✨ Inspired"). |
| `sortBy` | `setSortBy('newest' \| 'oldest' \| 'vitality-high' \| 'vitality-low')` | Index Tab, TOC list | Ordering criterion for entry list rendering. |
| `viewMode` | `setViewMode('grid' \| 'list')` | Bookshelf Gallery, Index list | Layout presentation mode switch. |
| `resetDiaryState` | `resetDiaryState()` | Navigation exit, reset action | Restores default filters, sort orders, and page index. |
