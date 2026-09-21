import { BaseService, ServiceError } from "./base.service";
import type {
  GoalRow,
  GoalInsert,
  GoalUpdate,
  GoalStatus,
  GoalFilters,
  GoalWithSubgoalsAndTags,
} from "@/types/goal.types";

export class GoalService extends BaseService {
  /**
   * Fetches user goals with assigned tags and child sub-goals,
   * applying optional filters (parent_id, status, priority, type, tag_ids, search).
   */
  public static async fetchGoals(
    filters?: GoalFilters
  ): Promise<GoalWithSubgoalsAndTags[]> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      let query = (supabase.from("goals") as any)
        .select(`
          *,
          tags:goal_tags(
            tag:tags(
              id,
              name,
              color,
              category:tag_categories(id, name, color)
            )
          ),
          subgoals:goals!parent_id(
            id,
            user_id,
            parent_id,
            title,
            description,
            type,
            status,
            priority,
            start_date,
            due_date,
            achieved_at,
            cancelled_at,
            cancel_reason,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filters?.parent_id !== undefined) {
        if (filters.parent_id === null) {
          query = query.is("parent_id", null);
        } else {
          query = query.eq("parent_id", filters.parent_id);
        }
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.priority) {
        query = query.eq("priority", filters.priority);
      }

      if (filters?.type) {
        query = query.eq("type", filters.type);
      }

      if (filters?.search && filters.search.trim().length > 0) {
        query = query.ilike("title", `%${filters.search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as GoalWithSubgoalsAndTags[];

      // In-memory filter for tag_ids if specified (checks if goal has any or all matching tags)
      if (filters?.tag_ids && filters.tag_ids.length > 0) {
        const requiredTags = new Set(filters.tag_ids);
        results = results.filter((goal) =>
          goal.tags?.some((t) => t.tag && requiredTags.has(t.tag.id))
        );
      }

      return results;
    } catch (error) {
      return this.handleError(error, "Failed to fetch goals");
    }
  }

