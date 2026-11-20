# Goals

### Clean Reusable Template

Whenever you start a new project or skill goal, you can instantiate this exact schema:

-   **North Star (Objective):** _[Direction / Purpose]_
    
-   **Final Outcome (Project DoD):** _[Concrete final artifact or proof]_
    
-   **Total Timebox:** _[Start Date – End Date | Weekly hour commitment]_
    
-   **Milestone 1: [Name]** _(Timebox: Week X)_
    
    -   **Modules / Workstreams:** _[Groupings of work]_
        
    -   **Tasks:** _[1–3 hour checkable items]_
        
    -   **Milestone 1 DoD:** _[3–4 binary Pass/Fail conditions]_
        
-   **Milestone 2: [Name]** _(Timebox: Week Y)_
    
    -   **Modules / Workstreams:** _[Groupings of work]_
        
    -   **Tasks:** _[1–3 hour checkable items]_
        
    -   **Milestone 2 DoD:** _[3–4 binary Pass/Fail conditions]_
        

Here are the 5 tables updated to use standard auto-incrementing integers (`bigint GENERATED ALWAYS AS IDENTITY`) instead of UUIDs:

```
goals (1)
 ├──< milestones (N)
 │     ├──< definition_of_done_items (N)   [Milestone-level exit criteria]
 │     └──< goal_modules (N)               [Workstreams / Epics]
 │           └──< goal_tasks (N)           [1–3 hr atomic work packages]
 └──< definition_of_done_items (N)         [Project-level final outcome DoD]
```

### Table 1: `goals` (North Star, Final Outcome & Total Timebox)

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| user_id | uuid | FK → auth.users(id), NOT NULL |
| title | text | NOT NULL |
| north_star | text | Nullable (Qualitative objective / "Why") |
| final_outcome | text | Nullable (Description of the final capstone deliverable) |
| start_date | date | Nullable |
| target_end_date | date | Nullable |
| weekly_hours_budget | numeric(4,1) | Weekly time commitment (e.g., 7.0) |
| status | text | Enum: 'draft', 'active', 'completed', 'archived' |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

### Table 2: `milestones` (Checkpoints, Timeboxes & Stage-Gates)

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| goal_id | bigint | FK → goals(id) ON DELETE CASCADE, NOT NULL |
| title | text | NOT NULL |
| sort_order | integer | NOT NULL (1, 2, 3... — defines stage-gate sequence) |
| start_date | date | Milestone timebox start |
| due_date | date | Milestone timebox deadline |
| status | text | Enum: 'locked', 'in_progress', 'passed', 'slipped' |
| passed_at | timestamptz | Nullable; set only when 100% of its DoD items are verified |
| retrospective_note | text | Optional post-milestone review / scope-cut notes |

### Table 3: `definition_of_done_items` (Binary Pass/Fail Gates)

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| goal_id | bigint | FK → goals(id) ON DELETE CASCADE, NOT NULL |
| milestone_id | bigint | FK → milestones(id) ON DELETE CASCADE, Nullable (NULL = Goal Final Outcome DoD) |
| criterion | text | NOT NULL (Verifiable binary Pass/Fail condition) |
| sort_order | integer | NOT NULL, default 0 |

### Table 4: `goal_modules` (Workstreams / Epics)

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| milestone_id | bigint | FK → milestones(id) ON DELETE CASCADE, NOT NULL |
| title | text | NOT NULL |
| description | text | Optional scope notes |
| sort_order | integer | NOT NULL, default 0 |
| status | text | Enum: 'pending', 'in_progress', 'completed', 'deferred' |

### Table 5: `goal_tasks` (Atomic 1–3 Hour Work Packages)

| Column | Type | Constraints / Notes |
| --- | --- | --- |
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| module_id | bigint | FK → goal_modules(id) ON DELETE CASCADE, NOT NULL |
| title | text | NOT NULL |
| acceptance_note | text | Optional task-level verification note |
| estimated_minutes | integer | NOT NULL, default 60 (15 <= estimated_minutes <= 240) |
| actual_minutes | integer | default 0 |
| status | text | Enum: 'todo', 'in_progress', 'done', 'cut' |
| due_date | date | Optional daily scheduling target |
| completed_at | timestamptz | Nullable |
| sort_order | integer | NOT NULL, default 0 |

