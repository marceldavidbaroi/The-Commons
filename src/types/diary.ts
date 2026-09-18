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
  firstEntryId?: string;
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
  energyLevel: number; // 1 - 5
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
  // Database snake_case fields
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

export interface DiarySummary {
  totalDiaries: number;
  activeDiaries: number;
  archivedDiaries: number;
  totalEntries: number;
  totalWords: number;
  averageEnergy: number;
  currentStreak: number;
  longestStreak: number;
  latestEntryDate: string | null;
  moodBreakdown: Record<string, number>;
}

export interface PaginationMeta {
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export type DiarySortOption = "newest" | "oldest" | "vitality-high" | "vitality-low";
export type DiaryViewMode = "grid" | "list";

export interface EnergyLevelOption {
  level: number;
  label: string;
  description?: string;
}

export interface MoodOption {
  emoji: string;
  label: string;
  color?: string;
}

export interface WeatherOption {
  id: string;
  label: string;
  inkNote: string;
}

export const ENERGY_LEVELS: EnergyLevelOption[] = [
  { level: 1, label: "Drained", description: "Minimal energy, resting" },
  { level: 2, label: "Low", description: "Quiet & contemplative" },
  { level: 3, label: "Steady", description: "Balanced and centered" },
  { level: 4, label: "High", description: "Productive and animated" },
  { level: 5, label: "Peak", description: "Vibrant creative flow" },
];

export const MOOD_LIST: MoodOption[] = [
  { emoji: "🌿", label: "Calm" },
  { emoji: "✨", label: "Inspired" },
  { emoji: "🎯", label: "Focused" },
  { emoji: "🌊", label: "In Flow" },
  { emoji: "☕", label: "Cozy" },
  { emoji: "⚡", label: "Energetic" },
];

export const INITIAL_DIARIES: Diary[] = [];

export const INITIAL_ENTRIES: DiaryEntry[] = [];

