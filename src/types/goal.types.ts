import { z } from "zod";

export type GoalType =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "milestone"
  | "habit";

export type GoalStatus =
  | "draft"
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "deferred";

export type GoalPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";

export interface GoalRow {
  id: string; // UUID
  user_id: string; // UUID
  parent_id: string | null; // UUID
  title: string;
  description: string | null;
  type: GoalType;
  status: GoalStatus;
  priority: GoalPriority;
  start_date: string | null;
  due_date: string | null;
  achieved_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalInsert {
  title: string;
  description?: string | null;
  parent_id?: string | null;
  type?: GoalType;
  status?: GoalStatus;
  priority?: GoalPriority;
  start_date?: string | null;
  due_date?: string | null;
  tag_ids?: number[];
}

export interface GoalUpdate {
  title?: string;
  description?: string | null;
  parent_id?: string | null;
  type?: GoalType;
  status?: GoalStatus;
  priority?: GoalPriority;
  start_date?: string | null;
  due_date?: string | null;
  achieved_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
}

export interface GoalTagItem {
  tag: {
    id: number;
    name: string;
    color: string | null;
    category?: {
      id: number;
      name: string;
      color: string;
    };
  };
}

export interface GoalWithSubgoalsAndTags extends GoalRow {
  tags: GoalTagItem[];
  subgoals?: GoalRow[];
}

export interface GoalFilters {
  parent_id?: string | null;
  type?: GoalType;
  status?: GoalStatus;
  priority?: GoalPriority;
  tag_ids?: number[];
  search?: string;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const goalTypeEnum = z.enum([
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "milestone",
  "habit",
]);

export const goalStatusEnum = z.enum([
  "draft",
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "deferred",
]);

export const goalPriorityEnum = z.enum([
  "low",
  "normal",
  "high",
  "critical",
]);

// Create Goal Schema
export const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Maximum 255 characters"),
  description: z.string().trim().nullable().optional(),
  parent_id: z.string().uuid("Invalid parent goal UUID").nullable().optional(),
  type: goalTypeEnum.default("daily"),
  status: goalStatusEnum.default("draft"),
  priority: goalPriorityEnum.default("normal"),
  start_date: z.string().datetime({ offset: true }).nullable().optional(),
  due_date: z.string().datetime({ offset: true }).nullable().optional(),
  tag_ids: z.array(z.number().int().positive()).optional(),
});

// Update Goal Schema
export const updateGoalSchema = createGoalSchema.partial().extend({
  achieved_at: z.string().datetime({ offset: true }).nullable().optional(),
  cancelled_at: z.string().datetime({ offset: true }).nullable().optional(),
  cancel_reason: z.string().trim().nullable().optional(),
});

// Status Transition Schema
export const updateGoalStatusSchema = z.object({
  status: goalStatusEnum,
  cancel_reason: z.string().trim().nullable().optional(),
});

// Goal Filter Schema
export const goalFilterSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  type: goalTypeEnum.optional(),
  status: goalStatusEnum.optional(),
  priority: goalPriorityEnum.optional(),
  tag_ids: z.array(z.number().int().positive()).optional(),
  search: z.string().trim().optional(),
});

/**
 * Auto-calculates an ISO YYYY-MM-DD target due date based on the selected horizon type
 * and a reference base date (e.g. updated_at or current date).
 */
export function calculateDueDateFromHorizon(type: GoalType, baseDate: Date | string = new Date()): string {
  const d = typeof baseDate === "string" ? new Date(baseDate) : new Date(baseDate);
  const valid = isNaN(d.getTime()) ? new Date() : d;
  const target = new Date(valid);

  switch (type) {
    case "daily":
      // Same day / today
      break;
    case "weekly":
      target.setDate(target.getDate() + 7);
      break;
    case "monthly":
      target.setMonth(target.getMonth() + 1);
      break;
    case "quarterly":
      target.setMonth(target.getMonth() + 3);
      break;
    case "yearly":
      target.setFullYear(target.getFullYear() + 1);
      break;
    case "milestone":
      target.setMonth(target.getMonth() + 1);
      break;
    case "habit":
      target.setDate(target.getDate() + 30);
      break;
    default:
      break;
  }

  return target.toISOString().split("T")[0];
}

