# PRD: Daily Diary & Multi-Tome Journaling

## 1. Executive Summary & Objective
- **Problem Statement**: Members need a tactile, mindful digital sanctuary to record daily reflections, 3-item gratitude rituals, vitality energy scores, mood tags, and weather across multiple custom tomes.
- **Proposed Solution**: A multi-tome journal system where users manage styled books (vintage codex, classic ledger, modern chronicle) and write sequential daily entries with real-time autosave. The tome gallery (`/my-diaries`) displays a top-level summary header alongside a collection of books powered by an atomic database overview RPC (`get_user_diaries_overview`) and aggregate analytics RPC (`get_diary_stats`).
- **Target Persona**: Writers, thinkers, scholars, and daily journaling enthusiasts.

## 2. User Stories & Acceptance Criteria
- **User Story 1 (Tome Gallery & Summary)**: As a user, I want to open `/my-diaries` and immediately see my overall journaling summary (total tomes, total entries, writing streak, word count) alongside my styled journal collection.
  - [ ] A single atomic database RPC (`get_user_diaries_overview`) loads all user tomes with joined counts and latest activity.
  - [ ] Global analytics banner displays calculated streak, word total, average vitality, and mood breakdown via `get_diary_stats(null)`.
  - [ ] **Atomic Creation**: Creating a new diary initializes both the tome container and its first blank leaf (page 1) in a single atomic transaction via `create_diary_with_first_page`.
  - [ ] **Zero Refetch Cache Mutation**: Creating, updating, or deleting a diary updates the TanStack Query in-memory cache directly (`setQueryData`) and optimistic Zustand store (`useDiaryStore`), ensuring zero extra network roundtrips to refetch the entire list.
  - [ ] Diaries can be reordered (persisted via `reorder_diaries`), favorited, and archived.
- **User Story 2 (Sequential Entry Writing & Rituals)**: As a user, I want to write daily pages with structured rituals (gratitude, energy score, mood, weather).
  - [ ] Page numbers increment sequentially per diary, calculated atomically via `create_diary_entry`.
  - [ ] Entries autosave with debounced mutation.
  - [ ] Users can bookmark/heart special entries.
- **User Story 3 (Analytics & Streaks)**: As a user, I want to see my writing streak and word count stats across individual tomes or aggregated across all tomes in my overview summary.
  - [ ] System computes consecutive days written, total words, hearted entries, and mood breakdown.
- **User Story 4 (Diary Details Multi-Tab Architecture & Zero-Redundant-Call Cache Sync)**: As a user viewing a diary (`/my-diaries/[diaryId]/pages/[entryId]`), I want distinct Journal, Index, and Summary tabs that load smoothly and synchronize in-memory without extra network refetches.
  - [ ] **Journal Tab**: Fast, tactile two-page canvas and ritual sidebar for the active page.
  - [ ] **Index Tab**: Table of contents with search, sort, and mood filtering over cached entries.
  - [ ] **Summary Tab**: Dedicated analytics view for this specific tome via `get_diary_stats(diaryId)`.
  - [ ] **Store & Cache Synchronization**: Any action on the active page (saving text, changing mood, hearting, adding or deleting pages) immediately updates the local Zustand store (`useDiaryStore`) and performs in-place TanStack cache updates across entries and stats—avoiding redundant network roundtrips.

## 3. Page Routes & UI Breakdown

> [!TIP]
> For the complete technical map connecting every page route and component trigger to its corresponding database RPC and TanStack Query cache action, refer to the [Page-to-API Matrix](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/daily-diary/05-page-to-api-matrix.md).

| Route / URL | Component / View | Description | Key User Actions |
|---|---|---|---|
| `/my-diaries` | `MyDiariesPage`<br/>`single-diary-entry-client.tsx` | Tome gallery with overall summary stats banner & 3D covers | View aggregate summary, create tome, browse books, reorder, open tome |
| `/my-diaries/[diaryId]` | Route Redirect | Fast router resolving the active/first leaf of the tome | Auto-routes to `/my-diaries/[diaryId]/pages/[entryId]` |
| `/my-diaries/[diaryId]/pages/[entryId]` | `MyDiaryEntryDetailsClient` | Tactile two-page editor with Journal, Index, and Summary tabs | Switch tabs, write reflection, gratitude, change mood, browse TOC, view stats |
| `/daily-diary` | Fast Redirect | Fast redirect to active/favorite diary entry | Auto-opens latest daily entry |

## 4. Visual & Interactive States
- **Summary Banner**: Glassmorphic banner displaying total tomes, total entries written, current streak, and total words.
- **Bookshelf Grid State**: Tactile bookshelf / 3D cover grid showing user tomes with cover textures, theme stamps, and progress badges.
- **Tab Navigation State**: Fluid tab switcher between **Journal** (active canvas), **Index** (TOC list), and **Summary** (tome metrics).
- **Autosaving State**: Discreet "Ink drying..." / "Saved" status indicator in header.
- **Empty State**: Elegant prompt card suggesting first reflection with sample opening kickers.
