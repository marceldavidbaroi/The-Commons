"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GoalService } from "@/services/goal.service";
import { notify } from "@/lib/notify";
import type {
  GoalRow,
  GoalInsert,
  GoalUpdate,
  GoalStatus,
  GoalFilters,
  GoalWithSubgoalsAndTags,
} from "@/types/goal.types";

export const goalKeys = {
  all: ["goals"] as const,
  lists: () => [...goalKeys.all, "list"] as const,
  list: (filters?: GoalFilters) => [...goalKeys.lists(), filters ?? {}] as const,
  details: () => [...goalKeys.all, "detail"] as const,
  detail: (id: string) => [...goalKeys.details(), id] as const,
};

/**
 * Hook to retrieve user goals with tag joins and recursive sub-goals.
 */
export function useGoalsQuery(filters?: GoalFilters) {
  return useQuery({
    queryKey: goalKeys.list(filters),
    queryFn: async (): Promise<GoalWithSubgoalsAndTags[]> => {
      return GoalService.fetchGoals(filters);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to retrieve a single goal by UUID.
 */
export function useGoalQuery(id: string) {
  return useQuery({
    queryKey: goalKeys.detail(id),
    queryFn: async (): Promise<GoalWithSubgoalsAndTags | null> => {
      if (!id) return null;
      return GoalService.fetchGoalById(id);
    },
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to create a new root or sub-goal.
 */
export function useCreateGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GoalInsert): Promise<GoalWithSubgoalsAndTags> => {
      return GoalService.createGoal(payload);
    },
    onSuccess: (newGoal) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      notify.success("Goal created successfully");
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to create goal");
    },
  });
}

/**
 * Hook to update an existing goal's attributes.
 */
export function useUpdateGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: GoalUpdate;
    }): Promise<GoalRow> => {
      return GoalService.updateGoal(id, payload);
    },
    onSuccess: (updatedGoal) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      notify.success("Goal updated");
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to update goal");
    },
  });
}

/**
 * Hook to update goal status with optimistic cache update.
 */
export function useUpdateGoalStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      cancelReason,
    }: {
      id: string;
      status: GoalStatus;
      cancelReason?: string | null;
    }): Promise<GoalRow> => {
      return GoalService.updateGoalStatus(id, status, cancelReason);
    },
    onMutate: async ({ id, status }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: goalKeys.all });

      // Optimistically update list caches
      queryClient.setQueriesData<GoalWithSubgoalsAndTags[]>(
        { queryKey: goalKeys.lists() },
        (old) => {
          if (!old) return old;
          return old.map((goal) => {
            if (goal.id === id) {
              return {
                ...goal,
                status,
                achieved_at: status === "completed" ? new Date().toISOString() : null,
              };
            }
            return goal;
          });
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      notify.error(error instanceof Error ? error.message : "Failed to update goal status");
    },
  });
}

/**
 * Hook to delete a goal and invalidate caches.
 */
export function useDeleteGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return GoalService.deleteGoal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      notify.success("Goal deleted");
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to delete goal");
    },
  });
}

/**
 * Hook to synchronize tags for a goal.
 */
export function useSyncGoalTagsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goalId,
      tagIds,
    }: {
      goalId: string;
      tagIds: number[];
    }): Promise<void> => {
      return GoalService.syncGoalTags(goalId, tagIds);
    },
    onSuccess: (_, { goalId }) => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
      notify.success("Tags updated");
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to sync goal tags");
    },
  });
}
