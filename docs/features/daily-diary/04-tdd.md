# Technical Design Document: Daily Diary

> [!NOTE]
> Architectural blueprints, state management patterns, and component hierarchy for the Daily Diary & Multi-Tome Journaling feature.

---

## 1. System Architecture & State Boundaries

```mermaid
graph TD
    %% Gallery Page
    GalleryPage["/my-diaries"] -->|Fetch tomes overview| UseDiaries["useDiariesOverview()"]
    GalleryPage -->|Fetch global stats| UseStatsGlobal["useDiaryStats(null)"]
    UseDiaries -->|RPC: get_user_diaries_overview| SupabaseDB[("Supabase PostgreSQL DB")]
    UseStatsGlobal -->|RPC: get_diary_stats| SupabaseDB
    SupabaseDB -->|List + Metrics + Stats| QueryClient["TanStack Query Cache: ['diaries']"]
    QueryClient -->|Hydrated State| GalleryPage
    
    %% Gallery Tome Mutations
    GalleryPage -->|Create Diary Action| CreateMutation["useCreateDiaryMutation"]
    GalleryPage -->|Update Diary Action| UpdateMutation["useUpdateDiaryMutation"]
    GalleryPage -->|Delete Diary Action| DeleteMutation["useDeleteDiaryMutation"]
    GalleryPage -->|Reorder Action| ReorderMutation["useReorderDiariesMutation"]
    
    CreateMutation -->|POST RPC: create_diary_with_first_page| SupabaseDB
    UpdateMutation -->|PATCH Table: diaries| SupabaseDB
    DeleteMutation -->|DELETE Table: diaries| SupabaseDB
    ReorderMutation -->|POST RPC: reorder_diaries| SupabaseDB
    
    CreateMutation -.->|Direct setQueryData: Prepend Tome| QueryClient
    UpdateMutation -.->|Direct setQueryData: In-Place Update| QueryClient
    DeleteMutation -.->|Direct setQueryData: Filter Tome| QueryClient

    %% Diary Details Page (3 Synchronized Tabs)
    subgraph DiaryDetails ["Diary Details Page: /my-diaries/[diaryId]/pages/[entryId]"]
        TabSwitcher["Tab Switcher: Journal | Index | Summary"]
        
        %% Tab 1: Journal Canvas
        TabSwitcher -->|Active: Journal Tab| JournalView["Journal Two-Page Canvas & Ritual Sidebar"]
        JournalView -->|Query: diaryKeys.entries(diaryId)| UseEntries["useDiaryEntries(diaryId)"]
        JournalView -->|Debounced write / autosave| AutoSave["useUpdateDiaryEntryMutation()"]
        
        %% Tab 2: Index (TOC)
        TabSwitcher -->|Active: Index Tab| IndexView["Index / TOC Table of Contents"]
        IndexView -->|Reuses cached entries| UseEntries
        
        %% Tab 3: Summary Stats
        TabSwitcher -->|Active: Summary Tab| SummaryView["Summary / Analytics Tab"]
        SummaryView -->|Query: diaryKeys.stats(diaryId)| UseStatsTome["useDiaryStats(diaryId)"]
    end

    UseEntries -->|Select diary_entries| SupabaseDB
    UseStatsTome -->|RPC: get_diary_stats(diaryId)| SupabaseDB

    AutoSave -->|Update diary_entries| SupabaseDB
    AutoSave -.->|1. In-Place Update Entry in useDiaryStore| DiaryStore["Zustand useDiaryStore"]
    AutoSave -.->|2. In-Place Update Entries Cache| QueryClient
    AutoSave -.->|3. In-Place Update Stats Cache| QueryClient
```

---

## 2. Component Hierarchy & File Mapping

```text
src/
├── app/
│   ├── my-diaries/
│   │   ├── page.tsx                           # Tome gallery page (Bookshelf overview & global analytics)
│   │   └── [diaryId]/
│   │       ├── page.tsx                       # Redirect router (auto-routes to active leaf)
│   │       └── pages/
│   │           └── [entryId]/
│   │               └── page.tsx               # Two-page spread canvas with Journal, Index, and Summary tabs
│   └── daily-diary/
│       ├── page.tsx                           # Fast redirect to user's favorite diary
│       └── [id]/
│           └── page.tsx                       # Daily diary standalone reader
├── components/
│   └── diary/
│       ├── single-diary-entry-client.tsx      # Bookshelf gallery, 3D tome covers, creation/edit modals, and stats banner
│       ├── my-diary-entry-details-client.tsx  # Interactive two-page book spread, ritual sidebar, TOC index, and summary
│       └── my-diary-index-client.tsx          # Lightweight index client wrapper
├── hooks/
│   └── queries/
│       └── use-diaries.ts                     # TanStack Query & Mutation suite:
│                                              #   - useDiariesOverview()
│                                              #   - useDiaryEntries(diaryId)
│                                              #   - useDiaryStats(diaryId)
│                                              #   - useCreateDiaryMutation()
│                                              #   - useUpdateDiaryMutation()
│                                              #   - useDeleteDiaryMutation()
│                                              #   - useReorderDiariesMutation()
│                                              #   - useCreateDiaryEntryMutation()
│                                              #   - useUpdateDiaryEntryMutation()
│                                              #   - useDeleteDiaryEntryMutation()
│                                              #   - useToggleHeartEntryMutation()
├── stores/
│   └── diary-store.ts                         # Zustand client store with localStorage persistence:
│                                              #   - diaries & entries arrays
│                                              #   - activeDiaryId, currentEntryId, currentPageIndex
│                                              #   - searchQuery, activeFilter, activeMoodFilter, sortBy, viewMode
└── types/
    ├── diary.ts                               # Domain models (Diary, DiaryEntry, MOOD_LIST, ENERGY_LEVELS, defaults)
    └── database.ts                            # Supabase Database schema definitions and RPC signatures
```

