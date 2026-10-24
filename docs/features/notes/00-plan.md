# Implementation Plan: Notes & Wiki-Link Knowledge Engine

> **Document Type**: Implementation Plan (IP) / Phased Delivery Roadmap  
> **Feature**: Notes & Wiki-Link Knowledge Engine  
> **Status**: Ready for Execution  

---

## 1. Overview & Strategy

This Implementation Plan decomposes the Notes feature into **6 small, verifiable, and manageable phases**. 

Following The Commons' 3-stage velocity process, each phase targets a self-contained vertical slice that can be independently tested and committed, ensuring zero regression and predictable execution.

```mermaid
graph LR
    P1[Phase 1: Database Engine & Migrations] --> P2[Phase 2: Svelte 5 State & Data Client]
    P2 --> P3[Phase 3: Vault Explorer & Soft-Delete Trash]
    P3 --> P4[Phase 4: Workspace Shell & Multi-Pane Grid]
    P4 --> P5[Phase 5: Live Preview Editor & [[Wiki-Links]]]
    P5 --> P6[Phase 6: Interactive Canvas Graph & Context Dock]
```

---

## 2. Phased Implementation Roadmap

---

### Phase 1: Database Schema, Graph Triggers & Stored Procedures
**Goal**: Establish PostgreSQL foundation, graph synchronization trigger, atomic soft-delete RPCs, and run automated integration tests.

- [x] **1.1 Migration File**: Create timestamped migration in `supabase/migrations/`:
  - `public.folders` (UUID, `user_id`, self-referential `parent_id`, `deleted_at`).
  - `public.notes` (UUID, `user_id`, `folder_id`, `title`, `content`, `deleted_at`).
  - `public.note_connections` (UUID, `source_note_id`, `target_note_id`, `deleted_at`).
  - Partial unique index: `uq_active_user_note_title` on `(user_id, lower(title)) where deleted_at is null`.
  - Trigram index on `lower(title) gin_trgm_ops` and performance indexes on `deleted_at is null`.
- [x] **1.2 Graph Trigger Engine**:
  - Implement `public.handle_note_connections()` to parse `[[Wiki Link]]` tokens on active edit.
  - Automatically cascade soft-deletion/restoration of edges when notes change `deleted_at`.
- [x] **1.3 Stored Procedures (RPCs)**:
  - `delete_folder(target_folder_id, cascade_children)` (Option A: Cascade vs. Option B: Orphan).
  - `restore_note(target_note_id)`.
  - `restore_folder(target_folder_id)` (with orphan parent re-linking check).
  - `purge_item(item_type, item_id)` (permanent hard-delete).
- [x] **1.4 RLS Security**:
  - Enable RLS on all three tables with `auth.uid() = user_id` check.
- [x] **1.5 TypeScript Generation & Vitest**:
  - Run `supabase gen types typescript` into `src/lib/types/database.types.ts`.
  - Execute Vitest integration suite (TC-01 through TC-06).

**Phase 1 Verifiable Milestone**:
- [x] Database migration applied cleanly.
- [x] Vitest tests pass 100% for all deletion strategies, graph synchronization, and purge actions.

---

### Phase 2: Svelte 5 Runes State Store & Client Data Layer
**Goal**: Build the client state container and typed Supabase RPC helper bindings.

- [x] **2.1 TypeScript Models**: Create `src/lib/types/notes.ts`:
  - `FolderRecord`, `NoteStub`, `NoteDetail`, `WorkspaceTab`, `WorkspacePane`, `GraphNode`, `GraphEdge`.
- [x] **2.2 Client API Helpers**: Create `src/lib/services/notes-service.ts`:
  - `fetchFolders()`, `fetchNoteStubs()`, `fetchNoteDetail(id)`.
  - `createNote()`, `updateNoteContent()`, `renameNote()`.
  - `createFolder()`, `renameFolder()`.
  - `deleteFolder(id, cascadeChildren)`, `restoreNote(id)`, `restoreFolder(id)`, `purgeItem(type, id)`.
  - `fetchRecycleBin()`.
