import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DiarySortOption = "newest" | "oldest" | "vitality-high" | "vitality-low";
export type DiaryViewMode = "grid" | "list";

export interface DiaryStoreState {
  activeDiaryId: string;
  currentPageIndex: number;
  currentEntryId: string | null;
  searchQuery: string;
  activeFilter: "all" | "favorites" | "high-vitality";
  activeMoodFilter: string;
  sortBy: DiarySortOption;
  viewMode: DiaryViewMode;

  // UI State Actions
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

export const useDiaryStore = create<DiaryStoreState>()(
  persist(
    (set) => ({
      activeDiaryId: "",
      currentPageIndex: 0,
      currentEntryId: null,
      searchQuery: "",
      activeFilter: "all",
      activeMoodFilter: "all",
      sortBy: "newest",
      viewMode: "grid",

      setActiveDiaryId: (activeDiaryId) => set({ activeDiaryId }),

      setCurrentPageIndex: (index) =>
        set({ currentPageIndex: Math.max(0, index) }),

      setCurrentEntryId: (id) => set({ currentEntryId: id }),

      setSearchQuery: (searchQuery) =>
        set({ searchQuery, currentPageIndex: 0 }),

      setActiveFilter: (activeFilter) =>
        set({ activeFilter, currentPageIndex: 0 }),

      setActiveMoodFilter: (activeMoodFilter) =>
        set({ activeMoodFilter, currentPageIndex: 0 }),

      setSortBy: (sortBy) => set({ sortBy }),

      setViewMode: (viewMode) => set({ viewMode }),

      resetDiaryState: () =>
        set({
          currentPageIndex: 0,
          searchQuery: "",
          activeFilter: "all",
          activeMoodFilter: "all",
          sortBy: "newest",
        }),
    }),
    {
      name: "the-commons-diary-ui-store",
      partialize: (state) => ({
        activeDiaryId: state.activeDiaryId,
        sortBy: state.sortBy,
        viewMode: state.viewMode,
        activeFilter: state.activeFilter,
        activeMoodFilter: state.activeMoodFilter,
      }),
    }
  )
);