---

# Goals UI

Here is the updated UI specification across all three routes, removing `is_verified` from `definition_of_done_items` and adding the unsaved-changes navigation guard.

### Global Navigation Guard (Unsaved Changes Protection)

-   **Trigger:** Applies to both `/goal/:id` and `/goal/:id/milestone/:milestoneId` whenever local draft state differs from the last saved snapshot (`isDirty === true`) and the user triggers any navigation (clicking back links, breadcrumbs, sidebar routes, or browser back/refresh).
    
-   **Confirmation Dialog (3 Actions):**
    
    -   **Save & Leave:** Commits all pending edits to the database, clears the dirty flag, and completes the navigation.
        
    -   **Discard:** Resets the local draft state, clears the dirty flag, and navigates away without saving.
        
    -   **Cancel:** Closes the dialog and keeps the user on the current page with their edits intact.
        

### Route 1: `/goals` (Goals Directory)

-   **Top Header Bar:**
    
    -   Page Title (`Goals`)
        
    -   Primary Action: `+ Create Goal` button.
        
-   **Create Goal Dialog:**
    
    -   Single text input: `Goal Title` (required).
        
    -   Actions: `Cancel` and `Create` (creates the goal in `'draft'` status and navigates to `/goal/:id`).
        
-   **Goals Grid / List (Cards):**
    
    -   Responsive card grid displaying each goal (`status` badge, `title`, truncated `north_star`, `start_date – target_end_date` timebox, and milestone count like `2 / 4 Milestones Passed`).
        
    -   **Interaction:** Clicking anywhere on a card navigates to `/goal/:id`.
        

### Route 2: `/goal/:id` (Goal Architecture & North Star Page)

-   **Top Sticky Action Bar:**
    
    -   Back link (`← Goals`) — triggers the **Unsaved Changes Confirmation Dialog** if dirty.
        
    -   Dirty-state controls: `Clear` (reverts local edits back to the last saved state) and `Save` (persists changes to `goals` and goal-level `definition_of_done_items`). Both disabled when clean.
        
-   **Section 1: North Star Layer**
    
    -   **Header Row:** Editable `title` input + `status` dropdown (`draft`, `active`, `completed`, `archived`).
        
    -   **North Star (`north_star`):** Multi-line textarea defining the overarching objective / "Why".
        
    -   **Final Outcome (`final_outcome`):** Multi-line textarea defining the capstone deliverable.
        
    -   **Timebox Row:** Three inline inputs — `start_date` picker, `target_end_date` picker, and `weekly_hours_budget` numeric input (`hrs/week`).
        
-   **Section 2: Final Outcome Definition of Done (Project-Level DoD)**
    
    -   Section header (`Final Outcome DoD`) with an inline `+ Add Criterion` input/button (`milestone_id = NULL`).
        
    -   Ordered list of exit criteria rows: editable `criterion` text input, drag/sort handle, and delete icon.
        
-   **Section 3: Milestones Section**
    
    -   Section header (`Milestones`) with a `+` button.
        
    -   **Add Milestone Dialog / Inline Input:** Prompts for just the `title` (auto-assigns next `sort_order` and initial status).
        
    -   **Milestone List:** Ordered rows/cards showing `sort_order` badge (`M1`, `M2`...), `title`, `status` badge (`locked`, `in_progress`, `passed`, `slipped`), `start_date – due_date`, and criteria count (`3 DoD criteria`).
        
    -   **Interaction:** Clicking a milestone row navigates to `/goal/:id/milestone/:milestoneId` (triggering the **Unsaved Changes Confirmation Dialog** first if `/goal/:id` has unsaved edits).
        

### Route 3: `/goal/:id/milestone/:milestoneId` (Milestone Stage-Gate & Execution Page)

