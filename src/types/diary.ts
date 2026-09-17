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
