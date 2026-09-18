import { BaseService, ServiceError } from "./base.service";
import type { Diary, DiaryEntry, DiaryTheme } from "@/types/diary";
import type { DiaryStats } from "@/types/database";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (val?: string | null): boolean => {
  if (!val || typeof val !== "string") return false;
  return UUID_REGEX.test(val);
};

export interface CreateDiaryInput {
  name: string;
  description?: string;
  theme: DiaryTheme;
  coverColor?: string;
}

export interface UpdateDiaryInput {
  name?: string;
  description?: string;
  theme?: DiaryTheme;
  coverColor?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  sortOrder?: number;
}

export interface CreateDiaryEntryInput {
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
}

export class DiaryService extends BaseService {
  /**
   * Fetches user diaries overview with aggregated entry counts and latest dates.
   */
  static async getDiariesOverview(): Promise<Diary[]> {
    try {
      const user = await this.getAuthenticatedUser(false);
      if (!user) return [];

      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from("diaries")
        .select("*, diary_entries(id, page_number, entry_date)")
        .eq("user_id", user.id)
        .order("is_favorite", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => {
        const entries = d.diary_entries || [];
        const highestPage = entries.reduce(
          (max: number, e: any) => Math.max(max, e.page_number || 0),
          0
        );
        const sortedDates = entries
          .map((e: any) => e.entry_date)
          .filter(Boolean)
          .sort((a: string, b: string) => b.localeCompare(a));

        return {
          id: d.id,
          userId: d.user_id,
          name: d.name,
          description: d.description || "",
          theme: (d.theme as DiaryTheme) || "vintage",
          coverColor: d.cover_color || undefined,
          isFavorite: Boolean(d.is_favorite),
          isArchived: Boolean(d.is_archived),
          sortOrder: d.sort_order ?? 0,
          entriesCount: entries.length,
          highestPageNumber: highestPage,
          latestEntryDate: sortedDates[0] || null,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        };
      });
    } catch (error) {
      return this.handleError(error, "Failed to retrieve user diaries.");
    }
  }

