import { BaseService, ServiceError } from "./base.service";
import type {
  TagCategoryRow,
  TagCategoryInsert,
  TagCategoryUpdate,
  TagCategoryWithTags,
  TagRow,
  TagInsert,
  TagUpdate,
  EntityType,
} from "@/types/tags";

export class TagService extends BaseService {
  /**
   * Retrieves all tag categories and their child tags for the authenticated user,
   * optionally filtered by a specific feature scope (e.g. 'diary', 'document', 'goals').
   * If the user does not have categories provisioned yet, automatically initializes
   * default system tag taxonomies on demand.
   */
  public static async fetchUserTagCategoriesWithTags(
    feature?: string
  ): Promise<TagCategoryWithTags[]> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      let query = (supabase.from("tag_categories") as any)
        .select("*, tags(*)")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (feature) {
        query = query.eq("feature", feature);
      }

      let { data, error } = await query;
      if (error) throw error;

      // Auto-provision default system tags if user has no categories for this scope
      if (!data || data.length === 0) {
        const featuresToProvision = feature ? [feature] : ["goals", "diary", "document"];
        await Promise.allSettled(
          featuresToProvision.map((f) =>
            (supabase as any).rpc("provision_feature_tag_categories", { p_feature: f })
          )
        );

        const retryResult = await query;
        if (!retryResult.error && retryResult.data) {
          data = retryResult.data;
        }
      }

