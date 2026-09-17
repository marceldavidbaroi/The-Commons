/**
 * Stub definitions for Daily Diary & Journaling
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
  latestEntryDate?: string;
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
  total_entries: number;
  total_words: number;
  average_energy: number;
  current_streak: number;
  longest_streak: number;
  mood_breakdown: Record<string, number>;
  tags: string[];
}

export declare function fetchUserDiaries(): Promise<Diary[]>;
export declare function createDiaryWithFirstPage(params: {
  name: string;
  description?: string;
  theme?: DiaryTheme;
  coverColor?: string;
}): Promise<{ diary: Diary; entry: DiaryEntry }>;
export declare function saveDiaryEntry(entry: Partial<DiaryEntry>): Promise<DiaryEntry>;
export declare function fetchDiaryStats(diaryId?: string): Promise<DiaryStats>;
