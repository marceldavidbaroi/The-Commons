# Feature Spec: Quick Note

> Living feature specification for the Apple Notes–style Quick Note in The Commons. Automatically rendered at `/dev/document`.

---

## 1. User Goal & UX

- **Problem Statement**: Users need a fast, zero-friction place to jot down random thoughts, movie URLs, snippets, or temporary drafts without the structure of folders, titles, or `[[wikilinks]]` used in `/wiki`.
- **Navigation**: Top-level nav item `/quick-note` labeled **Quick Note** in `(app)/+layout.svelte`.

### Master-Detail Layout (Apple Notes Style)
- **Desktop (Single Page, Two Panes)**:
  - **Left Pane (Note List)**: Compact list of notes sorted by `is_pinned DESC, updated_at DESC, id DESC`. Includes a `+ New` button, an inline **Search** bar (filters by `title` / `preview`), and a simple `All | Trash` toggle.
  - **Right Pane (Editor)**: Single seamless TipTap rich-text editor with debounced autosave (no separate title input or Save button) and a **three-dot (`⋮`) action menu** in the header.
- **Mobile (`<= 768px`)**:
  - **List View First**: Shows only the note list when no `?id=<id>` is in the URL.
  - **Detail View via URL (`?id=<id>`)**: Tapping any note navigates to `/quick-note?id=<id>` via `goto(...)`, showing the editor with a `< Back` button (and supporting the native browser/phone Back button to return to the list) plus the **three-dot (`⋮`) action menu**.

### Context & Detail Actions
- **List Right-Click Context Menu** (on any note row in `All`):
  - **Pin / Unpin**
  - **Lock / Unlock**
  - **Duplicate** (creates a new copy of the note and selects it)
  - **Delete** (soft delete to `Trash`)
  - *(In `Trash`, right-click offers **Restore** and **Delete Permanently**.)*
- **Detail Three-Dot (`⋮`) Menu** (in the editor header):
  - **Pin / Unpin**
  - **Lock / Unlock** *(and **Lock Now** when a locked note is temporarily unlocked)*
  - **Duplicate**
  - **Delete** *(or **Restore** / **Delete Permanently** when viewing a trashed note)*

### Seamless First-Line-as-Title & Rich Text
- **First Line = Title**: One seamless TipTap editor where the first block/line is styled as the title (larger/bold) and automatically synced to `title`. Remaining lines form the body and populate `preview`. Empty notes display `"New Note"` in the list.
- **Rich Text**: Supports headings, bold, italic, lists, checklists, links/clickable URLs, and code blocks via TipTap.

### Pinning, Locking, Soft Delete & Hard Delete
- **Pinning**: Notes can be pinned/unpinned (`is_pinned`). Pinned notes stay grouped at the top of the `All` list.
- **Locking**:
  - Notes can be locked/unlocked (`is_locked`) using a user passcode (set on first lock via a quick passcode modal).
  - Locked notes display a lock icon in the list and hide their body `preview` (showing `"Locked note"` instead).
  - Opening a locked note shows a centered unlock prompt; once unlocked, it stays readable for the current session until manually re-locked or the user clicks **Lock Now**.
  - Soft-deleting or hard-deleting a locked note requires it to be unlocked first.
- **Soft Delete**: Deleting an active note sets `deleted_at = now()`, removing it from `All` and moving it to **Trash**.
- **Trash Actions**:
  - **Restore**: Clears `deleted_at` (`null`) and returns the note to `All`.
  - **Hard Delete**: Permanently deletes the row from PostgreSQL (with confirmation).

---

## 2. Data & Schema

### New Tables: `public.quick_notes` & `public.quick_note_settings`