      return (data || []).map((cat: any) => ({
        ...cat,
        tags: (cat.tags || []).sort((a: TagRow, b: TagRow) =>
          a.name.localeCompare(b.name)
        ),
      })) as TagCategoryWithTags[];
    } catch (error) {
      return this.handleError(error, "Failed to fetch tag categories");
    }
  }

  /**
   * Creates a new tag category for the authenticated user.
   */
  public static async createTagCategory(
    payload: TagCategoryInsert
  ): Promise<TagCategoryRow> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { data, error } = await (supabase.from("tag_categories") as any)
        .insert({
          user_id: user.id,
          feature: payload.feature || "general",
          name: payload.name.trim(),
          color: payload.color || "#6B7280",
          display_order: payload.display_order ?? 0,
          is_system: payload.is_system ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TagCategoryRow;
    } catch (error) {
      return this.handleError(error, "Failed to create tag category");
    }
  }

  /**
   * Updates an existing tag category by ID.
   */
  public static async updateTagCategory(
    categoryId: number,
    payload: TagCategoryUpdate
  ): Promise<TagCategoryRow> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const updateData: Record<string, unknown> = {};
      if (payload.name !== undefined) updateData.name = payload.name.trim();
      if (payload.color !== undefined) updateData.color = payload.color;
      if (payload.display_order !== undefined) updateData.display_order = payload.display_order;
      if (payload.feature !== undefined) updateData.feature = payload.feature;

      const supabase = this.getSupabase();
      const { data, error } = await (supabase.from("tag_categories") as any)
        .update(updateData)
        .eq("id", categoryId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as TagCategoryRow;
    } catch (error) {
      return this.handleError(error, "Failed to update tag category");
    }
  }

  /**
   * Deletes a tag category by ID, cascading removal to nested tags.
   */
  public static async deleteTagCategory(categoryId: number): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { error } = await (supabase.from("tag_categories") as any)
        .delete()
        .eq("id", categoryId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, "Failed to delete tag category");
    }
  }

  /**
   * Creates a new tag under a specific category.
   */
  public static async createTag(payload: TagInsert): Promise<TagRow> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { data, error } = await (supabase.from("tags") as any)
        .insert({
          category_id: payload.category_id,
          user_id: user.id,
          name: payload.name.trim(),
          color: payload.color || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TagRow;
    } catch (error) {
      return this.handleError(error, "Failed to create tag");
    }
  }

  /**
   * Updates an existing tag by ID.
   */
  public static async updateTag(
    tagId: number,
    payload: TagUpdate
  ): Promise<TagRow> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const updateData: Record<string, unknown> = {};
      if (payload.name !== undefined) updateData.name = payload.name.trim();
      if (payload.color !== undefined) updateData.color = payload.color;
      if (payload.category_id !== undefined) updateData.category_id = payload.category_id;

      const supabase = this.getSupabase();
      const { data, error } = await (supabase.from("tags") as any)
        .update(updateData)
        .eq("id", tagId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as TagRow;
    } catch (error) {
      return this.handleError(error, "Failed to update tag");
    }
  }

  /**
   * Deletes a tag by ID, cascading removal from entity junction tables.
   */
  public static async deleteTag(tagId: number): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { error } = await (supabase.from("tags") as any)
        .delete()
        .eq("id", tagId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, "Failed to delete tag");
    }
  }

  /**
   * Fetches all tags assigned to a specific entity (e.g. diary entry or document).
   */
  public static async fetchEntityTags(
    entityType: EntityType,
    entityId: string
  ): Promise<TagRow[]> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const tableName =
        entityType === "diary_entry"
          ? "diary_entry_tags"
          : entityType === "goal"
          ? "goal_tags"
          : "document_tags";
      const idColumn =
        entityType === "diary_entry"
          ? "entry_id"
          : entityType === "goal"
          ? "goal_id"
          : "document_id";

      const { data, error } = await (supabase.from(tableName) as any)
        .select("tag_id, tags(*)")
        .eq(idColumn, entityId)
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || [])
        .map((row: any) => row.tags)
        .filter(Boolean) as TagRow[];
    } catch (error) {
      return this.handleError(error, "Failed to fetch entity tags");
    }
  }

  /**
   * Assigns a tag to an entity.
   */
  public static async assignTagToEntity(
    entityType: EntityType,
    entityId: string,
    tagId: number
  ): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const tableName =
        entityType === "diary_entry"
          ? "diary_entry_tags"
          : entityType === "goal"
          ? "goal_tags"
          : "document_tags";
      const idColumn =
        entityType === "diary_entry"
          ? "entry_id"
          : entityType === "goal"
          ? "goal_id"
          : "document_id";

      const { error } = await (supabase.from(tableName) as any)
        .insert({
          [idColumn]: entityId,
          tag_id: tagId,
          user_id: user.id,
        });

      if (error && error.code !== "23505") {
        // Ignore 23505 (unique violation/already assigned)
        throw error;
      }
    } catch (error) {
      return this.handleError(error, "Failed to assign tag to entity");
    }
  }

  /**
   * Removes a tag from an entity.
   */
  public static async removeTagFromEntity(
    entityType: EntityType,
    entityId: string,
    tagId: number
  ): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const tableName =
        entityType === "diary_entry"
          ? "diary_entry_tags"
          : entityType === "goal"
          ? "goal_tags"
          : "document_tags";
      const idColumn =
        entityType === "diary_entry"
          ? "entry_id"
          : entityType === "goal"
          ? "goal_id"
          : "document_id";

      const { error } = await (supabase.from(tableName) as any)
        .delete()
        .eq(idColumn, entityId)
        .eq("tag_id", tagId)
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      return this.handleError(error, "Failed to remove tag from entity");
    }
  }

  /**
   * Atomically synchronizes the full tag set assigned to an entity.
   */
  public static async syncEntityTags(
    entityType: EntityType,
    entityId: string,
    tagIds: number[]
  ): Promise<void> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const tableName =
        entityType === "diary_entry"
          ? "diary_entry_tags"
          : entityType === "goal"
          ? "goal_tags"
          : "document_tags";
      const idColumn =
        entityType === "diary_entry"
          ? "entry_id"
          : entityType === "goal"
          ? "goal_id"
          : "document_id";

      // 1. Fetch current tag IDs
      const { data: existing, error: fetchErr } = await (supabase.from(tableName) as any)
        .select("tag_id")
        .eq(idColumn, entityId)
        .eq("user_id", user.id);

      if (fetchErr) throw fetchErr;

      const currentTagIds = new Set<number>((existing || []).map((row: any) => row.tag_id));
      const targetTagIds = new Set<number>(tagIds);

      const toAdd = tagIds.filter((id) => !currentTagIds.has(id));
      const toRemove = Array.from(currentTagIds).filter((id) => !targetTagIds.has(id));

      // 2. Remove unwanted tags
      if (toRemove.length > 0) {
        const { error: delErr } = await (supabase.from(tableName) as any)
          .delete()
          .eq(idColumn, entityId)
          .eq("user_id", user.id)
          .in("tag_id", toRemove);

        if (delErr) throw delErr;
      }

      // 3. Insert newly added tags
      if (toAdd.length > 0) {
        const rowsToInsert = toAdd.map((tagId) => ({
          [idColumn]: entityId,
          tag_id: tagId,
          user_id: user.id,
        }));

        const { error: insErr } = await (supabase.from(tableName) as any)
          .insert(rowsToInsert);

        if (insErr) throw insErr;
      }
    } catch (error) {
      return this.handleError(error, "Failed to sync entity tags");
    }
  }

  /**
   * Provisions base tag categories for a specific feature on-demand via RPC.
   */
  public static async provisionFeatureTagCategories(
    feature: string
  ): Promise<{ success: boolean; feature: string; provisioned: boolean }> {
    try {
      const user = await this.getAuthenticatedUser();
      if (!user) throw new ServiceError("User not authenticated", "UNAUTHENTICATED");

      const supabase = this.getSupabase();
      const { data, error } = await (supabase as any).rpc(
        "provision_feature_tag_categories",
        { p_feature: feature }
      );

      if (error) throw error;
      return data as { success: boolean; feature: string; provisioned: boolean };
    } catch (error) {
      return this.handleError(error, `Failed to provision tags for feature ${feature}`);
    }
  }
}
