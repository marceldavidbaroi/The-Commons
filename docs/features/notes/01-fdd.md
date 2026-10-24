# Functional Design Document: Obsidian-Style Web Client (Notes & Wiki-Link Engine)

> **Document Type**: **F**unctional **D**esign **D**ocument (FDD) / Product Specification  
> **Feature**: Notes & Wiki-Link Knowledge Engine  
> **Status**: Approved for Implementation  

---

## 1. Executive Summary & Goals

The Commons Notes System is a high-density, multi-pane markdown knowledge base inspired by Obsidian, fully integrated with The Commons' global editorial design system. It allows authenticated members to organize hierarchical folder structures, author markdown notes with inline bidirectional `[[Wiki Links]]`, explore relationships via interactive canvas force-directed graphs, and safely manage deletions via a two-tier soft-delete Recycle Bin.

---

## 2. Directory & File Structure

Organized within The Commons SvelteKit application layout (`src/routes/(app)/notes/` and `src/lib/components/notes/`):

```text
src/
├── lib/
│   ├── state/
│   │   └── notes.svelte.ts                # Svelte 5 runes reactive state & business logic
│   └── components/
│       └── notes/
│           ├── shell/
│           │   ├── ActivityRibbon.svelte      # Left vertical action icon strip (44px)
│           │   ├── StatusBar.svelte           # Bottom metadata bar (words, sync state, panes)
│           │   └── CommandPalette.svelte      # Quick switcher modal (Ctrl/Cmd + P / O)
│           ├── explorer/
│           │   ├── FileTree.svelte            # Root file & directory hierarchy container
│           │   ├── TreeFolder.svelte          # Collapsible folder item with toggle & context menu
│           │   ├── TreeFile.svelte            # File/note row with active selection highlight
│           │   └── DeleteFolderModal.svelte   # Modal dialog (Cascade vs. Orphan strategy)
│           ├── workspace/
│           │   ├── WorkspaceGrid.svelte       # Multi-pane split manager (dynamic horizontal/vertical)
│           │   ├── PaneContainer.svelte       # Individual split pane wrapper
│           │   └── TabBar.svelte              # Pane tab strip (reorder, close, pin, split trigger)
│           ├── editor/
│           │   ├── LivePreviewEditor.svelte   # Line-based WYSIWYG editor container
│           │   ├── EditorLine.svelte          # Per-line renderer (formatted view vs. active input)
│           │   └── WikiLinkSuggestion.svelte  # Floating autocomplete popup anchored to [[
│           ├── graph/
│           │   ├── GraphView.svelte           # Full-featured canvas force-directed graph
│           │   ├── GraphControls.svelte       # Filter HUD (depth, ghost nodes, orphans, forces)
│           │   └── LocalGraph.svelte          # Context-dock scoped mini-graph (1-3 hops)
│           ├── context/
│           │   ├── ContextDock.svelte         # Right sidebar collapsible inspector container
│           │   ├── BacklinksPanel.svelte      # Incoming link references & mentions
│           │   └── OutgoingLinksPanel.svelte  # Explicit resolved & unresolved targets
│           └── trash/
│               ├── RecycleBinDrawer.svelte    # Slide-over panel for soft-deleted assets
│               └── TrashedItemRow.svelte      # Row with Restore and Permanent Purge actions
└── routes/
    └── (app)/
        └── notes/
            ├── +layout.svelte                 # Primary application frame (Ribbon + Tree + Split Grid + Dock)
            ├── +page.svelte                   # Empty workspace placeholder / active note dashboard
            ├── [id]/
            │   └── +page.svelte               # Deep-link route for opening notes directly by UUID
            └── graph/
                └── +page.svelte               # Dedicated full-viewport global graph page
```

---

## 3. Page & Layout Architecture

### Primary Workspace Shell (`+layout.svelte`)

A 4-tier horizontal flex layout that coordinates split views and sidebars:

