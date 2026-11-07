# Full plan — final

Consolidated from every decision so far. One thing to note up front: **status is out of the sort selector** (back to Created / Priority / Manual) and status + priority now drive **filters**, not sort. Pagination is **keyset cursor**, page size **10**.

---

## Section 1 — Picture of the app

### Lists index (`/`)
Cards showing list name and **active task count** (todo + in_progress, excluding trashed). A "New list" button, a **Trash** link, and per-card delete (moves the list *and all its tasks* to trash as a bundle). Clicking a card opens the list.

### Tasks in a list (`/lists/[id]`)
Rows show **title + status pill + priority flag**. Status and priority are **inline-editable** from the row. A checkbox enables **multi-select** with a sticky bottom action bar.

Header controls:
- **Sort selector** — Created · Priority · Manual (persisted per list; default **Created**)
- **Filter: Status** — multi-select checkbox dropdown (todo / in_progress / done / cancelled)
- **Filter: Priority** — multi-select checkbox dropdown (none / low / medium / high / urgent)
- **"New task"** button

List body loads **10 tasks per page** via **cursor pagination**. A **"Load more"** button at the bottom appends the next page; it disappears when there are no more results.

```
┌──────────────────────────────────────────────────────────┐
│ ← Website Redesign                                       │
│ Sort: Created ▾   Status: All ▾   Priority: All ▾        │
│                                              [+ New]     │
├──────────────────────────────────────────────────────────┤
│ ☐  ⚑  Update auth flow       ● In progress               │
│ ☐     API contract definition○ To do                     │
│ ☐  ⚑  Homepage wireframe     ○ To do                     │
│ ...                                                       │
│                     [ Load more ]                         │
├──────────────────────────────────────────────────────────┤
│  2 selected         [ Move to trash ]   Clear             │
└──────────────────────────────────────────────────────────┘
```

### Create task (`/lists/[id]/tasks/new`)
Separate page. Title field, rich text description (TipTap) with `[[` picker, status (default To do), priority (default None). Save → **lands on the new task's preview**.

### Task preview (`/lists/[id]/tasks/[taskId]`)
Read-only: title, status pill, priority flag, rendered description with live chips, backlinks panel. Header: **Edit**, **Move to trash**.

### Edit task (`/lists/[id]/tasks/[taskId]/edit`)
Same form as create, prefilled. Save → back to preview.

### Trash (`/trash`)
Two sections: **Lists** and **Tasks**. Each row shows name + when trashed. Actions: **Restore**, **Delete permanently**. A **"Empty trash"** button with confirmation. **No auto-purge**.

Restore rules:
- **Restore a list** → restores the list + tasks trashed *with it* (`trash_reason = 'list_deleted'`). Tasks trashed *individually or via bulk* before the list was trashed **stay in trash**.
- **Restore a task** → blocked if the parent list is still in trash, tooltip "Restore the list first."
- Restored tasks go to **end of the list** (max `position` + 1). No memory of old position.

### Chip states (three)
- **Live** → normal chip, click navigates.
- **In trash** → muted chip, click opens the trashed task's read-only preview.
- **Permanently deleted** → `⚠ Deleted task`, not clickable.

---

## Section 2 — Backend (Supabase + SvelteKit)

### 2.1 Schema

**`lists`**
- `id`, `name`, `owner_id`
- `sort_mode` enum `('created','priority','manual')` — default `created`
- `live_tasks_count` integer not null default 0 (maintained via DB trigger; tracks all live tasks where `deleted_at IS NULL`)
- `active_tasks_count` integer not null default 0 (maintained via DB trigger; tracks live tasks where `status IN ('todo','in_progress')`)
- `deleted_at` (nullable), `trash_reason` enum `('list_deleted')` (nullable)
- `created_at`

**`tasks`**
- `id`, `list_id` (FK, cascade on hard delete), `title`, `description_html`
- `status` enum `('todo','in_progress','done','cancelled')` — default `todo`
- `priority` enum `('none','low','medium','high','urgent')` — default `none`
- `position` float8 (used only in Manual mode)
- `deleted_at` (nullable), `trash_reason` enum `('individual','bulk','list_deleted')` (nullable)
- `created_at`, `updated_at`

**`task_links`**
- `source_task_id`, `target_task_id`, composite PK, indexed both directions
- Both FKs `ON DELETE CASCADE` from `tasks`. **Soft delete does not remove links** — that's what keeps "In trash" chips renderable.

