import { z } from "zod";

// ============================================================================
// Database Row & Mutation Interfaces
// ============================================================================

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
  created_at: string;
  updated_at: string;
}

export interface TagInsert {
  category_id: number;
  name: string;
  color?: string | null;
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
  entity_id: string;
  tag_id: number;
  user_id: string;
  created_at: string;
  tag?: TagRow;
}

export type EntityType = "document" | "diary_entry" | "goal";

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const hexColorSchema = z
  .string()
  .regex(/^#([0-9A-F]{3}){1,2}$/i, "Must be a valid hex color code (e.g. #6B7280)");

export const createTagCategorySchema = z.object({
  feature: z.string().trim().min(1).default("general"),
  name: z.string().trim().min(1, "Name is required").max(50, "Maximum 50 characters"),
  color: hexColorSchema.default("#6B7280"),
  display_order: z.number().int().nonnegative().default(0),
});

export const updateTagCategorySchema = createTagCategorySchema.partial();

export const createTagSchema = z.object({
  category_id: z.number().int().positive("Invalid numeric category ID"),
  name: z.string().trim().min(1, "Tag name is required").max(50, "Maximum 50 characters"),
  color: hexColorSchema.nullable().optional(),
});

export const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: hexColorSchema.nullable().optional(),
  category_id: z.number().int().positive().optional(),
});

export const syncEntityTagsSchema = z.object({
  entity_id: z.string().uuid("Invalid entity UUID"),
  entity_type: z.enum(["document", "diary_entry", "goal"]),
  tag_ids: z.array(z.number().int().positive("Invalid numeric tag ID")),
});
