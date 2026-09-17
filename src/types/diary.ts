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

export const INITIAL_DIARIES: Diary[] = [
  {
    id: "diary-vintage-default",
    name: "Chronicles & Inquiries",
    description: "Daily recollections, quiet morning thoughts, and philosophical inquiries in walnut ink.",
    theme: "vintage",
    coverColor: "#8C3A27",
    isFavorite: true,
    sortOrder: 1,
    entriesCount: 3,
    highestPageNumber: 3,
    latestEntryDate: "2026-09-17",
    createdAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-17T12:00:00Z",
  },
  {
    id: "diary-classic-default",
    name: "Architectural Codex",
    description: "System designs, craft observations, and structured project ledgers.",
    theme: "classic",
    coverColor: "#1E3A5F",
    isFavorite: true,
    sortOrder: 2,
    entriesCount: 2,
    highestPageNumber: 2,
    latestEntryDate: "2026-09-16",
    createdAt: "2026-09-05T09:30:00Z",
    updatedAt: "2026-09-16T18:00:00Z",
  },
  {
    id: "diary-modern-default",
    name: "Studio Sprint Log",
    description: "Fast daily check-ins, sprint trackers, and evening gratitude notes.",
    theme: "modern",
    coverColor: "#0F172A",
    isFavorite: false,
    sortOrder: 3,
    entriesCount: 1,
    highestPageNumber: 1,
    latestEntryDate: "2026-09-15",
    createdAt: "2026-09-10T14:00:00Z",
    updatedAt: "2026-09-15T20:30:00Z",
  },
];

export const INITIAL_ENTRIES: DiaryEntry[] = [
  {
    id: "entry-1",
    diaryId: "diary-vintage-default",
    pageNumber: 1,
    entryDate: "2026-09-15",
    dateStr: "September 15",
    dayOfWeek: "Tuesday",
    yearStr: "Anno 2026",
    title: "The Quiet Hour of Dawning",
    description: "Awoke before the church bells. The air through the opened casement was cool and scented with pine and damp stone. Began the third chapter of the monograph with renewed focus.",
    gratitude: ["Warm cinnamon tea at first light", "The stillness before the city stirs", "A clear mind for drafting"],
    energyLevel: 4,
    startTime: "06:30",
    endTime: "08:15",
    mood: "✨ Inspired",
    weather: "sunny",
    isHearted: true,
    tags: ["Morning Routine", "Monograph", "Stillness"],
    wordCount: 38,
    createdAt: "2026-09-15T06:30:00Z",
  },
  {
    id: "entry-2",
    diaryId: "diary-vintage-default",
    pageNumber: 2,
    entryDate: "2026-09-16",
    dateStr: "September 16",
    dayOfWeek: "Wednesday",
    yearStr: "Anno 2026",
    title: "Reflections on Tactile Software",
    description: "Why must digital instruments feel so disposable? A ledger should possess weight, cadence, and texture. Exploring typographic proportions for our sanctuary broadsheet.",
    gratitude: ["Discovery of antique typography specimens", "Productive discourse with fellow citizens", "An evening rainstorm"],
    energyLevel: 5,
    startTime: "14:00",
    endTime: "16:45",
    mood: "🌊 In Flow",
    weather: "rainy",
    isHearted: true,
    tags: ["Philosophy", "Craft", "Typography"],
    wordCount: 32,
    createdAt: "2026-09-16T14:00:00Z",
  },
  {
    id: "entry-3",
    diaryId: "diary-vintage-default",
    pageNumber: 3,
    entryDate: "2026-09-17",
    dateStr: "September 17",
    dayOfWeek: "Thursday",
    yearStr: "Anno 2026",
    title: "Sanctuary Ledger Sealed",
    description: "Completed the single-page application framework and verified persistent local storage across reloads. Everything remains intact upon refreshing the desk.",
    gratitude: ["Clarity of architectural direction", "A resilient client store", "A cup of roasted pour-over"],
    energyLevel: 4,
    startTime: "09:00",
    endTime: "11:30",
    mood: "🎯 Focused",
    weather: "sunny",
    isHearted: false,
    tags: ["Milestone", "The Commons", "SPA"],
    wordCount: 26,
    createdAt: "2026-09-17T09:00:00Z",
  },
  {
    id: "entry-classic-1",
    diaryId: "diary-classic-default",
    pageNumber: 1,
    entryDate: "2026-09-15",
    dateStr: "September 15",
    dayOfWeek: "Tuesday",
    yearStr: "Anno 2026",
    title: "Foundation Blueprint Spec §1",
    description: "Established core schema conventions for the citizen identity registry and cryptographic key storage. Strict boundaries between presentation and persistence.",
    gratitude: ["Elegant interface design", "Uninterrupted focus session", "Crisp autumn weather"],
    energyLevel: 4,
    startTime: "10:00",
    endTime: "12:30",
    mood: "🎯 Focused",
    weather: "sunny",
    isHearted: true,
    tags: ["Engineering", "Architecture"],
    wordCount: 24,
    createdAt: "2026-09-15T10:00:00Z",
  },
  {
    id: "entry-modern-1",
    diaryId: "diary-modern-default",
    pageNumber: 1,
    entryDate: "2026-09-15",
    dateStr: "September 15",
    dayOfWeek: "Tuesday",
    yearStr: "Anno 2026",
    title: "Sprint Kickoff & Intentions",
    description: "Priorities for the week: Finish user items migration, complete broadsheet layout, and polish the dark mode color palette.",
    gratitude: ["Reliable colleagues", "Clear product backlog", "Great morning workout"],
    energyLevel: 5,
    startTime: "08:30",
    endTime: "09:15",
    mood: "⚡ Energetic",
    weather: "sunny",
    isHearted: false,
    tags: ["Sprint", "Goals"],
    wordCount: 22,
    createdAt: "2026-09-15T08:30:00Z",
  },
];