**Indexes for pagination:**
- `(created_at, id)` on `tasks` — Created sort
- `(priority, created_at, id)` on `tasks` — Priority sort
- `(position, id)` on `tasks` — Manual sort

### 2.2 Trash lifecycle

Every delete is **soft delete** (`deleted_at` set + `trash_reason`):

- **Individual task** → `trash_reason = 'individual'`
- **Bulk tasks** → `trash_reason = 'bulk'` (same effect, different reason for auditing)
- **Whole list** → list gets `deleted_at` + `trash_reason = 'list_deleted'`; every **live** task under it gets the same. Tasks already in trash are **not touched**.

**Restore task** → only if `parent_list.deleted_at IS NULL`; position = `max(position)+1`.

**Restore list** → list `deleted_at` cleared; tasks where `list_id = X AND trash_reason = 'list_deleted'` also cleared.

**Permanent delete** → hard `DELETE`. FK cascade removes links. Chips pointing at the deleted ID become "Deleted task."

### 2.3 Sort (no status)

Three modes, `sort_mode` persisted on the list:

| Mode | ORDER BY | Cursor keyset |
|---|---|---|
| **Created** (default) | `created_at ASC, id ASC` | `(created_at, id) > ($c, $i)` |
| **Priority** | `priority DESC, created_at ASC, id ASC` | mixed-direction keyset (below) |
| **Manual** | `position ASC, id ASC` | `(position, id) > ($p, $i)` |

**Priority keyset** (mixed direction — DESC on priority, ASC on the rest):
```sql
WHERE (priority < $p)
   OR (priority = $p AND created_at > $c)
   OR (priority = $p AND created_at = $c AND id > $i)
```
Postgres enum ordering is declaration order: `urgent > high > medium > low > none`, so `priority DESC` puts Urgent first and None last. Correct.

### 2.4 Filters (status + priority)

Filters are **multi-select checkboxes**. Default = no filter = all values.

Applied as:
```sql
WHERE deleted_at IS NULL
  AND (status IN (...) OR <empty filter>)
  AND (priority IN (...) OR <empty filter>)
  AND <cursor keyset condition>
ORDER BY <per sort_mode>
LIMIT 11  -- fetch one extra to detect next page
```