-   **Top Sticky Action Bar:**
    
    -   Breadcrumb / Back link (`← Goal Title`) — triggers the **Unsaved Changes Confirmation Dialog** if dirty.
        
    -   Dirty-state controls: `Cancel` (reverts unsaved local edits or returns to `/goal/:id`) and `Save` (persists changes to `milestones`, milestone `definition_of_done_items`, `goal_modules`, and `goal_tasks`).
        
-   **Section 1: Milestone Header & Details**
    
    -   **Header Row:** Editable milestone `title` input + `status` dropdown (`locked`, `in_progress`, `passed`, `slipped`).
        
    -   **Timebox Row:** `start_date` picker and `due_date` picker.
        
    -   **Notes Area (`retrospective_note`):** Multi-line textarea for blockers, scope-cut decisions, and review notes.
        
-   **Section 2: Milestone Definition of Done (Exit Criteria)**
    
    -   Section header (`Milestone Definition of Done`) with an inline `+ Add Criterion` input/button (`milestone_id = :milestoneId`).
        
    -   Ordered list of exit criteria rows: editable `criterion` text input, drag/sort handle, and delete icon.
        
-   **Section 3: Goal Modules & Tasks (Work Breakdown Tree)**
    
    -   Section header (`Goal Modules`) with a `+ Add Module` button (prompts for module `title` and appends a new module card).
        
    -   **Module Cards (Stacked Blocks):** Each `goal_modules` item renders as a distinct card:
        
        -   **Module Header:** Editable module `title`, module `status` dropdown (`pending`, `in_progress`, `completed`, `deferred`), optional `description` input, and delete button.
            
        -   **Task List inside the Module:**
            
            -   Each `goal_tasks` row displays:
                
                -   `status` dropdown/pill (`todo`, `in_progress`, `done`, `cut`)
                    
                -   Inline editable `title`
                    
                -   `estimated_minutes` input (default `60`, highlights warning if `> 180`) and `actual_minutes` input
                    
                -   Optional `due_date` picker & expandable `acceptance_note` field
                    
                -   Delete task icon
                    
            -   **Module Footer:** Quick-add bar (`+ Add Task` title input + default `60m` estimate) scoped directly to that `module_id`.
                

### Core UX & State Rules

1.  **Zero-Friction Creation:** Creating a Goal, Milestone, Module, or Task only asks for its **title** upfront; dates, notes, and estimates are edited in place afterward.
    
2.  **Batch Save & Dirty Tracking:** Both `/goal/:id` and `/goal/:id/milestone/:milestoneId` maintain a deep-cloned baseline snapshot on load/save. Any local mutation flips `isDirty = true`, enabling `Save`/`Clear` and arming the 3-way navigation confirmation modal (`Save & Leave` / `Discard` / `Cancel`).

### Architecture, Pagination & System Rules

-   **4-Layer SPA Separation:** Views (`.svelte`) never import Supabase directly; all queries live in `goals-service.ts` and state is managed in `data.svelte.ts` (cache-first, zero-refetch on CUD via `.select()`).
-   **Keyset Pagination (`limit(20)`):**
    -   **Goals List (`/goals`):** Keyset-paginated using `(created_at desc, id desc)` with `limit(20)` and composite index `(user_id, created_at desc, id desc)`.
    -   **Task List (`goal_tasks`):** Keyset-paginated per module using `(sort_order asc, id asc)` with `limit(20)` and composite index `(module_id, sort_order asc, id asc)`.
-   **Explicit Column Selection & Aggregations:** Prohibit `select('*')`. Use a Postgres View or RPC for `/goals` card milestone counts (`passed / total`).
-   **RLS & Indexing:** Enable RLS on all 5 tables (`auth.uid() = user_id` directly on `goals` and via `goal_id` / `milestone_id` / `module_id` ownership checks on child tables).
-   **Navigation Guard & UI:** Implement the unsaved-changes guard with SvelteKit `beforeNavigate` + `window.onbeforeunload`. Avoid `backdrop-blur-*` on sticky bars and modals.