---

## 3. State Management & Zero-Redundant-Call Architecture

### A. Query Key Factory & Fine-Grained Invalidation
All queries and mutations adhere to a strict hierarchical key factory defined in [`src/hooks/queries/use-diaries.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/hooks/queries/use-diaries.ts):

```typescript
export const diaryKeys = {
  all: ["diaries"] as const,
  lists: () => [...diaryKeys.all, "list"] as const,
  overview: () => [...diaryKeys.all, "overview"] as const,
  stats: (diaryId?: string) => [...diaryKeys.all, "stats", diaryId || "global"] as const,
  detail: (diaryId: string) => [...diaryKeys.all, "detail", diaryId] as const,
  entries: (diaryId?: string) => [...diaryKeys.all, "entries", diaryId || "all"] as const,
  entry: (diaryId: string, entryId: string) => [...diaryKeys.all, "entry", diaryId, entryId] as const,
};
```

---

### B. Action Cache Synchronization (Zero Redundant Network Calls)

> [!IMPORTANT]
> When any action occurs in the Journal tab or Entry actions, **NO destructive refetches (`invalidateQueries`) are triggered**. All dependent caches (`entries`, `overview`, and `stats`) are updated directly in-memory using `queryClient.setQueryData` alongside optimistic `useDiaryStore` updates.

#### 1. Autosaving Active Reflection
When the user edits reflection text, gratitude statements, energy rating, or mood:
1. **Zustand Store**: Updated immediately via `updateEntry(id, updates)`.
2. **TanStack Entries Cache**: Surgically updated in-place under `diaryKeys.entries(diaryId)`.
3. **TanStack Stats Cache**: Word counts and energy averages adjusted without triggering an RPC network roundtrip.

```typescript
// Example: Surgical in-place cache update on entry autosave
export function useUpdateDiaryEntryMutation() {
  const queryClient = useQueryClient();
  const updateEntryInStore = useDiaryStore((state) => state.updateEntry);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DiaryEntry> }) => {
      // 1. Local store update
      updateEntryInStore(id, updates);

      // 2. Supabase table update with RLS
      const supabase = createClient();
      const dbPayload = mapEntryToDbRow(updates);
      const { data, error } = await supabase
        .from("diary_entries")
        .update(dbPayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedRow) => {
      const diaryId = updatedRow.diary_id;
      // In-place TanStack Query cache sync
      queryClient.setQueryData<DiaryEntry[]>(
        diaryKeys.entries(diaryId),
        (old) => old?.map((e) => (e.id === updatedRow.id ? mapDbRowToEntry(updatedRow) : e)) ?? []
      );
    },
  });
}
```

#### 2. Creating a New Sequential Page (`useCreateDiaryEntryMutation`)
When user clicks "Add Page" / "New Leaf":
1. **RPC Execution**: Calls `create_diary_entry(p_diary_id, ...)` which atomically computes `MAX(page_number) + 1`.
2. **Store & Cache Update**: Prepend new page to `useDiaryStore.entries` and `diaryKeys.entries(diaryId)`.
3. **Overview Count Sync**: Increments `entries_count` and `highest_page_number` in `diaryKeys.overview()`.

#### 3. Deleting a Page (`useDeleteDiaryEntryMutation`)
When user deletes a page:
1. **Table Execution**: Calls `supabase.from('diary_entries').delete().eq('id', id)`.
2. **Store & Cache Update**: Removes entry from `useDiaryStore.entries` and `diaryKeys.entries(diaryId)`.
3. **Stats Sync**: Decrements `total_entries` in `diaryKeys.stats(diaryId)`.

---

## 4. Client Store: `useDiaryStore`

Located in [`src/stores/diary-store.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/stores/diary-store.ts), persisting with key `the-commons-diary-store-v4`:

```typescript
export interface DiaryStoreState {
  diaries: Diary[];
  entries: DiaryEntry[];
  activeDiaryId: string;
  currentPageIndex: number;
  currentEntryId: string | null;
  searchQuery: string;
  activeFilter: "all" | "favorites" | "high-vitality";
  activeMoodFilter: string;
  sortBy: DiarySortOption;
  viewMode: DiaryViewMode;

  // Actions
  setDiaries: (diaries: Diary[]) => void;
  createDiary: (data: { name: string; description: string; theme: DiaryTheme; coverColor?: string }) => Diary;
  updateDiary: (id: string, updates: Partial<Diary>) => void;
  deleteDiary: (id: string) => void;
  setEntries: (entries: DiaryEntry[]) => void;
  updateEntry: (idOrPage: string | number, updates: Partial<DiaryEntry>) => void;
  createEntry: (diaryId?: string, customData?: Partial<DiaryEntry>) => DiaryEntry;
  deleteEntry: (idOrPage: string | number) => void;
  toggleHeart: (idOrPage: string | number) => void;
  setActiveDiaryId: (id: string) => void;
  setCurrentPageIndex: (index: number) => void;
  setCurrentEntryId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: "all" | "favorites" | "high-vitality") => void;
  setActiveMoodFilter: (mood: string) => void;
  setSortBy: (sort: DiarySortOption) => void;
  setViewMode: (mode: DiaryViewMode) => void;
  resetDiaryState: () => void;
}
```
