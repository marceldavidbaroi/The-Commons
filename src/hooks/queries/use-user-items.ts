"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserItemsService, UserItemFilters } from "@/services/user-items.service";
import { notify } from "@/lib/notify";
import type { UserItem, UserSortPreferences } from "@/types/database";

export type { UserItemFilters };

export const userItemKeys = {
  all: ["user_items"] as const,
  lists: () => [...userItemKeys.all, "list"] as const,
  list: (filters: UserItemFilters) => [...userItemKeys.lists(), filters] as const,
  detail: (id: string) => [...userItemKeys.all, "detail", id] as const,
};

/**
 * Hook to retrieve user-scoped items utilizing UserItemsService.
 */
export function useUserItems(filters: UserItemFilters = {}) {
  return useQuery({
    queryKey: userItemKeys.list(filters),
    queryFn: async (): Promise<UserItem[]> => {
      return UserItemsService.getUserItems(filters);
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Mutation to atomically reorder user items with optimistic updates.
 */
export function useReorderUserItemsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      return UserItemsService.reorderUserItems(itemIds);
    },
    onMutate: async (newItemIds) => {
      await queryClient.cancelQueries({ queryKey: userItemKeys.all });
      const previousItems = queryClient.getQueriesData<UserItem[]>({ queryKey: userItemKeys.lists() });

      queryClient.setQueriesData<UserItem[]>({ queryKey: userItemKeys.lists() }, (old) => {
        if (!old) return [];
        const itemMap = new Map(old.map((item) => [item.id, item]));
        return newItemIds
          .map((id, index) => {
            const item = itemMap.get(id);
            return item ? { ...item, sort_order: index } : null;
          })
          .filter(Boolean) as UserItem[];
      });

      return { previousItems };
    },
    onError: (err, _newItemIds, context) => {
      if (context?.previousItems) {
        context.previousItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      notify.error(err, "Failed to reorder curation items.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userItemKeys.all });
    },
  });
}

/**
 * Mutation hook to persist user's custom sort preferences in Supabase profile metadata.
 */
export function useUpdateSortPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: UserSortPreferences) => {
      return UserItemsService.updateSortPreferences(preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userItemKeys.all });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      notify.success("Curation Calibrated", "Your sorting and display preferences have been updated.");
    },
    onError: (error) => {
      notify.error(error, "Failed to update sorting preferences.");
    },
  });
}