**Filter + cursor interaction:**
- Filters are part of the query. Cursor encodes only the sort keyset (the last row's sort keys), not the filters.
- Changing a filter **resets the cursor to `null`** (page 1).
- Filters are passed in the URL query string (shareable, survives reload).
- Server validates that the cursor's sort mode matches the list's current `sort_mode`; mismatched cursor → 400, client resets.

**Empty filter = all values** — no filter means no `IN` clause is added (not `IN (all)`; the SQL is literally cleaner).

### 2.5 Cursor pagination

- **Page size:** `PAGE_SIZE = 10`.
- **Fetch strategy:** fetch 11, return 10, `nextCursor` derived from row #10 if row #11 exists.
- **Cursor:** opaque, base64-encoded, contains the sort keyset for the active mode. Client never builds one.
- **Load-more endpoint:** `GET /lists/[id]/tasks/page?cursor=...&status=...&priority=...` — filters passed separately from cursor.
- **Response:**
  ```
  {
    tasks: Task[],
    nextCursor: string | null,
    totalLive: number,        // all live tasks in the list, for the header
    totalFiltered: number     // count matching current filters
  }
  ```

**Keyset deletion-safety:** because the cursor is a keyset (not offset), a task deleted between pages doesn't cause skips/duplicates.

### 2.6 Counts

- **Zero-Count-Query Architecture**: Counts are maintained directly on the `lists` table via PostgreSQL triggers on task mutations (insert, soft-delete, restore, hard-delete, status update) to eliminate expensive aggregate count queries and minimize wire/API overhead:
  - `lists.active_tasks_count` → Live tasks where `status IN ('todo','in_progress') AND deleted_at IS NULL`. Used by Lists index cards.
  - `lists.live_tasks_count` → All live tasks where `deleted_at IS NULL` (including `done` and `cancelled`). Used by the list detail header for `totalLive`.
- **List detail header**: Displays `totalLive` directly from `list.live_tasks_count`. When status/priority filters are active, `totalFiltered` is queried for the active filter set, rendering `totalFiltered of {list.live_tasks_count} tasks`.

### 2.7 Inline edits

- **PATCH status** (single task) — row dropdown fires optimistic update, row stays put even if status sort/filter would move it. Next reload reflects new position.
- **PATCH priority** — same.

Neither triggers link re-sync (no description change).

### 2.8 Link sync

On **create** and **edit** task save: parse `description_html` for all `data-task-id` attributes, diff against existing `task_links` rows for that source, insert/delete the delta. Server-side in the form action.

### 2.9 Access control (RLS)

- `lists` — owner-scoped.
- `tasks` — ownership via `list_id → lists.owner_id`.
- `task_links` — both source and target must resolve to tasks the user owns.

Trash reads are normal `SELECT` including soft-deleted rows; live pages add `WHERE deleted_at IS NULL`, trash page adds `WHERE deleted_at IS NOT NULL`. Chip resolution **does not filter on `deleted_at`** — it fetches all referenced IDs so it can distinguish live / in-trash / gone.

### 2.10 API surface

**Loads:**
- `/` — lists + `activeCount`, live only.
- `/lists/[id]` — list meta (incl. `sort_mode`) + page 1 tasks + `nextCursor` + counts. Reads filters from URL.
- `/lists/[id]/tasks/new` — list id for picker scope.
- `/lists/[id]/tasks/[taskId]` — task + chip resolution + backlinks (live sources only).
- `/lists/[id]/tasks/[taskId]/edit` — same task, edit mode.
- `/trash` — soft-deleted lists + tasks.
- `GET /lists/[id]/tasks?q=&exclude=` — picker search, scoped to list, title only, 8 results.

**Pagination endpoint:**
- `GET /lists/[id]/tasks/page?cursor=...&status=...&priority=...`

**Form actions / endpoints:**
- `create list`, `delete list` (soft, bundle)
- `create task`, `update task`, `delete task` (soft, individual)
- **`bulkTrash`** — array of task IDs
- `restoreTask`, `restoreList`, `permanentlyDelete`, `emptyTrash`
- `PATCH status`, `PATCH priority` (inline, per-task)
- `PATCH sort_mode` (persist per list)

**Realtime:** skipped.

### 2.11 Rich text extensions

TipTap with: bold, italic, bulleted list, numbered list, headings, links, **table** (row/header/cell), **task list (checklist)**, custom `TaskChip` node. Chips allowed **inside table cells**.

Checklists are inline scratch content — ticking has **no effect** on task status.

---

## Section 3 — UI pages and components

### 3.1 Routes

| Route | Purpose |
|---|---|
| `/` | Lists index (live) + Trash link |
| `/lists/[id]` | Tasks in list (rows, sort, filters, bulk, pagination) |
| `/lists/[id]/tasks/new` | Create task page |
| `/lists/[id]/tasks/[taskId]` | Preview |
| `/lists/[id]/tasks/[taskId]/edit` | Edit |
| `/trash` | Trash — lists + tasks |

### 3.2 Components

**Lists index**
- `ListCard` — name, active count, trash button (confirm mentions cascade)
- `CreateListForm`
- `ConfirmDialog`

**Tasks in list**
- `ListHeader` — name, `SortSelect`, `StatusFilter`, `PriorityFilter`, "New task", counts
- `TaskTable` — owns accumulated `tasks[]`, `nextCursor`, `isLoadingMore`, selection; **drag enabled only when sort mode = Manual**; appends on load-more
- `TaskRow` — checkbox, drag handle (Manual only), title, `PriorityFlag`, `StatusPill`, `StatusDropdown`, `PriorityDropdown` (both inline)
- `SortSelect` — Created · Priority · Manual; fires `PATCH sort_mode` and reloads; resets cursor and selection
- `StatusFilter` — multi-select dropdown
- `PriorityFilter` — multi-select dropdown
- `LoadMoreButton` — visible when `nextCursor !== null`; spinner while loading; disappears at end
- `BulkActionBar` — count (across loaded pages), "Move to trash", "Clear"
- `EmptyState` — shown only when zero live tasks exist in the list (not when filters simply match nothing — that gets a "No matching tasks" variant with a "Clear filters" link)

**Create / Edit**
- `TaskFormPage` — shared wrapper
- `TaskTitleInput`
- `RichTextEditor` — TipTap instance + toolbar
- `LinkPicker` — popover driven by `@tiptap/suggestion`
- `TaskChipNode` — TipTap custom node, holds `data-task-id`
- `TaskMetaFields` — status + priority dropdowns in the form

**Preview**
- `TaskPreviewHeader` — title, `StatusPill`, `PriorityFlag`, Edit, Move-to-trash
- `TaskDescriptionRender` — sanitized HTML with live chips (three states)
- `BacklinksPanel` — live sources only; unpaginated in v1
- `ConfirmDialog`

**Trash**
- `TrashPage`
- `TrashedListRow` — name, when trashed, Restore, Delete-permanently
- `TrashedTaskRow` — title, parent list, Restore (disabled if parent list is trashed), Delete-permanently
- `EmptyTrashButton`

**Shared**
- `StatusDot`, `StatusPill`, `StatusDropdown`
- `PriorityFlag`, `PriorityDropdown`
- `InlineEdit` (list rename only)
- `ConfirmDialog`

### 3.3 Interaction notes

- **Inline status/priority edit + active filter/sort** — row updates in place, does **not** re-sort or re-filter until next reload. Avoids mid-interaction jumps.
- **Filters** — stored in URL query string. Changing a filter:
  1. resets cursor to page 1,
  2. replaces the tasks array (does **not** append),
  3. clears selection.
- **Sort change** — persists to DB, reloads page 1, clears selection. Same reset path as filter change.
- **Drag reorder** — Manual mode only. Works **within the currently loaded page**; cannot drag past "Load more." Server rewrites `position` (fractional indexing) for affected rows.
- **Bulk selection** — by task ID, persists across "Load more," cleared on filter change, sort change, or navigation. Header checkbox = "Select all loaded" (filtered loaded rows).
- **Load more** — appends. If the client receives `nextCursor === null`, button hides. Errors keep the list and re-enable the button.
- **Empty states:**
  - Zero live tasks in list → `EmptyState` with "New task" CTA.
  - Filters active but no matches → "No tasks match these filters" + "Clear filters."
  - All loaded with no more → no element, no message.
- **Chip states** — render pass batches all `data-task-id`s in one query (including soft-deleted), maps to `live / trash / gone`.

### 3.4 The `[[` interaction

- **`RichTextEditor`** mounts `@tiptap/suggestion` on `[[`, passes query + list id to `LinkPicker`.
- **`LinkPicker`** calls `GET /lists/[id]/tasks?q=&exclude=`, renders results, emits `onSelect(task)` or `onCreate(title)`.
- **`TaskChipNode`** inserts `[[task:<id>]]`-equivalent HTML: `<span data-task-id="…" data-type="task-link">…</span>`. Visible text is a cached title (fallback only); ID is the source of truth.
- Picker works inside table cells.

### 3.5 Rich text library

TipTap / ProseMirror — `@tiptap/suggestion` is purpose-built for `[[`-triggered popovers, custom node for the chip is first-class, HTML serialization is clean, Svelte integration exists.

---

## Section 4 — Build order

1. **Schema + RLS** — tables with `deleted_at`, `trash_reason`, `sort_mode`, enums, indexes for the three sort modes. Seed data by SQL to verify.
2. **Lists index** — create, delete-to-trash (bundle), active counts, Trash link.
3. **Tasks in list (read-only)** — rows with title + status pill + priority flag. **Pagination from day one** (cursor, 10 per page, Load more). Sort dropdown (Created / Priority / Manual) with persist.
4. **Filters** — status + priority multi-select, URL params, cursor reset on change.
5. **Create task page** — plain textarea, title + status + priority, redirect to preview.
6. **Preview page** — plain render + backlinks panel (empty for now).
7. **Swap in `RichTextEditor`** — bold/italic/lists + HTML save.
8. **`[[` picker + `TaskChipNode`** — same-list search, chip insertion, three chip states in preview.
9. **Edit page** — prefill, save, redirect to preview.
10. **Trash page** — restore rules, permanent delete, empty trash; test the restore-conflict path.
111. **Inline status/priority edit** — optimistic update, no re-sort.
12. **Manual drag + bulk select + BulkActionBar.**
13. **Polish** — table + checklist extensions, chip-in-table, empty states, "Create from picker," keyboard hints.

Ship after step 12. Step 13 trails.

---

## Section 5 — Decisions confirmed

**A. Count metrics**:
- **All live tasks** displayed on list detail header (`totalLive`).
- Counts are maintained directly in fields on the `lists` table (`live_tasks_count` and `active_tasks_count`) updated via database triggers on task changes—no API calls to count or fetch all tasks.

**B. Filter UI style**:
- **Multi-select checkboxes** for both Status and Priority.

Everything locked: status sort **removed**, filters **added** for both status and priority, page size **10**, **cursor** keyset pagination, trash with restore rules, priority with inline edit, bulk delete, rich text with tables + checklists, chips in three states, backlinks panel, persisted per-list sort.