  /**
   * Fetches entries for a specific diary tome or all user entries.
   */
  static async getDiaryEntries(diaryId?: string): Promise<DiaryEntry[]> {
    try {
      const user = await this.getAuthenticatedUser(false);
      if (!user) return [];

      const supabase = this.getSupabase();
      let q = supabase
        .from("diary_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("page_number", { ascending: false });

      if (diaryId && isUuid(diaryId)) {
        q = q.eq("diary_id", diaryId);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((row: any) => ({
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
    } catch (error) {
      return this.handleError(error, "Failed to retrieve diary entries.");
    }
  }

  /**
   * Computes diary statistics directly from entries.
   */
  static async getDiaryStats(diaryId?: string): Promise<DiaryStats> {
    try {
      const entries = await this.getDiaryEntries(diaryId);
      return this.computeStatsFromEntries(entries);
    } catch {
      return this.computeEmptyStats();
    }
  }

  /**
   * Creates a new diary tome along with its first initial leaf.
   */
  static async createDiary(input: CreateDiaryInput): Promise<Diary> {
    try {
      const user = await this.getAuthenticatedUser(true);
      if (!user) throw new Error("Authenticated user required");

      await this.ensureProfile(user.id, user.email);

      const supabase = this.getSupabase();
      const defaultCoverColor =
        input.coverColor ||
        (input.theme === "vintage" ? "#8C3A27" : input.theme === "classic" ? "#1E3A5F" : "#172330");

      const { data: newDiaryRow, error: diaryError } = await (supabase.from("diaries") as any)
        .insert({
          user_id: user.id,
          name: input.name.trim() || "Untitled Tome",
          description: input.description?.trim() || null,
          theme: input.theme,
          cover_color: defaultCoverColor,
          is_favorite: false,
          is_archived: false,
          sort_order: 0,
        })
        .select()
        .single();

      if (diaryError || !newDiaryRow) {
        throw diaryError || new Error("Failed to insert diary record.");
      }

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];
      const { data: firstEntryRow } = await (supabase.from("diary_entries") as any)
        .insert({
          diary_id: newDiaryRow.id,
          user_id: user.id,
          page_number: 1,
          entry_date: todayStr,
          date_str: today.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
          day_of_week: today.toLocaleDateString("en-US", { weekday: "long" }),
          year_str: `Anno ${today.getFullYear()}`,
          title: "",
          description: "",
          gratitude: ["", "", ""],
          energy_level: 3,
          start_time: "09:00",
          end_time: "17:00",
          mood: "🌿 Calm",
          weather: "sunny",
          is_hearted: false,
          tags: ["Fresh Inscription"],
          word_count: 0,
        })
        .select()
        .single();

      return {
        id: newDiaryRow.id,
        userId: newDiaryRow.user_id,
        name: newDiaryRow.name,
        description: newDiaryRow.description || "",
        theme: newDiaryRow.theme,
        coverColor: newDiaryRow.cover_color,
        isFavorite: Boolean(newDiaryRow.is_favorite),
        isArchived: Boolean(newDiaryRow.is_archived),
        sortOrder: newDiaryRow.sort_order,
        entriesCount: 1,
        highestPageNumber: 1,
        latestEntryDate: todayStr,
        firstEntryId: firstEntryRow?.id,
        createdAt: newDiaryRow.created_at,
        updatedAt: newDiaryRow.updated_at,
      };
    } catch (error) {
      return this.handleError(error, "Failed to create diary tome.");
    }
  }

  /**
   * Updates an existing diary tome's properties.
   */
  static async updateDiary(diaryId: string, updates: UpdateDiaryInput): Promise<Diary> {
    try {
      const user = await this.getAuthenticatedUser(false);
      if (!user || !isUuid(diaryId)) {
        throw new ServiceError("Invalid diary ID format", "INVALID_ID");
      }

      const supabase = this.getSupabase();
      const dbPayload: any = {};
      if (updates.name !== undefined) dbPayload.name = updates.name.trim();
      if (updates.description !== undefined) dbPayload.description = updates.description.trim();
      if (updates.theme !== undefined) dbPayload.theme = updates.theme;
      if (updates.coverColor !== undefined) dbPayload.cover_color = updates.coverColor;
      if (updates.isFavorite !== undefined) dbPayload.is_favorite = updates.isFavorite;
      if (updates.isArchived !== undefined) dbPayload.is_archived = updates.isArchived;
      if (updates.sortOrder !== undefined) dbPayload.sort_order = updates.sortOrder;

      const { data, error } = await (supabase.from("diaries") as any)
        .update(dbPayload)
        .eq("id", diaryId)
        .select()
        .single();

      if (error || !data) throw error || new Error("Failed to update diary.");

      return {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description || "",
        theme: data.theme,
        coverColor: data.cover_color,
        isFavorite: Boolean(data.is_favorite),
        isArchived: Boolean(data.is_archived),
        sortOrder: data.sort_order,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      return this.handleError(error, "Failed to update diary.");
    }
  }

  /**
   * Deletes a diary tome and cascades entry deletion.
   */
  static async deleteDiary(diaryId: string): Promise<string> {
    try {
      await this.getAuthenticatedUser(true);
      if (!isUuid(diaryId)) {
        throw new ServiceError("Invalid diary ID format", "INVALID_ID");
      }

      const supabase = this.getSupabase();
      const { error } = await supabase.from("diaries").delete().eq("id", diaryId);
      if (error) throw error;
      return diaryId;
    } catch (error) {
      return this.handleError(error, "Failed to delete diary.");
    }
  }

  /**
   * Adds a new page leaf to a diary.
   */
  static async createDiaryEntry(input: CreateDiaryEntryInput): Promise<DiaryEntry> {
    try {
      const user = await this.getAuthenticatedUser(true);
      if (!user) throw new Error("Authenticated user required");

      const supabase = this.getSupabase();

      const { data: maxPageData } = await supabase
        .from("diary_entries")
        .select("page_number")
        .eq("diary_id", input.diaryId)
        .order("page_number", { ascending: false })
        .limit(1);

      const nextPageNum = ((maxPageData?.[0] as any)?.page_number || 0) + 1;
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const { data: row, error: insertError } = await (supabase.from("diary_entries") as any)
        .insert({
          diary_id: input.diaryId,
          user_id: user.id,
          page_number: nextPageNum,
          entry_date: todayStr,
          date_str: today.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
          day_of_week: today.toLocaleDateString("en-US", { weekday: "long" }),
          year_str: `Anno ${today.getFullYear()}`,
          title: input.title || "",
          description: input.description || "",
          gratitude: input.gratitude || ["", "", ""],
          energy_level: input.energyLevel || 3,
          start_time: input.startTime || "09:00",
          end_time: input.endTime || "17:00",
          mood: input.mood || "🌿 Calm",
          weather: input.weather || "sunny",
          is_hearted: Boolean(input.isHearted),
          tags: input.tags || ["Daily Reflection"],
          word_count: input.description
            ? input.description.trim().split(/\s+/).filter(Boolean).length
            : 0,
        })
        .select()
        .single();

      if (insertError || !row) throw insertError || new Error("Failed to insert diary page.");

      return {
        id: row.id,
        diaryId: row.diary_id,
        userId: row.user_id,
        pageNumber: row.page_number,
        entryDate: row.entry_date,
        dateStr: row.date_str,
        dayOfWeek: row.day_of_week,
        yearStr: row.year_str,
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
    } catch (error) {
      return this.handleError(error, "Failed to create diary page.");
    }
  }

  /**
   * Updates an existing entry page leaf.
   */
  static async updateDiaryEntry(
    entryId: string,
    updates: Partial<DiaryEntry>
  ): Promise<{ entryId: string; updates: Partial<DiaryEntry> }> {
    try {
      await this.getAuthenticatedUser(true);
      if (!isUuid(entryId)) {
        throw new ServiceError("Invalid entry ID format", "INVALID_ID");
      }

      const supabase = this.getSupabase();
      const dbPayload: any = {};
      if (updates.entryDate !== undefined) dbPayload.entry_date = updates.entryDate;
      if (updates.dateStr !== undefined) dbPayload.date_str = updates.dateStr;
      if (updates.dayOfWeek !== undefined) dbPayload.day_of_week = updates.dayOfWeek;
      if (updates.yearStr !== undefined) dbPayload.year_str = updates.yearStr;
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

      if (error) throw error;
      return { entryId, updates };
    } catch (error) {
      return this.handleError(error, "Failed to update entry.");
    }
  }

  /**
   * Deletes an individual entry page.
   */
  static async deleteDiaryEntry(
    entryId: string,
    diaryId: string
  ): Promise<{ entryId: string; diaryId: string }> {
    try {
      await this.getAuthenticatedUser(true);
      if (!isUuid(entryId)) {
        throw new ServiceError("Invalid entry ID format", "INVALID_ID");
      }

      const supabase = this.getSupabase();
      const { error } = await supabase.from("diary_entries").delete().eq("id", entryId);
      if (error) throw error;
      return { entryId, diaryId };
    } catch (error) {
      return this.handleError(error, "Failed to delete entry.");
    }
  }

  /**
   * Reorders user's diaries in batch.
   */
  static async reorderDiaries(diaryIds: string[]): Promise<string[]> {
    try {
      const user = await this.getAuthenticatedUser(false);
      if (!user) return diaryIds;

      const supabase = this.getSupabase();
      await Promise.allSettled(
        diaryIds.map((id, index) =>
          (supabase.from("diaries") as any).update({ sort_order: index + 1 }).eq("id", id)
        )
      );
      return diaryIds;
    } catch (error) {
      return this.handleError(error, "Failed to reorder diaries.");
    }
  }

  /**
   * Bookmarks / hearts an individual entry.
   */
  static async toggleHeart(
    entryId: string,
    isHearted: boolean,
    diaryId?: string
  ): Promise<{ entryId: string; isHearted: boolean; diaryId?: string }> {
    try {
      const user = await this.getAuthenticatedUser(false);
      if (!user || !isUuid(entryId)) {
        return { entryId, isHearted, diaryId };
      }

      const supabase = this.getSupabase();
      const { error } = await (supabase.from("diary_entries") as any)
        .update({ is_hearted: isHearted })
        .eq("id", entryId);

      if (error) throw error;
      return { entryId, isHearted, diaryId };
    } catch (error) {
      return this.handleError(error, "Failed to bookmark entry.");
    }
  }

  private static computeEmptyStats(): DiaryStats {
    return {
      total_entries: 0,
      total_words: 0,
      average_energy: 0,
      hearted_entries: 0,
      current_streak: 0,
      longest_streak: 0,
      mood_breakdown: {},
      tags: [],
    };
  }

  private static computeStatsFromEntries(entries: DiaryEntry[]): DiaryStats {
    const totalEntries = entries.length;
    const totalWords = entries.reduce(
      (sum, e) => sum + (e.description ? e.description.split(/\s+/).filter(Boolean).length : 0),
      0
    );
    const avgEnergy = totalEntries
      ? Number((entries.reduce((sum, e) => sum + e.energyLevel, 0) / totalEntries).toFixed(1))
      : 0;
    const heartedCount = entries.filter((e) => e.isHearted).length;
    const moodMap: Record<string, number> = {};
    const tagSet = new Set<string>();

    entries.forEach((e) => {
      if (e.mood) moodMap[e.mood] = (moodMap[e.mood] || 0) + 1;
      e.tags?.forEach((t) => tagSet.add(t));
    });

    return {
      total_entries: totalEntries,
      total_words: totalWords,
      average_energy: avgEnergy,
      hearted_entries: heartedCount,
      current_streak: 0,
      longest_streak: 0,
      mood_breakdown: moodMap,
      tags: Array.from(tagSet),
    };
  }
}
