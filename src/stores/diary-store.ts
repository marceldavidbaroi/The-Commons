import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Diary,
  DiaryEntry,
  DiaryTheme,
  INITIAL_DIARIES,
  INITIAL_ENTRIES,
} from "@/types/diary";

export type DiarySortOption = "newest" | "oldest" | "vitality-high" | "vitality-low";
export type DiaryViewMode = "grid" | "list";

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

  // Diary Actions
  setDiaries: (diaries: Diary[]) => void;
  createDiary: (data: {
    name: string;
    description: string;
    theme: DiaryTheme;
    coverColor?: string;
  }) => Diary;
  updateDiary: (id: string, updates: Partial<Diary>) => void;
  deleteDiary: (id: string) => void;
  reorderDiaries: (diaryIds: string[]) => void;
  toggleFavoriteDiary: (id: string) => void;
  getDiaryById: (id: string) => Diary | undefined;
  getEntriesByDiaryId: (diaryId: string) => DiaryEntry[];
  setActiveDiaryId: (id: string) => void;

  // Entry Actions
  setEntries: (entries: DiaryEntry[]) => void;
  getEntryById: (idOrPage: string | number) => DiaryEntry | undefined;
  updateEntry: (idOrPage: string | number, updates: Partial<DiaryEntry>) => void;
  createEntry: (diaryId?: string, customData?: Partial<DiaryEntry>) => DiaryEntry;
  deleteEntry: (idOrPage: string | number) => void;
  toggleHeart: (idOrPage: string | number) => void;

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
    (set, get) => ({
      diaries: INITIAL_DIARIES,
      entries: INITIAL_ENTRIES,
      activeDiaryId: INITIAL_DIARIES[0]?.id || "",
      currentPageIndex: 0,
      currentEntryId: INITIAL_ENTRIES[0]?.id || null,
      searchQuery: "",
      activeFilter: "all",
      activeMoodFilter: "all",
      sortBy: "newest",
      viewMode: "grid",


      setDiaries: (diaries) => set({ diaries }),

      createDiary: ({ name, description, theme, coverColor }) => {
        const id = `diary-${theme}-${Date.now().toString(36)}`;
        const now = new Date().toISOString();
        const defaultColor =
          coverColor ||
          (theme === "vintage" ? "#8C3A27" : theme === "classic" ? "#1E3A5F" : "#172330");

        const newDiary: Diary = {
          id,
          name: name.trim() || "Untitled Tome",
          description: description.trim() || "A private chronicle for thoughts and daily records.",
          theme,
          coverColor: defaultColor,
          createdAt: now,
          updatedAt: now,
        };

        // Also create the first initial blank page for this new diary
        const highestPage = get().entries.reduce(
          (max, e) => Math.max(max, e.pageNumber || 0),
          0
        );
        const newPageNum = highestPage + 1;
        const today = new Date();
        const newEntryId = String(newPageNum);

        const firstEntry: DiaryEntry = {
          id: newEntryId,
          diaryId: id,
          pageNumber: newPageNum,
          dateStr: today.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          }),
          dayOfWeek: today.toLocaleDateString("en-US", { weekday: "long" }),
          yearStr: `Anno ${today.getFullYear()}`,
          title: "",
          description: "",
          gratitude: ["", "", ""],
          energyLevel: 3,
          startTime: "09:00",
          endTime: "17:00",
          mood: "🌿 Calm",
          weather: "sunny",
          isHearted: false,
          tags: ["Fresh Inscription"],
          createdAt: now,
        };

        set((state) => ({
          diaries: [newDiary, ...state.diaries],
          entries: [firstEntry, ...state.entries],
          activeDiaryId: id,
          currentEntryId: newEntryId,
        }));

        return newDiary;
      },

      updateDiary: (id, updates) =>
        set((state) => ({
          diaries: state.diaries.map((d) =>
            d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
          ),
        })),

      deleteDiary: (id) =>
        set((state) => ({
          diaries: state.diaries.filter((d) => d.id !== id),
          entries: state.entries.filter((e) => e.diaryId !== id),
        })),

      reorderDiaries: (diaryIds) =>
        set((state) => {
          const map = new Map(state.diaries.map((d) => [d.id, d]));
          const reordered: Diary[] = [];
          diaryIds.forEach((id, idx) => {
            const d = map.get(id);
            if (d) {
              reordered.push({ ...d, sortOrder: idx + 1 });
              map.delete(id);
            }
          });
          map.forEach((d) => reordered.push(d));
          return { diaries: reordered };
        }),

      toggleFavoriteDiary: (id) =>
        set((state) => ({
          diaries: state.diaries.map((d) =>
            d.id === id ? { ...d, isFavorite: !d.isFavorite, updatedAt: new Date().toISOString() } : d
          ),
        })),

      getDiaryById: (id) => {
        return get().diaries.find((d) => d.id === id);
      },

      getEntriesByDiaryId: (diaryId) => {
        return get().entries.filter((e) => e.diaryId === diaryId);
      },

      setActiveDiaryId: (activeDiaryId) => set({ activeDiaryId }),

      setEntries: (entries) => set({ entries }),

      getEntryById: (idOrPage) => {
        const idStr = String(idOrPage);
        const state = get();
        // 1. Direct match on entry id / pageNumber
        const found = state.entries.find(
          (e) =>
            e.id === idStr ||
            String(e.pageNumber) === idStr ||
            `page-${e.pageNumber}` === idStr
        );
        if (found) return found;


        // 2. If it's a diaryId, return the latest entry for that diary
        const diaryEntries = state.entries.filter((e) => e.diaryId === idStr);
        if (diaryEntries.length > 0) {
          return diaryEntries[0];
        }

        return state.entries[0];
      },

      updateEntry: (idOrPage, updates) =>
        set((state) => {
          const idStr = String(idOrPage);
          const updatedEntries = state.entries.map((entry) => {
            if (
              entry.id === idStr ||
              String(entry.pageNumber) === idStr ||
              `page-${entry.pageNumber}` === idStr
            ) {
              return {
                ...entry,
                ...updates,
                updatedAt: new Date().toISOString(),
              };
            }
            return entry;
          });
          return { entries: updatedEntries };
        }),

      createEntry: (diaryId, customData) => {
        const state = get();
        const targetDiaryId = diaryId || state.activeDiaryId || state.diaries[0]?.id || "diary-vintage-1";
        const highestPage = state.entries.reduce(
          (max, e) => Math.max(max, e.pageNumber || 0),
          0
        );
        const newPageNum = highestPage + 1;
        const today = new Date();
        const newId = String(newPageNum);

        const newEntry: DiaryEntry = {
          id: newId,
          diaryId: targetDiaryId,
          pageNumber: newPageNum,
          dateStr: today.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          }),
          dayOfWeek: today.toLocaleDateString("en-US", { weekday: "long" }),
          yearStr: `Anno ${today.getFullYear()}`,
          title: "",
          description: "",
          gratitude: ["", "", ""],
          energyLevel: 3,
          startTime: "09:00",
          endTime: "17:00",
          mood: "🌿 Calm",
          weather: "sunny",
          isHearted: false,
          tags: ["Daily Reflection"],
          createdAt: new Date().toISOString(),
          ...customData,
        };

        set((s) => ({
          entries: [newEntry, ...s.entries],
          currentEntryId: newId,
          activeDiaryId: targetDiaryId,
          currentPageIndex: 0,
        }));

        return newEntry;
      },

      deleteEntry: (idOrPage) =>
        set((state) => {
          const idStr = String(idOrPage);
          return {
            entries: state.entries.filter(
              (e) =>
                e.id !== idStr &&
                String(e.pageNumber) !== idStr &&
                `page-${e.pageNumber}` !== idStr
            ),
          };
        }),

      toggleHeart: (idOrPage) =>
        set((state) => {
          const idStr = String(idOrPage);
          return {
            entries: state.entries.map((e) => {
              if (
                e.id === idStr ||
                String(e.pageNumber) === idStr ||
                `page-${e.pageNumber}` === idStr
              ) {
                return { ...e, isHearted: !e.isHearted };
              }
              return e;
            }),
          };
        }),

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
      name: "the-commons-diary-store-v4",
      partialize: (state) => ({
        diaries: state.diaries,
        entries: state.entries,
        activeDiaryId: state.activeDiaryId,
      }),
    }
  )
);