  /**
   * Fetches a single goal by UUID with tags and sub-goals.
   */
  public static async fetchGoalById(
    id: string
  ): Promise<GoalWithSubgoalsAndTags | null> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { data, error } = await (supabase.from("goals") as any)
        .select(`
          *,
          tags:goal_tags(
            tag:tags(
              id,
              name,
              color,
              category:tag_categories(id, name, color)
            )
          ),
          subgoals:goals!parent_id(
            id,
            user_id,
            parent_id,
            title,
            description,
            type,
            status,
            priority,
            start_date,
            due_date,
            achieved_at,
            cancelled_at,
            cancel_reason,
            created_at,
            updated_at
          )
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as GoalWithSubgoalsAndTags | null;
    } catch (error) {
      return this.handleError(error, `Failed to fetch goal with id ${id}`);
    }
  }

  /**
   * Creates a new root or sub-goal, optionally associating tags.
   */
  public static async createGoal(
    payload: GoalInsert
  ): Promise<GoalWithSubgoalsAndTags> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      await this.ensureProfile(user.id, user.email);

      const supabase = this.getSupabase();
      const goalInsertData: Record<string, unknown> = {
        user_id: user.id,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        parent_id: payload.parent_id || null,
        type: payload.type || "daily",
        status: payload.status || "draft",
        priority: payload.priority || "normal",
        start_date: payload.start_date || null,
        due_date: payload.due_date || null,
      };

      const { data: createdGoal, error } = await (supabase.from("goals") as any)
        .insert(goalInsertData)
        .select()
        .single();

      if (error) throw error;

      // Assign initial tags if provided
      if (payload.tag_ids && payload.tag_ids.length > 0) {
        const tagRows = payload.tag_ids.map((tagId) => ({
          goal_id: createdGoal.id,
          tag_id: tagId,
          user_id: user.id,
        }));

        const { error: tagErr } = await (supabase.from("goal_tags") as any)
          .insert(tagRows);

        if (tagErr) throw tagErr;
      }

      // Re-fetch created goal with relation mappings
      const fullGoal = await this.fetchGoalById(createdGoal.id);
      if (!fullGoal) throw new ServiceError("Failed to retrieve created goal");
      return fullGoal;
    } catch (error) {
      return this.handleError(error, "Failed to create goal");
    }
  }

  /**
   * Updates goal attributes by ID.
   */
  public static async updateGoal(
    id: string,
    payload: GoalUpdate
  ): Promise<GoalRow> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const updateData: Record<string, unknown> = {};
      if (payload.title !== undefined) updateData.title = payload.title.trim();
      if (payload.description !== undefined) updateData.description = payload.description?.trim() || null;
      if (payload.parent_id !== undefined) updateData.parent_id = payload.parent_id;
      if (payload.type !== undefined) updateData.type = payload.type;
      if (payload.status !== undefined) updateData.status = payload.status;
      if (payload.priority !== undefined) updateData.priority = payload.priority;
      if (payload.start_date !== undefined) updateData.start_date = payload.start_date;
      if (payload.due_date !== undefined) updateData.due_date = payload.due_date;
      if (payload.achieved_at !== undefined) updateData.achieved_at = payload.achieved_at;
      if (payload.cancelled_at !== undefined) updateData.cancelled_at = payload.cancelled_at;
      if (payload.cancel_reason !== undefined) updateData.cancel_reason = payload.cancel_reason;

      const supabase = this.getSupabase();
      const { data, error } = await (supabase.from("goals") as any)
        .update(updateData)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as GoalRow;
    } catch (error) {
      return this.handleError(error, `Failed to update goal ${id}`);
    }
  }

  /**
   * Transitions goal status and automatically stamps lifecycle timestamps.
   */
  public static async updateGoalStatus(
    id: string,
    status: GoalStatus,
    cancelReason?: string | null
  ): Promise<GoalRow> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const updates: Record<string, unknown> = { status };

      if (status === "completed") {
        updates.achieved_at = new Date().toISOString();
        updates.cancelled_at = null;
        updates.cancel_reason = null;
      } else if (status === "cancelled") {
        updates.cancelled_at = new Date().toISOString();
        updates.cancel_reason = cancelReason?.trim() || null;
      } else {
        // Reset lifecycle timestamps if transitioned back to draft, pending, in_progress, deferred
        updates.achieved_at = null;
        updates.cancelled_at = null;
        updates.cancel_reason = null;
      }

      const supabase = this.getSupabase();
      const { data, error } = await (supabase.from("goals") as any)
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as GoalRow;
    } catch (error) {
      return this.handleError(error, `Failed to update status for goal ${id}`);
    }
  }

  /**
   * Deletes a goal and cascades deletion to child sub-goals and goal_tags.
   */
  public static async deleteGoal(id: string): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { error } = await (supabase.from("goals") as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, `Failed to delete goal ${id}`);
    }
  }

  /**
   * Synchronizes tags assigned to a goal.
   */
  public static async syncGoalTags(
    goalId: string,
    tagIds: number[]
  ): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();

      // 1. Fetch current tags assigned to goal
      const { data: existing, error: fetchErr } = await (supabase.from("goal_tags") as any)
        .select("tag_id")
        .eq("goal_id", goalId)
        .eq("user_id", user.id);

      if (fetchErr) throw fetchErr;

      const currentTagIds = new Set<number>((existing || []).map((row: any) => row.tag_id));
      const targetTagIds = new Set<number>(tagIds);

      const toAdd = tagIds.filter((id) => !currentTagIds.has(id));
      const toRemove = Array.from(currentTagIds).filter((id) => !targetTagIds.has(id));

      // 2. Remove tags that are no longer selected
      if (toRemove.length > 0) {
        const { error: delErr } = await (supabase.from("goal_tags") as any)
          .delete()
          .eq("goal_id", goalId)
          .eq("user_id", user.id)
          .in("tag_id", toRemove);

        if (delErr) throw delErr;
      }

      // 3. Insert newly assigned tags
      if (toAdd.length > 0) {
        const rowsToInsert = toAdd.map((tagId) => ({
          goal_id: goalId,
          tag_id: tagId,
          user_id: user.id,
        }));

        const { error: insErr } = await (supabase.from("goal_tags") as any)
          .insert(rowsToInsert);

        if (insErr) throw insErr;
      }
    } catch (error) {
      return this.handleError(error, `Failed to sync tags for goal ${goalId}`);
    }
  }
}
