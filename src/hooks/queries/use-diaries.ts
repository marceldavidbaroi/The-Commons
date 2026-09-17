"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useDiaryStore } from "@/stores/diary-store";
import {
  Diary,
  DiaryEntry,
  DiaryTheme,
  INITIAL_DIARIES,
  INITIAL_ENTRIES,
} from "@/types/diary";
import type { DiaryStats } from "@/types/database";

export const diaryKeys = {
  all: ["diaries"] as const,
  lists: () => [...diaryKeys.all, "list"] as const,
  overview: () => [...diaryKeys.all, "overview"] as const,
  stats: (diaryId?: string) => [...diaryKeys.all, "stats", diaryId || "global"] as const,
  detail: (diaryId: string) => [...diaryKeys.all, "detail", diaryId] as const,
  entries: (diaryId?: string) => [...diaryKeys.all, "entries", diaryId || "all"] as const,
  entry: (diaryId: string, entryId: string) => [...diaryKeys.all, "entry", diaryId, entryId] as const,
};

/**
 * Hook to retrieve user diaries with aggregated metrics (entry counts, latest dates)
 * via 1 single atomic database RPC `get_user_diaries_overview`.
 */
export function useDiariesOverview() {
  const setDiariesInStore = useDiaryStore((state) => state.setDiaries);

  const query = useQuery({
    queryKey: diaryKeys.overview(),
    queryFn: async (): Promise<Diary[]> => {
      const currentStoreDiaries = useDiaryStore.getState().diaries;
      const fallbackDiaries = currentStoreDiaries.length > 0 ? currentStoreDiaries : INITIAL_DIARIES;

      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)("get_user_diaries_overview");

      if (error) {
        console.warn("RPC get_user_diaries_overview fallback to local store:", error.message);
        return fallbackDiaries;
      }

      const overviewList = (data as any[]) || [];
      if (overviewList.length === 0) {
        return fallbackDiaries;
      }

      return overviewList.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description || "",
        theme: d.theme as DiaryTheme,
        coverColor: d.cover_color || undefined,
        isFavorite: d.is_favorite,
        isArchived: d.is_archived,
        sortOrder: d.sort_order,
        entriesCount: d.entries_count ?? 0,
        highestPageNumber: d.highest_page_number ?? 0,
        latestEntryDate: d.latest_entry_date ?? null,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    },
    staleTime: 60 * 1000,
    initialData: () => {
      const current = useDiaryStore.getState().diaries;
      return current.length > 0 ? current : INITIAL_DIARIES;
    },
  });

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      setDiariesInStore(query.data);
    }
  }, [query.data, setDiariesInStore]);

  return query;
}

/**
 * Hook to retrieve entries for a specific diary tome with 1 single API call.
 */
