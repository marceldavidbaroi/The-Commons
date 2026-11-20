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
| north_star | text | NOT NULL (Qualitative objective / "Why") |
| final_outcome | text | NOT NULL (Description of the final capstone deliverable) |
| start_date | date | NOT NULL |
| target_end_date | date | NOT NULL |
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
