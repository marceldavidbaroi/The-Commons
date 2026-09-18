"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DiaryService, isUuid } from "@/services/diary.service";
import { notify } from "@/lib/notify";
import type { CreateDiaryInput, UpdateDiaryInput, CreateDiaryEntryInput } from "@/services/diary.service";
import type { Diary, DiaryEntry } from "@/types/diary";
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

export { isUuid };

/**
 * Hook to retrieve user diaries overview with aggregated metrics.
 */
export function useDiariesOverview() {
  return useQuery({
    queryKey: diaryKeys.overview(),
    queryFn: async (): Promise<Diary[]> => {
      return DiaryService.getDiariesOverview();
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to retrieve entries for a specific diary tome.
 */
export function useDiaryEntries(diaryId?: string) {
  return useQuery({
    queryKey: diaryKeys.entries(diaryId),
    queryFn: async (): Promise<DiaryEntry[]> => {
      return DiaryService.getDiaryEntries(diaryId);
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to retrieve user's overall or per-diary analytics.
 */
export function useDiaryStats(diaryId?: string) {
  return useQuery({
    queryKey: diaryKeys.stats(diaryId),
    queryFn: async (): Promise<DiaryStats> => {
      return DiaryService.getDiaryStats(diaryId);
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Mutation to create a new diary tome in Supabase via Service Layer.
 */
export function useCreateDiaryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDiaryInput): Promise<Diary> => {
      return DiaryService.createDiary(input);
    },
    onSuccess: (newDiary) => {
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return [newDiary];
        const exists = old.some((d) => d.id === newDiary.id);
        if (exists) return old.map((d) => (d.id === newDiary.id ? newDiary : d));
        return [newDiary, ...old];
      });

      if (newDiary.firstEntryId) {
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const initialEntry: DiaryEntry = {
          id: newDiary.firstEntryId,
          diaryId: newDiary.id,
          userId: newDiary.userId,
          pageNumber: 1,
          entryDate: todayStr,
          dateStr: today.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
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
          wordCount: 0,
          createdAt: newDiary.createdAt || new Date().toISOString(),
        };

        queryClient.setQueryData<DiaryEntry[]>(diaryKeys.entries(newDiary.id), [initialEntry]);
      }

      queryClient.invalidateQueries({ queryKey: diaryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: diaryKeys.stats() });

      notify.success(
        "Tome Inscribed & Bound",
        `Volume "${newDiary.name}" is now safely recorded in your sanctuary archive.`
      );
    },
    onError: (error) => {
      notify.error(error, "Failed to bind new chronicle volume.");
    },
  });
}

/**
 * Mutation to update an existing diary tome.
 */
export function useUpdateDiaryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      diaryId,
      updates,
    }: {
      diaryId: string;
      updates: UpdateDiaryInput;
    }): Promise<Diary> => {
      return DiaryService.updateDiary(diaryId, updates);
    },
    onSuccess: (updatedDiary) => {
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return [updatedDiary];
        return old.map((d) => (d.id === updatedDiary.id ? updatedDiary : d));
      });
      queryClient.invalidateQueries({ queryKey: diaryKeys.overview() });
      notify.success(
        "Chronicle Calibrated",
        `Properties for "${updatedDiary.name}" were updated.`
      );
    },
    onError: (error) => {
      notify.error(error, "Failed to update diary properties.");
    },
  });
}

/**
 * Mutation to delete a diary tome.
 */
export function useDeleteDiaryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (diaryId: string): Promise<string> => {
      return DiaryService.deleteDiary(diaryId);
    },
    onSuccess: (diaryId) => {
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return [];
        return old.filter((d) => d.id !== diaryId);
      });
      queryClient.removeQueries({ queryKey: diaryKeys.entries(diaryId) });
      queryClient.removeQueries({ queryKey: diaryKeys.stats(diaryId) });
      queryClient.invalidateQueries({ queryKey: diaryKeys.overview() });

      notify.info(
        "Volume Dissolved",
        "The diary tome and its pages were removed from the sanctuary."
      );
    },
    onError: (error) => {
      notify.error(error, "Failed to remove diary volume.");
    },
  });
}

/**
 * Mutation to create a fresh new page in a diary.
 */
