# Tasks Calendar View — Implementation Plan

## 1. User Goal & UX
- **Entry Point**: A **Calendar** button in the `/tasks` header (Tier 1) that navigates to `/tasks/calendar`.
- **Views**: Traditional calendar grid supporting **Day**, **Week**, **Month**, **2-Month**, and **6-Month** layouts, with Previous / Today / Next navigation.
- **Day Indicators**:
  - **Month / 2-Month / 6-Month**: Compact dots (colored by priority or status) or small task icons when space permits; badge/count if multiple tasks fall on the same day.
  - **Week / Day**: Expanded day columns/cards showing task titles, priority, and status directly.
- **Day Interaction**: Clicking any day with tasks opens a small floating preview/popover listing the tasks due on that date (showing task titles, priority/status), where clicking a task title navigates to its task details.
- **Scope & Filtering**: Displays **all tasks across all lists**, hiding `done` and `cancelled` tasks by default with a toolbar toggle to show them.

## 2. Data & Query Layer
- **Existing Schema**: Uses `tasks.due_date` (`string | null`). No new tables required.
- **Service (`src/lib/services/tasks-service.ts`)**:
  - Add `fetchTasksByDateRange({ startDate, endDate, listId?, includeCompleted? })` using explicit column selection: `id, list_id, title, status, priority, due_date`.
  - Filter `deleted_at IS NULL` and `due_date >= startDate` / `due_date <= endDate`.
- **Store (`src/lib/state/tasks.svelte.ts`)**:
  - Cache fetched range results in memory by `YYYY-MM` or range key to avoid redundant refetches when switching between adjacent views.

## 3. Route & Component Matrix
| File | Responsibility |
| :--- | :--- |
| `src/routes/(app)/tasks/+page.svelte` | Add Calendar button in Tier 1 header linking to `/tasks/calendar`. |
| `src/routes/(app)/tasks/calendar/+page.svelte` | Calendar page shell, view-mode state (`day` \| `week` \| `month` \| `2month` \| `6month`), date navigation. |
| `src/lib/components/tasks/calendar/CalendarToolbar.svelte` | Tier 1/2 compact header: Back to Tasks, view switcher, Prev/Today/Next controls. |
| `src/lib/components/tasks/calendar/CalendarGrid.svelte` | Renders 1-month, 2-month, 6-month, week, or day grid layouts. |
| `src/lib/components/tasks/calendar/CalendarDayCell.svelte` | Renders day number, today highlight, and task dots/icons. |
| `src/lib/components/tasks/calendar/CalendarDayPanel.svelte` | Displays tasks for the selected day when clicked. |

## 4. Acceptance Criteria
- Navigating from `/tasks` to `/tasks/calendar` via the Calendar button works with zero layout shift.
- Switching between Day, Week, Month, 2-Month, and 6-Month views renders accurate dates and tasks for each range.
- Days with due tasks display dots/icons; clicking a day shows its tasks.
- Only non-deleted tasks (`deleted_at IS NULL`) belonging to the authenticated user (enforced by RLS) are shown.
