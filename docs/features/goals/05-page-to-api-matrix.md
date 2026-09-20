# Page-to-API Matrix: Goals & Objectives Ledger

## 1. Goals Dashboard (`/goals`)

The `/goals` page is the primary workplace for organizing initiatives. It offers multiple views (Recursive Tree, Kanban Status Board, and Flat List), a faceted filter toolbar, and quick action drawers.

| Route / Component | UI View / Element | User Action / Trigger | Target API / Query | HTTP / Method | TanStack Query Hook | Cache & UI Behavior |
|---|---|---|---|---|---|---|
| **`/goals`** | Page Layout / Initial Load | Page Mount / URL Filter Change | `fetchGoals(filters)` | Direct `SELECT` | `useGoals(filters)` | Fetches root & child goals with tag joins. Stored under `['goals', filters]` (5 min TTL). |
| **`/goals`** | View Toggle Switch | User toggles Tree / Board / List | `setViewMode(mode)` | Local Zustand | `useGoalUIStore` | Swaps view representation instantly with zero network refetch. |
| **`/goals`** | "New Goal" Button | User clicks header CTA | Opens `<GoalFormDialog />` | Local UI | N/A | Opens modal form with parent pre-set to `null` (root goal). |
| **`<GoalFormDialog />`** | Form Submission | User creates goal | `createGoal(payload)` | Direct `INSERT` | `useCreateGoalMutation()` | Optimistically inserts into `['goals']` cache; triggers toast; closes dialog. |
| **`<GoalTreeNode />`** | Status Checkbox / Pill | User toggles status (`completed`) | `updateGoalStatus(id, 'completed')` | Direct `UPDATE` | `useUpdateGoalStatusMutation()` | In-place cache update; auto-stamps `achieved_at = NOW()`; updates parent progress bar. |
| **`<GoalTreeNode />`** | Action Menu $\rightarrow$ "Cancel Goal" | User clicks Cancel | Opens `<GoalCancelDialog />` | Local UI | N/A | Prompts for optional reason, then submits `updateGoalStatus(id, 'cancelled', reason)`. |
| **`<GoalTreeNode />`** | "Add Sub-Goal" (`+`) Button | User clicks add child | Opens `<GoalFormDialog />` | Local UI | N/A | Opens modal with `parent_id` prefilled to target goal. |
| **`<GoalTreeNode />`** | Node Row / Title Click | User clicks goal item | `setSelectedGoalId(id)` | Local Zustand | `useGoalUIStore` | Opens `<GoalDetailDrawer />` slide-over with goal details & audit log. |
| **`<GoalDetailDrawer />`** | Edit Form / Inline Save | User edits title / description / dates | `updateGoal(id, updates)` | Direct `UPDATE` | `useUpdateGoalMutation()` | Updates item in cache; synchronizes details drawer. |
| **`<GoalDetailDrawer />`** | Tag Selector (`<TagPicker />`) | User adds/removes tags | `syncGoalTags(goalId, tagIds)` | Direct Batch | `useSyncGoalTagsMutation()` | Updates `goal_tags` relations; invalidates `['goals']`. |
| **`<GoalDetailDrawer />`** | "Delete Goal" Button | User confirms deletion | `deleteGoal(id)` | Direct `DELETE` | `useDeleteGoalMutation()` | Cascades deletion of sub-goals; removes from cache; closes drawer. |
| **`<GoalFilterToolbar />`** | Tag Filter Multiselect | User selects tag filters | `setTagFilter(tagIds)` | URL Sync | Router `replace` | Updates URL params (`?tags=101,102`); re-evaluates query. |
| **`<GoalFilterToolbar />`** | Priority / Status / Type Dropdowns | User filters by attribute | `setFilters(filters)` | URL Sync | Router `replace` | Updates URL query params. |

---

## 2. Zero-Redundant-Call Cache Strategies

1. **Optimistic Status Toggling**:
   When a user completes or updates a goal status:
   ```ts
   queryClient.setQueriesData<GoalWithSubgoalsAndTags[]>(
     { queryKey: goalKeys.all },
     (old) => {
       if (!old) return old;
       return updateGoalInTree(old, goalId, { status: newStatus });
     }
   );
   ```

2. **Hierarchical Cache Mutation on Sub-Goal Creation**:
   When a child goal is inserted:
   - Cache adds child record to parent's `subgoals` array.
   - Parent progress metrics recalculate without reloading entire table.