```sql
CREATE TABLE public.quick_notes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT '',
  content     text NOT NULL DEFAULT '',
  preview     text NOT NULL DEFAULT '',
  is_pinned   boolean NOT NULL DEFAULT false,
  is_locked   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz NULL
);

-- Composite index matching keyset cursor pagination (is_pinned DESC, updated_at DESC, id DESC)
CREATE INDEX idx_quick_notes_user_active_cursor
  ON public.quick_notes (user_id, is_pinned DESC, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_quick_notes_user_trashed_cursor
  ON public.quick_notes (user_id, deleted_at DESC, id DESC)
  WHERE deleted_at IS NOT NULL;

ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_notes_select_own"
  ON public.quick_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "quick_notes_insert_own"
  ON public.quick_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quick_notes_update_own"
  ON public.quick_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quick_notes_delete_own"
  ON public.quick_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Per-user passcode hash for locked notes (never exposed directly to client SELECT)
CREATE TABLE public.quick_note_settings (
  user_id       uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  passcode_hash text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_note_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_note_settings_own"
  ON public.quick_note_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Query & Store Rules
- **Explicit Column Selection**: `id, title, content, preview, is_pinned, is_locked, created_at, updated_at, deleted_at` (no `select('*')`).
- **Keyset Pagination**: `limit(20)` ordered by `is_pinned DESC, updated_at DESC, id DESC` (active) or `deleted_at DESC, id DESC` (trash).
- **Zero-Refetch Mutations**: Inserts/updates use `.select(...).single()` and update the in-memory store array directly; soft/hard deletes filter/move items locally.

---

## 3. Route & Component Matrix

| File | Responsibility |
| :--- | :--- |
| `src/routes/(app)/+layout.svelte` | Add `/quick-note` nav item (`Quick Note`). |
| `src/routes/(app)/quick-note/+page.svelte` | Single-page master-detail shell; syncs selected note with `?id=<bigint>` for desktop split view and mobile list/detail navigation. |
| `src/lib/types/quick-note.ts` | `QuickNote` (`id: number`) and payload interfaces. |
| `src/lib/services/quick-note-service.ts` | Supabase queries: `fetchQuickNotes`, `fetchTrashedQuickNotes`, `fetchQuickNoteById`, `createQuickNote`, `duplicateQuickNote`, `updateQuickNote`, `togglePinQuickNote`, `toggleLockQuickNote`, `setQuickNotePasscode`, `verifyQuickNotePasscode`, `softDeleteQuickNote`, `restoreQuickNote`, `hardDeleteQuickNote`. |
| `src/lib/state/quick-note.svelte.ts` | Svelte 5 runes store: active/trashed lists, selected note ID, unlocked note IDs (session-only), search filter, `All \| Trash` mode, debounced autosave, duplicate, and in-place CUD updates. |
| `src/lib/components/quick-note/QuickNoteList.svelte` | Left pane (desktop) / main view (mobile): `+ New`, inline search input, `All \| Trash` toggle, pinned indicator, load-more cursor trigger. |
| `src/lib/components/quick-note/QuickNoteListItem.svelte` | Compact Apple Notes–style row: `title` (or `"New Note"`), pin & lock badges, 1-line `preview` (redacted when locked), relative `updated_at`, and right-click context menu (`Pin`, `Lock`, `Duplicate`, `Delete`). |
| `src/lib/components/quick-note/QuickNoteEditor.svelte` | Right pane (desktop) / detail view (mobile): seamless TipTap editor (first line styled & synced as title), unlock gate for locked notes, three-dot (`⋮`) menu (`Pin`, `Lock`, `Duplicate`, `Delete` / `Restore` / `Delete Permanently`), mobile `< Back` button. |
| `src/lib/components/quick-note/QuickNotePasscodeModal.svelte` | Modal to set or verify the user's quick note lock passcode. |

---

## 4. Design & Theme Alignment

- **Theme Tokens**: All surfaces, text, borders, and active states use the app's CSS custom properties (`--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--text-primary`, `--text-secondary`, `--border-color`, `--accent-color`) so light/dark modes and user accent colors apply automatically.
- **Full-Bleed Split Layout**: Add `page.url.pathname.startsWith("/quick-note")` to `.content-wrapper.full-bleed` in `src/routes/(app)/+layout.svelte` (matching `/wiki` and `/movies`) so the two-pane layout renders cleanly without double outer padding.
- **No Blur Effects**: Context menus, the three-dot (`⋮`) popover, and `QuickNotePasscodeModal` use solid/alpha backgrounds with subtle borders and box-shadows (no `backdrop-filter: blur()` or `filter: blur()`).
- **Compact & Minimalist**: Flat, high-density list rows, subtle `1px` dividers, plain-language copy, and reused TipTap editor styling consistent with the rest of The Commons.

---

## 5. Acceptance Criteria & Invariants

- Opening `/quick-note` on desktop renders the note list on the left and the active note editor on the right in a single page with zero layout shift.
- Opening `/quick-note` on mobile shows only the list; tapping a note navigates to `/quick-note?id=<id>` and opens the editor, where `< Back` or the browser Back button returns to the list.
- Typing on the first line of the seamless editor automatically updates `title` in the list; rich-text edits autosave without page reload or list refetch.
- Pinned notes (`is_pinned = true`) sort above unpinned notes in `All`.
- Locked notes (`is_locked = true`) hide their preview in the list and require passcode verification before viewing, editing, or deleting.
- Soft-deleting a note moves it to `Trash` (`deleted_at` set); from `Trash` it can be restored or permanently hard-deleted.
- RLS enforces `auth.uid() = user_id` on all `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations.

---

## 6. Implementation Phases

### Phase 1: Database Migration & Types
- Create incremental SQL migration for `public.quick_notes`, `public.quick_note_settings`, composite cursor indexes, and strict `auth.uid() = user_id` RLS policies.
- Regenerate `src/lib/types/database.types.ts` and add `src/lib/types/quick-note.ts`.

### Phase 2: Service & Store Layer
- Implement `src/lib/services/quick-note-service.ts` with explicit column selection, keyset pagination (`limit(20)`), CUD operations returning `.select(...).single()`, pin/lock toggles, and passcode verification.
- Implement `src/lib/state/quick-note.svelte.ts` using Svelte 5 runes (`$state`, `$derived`) with zero-refetch in-place updates, debounced autosave, search filtering, `All | Trash` state, and session-only unlocked note tracking.

### Phase 3: Master-Detail UI & Navigation
- Add `/quick-note` (`Quick Note`) to `navItems` and `full-bleed` class in `src/routes/(app)/+layout.svelte`.
- Build `src/routes/(app)/quick-note/+page.svelte` with `?id=<bigint>` URL synchronization (desktop split view + mobile list/detail navigation).
- Build `QuickNoteList.svelte` (inline search, `All | Trash` toggle, `+ New`, cursor load-more) and `QuickNoteListItem.svelte` (right-click context menu: `Pin`, `Lock`, `Duplicate`, `Delete` / `Restore` / `Delete Permanently`).
- Build `QuickNoteEditor.svelte` (seamless first-line-as-title TipTap editor, three-dot `⋮` header menu, mobile `< Back` button).

### Phase 4: Passcode Lock Flow & Verification
- Build `QuickNotePasscodeModal.svelte` for setting and verifying the lock passcode, plus the inline unlock gate and delete guard for locked notes.
- Run `svelte-check` and unit/service tests to verify types, store mutations, and UI behavior.