export function useDiaryEntries(diaryId?: string) {
  const setEntriesInStore = useDiaryStore((state) => state.setEntries);

  const query = useQuery({
    queryKey: diaryKeys.entries(diaryId),
    queryFn: async (): Promise<DiaryEntry[]> => {
      const currentStoreEntries = useDiaryStore.getState().entries;
      const baseEntries = currentStoreEntries.length > 0 ? currentStoreEntries : INITIAL_ENTRIES;
      const localFiltered = diaryId
        ? baseEntries.filter((e: DiaryEntry) => e.diaryId === diaryId)
        : baseEntries;

      const supabase = createClient();
      let q = supabase
        .from("diary_entries")
        .select("*")
        .order("page_number", { ascending: false });

      if (diaryId) {
        q = q.eq("diary_id", diaryId);
      }

      const { data, error } = await q;

      if (error) {
        console.warn("Diary entries fetch fallback to local store:", error.message);
        return localFiltered;
      }

      if (!data || data.length === 0) {
        return localFiltered;
      }

      const mapped: DiaryEntry[] = (data as any[]).map((row) => ({
        id: row.id,
        diaryId: row.diary_id,
        userId: row.user_id,
        pageNumber: row.page_number,
        entryDate: row.entry_date,
        dateStr: row.date_str || "September 17",
        dayOfWeek: row.day_of_week || "Thursday",
        yearStr: row.year_str || "Anno 2026",
        title: row.title || "",
        description: row.description || "",
        gratitude: (row.gratitude as [string, string, string]) || ["", "", ""],
        energyLevel: row.energy_level || 3,
        startTime: row.start_time || "09:00",
        endTime: row.end_time || "17:00",
        mood: row.mood || "🌿 Calm",
        weather: row.weather || "sunny",
        isHearted: Boolean(row.is_hearted),
        tags: row.tags || [],
        wordCount: row.word_count || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return mapped;
    },
    staleTime: 30 * 1000,
    initialData: () => {
      const currentStoreEntries = useDiaryStore.getState().entries;
      const baseEntries = currentStoreEntries.length > 0 ? currentStoreEntries : INITIAL_ENTRIES;
      return diaryId ? baseEntries.filter((e: DiaryEntry) => e.diaryId === diaryId) : baseEntries;
    },
  });

  useEffect(() => {
    if (query.data && query.data.length > 0) {
      const currentStoreEntries = useDiaryStore.getState().entries;
      const remoteIds = new Set(query.data.map((e: DiaryEntry) => e.id));
      const untouchedLocal = currentStoreEntries.filter((e: DiaryEntry) => !remoteIds.has(e.id));
      setEntriesInStore([...query.data, ...untouchedLocal]);
    }
  }, [query.data, setEntriesInStore]);

  return query;
}

/**
 * Hook to retrieve user's overall or per-diary analytics via 1 single API call.
 */
export function useDiaryStats(diaryId?: string) {
  return useQuery({
    queryKey: diaryKeys.stats(diaryId),
    queryFn: async (): Promise<DiaryStats> => {
      const currentStoreEntries = useDiaryStore.getState().entries;
      const baseEntries = currentStoreEntries.length > 0 ? currentStoreEntries : INITIAL_ENTRIES;

      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)("get_diary_stats", {
        p_diary_id: diaryId ?? null,
      });

      if (error || !data) {
        const targetEntries = diaryId
          ? baseEntries.filter((e: DiaryEntry) => e.diaryId === diaryId)
          : baseEntries;
        const totalEntries = targetEntries.length;
        const totalWords = targetEntries.reduce(
          (sum: number, e: DiaryEntry) => sum + (e.description ? e.description.split(/\s+/).filter(Boolean).length : 0),
          0
        );
        const avgEnergy = totalEntries
          ? Number((targetEntries.reduce((sum: number, e: DiaryEntry) => sum + e.energyLevel, 0) / totalEntries).toFixed(1))
          : 0;
        const heartedCount = targetEntries.filter((e: DiaryEntry) => e.isHearted).length;
        const moodMap: Record<string, number> = {};
        const tagSet = new Set<string>();

        targetEntries.forEach((e: DiaryEntry) => {
          if (e.mood) moodMap[e.mood] = (moodMap[e.mood] || 0) + 1;
          e.tags?.forEach((t: string) => tagSet.add(t));
        });

        const uniqueDates = Array.from(
          new Set(
            targetEntries
              .map((e: DiaryEntry) => e.entryDate || e.createdAt?.split("T")[0])
              .filter(Boolean) as string[]
          )
        ).sort((a: string, b: string) => b.localeCompare(a));

        let currentStreak = 0;
        let longestStreak = 0;
        let streakCount = 0;
        let prevDate: Date | null = null;

        for (const dateStr of uniqueDates) {
          const d = new Date(dateStr);
          if (!prevDate) {
            streakCount = 1;
            currentStreak = 1;
          } else {
            const diffDays = Math.round((prevDate.getTime() - d.getTime()) / (1000 * 3600 * 24));
            if (diffDays === 1) {
              streakCount += 1;
              if (currentStreak > 0) currentStreak = streakCount;
            } else {
              streakCount = 1;
            }
          }
          if (streakCount > longestStreak) longestStreak = streakCount;
          prevDate = d;
        }

        return {
          total_entries: totalEntries,
          total_words: totalWords,
          average_energy: avgEnergy,
          hearted_entries: heartedCount,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          mood_breakdown: moodMap,
          tags: Array.from(tagSet),
        };
      }

      return data as DiaryStats;
    },
    staleTime: 60 * 1000,
    initialData: () => {
      const currentStoreEntries = useDiaryStore.getState().entries;
      const baseEntries = currentStoreEntries.length > 0 ? currentStoreEntries : INITIAL_ENTRIES;
      const targetEntries = diaryId
        ? baseEntries.filter((e: DiaryEntry) => e.diaryId === diaryId)
        : baseEntries;
      return {
        total_entries: targetEntries.length,
        total_words: 450,
        average_energy: 4.2,
        hearted_entries: 1,
        current_streak: 3,
        longest_streak: 5,
        mood_breakdown: { "🌿 Calm": 1, "⚡ Focused": 1, "✨ Inspired": 1 },
        tags: ["Daily Reflection", "Focus", "Deep Work"],
      };
    },
  });
}

/**
 * Mutation to create a new diary tome in Supabase via 1 SINGLE atomic RPC call (`create_diary_with_first_page`).
 */
export function useCreateDiaryMutation() {
  const queryClient = useQueryClient();
  const createDiaryInStore = useDiaryStore((state) => state.createDiary);
  const setDiariesInStore = useDiaryStore((state) => state.setDiaries);

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description: string;
      theme: DiaryTheme;
      coverColor?: string;
    }): Promise<Diary> => {
      // 1. Optimistic creation in local store
      const localCreated = createDiaryInStore(input);

      // 2. Exact 1 API call to Supabase RPC
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)("create_diary_with_first_page", {
        p_name: input.name.trim() || "Untitled Tome",
        p_description: input.description.trim() || null,
        p_theme: input.theme,
        p_cover_color: input.coverColor || null,
      });

      if (error) {
        console.warn("create_diary_with_first_page fallback to local store:", error.message);
        return localCreated;
      }

      const created = data as any;
      const syncedDiary: Diary = {
        id: created.id,
        userId: created.user_id,
        name: created.name,
        description: created.description || "",
        theme: created.theme,
        coverColor: created.cover_color,
        isFavorite: created.is_favorite,
        isArchived: created.is_archived,
        sortOrder: created.sort_order,
        entriesCount: created.entries_count || 1,
        highestPageNumber: created.highest_page_number || 1,
        latestEntryDate: created.latest_entry_date,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      };

      return syncedDiary;
    },
    onSuccess: (newDiary) => {
      // Direct cache update with 0 extra API calls
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return [newDiary];
        const exists = old.some((d) => d.id === newDiary.id);
        if (exists) return old.map((d) => (d.id === newDiary.id ? newDiary : d));
        return [newDiary, ...old];
      });
      const current = useDiaryStore.getState().diaries;
      const updated = current.some((d) => d.id === newDiary.id)
        ? current.map((d) => (d.id === newDiary.id ? newDiary : d))
        : [newDiary, ...current];
      setDiariesInStore(updated);
    },
  });
}

