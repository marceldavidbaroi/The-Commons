# Technical Design Document: Daily Diary

## 1. System Architecture & State Boundaries

```mermaid
graph TD
    GalleryPage[/my-diaries] -->|Fetch tomes| UseDiaries[useUserDiariesQuery]
    CanvasPage[/my-diaries/id/pages/id] -->|Fetch entry| UseEntry[useDiaryEntryQuery]
    CanvasPage -->|Debounced write| AutoSave[useUpdateDiaryEntryMutation]
    AutoSave -->|Optimistic Cache Update| QueryClient[TanStack Query Cache]
    AutoSave -->|Persist| SupabaseDB[(Supabase PostgreSQL)]
    CanvasPage -->|Theme & Flip Mode| DiaryStore[Zustand useDiaryUIStore]
```

## 2. Component Hierarchy & File Mapping

```text
src/
├── app/
│   ├── my-diaries/
│   │   ├── page.tsx                           # Tome gallery page
│   │   └── [diaryId]/
│   │       ├── page.tsx                       # Table of contents & entries
│   │       └── pages/
│   │           └── [entryId]/
│   │               └── page.tsx               # Two-page open book editor
├── components/
│   └── diary/
│       ├── DiaryBookCover.tsx                 # 3D interactive book cover
│       ├── DiaryTwoPageSpread.tsx             # Two-page open book editor
│       ├── DiaryRitualSidebar.tsx             # Gratitude & energy tracker
│       └── DiaryStatsCard.tsx                 # Streak & word counter
├── hooks/
│   └── queries/
│       └── use-diaries.ts                     # TanStack Query bindings
├── stores/
│   └── diary-store.ts                         # UI state (active tab, full screen)
└── types/
    └── diary.ts                               # Type definitions
```

## 3. State Management Division
- **Server State (TanStack Query v5)**:
  - `['user-diaries']`: Overview of all tomes.
  - `['diary-entries', diaryId]`: Page list for specific diary.
  - `['diary-entry', entryId]`: Full page content and ritual attributes.
  - `['diary-stats', diaryId?]`: Writing streaks & analytics.
- **Client UI State (Zustand v5)**:
  - Active creation modal toggles, search term, active theme preview.
