"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TagService } from "@/services/tag.service";
import { notify } from "@/lib/notify";
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

export const tagKeys = {
  all: ["tags"] as const,
  categories: (feature?: string) =>
    [...tagKeys.all, "categories", feature || "all"] as const,
  allCategories: () => [...tagKeys.all, "categories"] as const,
  entityTags: (entityType: EntityType, entityId: string) =>
    [...tagKeys.all, "entity", entityType, entityId] as const,
};

/**
 * Hook to retrieve user tag categories and nested child tags,
 * optionally filtered by feature scope (e.g. 'diary', 'document').
 */
export function useTagCategoriesQuery(feature?: string) {
  return useQuery({
    queryKey: tagKeys.categories(feature),
    queryFn: async (): Promise<TagCategoryWithTags[]> => {
      return TagService.fetchUserTagCategoriesWithTags(feature);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to retrieve tags assigned to a specific entity.
 */
export function useEntityTagsQuery(entityType: EntityType, entityId?: string) {
  return useQuery({
    queryKey: tagKeys.entityTags(entityType, entityId || ""),
    queryFn: async (): Promise<TagRow[]> => {
      if (!entityId) return [];
      return TagService.fetchEntityTags(entityType, entityId);
    },
    enabled: Boolean(entityId),
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to create a new tag category with zero-redundant-refetch cache injection.
 */
export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TagCategoryInsert): Promise<TagCategoryRow> => {
      return TagService.createTagCategory(payload);
    },
    onSuccess: (newCategory) => {
      // In-memory cache update for matching category query caches
      queryClient.setQueriesData<TagCategoryWithTags[]>(
        { queryKey: tagKeys.allCategories() },
        (old) => {
          if (!old) return [{ ...newCategory, tags: [] }];
          return [...old, { ...newCategory, tags: [] }].sort(
            (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name)
          );
        }
      );
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to create category");
    },
  });
}

/**
 * Hook to update a tag category.
 */
export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      payload,
    }: {
      categoryId: number;
      payload: TagCategoryUpdate;
    }): Promise<TagCategoryRow> => {
      return TagService.updateTagCategory(categoryId, payload);
    },
    onSuccess: (updatedCategory) => {
      queryClient.setQueriesData<TagCategoryWithTags[]>(
        { queryKey: tagKeys.allCategories() },
        (old) => {
          if (!old) return old;
          return old.map((cat) =>
            cat.id === updatedCategory.id
              ? { ...cat, ...updatedCategory, tags: cat.tags }
              : cat
          );
        }
      );
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to update category");
    },
  });
}

/**
 * Hook to delete a tag category.
 */
export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: number): Promise<void> => {
      return TagService.deleteTagCategory(categoryId);
    },
    onSuccess: (_, categoryId) => {
      queryClient.setQueriesData<TagCategoryWithTags[]>(
        { queryKey: tagKeys.allCategories() },
        (old) => {
          if (!old) return old;
          return old.filter((cat) => cat.id !== categoryId);
        }
      );
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to delete category");
    },
  });
}

/**
 * Hook to create a new tag with direct cache injection (zero redundant refetch).
 */
export function useCreateTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TagInsert): Promise<TagRow> => {
      return TagService.createTag(payload);
    },
    onSuccess: (newTag) => {
      queryClient.setQueriesData<TagCategoryWithTags[]>(
        { queryKey: tagKeys.allCategories() },
        (old) => {
          if (!old) return old;
          return old.map((cat) => {
            if (cat.id !== newTag.category_id) return cat;
            const updatedTags = [...cat.tags.filter((t) => t.id !== newTag.id), newTag].sort(
              (a, b) => a.name.localeCompare(b.name)
            );
            return { ...cat, tags: updatedTags };
          });
        }
      );
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to create tag");
    },
  });
}

/**
 * Hook to update an existing tag.
 */