/**
 * Mutation to update/save a diary entry page in Supabase via 1 SINGLE API call.
 */
export function useUpdateDiaryEntryMutation() {
  const queryClient = useQueryClient();
  const updateEntryInStore = useDiaryStore((state) => state.updateEntry);

  return useMutation({
    mutationFn: async ({
      entryId,
      updates,
    }: {
      entryId: string;
      updates: Partial<DiaryEntry>;
    }) => {
      // 1. Instant local update
      updateEntryInStore(entryId, updates);

      // 2. Exact 1 API call to Supabase table update
      const supabase = createClient();
      const dbPayload: any = {};
      if (updates.title !== undefined) dbPayload.title = updates.title;
      if (updates.description !== undefined) {
        dbPayload.description = updates.description;
        dbPayload.word_count = updates.description.trim().split(/\s+/).filter(Boolean).length;
      }
      if (updates.gratitude !== undefined) dbPayload.gratitude = updates.gratitude;
      if (updates.energyLevel !== undefined) dbPayload.energy_level = updates.energyLevel;
      if (updates.startTime !== undefined) dbPayload.start_time = updates.startTime;
      if (updates.endTime !== undefined) dbPayload.end_time = updates.endTime;
      if (updates.mood !== undefined) dbPayload.mood = updates.mood;
      if (updates.weather !== undefined) dbPayload.weather = updates.weather;
      if (updates.isHearted !== undefined) dbPayload.is_hearted = updates.isHearted;
      if (updates.tags !== undefined) dbPayload.tags = updates.tags;

      const { error } = await (supabase.from("diary_entries") as any)
        .update(dbPayload)
        .eq("id", entryId);

      if (error) {
        console.warn("Failed to persist entry update to Supabase:", error.message);
      }

      return { entryId, updates };
    },
    onSuccess: ({ entryId, updates }) => {
      // Update cache in-place without triggering extra GET queries
      queryClient.setQueriesData<DiaryEntry[]>({ queryKey: diaryKeys.all }, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((e) => (e.id === entryId ? { ...e, ...updates } : e));
      });
    },
  });
}

/**
 * Mutation to create a fresh new page in a diary via 1 SINGLE atomic RPC call (`create_diary_entry`).
 */
