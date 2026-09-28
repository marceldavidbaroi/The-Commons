import { z } from "zod";
import type { TagRow } from "./tags";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "deferred";

export type TaskPriority =
  | "low"
  | "normal"
  | "high"
  | "urgent";

export interface TaskRow {
  id: string; // UUID
  user_id: string; // UUID
  parent_id: string | null; // UUID
  
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  
  scheduled_date: string | null; // ISO YYYY-MM-DD
  due_date: string | null;       // ISO Timestamptz
  completed_at: string | null;   // ISO Timestamptz
  
  time_estimate_minutes: number | null;
  actual_minutes: number | null;
  sort_order: number;
  
  created_at: string;
  updated_at: string;
}

export interface TaskTagItem {
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

export interface TaskWithDetails extends TaskRow {
  tags?: TaskTagItem[];
  subtasks?: TaskWithDetails[];
}

export interface TaskInsert {
  title: string;
  description?: string | null;
  parent_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  scheduled_date?: string | null;
  due_date?: string | null;
  time_estimate_minutes?: number | null;
  actual_minutes?: number | null;
  sort_order?: number;
  tag_ids?: number[];
}

export interface TaskUpdate {
  title?: string;
  description?: string | null;
  parent_id?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  scheduled_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  time_estimate_minutes?: number | null;
  actual_minutes?: number | null;
  sort_order?: number;
  tag_ids?: number[];
}

export interface TaskFilterParams {
  scheduled_date?: string | null; // specific day YYYY-MM-DD
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  tag_ids?: number[];
  search?: string;
  parent_id?: string | null;
  include_subtasks?: boolean;
}

export interface DailyAgendaResponse {
  scheduled: TaskWithDetails[];
  overdue: TaskWithDetails[];
  completedToday: TaskWithDetails[];
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const taskStatusEnum = z.enum([
  "todo",
  "in_progress",
  "completed",
  "cancelled",
  "deferred",
]);

export const taskPriorityEnum = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Maximum 255 characters"),
  description: z.string().trim().nullable().optional(),
  parent_id: z.string().uuid("Invalid parent task UUID").nullable().optional(),
  status: taskStatusEnum.default("todo"),
  priority: taskPriorityEnum.default("normal"),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").nullable().optional(),
  due_date: z.string().datetime({ offset: true }).nullable().optional(),
  time_estimate_minutes: z.number().int().nonnegative().nullable().optional(),
  actual_minutes: z.number().int().nonnegative().nullable().optional(),
  sort_order: z.number().int().default(0),
  tag_ids: z.array(z.number().int().positive()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  completed_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
  completed_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export const taskFilterSchema = z.object({
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.union([taskStatusEnum, z.array(taskStatusEnum)]).optional(),
  priority: z.union([taskPriorityEnum, z.array(taskPriorityEnum)]).optional(),
  tag_ids: z.array(z.number().int().positive()).optional(),
  search: z.string().trim().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  include_subtasks: z.boolean().optional(),
});
