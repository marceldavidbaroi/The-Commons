/**
 * TypeScript Type Definitions & Function Stubs for Universal Tagging System
 * File: docs/features/document-tags/stubs.ts
 * Numeric ID Convention: tag_categories.id (number), tags.id (number)
 */

export interface TagCategoryRow {
  id: number;
  user_id: string;
  feature: string;
  name: string;
  color: string;
  display_order: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TagCategoryInsert {
  feature?: string;
  name: string;
  color?: string;
  display_order?: number;
  is_system?: boolean;
}

export interface TagCategoryUpdate {
  feature?: string;
  name?: string;
  color?: string;
  display_order?: number;
}

export interface TagRow {
  id: number;
  category_id: number;
  user_id: string;
  name: string;
  color: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TagInsert {
  category_id: number;
  name: string;
  color?: string | null;
  is_system?: boolean;
}

export interface TagUpdate {
  name?: string;
  color?: string | null;
  category_id?: number;
}

export interface TagCategoryWithTags extends TagCategoryRow {
  tags: TagRow[];
}

export interface EntityTagJunction {
  entity_id: string; // UUID of Document / Diary Entry
  tag_id: number;    // Numeric ID of Tag
  user_id: string;
  created_at: string;
  tag?: TagRow;
}

export type EntityType = "document" | "diary_entry";

// ============================================================================
// Service Function Headers
// ============================================================================

export declare function fetchUserTagCategoriesWithTags(
  feature?: string
): Promise<TagCategoryWithTags[]>;

export declare function createTagCategory(
  payload: TagCategoryInsert
): Promise<TagCategoryRow>;

export declare function updateTagCategory(
  categoryId: number,
  payload: TagCategoryUpdate
): Promise<TagCategoryRow>;

export declare function deleteTagCategory(categoryId: number): Promise<void>;

export declare function createTag(payload: TagInsert): Promise<TagRow>;

export declare function updateTag(
  tagId: number,
  payload: TagUpdate
): Promise<TagRow>;

export declare function deleteTag(tagId: number): Promise<void>;

export declare function fetchEntityTags(
  entityType: EntityType,
  entityId: string
): Promise<TagRow[]>;

export declare function assignTagToEntity(
  entityType: EntityType,
  entityId: string,
  tagId: number
): Promise<void>;

export declare function removeTagFromEntity(
  entityType: EntityType,
  entityId: string,
  tagId: number
): Promise<void>;

export declare function syncEntityTags(
  entityType: EntityType,
  entityId: string,
  tagIds: number[]
): Promise<void>;

export declare function provisionFeatureTagCategories(
  feature: string
): Promise<{ success: boolean; feature: string; provisioned: boolean }>;