export function useCreateDiaryEntryMutation() {
  const queryClient = useQueryClient();
  const createEntryInStore = useDiaryStore((state) => state.createEntry);

  return useMutation({
    mutationFn: async ({
      diaryId,
      customData,
    }: {
      diaryId: string;
      customData?: Partial<DiaryEntry>;
    }): Promise<DiaryEntry> => {
      // 1. Instant local optimistic entry
      const localEntry = createEntryInStore(diaryId, customData);

      // 2. Exact 1 API call to Supabase RPC
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)("create_diary_entry", {
        p_diary_id: diaryId,
        p_title: customData?.title || "",
        p_description: customData?.description || "",
        p_gratitude: customData?.gratitude || ["", "", ""],
        p_energy_level: customData?.energyLevel || 3,
        p_start_time: customData?.startTime || "09:00",
        p_end_time: customData?.endTime || "17:00",
        p_mood: customData?.mood || "🌿 Calm",
        p_weather: customData?.weather || "sunny",
        p_is_hearted: Boolean(customData?.isHearted),
        p_tags: customData?.tags || ["Daily Reflection"],
      });

      if (error) {
        console.warn("create_diary_entry fallback to local store:", error.message);
        return localEntry;
      }

      const row = data as any;
      return {
        id: row.id,
        diaryId: row.diary_id,
        userId: row.user_id,
        pageNumber: row.page_number,
        entryDate: row.entry_date,
        dateStr: row.date_str || localEntry.dateStr,
        dayOfWeek: row.day_of_week || localEntry.dayOfWeek,
        yearStr: row.year_str || localEntry.yearStr,
        title: row.title || "",
        description: row.description || "",
        gratitude: (row.gratitude as [string, string, string]) || ["", "", ""],
        energyLevel: row.energy_level || 3,
        startTime: row.start_time || "09:00",
        endTime: row.end_time || "17:00",
        mood: row.mood || "🌿 Calm",
        weather: row.weather || "sunny",
        isHearted: Boolean(row.is_hearted),
        tags: row.tags || ["Daily Reflection"],
        wordCount: row.word_count || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    },
    onSuccess: (newEntry, variables) => {
      // Update cache in-place with 0 extra API calls
      queryClient.setQueryData<DiaryEntry[]>(diaryKeys.entries(variables.diaryId), (old) => {
        if (!old) return [newEntry];
        return [newEntry, ...old.filter((e) => e.id !== newEntry.id)];
      });
      // Increment entry count in overview cache
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return old;
        return old.map((d) =>
          d.id === variables.diaryId
            ? {
                ...d,
                entriesCount: (d.entriesCount || 0) + 1,
                highestPageNumber: Math.max(d.highestPageNumber || 0, newEntry.pageNumber),
              }
            : d
        );
      });
    },
  });
}

/**
 * Mutation to delete a diary tome via 1 SINGLE API call.
 */
export function useDeleteDiaryMutation() {
  const queryClient = useQueryClient();
  const deleteDiaryInStore = useDiaryStore((state) => state.deleteDiary);

  return useMutation({
    mutationFn: async (diaryId: string) => {
      // 1. Instant local deletion
      deleteDiaryInStore(diaryId);

      // 2. Exact 1 API call to Supabase delete
      const supabase = createClient();
      const { error } = await supabase.from("diaries").delete().eq("id", diaryId);
      if (error) {
        console.warn("Failed to delete diary from Supabase:", error.message);
      }
      return diaryId;
    },
    onSuccess: (diaryId) => {
      // In-place cache cleanup with 0 extra API calls
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return [];
        return old.filter((d) => d.id !== diaryId);
      });
      queryClient.removeQueries({ queryKey: diaryKeys.entries(diaryId) });
      queryClient.removeQueries({ queryKey: diaryKeys.stats(diaryId) });
    },
  });
}

/**
 * Mutation to delete an individual diary entry via 1 SINGLE API call.
 */
export function useDeleteDiaryEntryMutation() {
  const queryClient = useQueryClient();
  const deleteEntryInStore = useDiaryStore((state) => state.deleteEntry);

  return useMutation({
    mutationFn: async ({ entryId, diaryId }: { entryId: string; diaryId: string }) => {
      // 1. Instant local deletion
      deleteEntryInStore(entryId);

      // 2. Exact 1 API call to Supabase delete
      const supabase = createClient();
      const { error } = await supabase.from("diary_entries").delete().eq("id", entryId);
      if (error) {
        console.warn("Failed to delete diary entry from Supabase:", error.message);
      }
      return { entryId, diaryId };
    },
    onSuccess: ({ entryId, diaryId }) => {
      // In-place cache update with 0 extra API calls
      queryClient.setQueryData<DiaryEntry[]>(diaryKeys.entries(diaryId), (old) => {
        if (!old) return [];
        return old.filter((e) => e.id !== entryId);
      });
      // Decrement overview count in cache
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return old;
        return old.map((d) =>
          d.id === diaryId ? { ...d, entriesCount: Math.max(0, (d.entriesCount || 1) - 1) } : d
        );
      });
    },
  });
}

