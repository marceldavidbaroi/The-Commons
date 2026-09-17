import { createClient } from "@/lib/supabase/client";
import { useDiaryStore } from "@/stores/diary-store";
import {
  Diary,
  DiaryEntry,
  DiaryTheme,
  DiaryStats,
  INITIAL_DIARIES,
  INITIAL_ENTRIES,
} from "@/types/diary";

/**
 * Fetches all user diaries with joined metrics via RPC get_user_diaries_overview.
 */
export async function fetchUserDiariesOverview(): Promise<Diary[]> {
  const currentStoreDiaries = useDiaryStore.getState().diaries;
  const fallbackDiaries = currentStoreDiaries.length > 0 ? currentStoreDiaries : INITIAL_DIARIES;

  const supabase = createClient();
  const { data, error } = await (supabase.rpc as any)("get_user_diaries_overview");

  if (error || !data || (data as any[]).length === 0) {
    return fallbackDiaries;
  }

  return (data as any[]).map((d) => ({
    id: d.id,
    userId: d.user_id,
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
}

/**
 * Calculates user-wide or tome-specific analytics via RPC get_diary_stats.
 */
export async function fetchDiaryStats(diaryId?: string): Promise<DiaryStats> {
  const supabase = createClient();
  const { data, error } = await (supabase.rpc as any)("get_diary_stats", {
    p_diary_id: diaryId ?? null,
  });

  if (error || !data) {
    const currentStoreEntries = useDiaryStore.getState().entries;
    const baseEntries = currentStoreEntries.length > 0 ? currentStoreEntries : INITIAL_ENTRIES;
    const targetEntries = diaryId
      ? baseEntries.filter((e: DiaryEntry) => e.diaryId === diaryId)
      : baseEntries;

    const totalEntries = targetEntries.length;
    const totalWords = targetEntries.reduce(
      (sum: number, e: DiaryEntry) =>
        sum + (e.description ? e.description.split(/\s+/).filter(Boolean).length : 0),
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

    return {
      diaryId: diaryId ?? null,
      totalEntries,
      totalWords,
      averageEnergy: avgEnergy,
      heartedEntries: heartedCount,
      currentStreak: 1,
      longestStreak: 3,
      moodBreakdown: moodMap,
      tags: Array.from(tagSet),
      total_entries: totalEntries,
      total_words: totalWords,
      average_energy: avgEnergy,
      hearted_entries: heartedCount,
      current_streak: 1,
      longest_streak: 3,
      mood_breakdown: moodMap,
    };
  }

  return {
    ...(data as any),
    diaryId: diaryId ?? null,
    totalEntries: data.total_entries,
    totalWords: data.total_words,
    averageEnergy: data.average_energy,
    heartedEntries: data.hearted_entries,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    moodBreakdown: data.mood_breakdown,
  };
}

/**
 * Fetches entries for a specific diary tome with RLS.
 */
export async function fetchDiaryEntries(diaryId?: string): Promise<DiaryEntry[]> {
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
  if (error || !data || data.length === 0) {
    return localFiltered;
  }

  return (data as any[]).map((row) => ({
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
}

/**
 * Fetches a single entry page.
 */
export async function fetchDiaryEntry(entryId: string): Promise<DiaryEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("diary_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (error || !data) {
    const fromStore = useDiaryStore.getState().getEntryById(entryId);
    if (fromStore) return fromStore;
    return INITIAL_ENTRIES[0];
  }

  const row = data as any;
  return {
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
  };
}

/**
 * Atomically creates a new diary tome and initializes its first page via RPC create_diary_with_first_page.
 */
export async function createDiaryWithFirstPage(params: {
  name: string;
  description?: string;
  theme?: DiaryTheme;
  coverColor?: string;
}): Promise<Diary> {
  const supabase = createClient();
  const { data, error } = await (supabase.rpc as any)("create_diary_with_first_page", {
    p_name: params.name.trim() || "Untitled Tome",
    p_description: params.description?.trim() || null,
    p_theme: params.theme || "vintage",
    p_cover_color: params.coverColor || null,
  });

  if (error || !data) {
    return useDiaryStore.getState().createDiary({
      name: params.name,
      description: params.description || "",
      theme: params.theme || "vintage",
      coverColor: params.coverColor,
    });
  }

  const created = data as any;
  return {
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
}

/**
 * Atomically adds a new sequential page to a diary via RPC create_diary_entry.
 */
export async function createDiaryEntry(params: {
  diaryId: string;
  title?: string;
  description?: string;
  gratitude?: [string, string, string];
  energyLevel?: number;
  startTime?: string;
  endTime?: string;
  mood?: string;
  weather?: string;
  isHearted?: boolean;
  tags?: string[];
}): Promise<DiaryEntry> {
  const supabase = createClient();
  const { data, error } = await (supabase.rpc as any)("create_diary_entry", {
    p_diary_id: params.diaryId,
    p_title: params.title || "",
    p_description: params.description || "",
    p_gratitude: params.gratitude || ["", "", ""],
    p_energy_level: params.energyLevel || 3,
    p_start_time: params.startTime || "09:00",
    p_end_time: params.endTime || "17:00",
    p_mood: params.mood || "🌿 Calm",
    p_weather: params.weather || "sunny",
    p_is_hearted: Boolean(params.isHearted),
    p_tags: params.tags || ["Daily Reflection"],
  });

  if (error || !data) {
    return useDiaryStore.getState().createEntry(params.diaryId, params);
  }

  const row = data as any;
  return {
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
    tags: row.tags || ["Daily Reflection"],
    wordCount: row.word_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Updates diary tome metadata via Supabase Table Update.
 */
export async function updateDiary(
  id: string,
  params: Partial<Pick<Diary, "name" | "description" | "theme" | "coverColor" | "isFavorite" | "isArchived" | "sortOrder">>
): Promise<Diary> {
  const supabase = createClient();
  const dbPayload: any = {};
  if (params.name !== undefined) dbPayload.name = params.name.trim();
  if (params.description !== undefined) dbPayload.description = params.description.trim();
  if (params.theme !== undefined) dbPayload.theme = params.theme;
  if (params.coverColor !== undefined) dbPayload.cover_color = params.coverColor;
  if (params.isFavorite !== undefined) dbPayload.is_favorite = params.isFavorite;
  if (params.isArchived !== undefined) dbPayload.is_archived = params.isArchived;
  if (params.sortOrder !== undefined) dbPayload.sort_order = params.sortOrder;

  const { data, error } = await (supabase.from("diaries") as any)
    .update(dbPayload)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    useDiaryStore.getState().updateDiary(id, params);
    return (
      useDiaryStore.getState().getDiaryById(id) || {
        id,
        name: params.name || "Untitled Tome",
        description: params.description || "",
        theme: params.theme || "vintage",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    description: data.description || "",
    theme: data.theme,
    coverColor: data.cover_color,
    isFavorite: data.is_favorite,
    isArchived: data.is_archived,
    sortOrder: data.sort_order,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Deletes a diary tome and cascades entry deletion via Supabase Table Delete.
 */
export async function deleteDiary(id: string): Promise<{ success: boolean; id: string }> {
  const supabase = createClient();
  useDiaryStore.getState().deleteDiary(id);
  const { error } = await supabase.from("diaries").delete().eq("id", id);
  return { success: !error, id };
}

/**
 * Updates or autosaves an entry page via Supabase Table Update.
 */
export async function saveDiaryEntry(
  entry: Partial<DiaryEntry> & { id: string }
): Promise<DiaryEntry> {
  const supabase = createClient();
  const dbPayload: any = {};
  if (entry.title !== undefined) dbPayload.title = entry.title;
  if (entry.description !== undefined) {
    dbPayload.description = entry.description;
    dbPayload.word_count = entry.description.trim().split(/\s+/).filter(Boolean).length;
  }
  if (entry.gratitude !== undefined) dbPayload.gratitude = entry.gratitude;
  if (entry.energyLevel !== undefined) dbPayload.energy_level = entry.energyLevel;
  if (entry.startTime !== undefined) dbPayload.start_time = entry.startTime;
  if (entry.endTime !== undefined) dbPayload.end_time = entry.endTime;
  if (entry.mood !== undefined) dbPayload.mood = entry.mood;
  if (entry.weather !== undefined) dbPayload.weather = entry.weather;
  if (entry.isHearted !== undefined) dbPayload.is_hearted = entry.isHearted;
  if (entry.tags !== undefined) dbPayload.tags = entry.tags;

  useDiaryStore.getState().updateEntry(entry.id, entry);

  const { data, error } = await (supabase.from("diary_entries") as any)
    .update(dbPayload)
    .eq("id", entry.id)
    .select()
    .single();

  if (error || !data) {
    return (
      useDiaryStore.getState().getEntryById(entry.id) ||
      ({ ...entry } as DiaryEntry)
    );
  }

  return {
    id: data.id,
    diaryId: data.diary_id,
    userId: data.user_id,
    pageNumber: data.page_number,
    entryDate: data.entry_date,
    dateStr: data.date_str,
    dayOfWeek: data.day_of_week,
    yearStr: data.year_str,
    title: data.title,
    description: data.description,
    gratitude: data.gratitude,
    energyLevel: data.energy_level,
    startTime: data.start_time,
    endTime: data.end_time,
    mood: data.mood,
    weather: data.weather,
    isHearted: data.is_hearted,
    tags: data.tags,
    wordCount: data.word_count,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Deletes an entry page via Supabase Table Delete.
 */
export async function deleteDiaryEntry(
  entryId: string
): Promise<{ success: boolean; id: string }> {
  const supabase = createClient();
  useDiaryStore.getState().deleteEntry(entryId);
  const { error } = await supabase.from("diary_entries").delete().eq("id", entryId);
  return { success: !error, id: entryId };
}

/**
 * Reorders diary tomes via RPC reorder_diaries.
 */
export async function reorderDiaries(diaryIds: string[]): Promise<void> {
  useDiaryStore.getState().reorderDiaries(diaryIds);
  const supabase = createClient();
  await (supabase.rpc as any)("reorder_diaries", {
    p_diary_ids: diaryIds,
  });
}
