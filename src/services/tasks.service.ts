import { BaseService, ServiceError } from "./base.service";
import { TagService } from "./tag.service";
import type {
  TaskRow,
  TaskInsert,
  TaskUpdate,
  TaskFilterParams,
  TaskWithDetails,
  DailyAgendaResponse,
} from "@/types/tasks";

export class TaskService extends BaseService {
  /**
   * Fetches user tasks with assigned tags and child subtasks,
   * applying optional filters (scheduled_date, status, priority, tag_ids, search, parent_id).
   */
  public static async fetchTasks(
    filters?: TaskFilterParams
  ): Promise<TaskWithDetails[]> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      let query = (supabase.from("tasks") as any)
        .select(`
          *,
          tags:task_tags(
            tag:tags(
              id,
              name,
              color,
              category:tag_categories(id, name, color)
            )
          ),
          subtasks:tasks!parent_id(
            id,
            user_id,
            parent_id,
            title,
            description,
            status,
            priority,
            scheduled_date,
            due_date,
            completed_at,
            time_estimate_minutes,
            actual_minutes,
            sort_order,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (filters?.parent_id !== undefined) {
        if (filters.parent_id === null) {
          query = query.is("parent_id", null);
        } else {
          query = query.eq("parent_id", filters.parent_id);
        }
      }

      if (filters?.scheduled_date !== undefined) {
        if (filters.scheduled_date === null) {
          query = query.is("scheduled_date", null);
        } else {
          query = query.eq("scheduled_date", filters.scheduled_date);
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in("status", filters.status);
        } else {
          query = query.eq("status", filters.status);
        }
      }

      if (filters?.priority) {
        if (Array.isArray(filters.priority)) {
          query = query.in("priority", filters.priority);
        } else {
          query = query.eq("priority", filters.priority);
        }
      }

      if (filters?.search && filters.search.trim().length > 0) {
        query = query.ilike("title", `%${filters.search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as TaskWithDetails[];

      // In-memory filter for tag_ids if specified
      if (filters?.tag_ids && filters.tag_ids.length > 0) {
        const requiredTags = new Set(filters.tag_ids);
        results = results.filter((task) =>
          task.tags?.some((t) => t.tag && requiredTags.has(t.tag.id))
        );
      }

      return results;
    } catch (error) {
      return this.handleError(error, "Failed to fetch tasks");
    }
  }

  /**
   * Fetches daily task agenda grouped into scheduled today, overdue, and completed today.
   */
  public static async fetchDailyAgenda(dateStr: string): Promise<DailyAgendaResponse> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();

      // Query root level tasks related to this date or overdue
      const { data, error } = await (supabase.from("tasks") as any)
        .select(`
          *,
          tags:task_tags(
            tag:tags(
              id,
              name,
              color,
              category:tag_categories(id, name, color)
            )
          ),
          subtasks:tasks!parent_id(
            id,
            user_id,
            parent_id,
            title,
            description,
            status,
            priority,
            scheduled_date,
            due_date,
            completed_at,
            time_estimate_minutes,
            actual_minutes,
            sort_order,
            created_at,
            updated_at
          )
        `)
        .eq("user_id", user.id)
        .is("parent_id", null)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allTasks = (data || []) as TaskWithDetails[];

      const scheduled: TaskWithDetails[] = [];
      const overdue: TaskWithDetails[] = [];
      const completedToday: TaskWithDetails[] = [];

      for (const task of allTasks) {
        const isCompleted = task.status === "completed";
        const completedDateStr = task.completed_at ? task.completed_at.slice(0, 10) : null;

        if (isCompleted && completedDateStr === dateStr) {
          completedToday.push(task);
        } else if (!isCompleted && task.scheduled_date === dateStr) {
          scheduled.push(task);
        } else if (!isCompleted && task.scheduled_date && task.scheduled_date < dateStr) {
          overdue.push(task);
        }
      }