export function useCreateDiaryEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      diaryId,
      customData,
    }: {
      diaryId: string;
      customData?: Partial<DiaryEntry>;
    }): Promise<DiaryEntry> => {
      const payload: CreateDiaryEntryInput = {
        diaryId,
        title: customData?.title,
        description: customData?.description,
        gratitude: customData?.gratitude,
        energyLevel: customData?.energyLevel,
        startTime: customData?.startTime,
        endTime: customData?.endTime,
        mood: customData?.mood,
        weather: customData?.weather,
        isHearted: customData?.isHearted,
        tags: customData?.tags,
      };
      return DiaryService.createDiaryEntry(payload);
    },
    onSuccess: (newEntry, variables) => {
      queryClient.setQueryData<DiaryEntry[]>(diaryKeys.entries(variables.diaryId), (old) => {
        if (!old) return [newEntry];
        return [newEntry, ...old.filter((e) => e.id !== newEntry.id)];
      });

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

      queryClient.invalidateQueries({ queryKey: diaryKeys.entries(variables.diaryId) });
      queryClient.invalidateQueries({ queryKey: diaryKeys.overview() });
      queryClient.invalidateQueries({ queryKey: diaryKeys.stats() });

      notify.success(
        "Fresh Leaf Bound",
        `Page ${newEntry.pageNumber} has been added to your tome.`
      );
    },
    onError: (error) => {
      notify.error(error, "Failed to insert new page leaf.");
    },
  });
}

/**
 * Mutation to update/save a diary entry page.
 */
export function useUpdateDiaryEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      updates,
    }: {
      entryId: string;
      updates: Partial<DiaryEntry>;
    }) => {
      return DiaryService.updateDiaryEntry(entryId, updates);
    },
    onSuccess: ({ entryId, updates }) => {
      queryClient.setQueriesData<DiaryEntry[]>({ queryKey: diaryKeys.all }, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((e) => (e.id === entryId ? { ...e, ...updates } : e));
      });
      queryClient.invalidateQueries({ queryKey: diaryKeys.stats() });
    },
    onError: (error) => {
      notify.error(error, "Failed to synchronize reflection to cloud.");
    },
  });
}

/**
 * Mutation to delete an individual diary entry.
 */
export function useDeleteDiaryEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, diaryId }: { entryId: string; diaryId: string }) => {
      return DiaryService.deleteDiaryEntry(entryId, diaryId);
    },
    onSuccess: ({ entryId, diaryId }) => {
      queryClient.setQueryData<DiaryEntry[]>(diaryKeys.entries(diaryId), (old) => {
        if (!old) return [];
        return old.filter((e) => e.id !== entryId);
      });
      queryClient.setQueryData<Diary[]>(diaryKeys.overview(), (old) => {
        if (!old) return old;
        return old.map((d) =>
          d.id === diaryId ? { ...d, entriesCount: Math.max(0, (d.entriesCount || 1) - 1) } : d
        );
      });
      queryClient.invalidateQueries({ queryKey: diaryKeys.entries(diaryId) });
      queryClient.invalidateQueries({ queryKey: diaryKeys.stats(diaryId) });

      notify.info("Leaf Discarded", "The page was removed from the chronicle.");
    },
    onError: (error) => {
      notify.error(error, "Failed to delete page leaf.");
    },
  });
}

/**
 * Mutation to reorder user's diary tomes.
 */
export function useReorderDiariesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (diaryIds: string[]): Promise<string[]> => {
      return DiaryService.reorderDiaries(diaryIds);
    },
    onSuccess: (diaryIds) => {
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
      notify.info("Archive Reordered", "Your tome bookshelf order was preserved.");
    },
    onError: (error) => {
      notify.error(error, "Failed to persist bookshelf order.");
    },
  });
}

/**
 * Mutation to bookmark/heart an entry page.
 */
export function useToggleHeartEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      isHearted,
      diaryId,
    }: {
      entryId: string;
      isHearted: boolean;
      diaryId?: string;
    }) => {
      return DiaryService.toggleHeart(entryId, isHearted, diaryId);
    },
    onSuccess: ({ entryId, isHearted, diaryId }) => {
      queryClient.setQueriesData<DiaryEntry[]>({ queryKey: diaryKeys.all }, (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((e) => (e.id === entryId ? { ...e, isHearted } : e));
      });
      if (diaryId) {
        queryClient.setQueryData<DiaryStats>(diaryKeys.stats(diaryId), (old) => {
          if (!old) return old;
          const currentHearted = old.hearted_entries ?? 0;
          const newHearted = isHearted ? currentHearted + 1 : Math.max(0, currentHearted - 1);
          return {
            ...old,
            hearted_entries: newHearted,
          };
        });
      }
    },
    onError: (error) => {
      notify.error(error, "Failed to update bookmark.");
    },
  });
}
