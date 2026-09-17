/**
 * Stub definitions for Daily Diary & Journaling
 * The Commons Architecture
 */

export type DiaryTheme = "vintage" | "classic" | "modern";

export interface Diary {
  id: string;
  userId?: string;
  name: string;
  description: string;
  theme: DiaryTheme;
  coverColor?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  sortOrder?: number;
  entriesCount?: number;
  highestPageNumber?: number;
  latestEntryDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry {
  id: string;
  diaryId: string;
  userId?: string;
  pageNumber: number;
  entryDate?: string;
  dateStr: string;
  dayOfWeek: string;
  yearStr: string;
  title: string;
  description: string;
  gratitude: [string, string, string];
  energyLevel: number; // 1 to 5
  startTime: string;
  endTime: string;
  mood: string;
  weather: string;
  isHearted: boolean;
  tags?: string[];
  wordCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface DiaryStats {
  diaryId?: string | null;
  totalEntries?: number;
  totalWords?: number;
  averageEnergy?: number;
  heartedEntries?: number;
  currentStreak?: number;
  longestStreak?: number;
  moodBreakdown?: Record<string, number>;
  tags?: string[];
  topWritingHours?: string[];
  // Database snake_case fallbacks
  total_entries?: number;
  total_words?: number;
  average_energy?: number;
  hearted_entries?: number;
  current_streak?: number;
  longest_streak?: number;
  mood_breakdown?: Record<string, number>;
}

export interface DiaryIndexEntry {
  id: string;
  pageNumber: number;
  dateStr: string;
  dayOfWeek?: string;
  yearStr?: string;
  title: string;
  snippet: string;
  mood: string;
  isHearted: boolean;
  wordCount: number;
}

// -----------------------------------------------------------------------------
// Core API & RPC Function Declarations
// -----------------------------------------------------------------------------

/** Fetches all user diaries with joined metrics via RPC get_user_diaries_overview */
export declare function fetchUserDiariesOverview(): Promise<Diary[]>;

/** Calculates user-wide or tome-specific analytics via RPC get_diary_stats */
export declare function fetchDiaryStats(diaryId?: string): Promise<DiaryStats>;

/** Fetches entries for a specific diary tome with RLS */
export declare function fetchDiaryEntries(diaryId?: string): Promise<DiaryEntry[]>;

/** Fetches a single entry page */
export declare function fetchDiaryEntry(entryId: string): Promise<DiaryEntry>;

/** Atomically creates a new diary tome and initializes its first page via RPC create_diary_with_first_page */
export declare function createDiaryWithFirstPage(params: {
  name: string;
  description?: string;
  theme?: DiaryTheme;
  coverColor?: string;
}): Promise<Diary>;

/** Atomically adds a new sequential page to a diary via RPC create_diary_entry */
export declare function createDiaryEntry(params: {
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
}): Promise<DiaryEntry>;

/** Updates diary tome metadata via Supabase Table Update */
export declare function updateDiary(
  id: string,
  params: Partial<Pick<Diary, "name" | "description" | "theme" | "coverColor" | "isFavorite" | "isArchived" | "sortOrder">>
): Promise<Diary>;

/** Deletes a diary tome and cascades entry deletion via Supabase Table Delete */
export declare function deleteDiary(id: string): Promise<{ success: boolean; id: string }>;

/** Updates or autosaves an entry page via Supabase Table Update */
export declare function saveDiaryEntry(entry: Partial<DiaryEntry> & { id: string }): Promise<DiaryEntry>;

/** Deletes an entry page via Supabase Table Delete */
export declare function deleteDiaryEntry(entryId: string): Promise<{ success: boolean; id: string }>;

/** Reorders diary tomes via RPC reorder_diaries */
export declare function reorderDiaries(diaryIds: string[]): Promise<void>;
