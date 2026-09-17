export type DiaryTheme = "vintage" | "classic" | "modern";

export interface Diary {
  id: string;
  name: string;
  description: string;
  theme: DiaryTheme;
  coverColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntry {
  id: string;
  diaryId: string;
  pageNumber: number;
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
    id: "diary-vintage-1",
    name: "The Antiquarian Codex",
    description: "Aged parchment, walnut ink reflections, and intimate morning thoughts.",
    theme: "vintage",
    coverColor: "#8C3A27",
    createdAt: "2026-09-14T08:00:00Z",
    updatedAt: "2026-09-16T18:00:00Z",
  },
  {
    id: "diary-classic-2",
    name: "Architectural Ledger",
    description: "Mid-century clothbound field journal, design systems, and thoughtful craft.",
    theme: "classic",
    coverColor: "#1E3A5F",
    createdAt: "2026-09-11T08:00:00Z",
    updatedAt: "2026-09-15T18:00:00Z",
  },
  {
    id: "diary-modern-3",
    name: "Studio Minimalist Chronicle",
    description: "Ultra-clean modern workspace diary for clarity, quarterly goals, and sprint focus.",
    theme: "modern",
    coverColor: "#172330",
    createdAt: "2026-09-08T08:00:00Z",
    updatedAt: "2026-09-14T18:00:00Z",
  },
];

export const INITIAL_ENTRIES: DiaryEntry[] = [
  {
    id: "142",
    diaryId: "diary-vintage-1",
    pageNumber: 142,
    dateStr: "September 16",
    dayOfWeek: "Tuesday",
    yearStr: "Anno 2026",
    title: "A quiet morning with tea and great architectural clarity.",
    description:
      "Woke up before dawn to the soft patter of rain. Made a hot cup of loose-leaf black tea and spent an hour sketching schema flows by hand before opening the computer.\n\nEliminating unnecessary distractions made all the difference today. The modular tables and reactive state feel balanced and intuitive now.",
    gratitude: [
      "The quiet hush of the morning house before anyone else was awake.",
      "A breakthrough on our clean design language without cluttered cards.",
      "Warm cedar incense burning by the window.",
    ],
    energyLevel: 4,
    startTime: "08:30",
    endTime: "17:45",
    mood: "✨ Inspired",
    weather: "rainy",
    isHearted: true,
    tags: ["Architecture", "Reflection", "Deep Work"],
    createdAt: "2026-09-16T08:30:00Z",
  },
  {
    id: "141",
    diaryId: "diary-vintage-1",
    pageNumber: 141,
    dateStr: "September 15",
    dayOfWeek: "Monday",
    yearStr: "Anno 2026",
    title: "Setting peaceful intentions for the week ahead.",
    description:
      "Monday arrived with crisp golden sunlight. Reviewed our core roadmap and decided to simplify our interface to feel like a timeless handwritten journal.\n\nNature walk at midday helped untangle several tricky state problems.",
    gratitude: [
      "Fresh crisp autumn air on the afternoon path.",
      "Clear team alignment during morning check-in.",
      "An uninterrupted two-hour deep work session.",
    ],
    energyLevel: 3,
    startTime: "09:00",
    endTime: "17:00",
    mood: "🌿 Calm",
    weather: "sunny",
    isHearted: false,
    tags: ["Planning", "Nature", "Habits"],
    createdAt: "2026-09-15T09:00:00Z",
  },
  {
    id: "140",
    diaryId: "diary-vintage-1",
    pageNumber: 140,
    dateStr: "September 14",
    dayOfWeek: "Sunday",
    yearStr: "Anno 2026",
    title: "Sunday reflection: Rest, gardening, and old fountain pens.",
    description:
      "Spent the afternoon cleaning vintage fountain pens and reading under the oak tree. Taking time away from screens always restores perspective and creative stamina.",
    gratitude: [
      "Homegrown mint tea in the afternoon.",
      "A long letter received from an old friend.",
      "Gentle breeze through the open kitchen door.",
    ],
    energyLevel: 5,
    startTime: "10:15",
    endTime: "18:30",
    mood: "☕ Cozy",
    weather: "sunny",
    isHearted: true,
    tags: ["Solitude", "Rest", "Craft"],
    createdAt: "2026-09-14T10:15:00Z",
  },
  {
    id: "139",
    diaryId: "diary-classic-2",
    pageNumber: 139,
    dateStr: "September 11",
    dayOfWeek: "Thursday",
    yearStr: "Anno 2026",
    title: "Deep focus sprint on fluid responsive typography.",
    description:
      "Tested various font pairings across device sizes. When typography feels right, the whole interface comes to life effortlessly without needing loud decorations.",
    gratitude: [
      "Smooth collaborative review with the engineering team.",
      "A delicious bowl of warm miso soup at lunch.",
      "Productive rhythm on design system tokens.",
    ],
    energyLevel: 4,
    startTime: "08:45",
    endTime: "17:15",
    mood: "🎯 Focused",
    weather: "cloudy",
    isHearted: false,
    tags: ["Typography", "Design System", "Craft"],
    createdAt: "2026-09-11T08:45:00Z",
  },
  {
    id: "138",
    diaryId: "diary-modern-3",
    pageNumber: 138,
    dateStr: "September 08",
    dayOfWeek: "Monday",
    yearStr: "Anno 2026",
    title: "Welcoming September: Autumn plans and fresh beginnings.",
    description:
      "First week of September brought cooler mornings and amber evening light. Outlined quarterly goals with a renewed sense of focus and calm dedication.",
    gratitude: [
      "Cool breeze announcing the change of seasons.",
      "A quiet desk space with natural daylight.",
      "Good coffee beans ground fresh at sunrise.",
    ],
    energyLevel: 3,
    startTime: "09:15",
    endTime: "16:45",
    mood: "🌊 In Flow",
    weather: "sunny",
    isHearted: false,
    tags: ["Autumn", "Goals", "Habits"],
    createdAt: "2026-09-08T09:15:00Z",
  },
];