```text
+---+----------------------+---------------------------------------------------+----------------------+
|   | VAULT EXPLORER       | MULTI-PANE WORKSPACE                              | CONTEXT DOCK         |
| R |                      |                                                   |                      |
| I | Header & New File    | +-----------------------+-----------------------+ | Header & Tab Switch  |
| B | -------------------- | | PANE 1 (Active)       | PANE 2 (Split Right)  | | -------------------- |
| B | File & Folder Tree   | | [Tab 1] [Tab 2] [+]   | [Tab 1] [+]           | | Backlinks List     |
| O | with Guide Lines     | | --------------------- | --------------------- | | Outgoing Links     |
| N |                      | | Live Preview Note     | Side-by-side Note /   | | Local Graph View   |
|   |                      | | or Embedded Graph     | Canvas Graph View     | | (Scoped to Active) |
+---+----------------------+-------------------------+-----------------------+----------------------+
| STATUS BAR: Word Count | Current Note Path | Sync Status | Active Panes: 2 | Graph Engine: Idle     |
+----------------------------------------------------------------------------------------------------+
```

* **Activity Ribbon (`ActivityRibbon.svelte`):** Fixed 44px left strip with icon triggers to toggle File Explorer, Global Graph view, Recycle Bin drawer, and Command Palette.
* **Vault Explorer Sidebar (`FileTree.svelte`):** 260px collapsible panel displaying folders, subfolders with indentation guide lines, root notes, and creation buttons.
* **Workspace Split Grid (`WorkspaceGrid.svelte`):** Dynamic container subdividing the middle canvas into 1 to $N$ independent split panes side by side.
* **Pane Container (`PaneContainer.svelte`):** Contains a top tab bar (`TabBar.svelte`) and an active view viewport (swappable between `LivePreviewEditor.svelte` and `GraphView.svelte`).
* **Context Dock Sidebar (`ContextDock.svelte`):** 280px collapsible inspector showing backlinks, outgoing links, and a synced local graph for the currently focused note.
* **Status Bar (`StatusBar.svelte`):** 24px bottom strip displaying document metrics, local graph depth, and Supabase synchronization states.

---

## 4. Visual Identity & Theming

**No separate theme stylesheet is used.** The notes interface seamlessly inherits The Commons design tokens from `src/lib/styles/global.css`:

* **Color Themes**: Supports all built-in themes (`Paper`, `Sage`, `Slate`, `Dune`, `Espresso`, `Midnight`).
* **Design Tokens**:
  * Canvas backgrounds: `var(--bg-primary)`, `var(--bg-secondary)`, `var(--bg-tertiary)`, `var(--bg-surface)`, `var(--bg-elevated)`.
  * Typography & ink: `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`.
  * Hairlines & borders: `var(--border-subtle)`, `var(--border-focus)`.
  * Primary accents & interactive pills: `var(--primary)`, `var(--primary-hover)`, `var(--accent)`.
* **Zero Blur Effects**: Adheres to 60-120 FPS rendering rules using solid/alpha backgrounds and hardware-accelerated box-shadows.

---

## 5. State Management & Variables (`notes.svelte.ts`)

State is centralized using **Svelte 5 Runes** (`$state`, `$derived`, and `$effect`).

### Core Data Models

```ts
export interface FolderRecord {
  id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  deleted_at: string | null;
}

export interface NoteStub {
  id: string;
  folder_id: string | null;
  title: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NoteDetail {
  id: string;
  folder_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceTab {
  id: string;
  type: 'note' | 'graph';
  noteId?: string;
  title: string;
  pinned: boolean;
}

export interface WorkspacePane {
  id: string;
  tabs: WorkspaceTab[];
  activeTabIndex: number;
}

export interface GraphNode {
  id: string;
  title: string;
  isGhost: boolean;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}
```

### Reactive Store Variables (`NotesStore`)

#### Vault State
* **`folders: FolderRecord[]`** — All active folders (`deleted_at is null`).
* **`notes: NoteStub[]`** — Lightweight list of all active note headers and metadata.
* **`activeNotesCache: Map<string, NoteDetail>`** — In-memory cache of loaded Markdown note bodies.
* **`backlinks: Map<string, Array<{ id: string; title: string }>>`** — Reverse graph connections indexed by target note ID.
* **`outgoingLinks: Map<string, Array<{ title: string; isResolved: boolean }>>`** — Forward links extracted from the active note body.

