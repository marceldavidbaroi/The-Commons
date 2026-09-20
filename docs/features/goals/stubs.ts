/**
 * TypeScript Type Definitions & Function Stubs for Goals & Objectives Ledger
 * File: docs/features/goals/stubs.ts
 */

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
// Service Function Headers
// ============================================================================

export declare function fetchGoals(
  filters?: GoalFilters
): Promise<GoalWithSubgoalsAndTags[]>;

export declare function fetchGoalById(
  id: string
): Promise<GoalWithSubgoalsAndTags | null>;

export declare function createGoal(
  payload: GoalInsert
): Promise<GoalWithSubgoalsAndTags>;

export declare function updateGoal(
  id: string,
  payload: GoalUpdate
): Promise<GoalRow>;

export declare function updateGoalStatus(
  id: string,
  status: GoalStatus,
  cancelReason?: string | null
): Promise<GoalRow>;

export declare function deleteGoal(id: string): Promise<void>;

export declare function syncGoalTags(
  goalId: string,
  tagIds: number[]
): Promise<void>;