- [x] **2.3 Svelte 5 Reactive Store**: Create `src/lib/state/notes.svelte.ts`:
  - Centralized runes store managing `folders`, `notes`, `activeNotesCache`, `panes`, `activePaneId`.
  - Derived helpers: `activeNote`, `activePane`, `activeTab`, `activeTitles`, `activeBacklinks`.
  - Debounced auto-save pipeline (500ms) with `isSaving` state indicator.

**Phase 2 Verifiable Milestone**:
- [x] Svelte 5 state store compiles cleanly with zero TypeScript errors.
- [x] Unit tests verify in-memory cache behavior, tab additions, and derived active lookups.

---

### Phase 3: Vault Explorer Sidebar & Recycle Bin Drawer
**Goal**: Deliver the folder navigation tree, note list, folder deletion modal, and soft-delete recovery drawer.

- [x] **3.1 Vault Explorer Container**:
  - Implement `src/lib/components/notes/explorer/FileTree.svelte`.
  - Root action header: "+ New Note", "+ New Folder", Collapse/Expand All.
- [x] **3.2 Tree Nodes**:
  - `TreeFolder.svelte`: Recursive folder nesting with indentation guide lines, chevron toggles, and context menu (Rename, New Note inside, Delete).
  - `TreeFile.svelte`: Note item row with active note indicator and click handlers (Click opens in active tab; Alt/Cmd+Click triggers split pane).
- [x] **3.3 Deletion Modal**:
  - `DeleteFolderModal.svelte`: Explains strategies clearly:
    - *Option A (Cascade)*: "Delete folder and all enclosed notes & subfolders".
    - *Option B (Orphan)*: "Delete parent folder only and move contents to root".
- [x] **3.4 Recycle Bin Drawer**:
  - `RecycleBinDrawer.svelte`: Slide-out sheet listing soft-deleted folders and notes.
  - `TrashedItemRow.svelte`: Quick action buttons to "Restore" or "Purge Permanently".

**Phase 3 Verifiable Milestone**:
- [x] Folders and notes can be created, nested, renamed, deleted via both strategies, and restored/purged from the Recycle Bin.
- [x] Styled using The Commons global design tokens (`var(--bg-secondary)`, `var(--border-subtle)`).

---

### Phase 4: Workspace Shell, Route Layout & Multi-Pane Grid
**Goal**: Build the 4-tier layout shell with dynamic side-by-side split panes and tab management.

- [x] **4.1 Shell Layout & Status Bar**:
  - `src/routes/(app)/notes/+layout.svelte`: Coordinates Activity Ribbon, Explorer sidebar, Split Grid canvas, Context Dock, and Status Bar.
  - `ActivityRibbon.svelte`: 44px vertical strip toggling Explorer, Graph view, Recycle Bin, and Command Palette.
  - `StatusBar.svelte`: 24px bottom bar showing note character/word count, save sync indicator, and active pane tally.
- [x] **4.2 Multi-Pane Grid Manager**:
  - `WorkspaceGrid.svelte`: Flexbox/grid multi-pane split manager (supports dynamic 1 to $N$ side-by-side panes).
  - `PaneContainer.svelte`: Wrapper around each split pane with active pane focus ring.
- [x] **4.3 Tab Bar**:
  - `TabBar.svelte`: Tab switching, pinned tab states, close button (`×`), and Split-Right button (`◫`).
- [x] **4.4 Quick Switcher**:
  - `CommandPalette.svelte`: Floating overlay triggered via `Cmd/Ctrl + P` or `Cmd/Ctrl + O` to search and jump to notes instantly.

**Phase 4 Verifiable Milestone**:
- [x] Users can open notes in tabs, split panes side-by-side, toggle focus between panes, and switch notes rapidly via the Command Palette.