      return {
        scheduled,
        overdue,
        completedToday,
      };
    } catch (error) {
      return this.handleError(error, "Failed to fetch daily agenda");
    }
  }

  /**
   * Fetches a single task by UUID with tags and subtasks.
   */
  public static async fetchTaskById(id: string): Promise<TaskWithDetails | null> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { data, error } = await (supabase.from("tasks") as any)
        .select(`
          *,
          tags:task_tags(
            tag:tags(
              id,
              name,
              color,
              category:tag_categories(id, name, color)
            )
          ),
          subtasks:tasks!parent_id(
            id,
            user_id,
            parent_id,
            title,
            description,
            status,
            priority,
            scheduled_date,
            due_date,
            completed_at,
            time_estimate_minutes,
            actual_minutes,
            sort_order,
            created_at,
            updated_at
          )
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data as TaskWithDetails;
    } catch (error) {
      return this.handleError(error, `Failed to fetch task ${id}`);
    }
  }

  /**
   * Creates a new task and optionally associates tags.
   */
  public static async createTask(payload: TaskInsert): Promise<TaskWithDetails> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      await this.ensureProfile(user.id, user.email);
      const supabase = this.getSupabase();

      const { tag_ids, ...taskFields } = payload;

      const { data, error } = await (supabase.from("tasks") as any)
        .insert({
          ...taskFields,
          user_id: user.id,
          status: taskFields.status ?? "todo",
          priority: taskFields.priority ?? "normal",
          sort_order: taskFields.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      const createdTask = data as TaskRow;

      // Associate tags if provided
      if (tag_ids && tag_ids.length > 0) {
        await TagService.syncEntityTags("task", createdTask.id, tag_ids);
      }

      // Return complete task object with tags and subtasks
      const fullTask = await this.fetchTaskById(createdTask.id);
      if (!fullTask) throw new ServiceError("Failed to load created task", "NOT_FOUND");
      return fullTask;
    } catch (error) {
      return this.handleError(error, "Failed to create task");
    }
  }

  /**
   * Updates an existing task and optionally synchronizes tag associations.
   */
  public static async updateTask(
    id: string,
    payload: TaskUpdate
  ): Promise<TaskWithDetails> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { tag_ids, ...updateFields } = payload;

      if (Object.keys(updateFields).length > 0) {
        const { error } = await (supabase.from("tasks") as any)
          .update(updateFields)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;
      }

      // Synchronize tags if provided
      if (tag_ids !== undefined) {
        await TagService.syncEntityTags("task", id, tag_ids);
      }

      const updated = await this.fetchTaskById(id);
      if (!updated) throw new ServiceError("Task not found after update", "NOT_FOUND");
      return updated;
    } catch (error) {
      return this.handleError(error, `Failed to update task ${id}`);
    }
  }

  /**
   * Quick status toggling with completed_at timestamp tracking.
   */
  public static async toggleTaskStatus(
    id: string,
    isCompleted: boolean
  ): Promise<TaskWithDetails> {
    const status = isCompleted ? "completed" : "todo";
    const completed_at = isCompleted ? new Date().toISOString() : null;

    return this.updateTask(id, {
      status,
      completed_at,
    });
  }

  /**
   * Reorders an array of task IDs sequentially by updating their sort_order.
   */
  public static async reorderTasks(orderedTaskIds: string[]): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const updates = orderedTaskIds.map((taskId, index) =>
        (supabase.from("tasks") as any)
          .update({ sort_order: index })
          .eq("id", taskId)
          .eq("user_id", user.id)
      );

      const results = await Promise.all(updates);
      for (const res of results) {
        if (res.error) throw res.error;
      }
    } catch (error) {
      return this.handleError(error, "Failed to reorder tasks");
    }
  }

  /**
   * Deletes a task by UUID. Cascades to subtasks and task_tags.
   */
  public static async deleteTask(id: string): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { error } = await (supabase.from("tasks") as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, `Failed to delete task ${id}`);
    }
  }

  /**
   * Associates multiple tags to a task.
   */
  public static async assignTaskTags(taskId: string, tagIds: number[]): Promise<void> {
    return TagService.syncEntityTags("task", taskId, tagIds);
  }

  /**
   * Removes a single tag association from a task.
   */
  public static async removeTaskTag(taskId: string, tagId: number): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { error } = await (supabase.from("task_tags") as any)
        .delete()
        .eq("task_id", taskId)
        .eq("tag_id", tagId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, `Failed to remove tag ${tagId} from task ${taskId}`);
    }
  }
}