/**
 * Mutation to reorder user's diary tomes via 1 SINGLE atomic RPC call (`reorder_diaries`).
 */
export function useReorderDiariesMutation() {
  const queryClient = useQueryClient();
  const reorderDiariesInStore = useDiaryStore((state) => state.reorderDiaries);

  return useMutation({
    mutationFn: async (diaryIds: string[]) => {
      // 1. Instant local store reorder
      reorderDiariesInStore(diaryIds);

      // 2. Exact 1 API call to Supabase RPC
      const supabase = createClient();
      const { error } = await (supabase.rpc as any)("reorder_diaries", {
        p_diary_ids: diaryIds,
      });

      if (error) {
        console.warn("reorder_diaries fallback to local store:", error.message);
      }

      return diaryIds;
    },
    onSuccess: (diaryIds) => {
      // Reorder TanStack Query cache in-place with 0 refetches
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return old;
        const map = new Map(old.map((d) => [d.id, d]));
        const reordered: Diary[] = [];
        diaryIds.forEach((id, idx) => {
          const d = map.get(id);
          if (d) {
            reordered.push({ ...d, sortOrder: idx + 1 });
            map.delete(id);
          }
        });
        map.forEach((d) => reordered.push(d));
        return reordered;
      });
    },
  });
}

/**
 * Mutation to update an existing diary tome via 1 SINGLE API call.
 */
export function useUpdateDiaryMutation() {
  const queryClient = useQueryClient();
  const updateDiaryInStore = useDiaryStore((state) => state.updateDiary);

  return useMutation({
    mutationFn: async ({
      diaryId,
      updates,
    }: {
      diaryId: string;
      updates: {
        name?: string;
        description?: string;
        theme?: DiaryTheme;
        coverColor?: string;
        isFavorite?: boolean;
        isArchived?: boolean;
        sortOrder?: number;
      };
    }) => {
      const defaultCoverColor =
        updates.coverColor ||
        (updates.theme === "vintage"
          ? "#8C3A27"
          : updates.theme === "classic"
          ? "#1E3A5F"
          : updates.theme === "modern"
          ? "#172330"
          : undefined);

      const localUpdates: Partial<Diary> = {
        ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
        ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
        ...(updates.theme !== undefined ? { theme: updates.theme } : {}),
        ...(defaultCoverColor !== undefined ? { coverColor: defaultCoverColor } : {}),
        ...(updates.isFavorite !== undefined ? { isFavorite: updates.isFavorite } : {}),
        ...(updates.isArchived !== undefined ? { isArchived: updates.isArchived } : {}),
        ...(updates.sortOrder !== undefined ? { sortOrder: updates.sortOrder } : {}),
      };

      // 1. Instant local store update
      updateDiaryInStore(diaryId, localUpdates);

      // 2. Exact 1 API call to Supabase table update
      const supabase = createClient();
      const dbPayload: any = {};
      if (updates.name !== undefined) dbPayload.name = updates.name.trim();
      if (updates.description !== undefined) dbPayload.description = updates.description.trim();
      if (updates.theme !== undefined) dbPayload.theme = updates.theme;
      if (defaultCoverColor !== undefined) dbPayload.cover_color = defaultCoverColor;
      if (updates.isFavorite !== undefined) dbPayload.is_favorite = updates.isFavorite;
      if (updates.isArchived !== undefined) dbPayload.is_archived = updates.isArchived;
      if (updates.sortOrder !== undefined) dbPayload.sort_order = updates.sortOrder;

      const { error } = await (supabase.from("diaries") as any)
        .update(dbPayload)
        .eq("id", diaryId);

      if (error) {
        console.warn("Failed to update diary in Supabase:", error.message);
      }

      return { diaryId, localUpdates };
    },
    onSuccess: ({ diaryId, localUpdates }) => {
      // In-place cache update with 0 extra API calls
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return old;
        return old.map((d) => (d.id === diaryId ? { ...d, ...localUpdates } : d));
      });
    },
  });
}

