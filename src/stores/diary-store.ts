import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DiaryStoreState {
  currentPageIndex: number;
  searchQuery: string;
  selectedDate: string | null;
  activeFilter: "all" | "favorites" | "prompts";
  isDrafting: boolean;
  heartOverrides: Record<number, boolean>; // pageNumber -> boolean

  // Actions
  setCurrentPageIndex: (index: number) => void;
  nextPage: (maxPages: number) => void;
  prevPage: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedDate: (date: string | null) => void;
  setActiveFilter: (filter: "all" | "favorites" | "prompts") => void;
  setIsDrafting: (isDrafting: boolean) => void;
  toggleHeart: (pageNumber: number, currentHearted?: boolean) => void;
  resetDiaryState: () => void;
}

export const useDiaryStore = create<DiaryStoreState>()(
  persist(
    (set) => ({
      currentPageIndex: 0,
      searchQuery: "",
      selectedDate: null,
      activeFilter: "all",
      isDrafting: false,
      heartOverrides: {},

      setCurrentPageIndex: (index) => set({ currentPageIndex: Math.max(0, index) }),

      nextPage: (maxPages) =>
        set((state) => ({
          currentPageIndex: Math.min(maxPages - 1, state.currentPageIndex + 1),
        })),

      prevPage: () =>
        set((state) => ({
          currentPageIndex: Math.max(0, state.currentPageIndex - 1),
        })),

      setSearchQuery: (searchQuery) => set({ searchQuery, currentPageIndex: 0 }),

      setSelectedDate: (selectedDate) => set({ selectedDate }),

      setActiveFilter: (activeFilter) => set({ activeFilter, currentPageIndex: 0 }),

      setIsDrafting: (isDrafting) => set({ isDrafting }),

      toggleHeart: (pageNumber, currentHearted = false) =>
        set((state) => {
          const currentVal = state.heartOverrides[pageNumber] ?? currentHearted;
          return {
            heartOverrides: {
              ...state.heartOverrides,
              [pageNumber]: !currentVal,
            },
          };
        }),

      resetDiaryState: () =>
        set({
          currentPageIndex: 0,
          searchQuery: "",
          selectedDate: null,
          activeFilter: "all",
          isDrafting: false,
        }),
    }),
    {
      name: "the-commons-diary-store",
      partialize: (state) => ({
        heartOverrides: state.heartOverrides,
        activeFilter: state.activeFilter,
      }),
    }
  )
);
