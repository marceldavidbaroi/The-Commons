import { z } from "zod";

export const diaryPaginationQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(24),
  offset: z.number().int().min(0).default(0),
  includeSummary: z.boolean().default(true),
  isArchived: z.boolean().default(false),
});

export const diarySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  description: z.string().max(280).optional(),
  theme: z.enum(["vintage", "classic", "modern"]).default("vintage"),
  coverColor: z.string().default("#8C3A27"),
});

export const updateDiarySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional().nullable(),
  theme: z.enum(["vintage", "classic", "modern"]).optional(),
  coverColor: z.string().optional(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const deleteDiarySchema = z.object({
  id: z.string().uuid(),
});

export const diaryEntrySchema = z.object({
  id: z.string().optional(),
  diaryId: z.string().uuid(),
  pageNumber: z.number().int().positive().optional(),
  entryDate: z.string().optional(),
  dateStr: z.string().optional(),
  dayOfWeek: z.string().optional(),
  yearStr: z.string().optional(),
  title: z.string().max(140).default(""),
  description: z.string().default(""),
  gratitude: z.tuple([z.string(), z.string(), z.string()]).default(["", "", ""]),
  energyLevel: z.number().int().min(1).max(5).default(3),
  startTime: z.string().default("09:00"),
  endTime: z.string().default("17:00"),
  mood: z.string().default("🌿 Calm"),
  weather: z.string().default("sunny"),
  isHearted: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  wordCount: z.number().int().default(0),
});

export const diarySummarySchema = z.object({
  totalDiaries: z.number().int(),
  activeDiaries: z.number().int(),
  archivedDiaries: z.number().int(),
  totalEntries: z.number().int(),
  totalWords: z.number().int(),
  averageEnergy: z.number(),
  currentStreak: z.number().int(),
  longestStreak: z.number().int(),
  latestEntryDate: z.string().nullable(),
  moodBreakdown: z.record(z.string(), z.number()),
});

export const paginationMetaSchema = z.object({
  totalCount: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
  nextOffset: z.number().int().nullable(),
});

export const diaryIndexEntrySchema = z.object({
  id: z.string(),
  pageNumber: z.number().int(),
  dateStr: z.string(),
  dayOfWeek: z.string().optional(),
  yearStr: z.string().optional(),
  title: z.string(),
  snippet: z.string(),
  mood: z.string(),
  isHearted: z.boolean(),
  wordCount: z.number().int(),
});

export const diaryStatsSchema = z.object({
  diaryId: z.string().uuid().nullable().optional(),
  totalEntries: z.number().int(),
  totalWords: z.number().int(),
  averageEnergy: z.number(),
  heartedEntries: z.number().int(),
  currentStreak: z.number().int(),
  longestStreak: z.number().int(),
  moodBreakdown: z.record(z.string(), z.number()),
  tags: z.array(z.string()),
  topWritingHours: z.array(z.string()).optional(),
});

export type DiaryPaginationQuery = z.infer<typeof diaryPaginationQuerySchema>;
export type CreateDiaryInput = z.infer<typeof diarySchema>;
export type UpdateDiaryInput = z.infer<typeof updateDiarySchema>;
export type DeleteDiaryInput = z.infer<typeof deleteDiarySchema>;
export type CreateEntryInput = z.infer<typeof diaryEntrySchema>;
export type DiarySummary = z.infer<typeof diarySummarySchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;
export type DiaryIndexEntry = z.infer<typeof diaryIndexEntrySchema>;
export type DiaryStats = z.infer<typeof diaryStatsSchema>;
