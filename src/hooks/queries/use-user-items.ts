"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { authKeys } from "./use-auth";
import type { UserItem, UserSortPreferences } from "@/types/database";

export interface UserItemFilters {
  status?: string | null;
  sortBy?: "created_at" | "updated_at" | "title" | "sort_order";
  ascending?: boolean;
}

export const userItemKeys = {
  all: ["user_items"] as const,
  lists: () => [...userItemKeys.all, "list"] as const,
  list: (filters: UserItemFilters) => [...userItemKeys.lists(), filters] as const,
  detail: (id: string) => [...userItemKeys.all, "detail", id] as const,
};

/**
 * Hook to retrieve user-scoped items utilizing the database RPC sorting engine.
 */
export function useUserItems(filters: UserItemFilters = {}) {
  return useQuery({
    queryKey: userItemKeys.list(filters),
    queryFn: async (): Promise<UserItem[]> => {
      const supabase = createClient();

      // Call database RPC `get_sorted_user_items`
      const { data, error } = await (supabase.rpc as any)("get_sorted_user_items", {
        p_status: filters.status ?? null,
        p_sort_by: filters.sortBy ?? null,
        p_ascending: filters.ascending ?? null,
      });

      if (error) {
        // Fallback to table query if RPC is not available
        console.warn("RPC get_sorted_user_items error, falling back to table select:", error.message);
        let query = supabase.from("user_items").select("*");
        if (filters.status) {
          query = query.eq("status", filters.status);
        }
        const sortCol = filters.sortBy || "sort_order";
        const { data: fallbackData, error: fallbackError } = await query.order(sortCol, {
          ascending: filters.ascending ?? true,
        });

        if (fallbackError) throw fallbackError;
        return (fallbackData as UserItem[]) ?? [];
      }

      return (data as UserItem[]) ?? [];
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
      const supabase = createClient();
      const { error } = await (supabase.rpc as any)("reorder_user_items", {
        p_item_ids: itemIds,
      });
      if (error) throw error;
      return itemIds;
    },
    onMutate: async (newItemIds) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: userItemKeys.all });

      // Snapshot previous lists
      const previousItems = queryClient.getQueriesData<UserItem[]>({ queryKey: userItemKeys.lists() });

      // Optimistically update lists
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
    onError: (_err, _newItemIds, context) => {
      // Rollback on error
      if (context?.previousItems) {
        context.previousItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userItemKeys.all });
    },
  });
}

/**
 * Mutation to update user default sort preferences.
 */
export function useUpdateSortPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sortBy: UserSortPreferences["default_sort_by"];
      sortOrder?: UserSortPreferences["default_sort_order"];
      filterFavoritesFirst?: boolean;
    }) => {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as any)("update_sort_preferences", {
        p_sort_by: params.sortBy,
        p_sort_order: params.sortOrder ?? "asc",
        p_filter_favorites_first: params.filterFavoritesFirst ?? true,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      queryClient.invalidateQueries({ queryKey: userItemKeys.all });
    },
  });
}
