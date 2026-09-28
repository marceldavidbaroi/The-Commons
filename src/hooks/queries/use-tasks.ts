"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskService } from "@/services/tasks.service";
import { notify } from "@/lib/notify";
import type {
  TaskRow,
  TaskInsert,
  TaskUpdate,
  TaskFilterParams,
  TaskWithDetails,
  DailyAgendaResponse,
} from "@/types/tasks";

export const taskKeys = {
  all: ["tasks"] as const,
  lists: () => [...taskKeys.all, "list"] as const,
  list: (filters?: TaskFilterParams) => [...taskKeys.lists(), filters ?? {}] as const,
  agendas: () => [...taskKeys.all, "agenda"] as const,
  agenda: (dateStr: string) => [...taskKeys.agendas(), dateStr] as const,
  details: () => [...taskKeys.all, "detail"] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

/**
 * Hook to retrieve user tasks with tag joins and recursive subtasks.
 */
export function useTasksQuery(filters?: TaskFilterParams) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: async (): Promise<TaskWithDetails[]> => {
      return TaskService.fetchTasks(filters);
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to retrieve daily categorized agenda (scheduled, overdue, completedToday).
 */
export function useDailyAgendaQuery(dateStr: string) {
  return useQuery({
    queryKey: taskKeys.agenda(dateStr),
    queryFn: async (): Promise<DailyAgendaResponse> => {
      return TaskService.fetchDailyAgenda(dateStr);
    },
    enabled: Boolean(dateStr),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to retrieve a single task by UUID.
 */
export function useTaskQuery(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async (): Promise<TaskWithDetails | null> => {
      if (!id) return null;
      return TaskService.fetchTaskById(id);
    },
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to create a new root task or subtask.
 */
export function useCreateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TaskInsert): Promise<TaskWithDetails> => {
      return TaskService.createTask(payload);
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      notify.success(`Task "${newTask.title}" added`);
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to create task");
    },
  });
}

/**
 * Hook to update an existing task.
 */
export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: TaskUpdate;
    }): Promise<TaskWithDetails> => {
      return TaskService.updateTask(id, payload);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      notify.success("Task updated");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to update task");
    },
  });
}

/**
 * Hook for one-click status toggle with optimistic updates.
 */
export function useToggleTaskStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isCompleted,
    }: {
      id: string;
      isCompleted: boolean;
    }): Promise<TaskWithDetails> => {
      return TaskService.toggleTaskStatus(id, isCompleted);
    },
    onMutate: async ({ id, isCompleted }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const previousTasks = queryClient.getQueriesData({ queryKey: taskKeys.all });

      // Optimistic update for list query caches
      queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (oldData: any) => {
        if (!Array.isArray(oldData)) return oldData;
        return oldData.map((task: TaskWithDetails) =>
          task.id === id
            ? {
                ...task,
                status: isCompleted ? "completed" : "todo",
                completed_at: isCompleted ? new Date().toISOString() : null,
              }
            : task
        );
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        for (const [queryKey, data] of context.previousTasks) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      notify.error("Failed to update task status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Hook to persist drag-and-drop sort order.
 */
export function useReorderTasksMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedTaskIds: string[]): Promise<void> => {
      return TaskService.reorderTasks(orderedTaskIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to reorder tasks");
    },
  });
}

/**
 * Hook to delete a task.
 */
export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return TaskService.deleteTask(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      notify.success("Task deleted");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to delete task");
    },
  });
}