#### Multi-Pane & Multi-Tab Workspace State
* **`panes: WorkspacePane[]`** — List of all open vertical/horizontal split panes.
* **`activePaneId: string`** — ID of the pane currently receiving user focus and keyboard input.
* **`isSaving: boolean`** — Network indicator showing debounced writes to Supabase.

#### Graph View Configuration State
* **`graphNodes: GraphNode[]`** — Computed layout vertices for nodes.
* **`graphEdges: GraphEdge[]`** — Directed relational links between notes.
* **`graphFilterShowGhosts: boolean`** — Toggle for displaying non-existent referenced notes.
* **`graphFilterShowOrphans: boolean`** — Toggle for displaying disconnected notes with 0 edges.
* **`localGraphDepth: number`** — Traversal distance (1, 2, or 3 hops) for the Context Dock graph.

#### Modals & Overlay State
* **`recycleBinOpen: boolean`** — Visibility toggle for the soft-delete recovery drawer.
* **`deleteFolderModalOpen: boolean`** — Visibility toggle for the delete confirmation dialog.
* **`pendingFolderToDelete: { id: string; name: string } | null`** — Target folder staged for deletion.
* **`commandPaletteOpen: boolean`** — Quick file switcher overlay visibility.

#### Derived Lookups (`$derived`)
* **`activeTitles: Set<string>`** — Lowercased note titles for $O(1)$ resolved vs. ghost link detection.
* **`activePane: WorkspacePane`** — Pointer to the focused split pane.
* **`activeTab: WorkspaceTab | null`** — Currently focused tab within the active pane.
* **`activeNote: NoteDetail | null`** — Full note document open in the focused tab.
* **`activeBacklinks: Array<{ id: string; title: string }>`** — Backlinks referencing the currently active note.

---

## 6. Component Hierarchy & Responsibilities

| Component | Parent Container | Primary Responsibilities |
| :--- | :--- | :--- |
| **`ActivityRibbon`** | `+layout.svelte` | Toggles left sidebar, global graph tab, recycle bin drawer, and settings. |
| **`FileTree`** | Left Sidebar | Renders the recursive folder tree, top-level notes, guide lines, and rename/delete triggers. |
| **`TreeFolder`** | `FileTree` | Manages collapse/expand states, folder hover menus, and drop targets. |
| **`TreeFile`** | `FileTree` / `TreeFolder` | Note item row. Click opens tab in active pane; Alt/Cmd+Click opens side-by-side split. |
| **`WorkspaceGrid`** | `+layout.svelte` | Divides canvas into split panes; tracks active pane focus outline. |
| **`PaneContainer`** | `WorkspaceGrid` | Hosts independent tab strip and active view instance for each split. |
| **`TabBar`** | `PaneContainer` | Tab switching, tab closing, drag-to-reorder, and the split-right (`◫`) button. |
| **`LivePreviewEditor`** | `PaneContainer` | Line-by-line Obsidian Live Preview. Renders rich text when unfocused and raw Markdown when active. |
| **`WikiLinkSuggestion`** | `LivePreviewEditor` | Floating dropdown triggered by `[[`. Filters note titles and completes links with `Arrow`/`Enter`. |
| **`GraphView`** | `PaneContainer` / Route | Canvas-based force-directed simulation. Handles node dragging, hover highlighting, pan, and zoom. |
| **`LocalGraph`** | `ContextDock` | Scoped force simulation rendering only nodes within $N$ hops of the active note. |
| **`ContextDock`** | `+layout.svelte` | Right inspector housing `BacklinksPanel`, `OutgoingLinksPanel`, and `LocalGraph`. |
| **`DeleteFolderModal`** | Root Shell | Confirms folder deletion: "Delete Parent Only" (orphan children to root) vs. "Delete with Children" (cascade soft-delete). |
| **`RecycleBinDrawer`** | Root Shell | Slide-out drawer listing soft-deleted folders and notes with one-click Restore and Permanent Purge actions. |