---

### Phase 5: Markdown Live Preview Editor & `[[Wiki-Link]]` Suggestions
**Goal**: Implement the distraction-free line-based Live Preview editor with auto-complete suggestions.

- [x] **5.1 Live Preview Container**:
  - `LivePreviewEditor.svelte`: Clean, high-density writing canvas inheriting The Commons typography tokens (`var(--font-sans)`, `var(--font-serif)`).
  - Smooth auto-resizing, debounced auto-save trigger on content input.
- [x] **5.2 Line-Based Live Preview Rendering**:
  - `EditorLine.svelte`: Active line shows raw Markdown syntax; inactive lines format headers, bold/italic, task checkboxes, and `[[Wiki-Links]]`.
- [x] **5.3 Wiki-Link Autocomplete Popup**:
  - `WikiLinkSuggestion.svelte`: Triggered dynamically when typing `[[`.
  - Filters active notes by title with fuzzy match.
  - Keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) to complete `[[Note Title]]`.
- [x] **5.4 Wiki-Link Click Navigation**:
  - Clicking a resolved `[[Link]]` opens that note in the active tab (or split pane if modifier key held).
  - Clicking an unresolved ghost link prompts to create a new note with that title.

**Phase 5 Verifiable Milestone**:
- [x] Full note authoring experience with live formatting, `[[` autocomplete, instant link navigation, and debounced database persistence.

---

### Phase 6: Canvas Force-Directed Graph Engine & Context Dock
**Goal**: Implement relational network graph visualization and the contextual backlinks sidebar.

- [x] **6.1 Global Force-Directed Graph Canvas**:
  - `GraphView.svelte`: HTML5 Canvas force-directed graph renderer.
  - Node physics simulation (repulsion, link spring, centering).
  - Visual distinction between active nodes and dashed "ghost" nodes.
  - Pan, zoom, node drag, and hover edge highlighting.
  - Clicking a node opens that note in the workspace.
- [x] **6.2 Graph Controls HUD**:
  - `GraphControls.svelte`: Floating toolbar toggling ghost nodes, orphan nodes, and force physics parameters.
- [x] **6.3 Context Dock & Scoped Local Graph**:
  - `ContextDock.svelte`: Collapsible right inspector sidebar.
  - `BacklinksPanel.svelte`: Lists incoming links and unlinked mentions.
  - `OutgoingLinksPanel.svelte`: Lists forward links (distinguishing resolved vs. unresolved).
  - `LocalGraph.svelte`: Scoped mini force-directed graph displaying the active note and nodes within 1 to 3 hops.
- [x] **6.4 Global Graph Route**:
  - `src/routes/(app)/notes/graph/+page.svelte`: Full-viewport dedicated graph exploration page.

**Phase 6 Verifiable Milestone**:
- [x] Real-time graph updates reflecting notes and links, interactive navigation from graph nodes, and backlinks visible in the right inspector.

---

## 3. Phase Dependency & Verification Matrix

| Phase | Core Deliverable | Acceptance Verification | Complexity |
| :--- | :--- | :--- | :--- |
| **Phase 1** | SQL Schema & Triggers | Vitest TC-01 to TC-06 pass; RLS verified | Medium |
| **Phase 2** | Svelte 5 Runes State Store | State store compiles with zero TS errors; cache tests pass | Low |
| **Phase 3** | File Explorer & Recycle Bin | Create/rename/delete folders & notes; restore/purge from trash | Medium |
| **Phase 4** | Shell Layout & Multi-Pane Grid | Side-by-side pane splitting; tab switching; Cmd+P quick switcher | Medium |
| **Phase 5** | Live Preview Editor & [[Wiki]] | `[[` autocomplete works; click navigation works; auto-save works | High |
| **Phase 6** | Canvas Graph & Context Dock | Canvas 60 FPS graph render; backlinks populate; 1-3 hop local graph | High |