export function useUpdateTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tagId,
      payload,
    }: {
      tagId: number;
      payload: TagUpdate;
    }): Promise<TagRow> => {
      return TagService.updateTag(tagId, payload);
    },
    onSuccess: (updatedTag) => {
      queryClient.setQueriesData<TagCategoryWithTags[]>(
        { queryKey: tagKeys.allCategories() },
        (old) => {
          if (!old) return old;
          return old.map((cat) => {
            if (cat.id !== updatedTag.category_id) {
              return {
                ...cat,
                tags: cat.tags.filter((t) => t.id !== updatedTag.id),
              };
            }
            return {
              ...cat,
              tags: cat.tags.map((t) => (t.id === updatedTag.id ? updatedTag : t)),
            };
          });
        }
      );
      // Invalidate entity tags that might contain this tag
      queryClient.invalidateQueries({ queryKey: [...tagKeys.all, "entity"] });
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to update tag");
    },
  });
}

/**
 * Hook to delete a tag.
 */
export function useDeleteTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: number): Promise<void> => {
      return TagService.deleteTag(tagId);
    },
    onSuccess: (_, tagId) => {
      queryClient.setQueriesData<TagCategoryWithTags[]>(
        { queryKey: tagKeys.allCategories() },
        (old) => {
          if (!old) return old;
          return old.map((cat) => ({
            ...cat,
            tags: cat.tags.filter((t) => t.id !== tagId),
          }));
        }
      );
      // Remove from entity tag caches
      queryClient.setQueriesData<TagRow[]>(
        { queryKey: [...tagKeys.all, "entity"] },
        (old) => (old ? old.filter((t) => t.id !== tagId) : old)
      );
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to delete tag");
    },
  });
}

/**
 * Hook to assign a tag to an entity with optimistic cache update.
 */
export function useAssignTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      tag,
    }: {
      entityType: EntityType;
      entityId: string;
      tag: TagRow;
    }): Promise<void> => {
      return TagService.assignTagToEntity(entityType, entityId, tag.id);
    },
    onMutate: async ({ entityType, entityId, tag }) => {
      const queryKey = tagKeys.entityTags(entityType, entityId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TagRow[]>(queryKey);

      queryClient.setQueryData<TagRow[]>(queryKey, (old) => {
        if (!old) return [tag];
        if (old.some((t) => t.id === tag.id)) return old;
        return [...old, tag];
      });

      return { previous, queryKey };
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      notify.error(error instanceof Error ? error.message : "Failed to assign tag");
    },
  });
}

/**
 * Hook to remove a tag from an entity with optimistic cache update.
 */
export function useRemoveTagMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      tagId,
    }: {
      entityType: EntityType;
      entityId: string;
      tagId: number;
    }): Promise<void> => {
      return TagService.removeTagFromEntity(entityType, entityId, tagId);
    },
    onMutate: async ({ entityType, entityId, tagId }) => {
      const queryKey = tagKeys.entityTags(entityType, entityId);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<TagRow[]>(queryKey);

      queryClient.setQueryData<TagRow[]>(queryKey, (old) => {
        if (!old) return [];
        return old.filter((t) => t.id !== tagId);
      });

      return { previous, queryKey };
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      notify.error(error instanceof Error ? error.message : "Failed to remove tag");
    },
  });
}

/**
 * Hook to sync all tags on an entity.
 */
export function useSyncEntityTagsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      tagIds,
    }: {
      entityType: EntityType;
      entityId: string;
      tagIds: number[];
    }): Promise<void> => {
      return TagService.syncEntityTags(entityType, entityId, tagIds);
    },
    onSuccess: (_, { entityType, entityId }) => {
      queryClient.invalidateQueries({
        queryKey: tagKeys.entityTags(entityType, entityId),
      });
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to sync entity tags");
    },
  });
}

/**
 * Hook to provision tag categories for a feature on-demand.
 */
export function useProvisionFeatureTagsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feature: string): Promise<{ success: boolean; feature: string; provisioned: boolean }> => {
      return TagService.provisionFeatureTagCategories(feature);
    },
    onSuccess: (result, feature) => {
      if (result.provisioned) {
        queryClient.invalidateQueries({
          queryKey: tagKeys.categories(feature),
        });
      }
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : "Failed to provision feature tags");
    },
  });
}

