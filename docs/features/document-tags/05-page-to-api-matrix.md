# Page-to-API Matrix: Universal Tagging System

## 1. Dedicated Tag Management Page (`/tag-management`)

The dedicated **Tag Management Page** (`/tag-management`) serves as the central hub for managing tag taxonomy. It lists all tag categories (with feature badges, tag count, and display order). Clicking any category in the list opens a **Side Dialog / Drawer** showing all tags belonging to that category, where users can add, edit, and delete tags. System categories/tags are marked with a visual badge and are strictly read-only.

| Route / Component | UI View / Element | User Action / Trigger | Target API | HTTP / Method | TanStack Query Hook | Cache & UI Behavior |
|---|---|---|---|---|---|---|
| **`/tag-management`** | Category List Table / Cards | Page Load / Feature Filter Change | `fetchUserTagCategoriesWithTags(feature)` | Direct `SELECT` | `useTagCategoriesQuery(feature)` | Reads from TanStack Query cache (5m TTL). |
| **`/tag-management`** | Top Action Bar / "New Category" Button | User clicks "Add Category" & submits modal/form | `createTagCategory({ feature, name, color, display_order })` | Direct `INSERT` | `useCreateCategoryMutation()` | Direct cache injection into `['tag-categories']`; updates list immediately. |
| **`/tag-management`** | Category Row / Card | User clicks category item | Local React State (`selectedCategoryId`) | UI Selection | Local State | Opens the **Side Dialog / Drawer** displaying the active category and its tags. |
| **`/tag-management`** | Category Action Menu (`...`) | User edits category name / color / order (Non-system) | `updateTagCategory(categoryId, updates)` | Direct `UPDATE` | `useUpdateCategoryMutation()` | Updates category in-place in TanStack cache. Disabled on system categories (`is_system = true`). |
| **`/tag-management`** | Category Action Menu (`...`) | User deletes category (Non-system) | `deleteTagCategory(categoryId)` | Direct `DELETE` | `useDeleteCategoryMutation()` | Removes category & child tags from cache; cascades in DB. Disabled on system categories. |
| **Side Dialog** (`<TagSideDialog />`) | Category Header | Dialog Opens | Read from `useTagCategoriesQuery` | In-Memory | `useTagCategoriesQuery()` | Displays category title, feature scope badge, color swatch, and `System (Read-only)` badge if `is_system = true`. |
| **Side Dialog** (`<TagSideDialog />`) | Tags List View | Renders child tags under active category | Derived from selected category in cache | In-Memory | `useTagCategoriesQuery()` | Renders tag badges, custom color indicators, and action buttons. System tags render in readonly mode. |
| **Side Dialog** (`<TagSideDialog />`) | "Add Tag" Input / Form | User submits new tag name & color | `createTag({ category_id, name, color })` | Direct `INSERT` | `useCreateTagMutation()` | Directly appends created tag to active category in cache without refetching. Disabled if category is system readonly. |
| **Side Dialog** (`<TagSideDialog />`) | Tag Item / "Edit" Button | User updates tag name or color override | `updateTag(tagId, { name, color })` | Direct `UPDATE` | `useUpdateTagMutation()` | Updates tag in cache in-place; invalidates affected entity queries. Disabled if tag is system readonly. |
| **Side Dialog** (`<TagSideDialog />`) | Tag Item / "Delete" (`🗑`) | User clicks delete tag | `deleteTag(tagId)` | Direct `DELETE` | `useDeleteTagMutation()` | Removes tag from category and entity tag caches. Disabled if tag is system readonly. |

---

## 2. System Tags & Read-Only Governance

1. **System Tag Categories (`is_system = true`)**:
   - Visual `System / Default` badge rendered next to the category title.
   - Category name, feature, and core configuration cannot be renamed or deleted by regular users.
   - Delete action is hidden or disabled in the UI.

2. **System Tags**:
   - System-provided tags cannot be deleted or renamed.
   - The Side Dialog shows a lock icon `🔒` and disables the edit/delete buttons for system tags.
   - Custom user-created tags under user categories are fully editable and deletable.

---

## 3. Zero-Redundant-Call Cache Strategies (TanStack Query)

1. **Hierarchical Category Fetch**:
   Categories and nested tags are fetched via Supabase relation:
   ```ts
   let query = supabase
     .from("tag_categories")
     .select("*, tags(*)")
     .order("display_order", { ascending: true })
     .order("name", { foreignTable: "tags", ascending: true });

   if (feature) {
     query = query.eq("feature", feature);
   }
   ```
   Stored in TanStack Query with `staleTime: 1000 * 60 * 5` (5 minutes).

2. **In-Memory Cache Injections on Mutations**:
   - **Create Tag**:
     ```ts
     queryClient.setQueriesData<TagCategoryWithTags[]>(
       { queryKey: tagKeys.allCategories() },
       (old) => {
         if (!old) return old;
         return old.map((cat) =>
           cat.id === newTag.category_id
             ? { ...cat, tags: [...cat.tags, newTag] }
             : cat
         );
       }
     );
     ```
   - **Delete Tag**:
     ```ts
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
     ```
