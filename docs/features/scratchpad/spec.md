# Feature Spec: Scratchpad (Quick Notes)

> Living feature specification for the Apple Notes–style Scratchpad in The Commons. Automatically rendered at `/dev/document`.

---

## 1. User Goal & UX

- **Problem Statement**: Users need a fast, zero-friction place to jot down random thoughts, movie URLs, snippets, or temporary drafts without the structure of folders, titles, or `[[wikilinks]]` used in `/wiki`.
- **Navigation**: Top-level nav item `/scratchpad` labeled **Scratchpad** in `(app)/+layout.svelte`.

### Master-Detail Layout (Apple Notes Style)
- **Desktop (Single Page, Two Panes)**:
  - **Left Pane (Note List)**: Compact list of notes sorted by `is_pinned DESC, updated_at DESC, id DESC`. Includes a `+ New` button, inline search, and a simple `All | Trash` toggle.
  - **Right Pane (Editor)**: Single seamless TipTap rich-text editor with debounced autosave (no separate title input or Save button).
- **Mobile (`<= 768px`)**:
  - **List View First**: Shows only the note list when no `?id=<id>` is in the URL.
  - **Detail View via URL (`?id=<id>`)**: Tapping any note navigates to `/scratchpad?id=<id>` via `goto(...)`, showing the editor with a `< Back` button (and supporting the native browser/phone Back button to return to the list).

### Seamless First-Line-as-Title & Rich Text
- **First Line = Title**: One seamless TipTap editor where the first block/line is styled as the title (larger/bold) and automatically synced to `title`. Remaining lines form the body and populate `preview`. Empty notes display `"New Note"` in the list.
- **Rich Text**: Supports headings, bold, italic, lists, checklists, links/clickable URLs, and code blocks via TipTap.

### Pinning, Soft Delete & Hard Delete
- **Pinning**: Notes can be pinned/unpinned (`is_pinned`). Pinned notes stay grouped at the top of the `All` list.
- **Soft Delete**: Deleting an active note sets `deleted_at = now()`, removing it from `All` and moving it to **Trash**.
- **Trash Actions**:
  - **Restore**: Clears `deleted_at` (`null`) and returns the note to `All`.
  - **Hard Delete**: Permanently deletes the row from PostgreSQL (with confirmation).

---

## 2. Data & Schema

### New Table: `public.scratchpad_notes`

```sql
CREATE TABLE public.scratchpad_notes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT '',
  content     text NOT NULL DEFAULT '',
  preview     text NOT NULL DEFAULT '',
  is_pinned   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz NULL
);

-- Composite index matching keyset cursor pagination (is_pinned DESC, updated_at DESC, id DESC)
CREATE INDEX idx_scratchpad_notes_user_active_cursor
  ON public.scratchpad_notes (user_id, is_pinned DESC, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_scratchpad_notes_user_trashed_cursor
  ON public.scratchpad_notes (user_id, deleted_at DESC, id DESC)
  WHERE deleted_at IS NOT NULL;

ALTER TABLE public.scratchpad_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scratchpad_notes_select_own"
  ON public.scratchpad_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "scratchpad_notes_insert_own"
  ON public.scratchpad_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scratchpad_notes_update_own"
  ON public.scratchpad_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scratchpad_notes_delete_own"
  ON public.scratchpad_notes FOR DELETE
  USING (auth.uid() = user_id);
```

### Query & Store Rules
- **Explicit Column Selection**: `id, title, content, preview, is_pinned, created_at, updated_at, deleted_at` (no `select('*')`).
- **Keyset Pagination**: `limit(20)` ordered by `is_pinned DESC, updated_at DESC, id DESC` (active) or `deleted_at DESC, id DESC` (trash).
- **Zero-Refetch Mutations**: Inserts/updates use `.select(...).single()` and update the in-memory store array directly; soft/hard deletes filter/move items locally.

---

## 3. Route & Component Matrix

| File | Responsibility |
| :--- | :--- |
| `src/routes/(app)/+layout.svelte` | Add `/scratchpad` nav item (`Scratchpad`). |
| `src/routes/(app)/scratchpad/+page.svelte` | Single-page master-detail shell; syncs selected note with `?id=<bigint>` for desktop split view and mobile list/detail navigation. |
| `src/lib/types/scratchpad.ts` | `ScratchpadNote` (`id: number`) and payload interfaces. |
| `src/lib/services/scratchpad-service.ts` | Supabase queries: `fetchScratchpadNotes`, `fetchTrashedScratchpadNotes`, `fetchScratchpadNoteById`, `createScratchpadNote`, `updateScratchpadNote`, `togglePinScratchpadNote`, `softDeleteScratchpadNote`, `restoreScratchpadNote`, `hardDeleteScratchpadNote`. |
| `src/lib/state/scratchpad.svelte.ts` | Svelte 5 runes store: active/trashed lists, selected note ID, search filter, `All \| Trash` mode, debounced autosave, in-place CUD updates. |
| `src/lib/components/scratchpad/ScratchpadList.svelte` | Left pane (desktop) / main view (mobile): `+ New`, search, `All \| Trash` toggle, pinned section/indicator, load-more cursor trigger. |
| `src/lib/components/scratchpad/ScratchpadListItem.svelte` | Compact Apple Notes–style row: `title` (or `"New Note"`), pin badge, 1-line `preview`, relative `updated_at`. |
| `src/lib/components/scratchpad/ScratchpadEditor.svelte` | Right pane (desktop) / detail view (mobile): seamless TipTap editor (first line styled & synced as title), Pin, Soft Delete / Restore / Hard Delete actions, mobile `< Back` button. |

---

## 4. Acceptance Criteria & Invariants

- Opening `/scratchpad` on desktop renders the note list on the left and the active note editor on the right in a single page with zero layout shift.
- Opening `/scratchpad` on mobile shows only the list; tapping a note navigates to `/scratchpad?id=<id>` and opens the editor, where `< Back` or the browser Back button returns to the list.
- Typing on the first line of the seamless editor automatically updates `title` in the list; rich-text edits autosave without page reload or list refetch.
- Pinned notes (`is_pinned = true`) sort above unpinned notes in `All`.
- Soft-deleting a note moves it to `Trash` (`deleted_at` set); from `Trash` it can be restored or permanently hard-deleted.
- RLS enforces `auth.uid() = user_id` on all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations.
