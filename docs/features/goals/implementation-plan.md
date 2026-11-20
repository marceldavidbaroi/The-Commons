# Goals Module — Phased Implementation Plan

> Reference: [spec.md](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/goals/spec.md)

---

## Phase 1: Database Schema, RLS, Indexes & Types
**Goal:** Establish the 5-table PostgreSQL schema, security policies, keyset-pagination indexes, and summary view.

1. **Create Migration (`supabase/migrations/20271120020000_create_goals_schema.sql`):**
   - Create enums/check constraints for `goals.status` (`draft`, `active`, `completed`, `archived`), `milestones.status` (`locked`, `in_progress`, `passed`, `slipped`), `goal_modules.status` (`pending`, `in_progress`, `completed`, `deferred`), and `goal_tasks.status` (`todo`, `in_progress`, `done`, `cut`).
   - Create tables with `bigint GENERATED ALWAYS AS IDENTITY` PKs:
     - `goals` (`user_id uuid FK -> auth.users(id) NOT NULL`; `north_star`, `final_outcome`, `start_date`, `target_end_date` **nullable**).
     - `milestones` (`goal_id FK -> goals(id) ON DELETE CASCADE`).
     - `definition_of_done_items` (`goal_id FK -> goals(id) ON DELETE CASCADE`, `milestone_id FK -> milestones(id) ON DELETE CASCADE NULL`).
     - `goal_modules` (`milestone_id FK -> milestones(id) ON DELETE CASCADE`).
     - `goal_tasks` (`module_id FK -> goal_modules(id) ON DELETE CASCADE`, `CHECK (estimated_minutes BETWEEN 15 AND 240)`).
   - Add `updated_at` trigger on `goals`.
   - **Indexes:**
     - `goals (user_id, created_at DESC, id DESC)` (keyset pagination).
     - `milestones (goal_id, sort_order ASC, id ASC)`.
     - `definition_of_done_items (goal_id, milestone_id, sort_order ASC, id ASC)`.
     - `goal_modules (milestone_id, sort_order ASC, id ASC)`.
     - `goal_tasks (module_id, sort_order ASC, id ASC)` (keyset pagination).
   - **Postgres View (`goal_summaries`):**
     - Aggregates `total_milestones` and `passed_milestones` per goal (with `security_invoker = true`) for `/goals` cards.
   - **RLS Policies:**
     - Enable RLS on all 5 tables.
     - `goals`: `auth.uid() = user_id` for `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
     - Child tables (`milestones`, `definition_of_done_items`, `goal_modules`, `goal_tasks`): `EXISTS` ownership check tracing up to `goals.user_id = auth.uid()`.
2. **Apply & Generate Types:**
   - Apply migration (`supabase db push` / `supabase migration up`).
   - Regenerate `src/lib/types/database.types.ts`.
   - Create `src/lib/types/goals.ts` with clean DTOs (`GoalSummary`, `GoalDetail`, `MilestoneDetail`, `GoalModuleWithTasks`, `DefinitionOfDoneItem`, `GoalTask`).

**Done Criteria:** Migration applies cleanly, RLS verified, `database.types.ts` updated, `npm run check` passes.

---

## Phase 2: Service Layer (`src/lib/services/goals-service.ts`)
**Goal:** Pure async Supabase functions with explicit column selection (no `select('*')`) and keyset pagination.

1. **Goals Directory:**
   - `fetchGoalsPage(cursor?: { created_at: string; id: number })`: Queries `goal_summaries` ordered by `created_at DESC, id DESC` with `.limit(20)` and keyset filter.
   - `createGoal(title: string)`: Inserts `{ user_id, title, status: 'draft' }` with `.select(...).single()`.
2. **Goal Architecture (`/goal/:id`):**
   - `fetchGoalDetail(goalId: number)`: Fetches goal row, project-level `definition_of_done_items` (`milestone_id IS NULL`), and `milestones` with DoD criteria counts.
   - `saveGoalArchitecture(goalId, goalPatch, dodOps)`: Updates `goals` and applies batch insert/update/delete/reorder on project-level `definition_of_done_items`, returning updated records via `.select()`.
   - `createMilestone(goalId: number, title: string, sortOrder: number)`: Inserts milestone with `.select(...).single()`.
3. **Milestone Execution (`/goal/:id/milestone/:milestoneId`):**
   - `fetchMilestoneDetail(milestoneId: number)`: Fetches milestone, its `definition_of_done_items`, and `goal_modules` (initial `goal_tasks` page `limit(20)` per module).
   - `fetchModuleTasksPage(moduleId: number, cursor?: { sort_order: number; id: number })`: Keyset-paginated `goal_tasks` query (`sort_order ASC, id ASC`, `.limit(20)`).
   - `saveMilestoneExecution(milestoneId, milestonePatch, dodOps, moduleOps, taskOps)`: Persists batch edits across `milestones`, `definition_of_done_items`, `goal_modules`, and `goal_tasks` returning mutated rows.
   - `createModule(milestoneId, title, sortOrder)` & `createGoalTask(moduleId, title, estimatedMinutes, sortOrder)`.

**Done Criteria:** Unit tests in `src/lib/services/goals.test.ts` pass; zero `select('*')` calls.

---

## Phase 3: State & Dirty-Tracking Store (`src/lib/state/goals.svelte.ts`)
**Goal:** Single source of truth using Svelte 5 runes, cache-first navigation, zero-refetch mutations, and baseline snapshot diffing.

1. **Directory State:**
   - `goals` array, `nextCursor`, `hasMore`, `loading`, `loadMore()`.
   - `addGoal(title)` prepends returned record in-place.
2. **Goal Detail Draft & Dirty State:**
   - `goalBaseline` vs `goalDraft` (deep-cloned snapshot on load/save).
   - `isGoalDirty = $derived(...)` comparing draft to baseline.
   - `clearGoalDraft()` resets draft to baseline; `commitGoalSave()` updates store in-place and refreshes baseline.
3. **Milestone Detail Draft & Dirty State:**
   - `milestoneBaseline` vs `milestoneDraft` (milestone fields, DoD items, modules, and loaded `goal_tasks` with per-module pagination cursor).
   - `isMilestoneDirty = $derived(...)`.
   - `clearMilestoneDraft()` & `commitMilestoneSave()` updating store in-place.

**Done Criteria:** Store unit tests (`src/lib/state/goals.test.ts`) verify dirty detection, `Clear`, `Save` in-place updates, and keyset cursor state.

---

## Phase 4: Global Navigation Guard & Shared UI Components
**Goal:** Reusable 3-action unsaved-changes guard and shared Goal UI primitives (no `backdrop-blur-*`).

1. **Unsaved Changes Dialog (`src/lib/components/goals/UnsavedChangesDialog.svelte`):**
   - Solid/alpha modal overlay (no blur) with 3 actions: **Save & Leave**, **Discard**, **Cancel**.
2. **Navigation Guard Helper (`src/lib/components/goals/useUnsavedGuard.svelte.ts`):**
   - Hooks SvelteKit `beforeNavigate(({ cancel, to }) => ...)` when `isDirty` is true: cancels navigation, stores `pendingUrl = to?.url`, opens dialog.
   - Hooks `window.onbeforeunload` for browser refresh/tab close.
   - `Save & Leave` awaits save callback, clears dirty state, calls `goto(pendingUrl)`.
   - `Discard` resets draft, clears dirty state, calls `goto(pendingUrl)`.
3. **Shared Components:**
   - `StatusBadge.svelte` (uniform status mapping for goals, milestones, modules, tasks).
   - `DodCriteriaList.svelte` (ordered editable `criterion` rows, drag/sort handle, delete icon, inline `+ Add Criterion`).

**Done Criteria:** Guard intercepts back links, breadcrumbs, sidebar clicks, and browser refresh cleanly.

---

## Phase 5: Route 1 — `/goals` (Goals Directory)
**Goal:** Implement `src/routes/(app)/goals/+page.svelte` and update app navigation links to include `/goals`.

1. **Header & Create Dialog:**
   - Compact header bar (`Goals` title + `+ Create Goal` button).
   - `CreateGoalDialog.svelte`: single `Goal Title` input + `Cancel` / `Create` (creates `'draft'` goal and navigates to `/goal/:id`).
2. **Goals Grid & Pagination:**
   - Responsive card grid showing `status` badge, `title`, truncated `north_star`, `start_date – target_end_date` timebox, and `X / Y Milestones Passed`.
   - Clicking a card navigates to `/goal/:id`.
   - `Load More` button / pagination trigger for keyset batches (`limit(20)`).

**Done Criteria:** Creating a goal navigates to `/goal/:id`; list paginates cleanly with 20-item batches.

---

## Phase 6: Route 2 — `/goal/:id` (Goal Architecture & North Star)
**Goal:** Implement `src/routes/(app)/goal/[id]/+page.svelte`.

1. **Sticky Action Bar:**
   - `← Goals` link (guarded), `Clear` and `Save` buttons (disabled when `!isGoalDirty`), solid background (no blur).
2. **Section 1 — North Star Layer:**
   - Editable `title` + `status` dropdown (`draft`, `active`, `completed`, `archived`).
   - `north_star` and `final_outcome` textareas.
   - Inline timebox row (`start_date`, `target_end_date`, `weekly_hours_budget`).
3. **Section 2 — Final Outcome DoD:**
   - `DodCriteriaList` scoped to `milestone_id = NULL`.
4. **Section 3 — Milestones List:**
   - `+` button with title-only inline/dialog creation (auto-assigns `sort_order`).
   - Ordered milestone rows (`M1`, `M2`, `title`, `status`, `start_date – due_date`, `N DoD criteria`).
   - Clicking a milestone navigates to `/goal/:id/milestone/:milestoneId` (guarded if dirty).

**Done Criteria:** Edits trigger dirty state, `Clear` reverts, `Save` persists in-place, guard protects navigation.

---

## Phase 7: Route 3 — `/goal/:id/milestone/:milestoneId` (Milestone Execution)
**Goal:** Implement `src/routes/(app)/goal/[id]/milestone/[milestoneId]/+page.svelte`.

1. **Sticky Action Bar:**
   - `← Goal Title` breadcrumb (guarded), `Cancel` and `Save` controls.
2. **Section 1 — Milestone Header & Details:**
   - Editable `title`, `status` dropdown (`locked`, `in_progress`, `passed`, `slipped`), `start_date` / `due_date` pickers, `retrospective_note` textarea.
3. **Section 2 — Milestone Definition of Done:**
   - `DodCriteriaList` scoped to `milestone_id = :milestoneId`.
4. **Section 3 — Goal Modules & `goal_tasks`:**
   - `+ Add Module` title-only creation.
   - Stacked `GoalModuleCard.svelte` components:
     - Module header (editable `title`, `status` dropdown, optional `description`, delete button).
     - `goal_tasks` rows (`status` pill/dropdown, inline `title`, `estimated_minutes` with `> 180` warning highlight, `actual_minutes`, optional `due_date`, expandable `acceptance_note`, delete icon).
     - Per-module `Load more tasks` control when `hasMoreTasks` is true (`limit(20)` keyset pagination).
     - Module footer quick-add bar (`+ Add Task` title + `60m` default).

**Done Criteria:** Full CRUD + batch save works across milestones, DoD items, modules, and paginated `goal_tasks`; `npm run check` and `npm run test` pass.
