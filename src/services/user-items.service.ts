import { BaseService } from "./base.service";
import type { UserItem } from "@/types/database";

export interface UserItemFilters {
  status?: string | null;
  sortBy?: "created_at" | "updated_at" | "title" | "sort_order";
  ascending?: boolean;
}

export class UserItemsService extends BaseService {
  /**
   * Fetches user-scoped items via RPC or table select.
   */
  static async getUserItems(filters: UserItemFilters = {}): Promise<UserItem[]> {
    try {
      const user = await this.getAuthenticatedUser(false);
      if (!user) return [];

      const supabase = this.getSupabase();

      const { data, error } = await (supabase.rpc as any)("get_sorted_user_items", {
        p_status: filters.status ?? null,
        p_sort_by: filters.sortBy ?? null,
        p_ascending: filters.ascending ?? null,
      });

      if (!error && data) {
        return (data as UserItem[]) ?? [];
      }

      // Fallback table query
      let query = supabase.from("user_items").select("*").eq("user_id", user.id);
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      const sortCol = filters.sortBy || "sort_order";
      const { data: fallbackData, error: fallbackError } = await query.order(sortCol, {
        ascending: filters.ascending ?? true,
      });

      if (fallbackError) throw fallbackError;
      return (fallbackData as UserItem[]) ?? [];
    } catch (error) {
      return this.handleError(error, "Failed to retrieve user items.");
    }
  }

  /**
   * Atomically reorders user items.
   */
  static async reorderUserItems(itemIds: string[]): Promise<string[]> {
    try {
      const user = await this.getAuthenticatedUser(true);
      if (!user) throw new Error("Authenticated user required");

      const supabase = this.getSupabase();
      const { error } = await (supabase.rpc as any)("reorder_user_items", {
        p_item_ids: itemIds,
      });
      if (error) throw error;
      return itemIds;
    } catch (error) {
      return this.handleError(error, "Failed to reorder items.");
    }
  }

  /**
   * Updates user item sorting preferences in profile.
   */
  static async updateSortPreferences(preferences: any): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser(true);
      if (!user) throw new Error("Authenticated user required");

      const supabase = this.getSupabase();
      const { error } = await (supabase.rpc as any)("update_sort_preferences", {
        p_sort_preferences: preferences,
      });
      if (error) throw error;
    } catch (error) {
      return this.handleError(error, "Failed to update sorting preferences.");
    }
  }
}
