import type {
  FolderRecord,
  NoteStub,
  NoteDetail,
  WorkspacePane,
  WorkspaceTab,
  GraphNode,
  GraphEdge
} from '$lib/types/notes';
import * as notesService from '$lib/services/notes-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';

export class NotesStore {
  // Vault state
  folders = $state<FolderRecord[]>([]);
  notes = $state<NoteStub[]>([]);
  activeNotesCache = $state<Map<string, NoteDetail>>(new Map());
  
  // Backlink & outgoing link metadata: noteId -> list of source notes
  backlinks = $state<Map<string, Array<{ id: string; title: string }>>>(new Map());
  outgoingLinks = $state<Map<string, Array<{ title: string; isResolved: boolean }>>>(new Map());

  // Multi-Pane Workspace State
  panes = $state<WorkspacePane[]>([
    {
      id: 'pane-default',
      tabs: [],
      activeTabIndex: -1
    }
  ]);
  activePaneId = $state<string>('pane-default');

  // Network & Save State
  isSaving = $state<boolean>(false);
  isLoading = $state<boolean>(false);
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Graph View Filters & Simulation Parameters
  graphFilterShowGhosts = $state<boolean>(true);
  graphFilterShowOrphans = $state<boolean>(true);
  graphPhysicsRepulsion = $state<number>(350);
  graphPhysicsLinkDistance = $state<number>(70);
  graphPhysicsCenterForce = $state<number>(0.05);
  localGraphDepth = $state<number>(1);

  // Inspector & Context Dock
  contextDockOpen = $state<boolean>(true);

  // Modals & Drawers
  recycleBinOpen = $state<boolean>(false);
  deleteFolderModalOpen = $state<boolean>(false);
  pendingFolderToDelete = $state<{ id: string; name: string } | null>(null);
  commandPaletteOpen = $state<boolean>(false);

  // Custom client injection for tests
  private customClient: SupabaseClient<Database> | undefined;

  constructor(customClient?: SupabaseClient<Database>) {
    this.customClient = customClient;
  }

  // --- Derived State Helpers ---

  /** Set of lowercased titles of all active notes for fast O(1) wiki-link lookup */
  activeTitles = $derived(new Set(this.notes.map((n) => n.title.toLowerCase())));

  /** Map of lowercased title to note stub for quick resolution */
  activeTitleMap = $derived(
    new Map(this.notes.map((n) => [n.title.toLowerCase(), n]))
  );

  /** Focused split pane */
  activePane = $derived(
    this.panes.find((p) => p.id === this.activePaneId) || this.panes[0]
  );

  /** Focused tab inside active pane */
  activeTab = $derived<WorkspaceTab | null>(
    (() => {
      const pane = this.activePane;
      if (!pane || pane.activeTabIndex < 0 || pane.activeTabIndex >= pane.tabs.length) {
        return null;
      }
      return pane.tabs[pane.activeTabIndex] || null;
    })()
  );

  /** Document currently open in the active tab (if note type) */
  activeNote = $derived<NoteDetail | null>(
    (() => {
      const tab = this.activeTab;
      if (!tab || tab.type !== 'note' || !tab.noteId) return null;
      return this.activeNotesCache.get(tab.noteId) || null;
    })()
  );

  /** Backlinks referencing the currently active note */
  activeBacklinks = $derived<Array<{ id: string; title: string }>>(
    (() => {
      const note = this.activeNote;
      if (!note) return [];
      return this.backlinks.get(note.id) || [];
    })()
  );

  /** Outgoing links from the currently active note */
  activeOutgoingLinks = $derived<Array<{ title: string; isResolved: boolean }>>(
    (() => {
      const note = this.activeNote;
      if (!note) return [];
      return this.outgoingLinks.get(note.id) || [];
    })()
  );

  /** Unlinked mentions of the currently active note's title in other notes */
  activeUnlinkedMentions = $derived<Array<{ id: string; title: string; snippet: string }>>(
    (() => {
      const current = this.activeNote;
      if (!current || !current.title || current.title.trim().length < 2) return [];

      const currentTitleLower = current.title.trim().toLowerCase();
      const currentId = current.id;
      const results: Array<{ id: string; title: string; snippet: string }> = [];

      for (const [otherId, otherDetail] of this.activeNotesCache.entries()) {
        if (otherId === currentId) continue;
        const text = otherDetail.content;
        const lower = text.toLowerCase();

        // Search for title occurrence not preceded by [[
        let searchIndex = 0;
        while ((searchIndex = lower.indexOf(currentTitleLower, searchIndex)) !== -1) {
          // Check if this occurrence is inside [[ ... ]]
          const prefix = text.substring(Math.max(0, searchIndex - 2), searchIndex);
          const isWikilink = prefix === '[[';

          if (!isWikilink) {
            // Found unlinked mention; extract snippet around it
            const start = Math.max(0, searchIndex - 30);
            const end = Math.min(text.length, searchIndex + currentTitleLower.length + 30);
            const snippet = (start > 0 ? '...' : '') + text.substring(start, end).replace(/\n/g, ' ') + (end < text.length ? '...' : '');
            results.push({
              id: otherDetail.id,
              title: otherDetail.title,
              snippet
            });
            break; // Record once per note
          }
          searchIndex += currentTitleLower.length;
        }
      }

      return results;
    })()
  );

  /**
   * Compute scoped graph data for a specific note with N hops (1 to 3)
   */
  getLocalGraphData(centerNoteId: string, depth: number = 1): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const full = this.graphData;
    const visited = new Set<string>([centerNoteId]);
    let currentFrontier = new Set<string>([centerNoteId]);

    for (let d = 0; d < depth; d++) {
      const nextFrontier = new Set<string>();
      for (const edge of full.edges) {
        if (currentFrontier.has(edge.source)) {
          if (!visited.has(edge.target)) {
            visited.add(edge.target);
            nextFrontier.add(edge.target);
          }
        }
        if (currentFrontier.has(edge.target)) {
          if (!visited.has(edge.source)) {
            visited.add(edge.source);
            nextFrontier.add(edge.source);
          }
        }
      }
      currentFrontier = nextFrontier;
      if (currentFrontier.size === 0) break;
    }

    const localNodes = full.nodes.filter((n) => visited.has(n.id));
    const localEdges = full.edges.filter(
      (e) => visited.has(e.source) && visited.has(e.target)
    );

    return { nodes: localNodes, edges: localEdges };
  }

  /** Graph representation computed from active notes and connections */
  graphData = $derived<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
    (() => {
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const existingIds = new Set(this.notes.map((n) => n.id));

      // Add regular active note nodes
      for (const n of this.notes) {
        nodes.push({
          id: n.id,
          title: n.title,
          isGhost: false,
          degree: 0,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: 5
        });
      }

      // Populate outgoing and ghost links
      for (const [sourceId, links] of this.outgoingLinks.entries()) {
        for (const link of links) {
          const lower = link.title.toLowerCase();
          const targetStub = this.activeTitleMap.get(lower);

          if (targetStub) {
            edges.push({ source: sourceId, target: targetStub.id });
          } else if (this.graphFilterShowGhosts) {
            const ghostId = `ghost-${lower}`;
            if (!nodes.some((nd) => nd.id === ghostId)) {
              nodes.push({
                id: ghostId,
                title: link.title,
                isGhost: true,
                degree: 0,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                radius: 4
              });
            }
            edges.push({ source: sourceId, target: ghostId });
          }
        }
      }

      // Calculate degrees
      const degreeMap = new Map<string, number>();
      for (const edge of edges) {
        degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
        degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
      }

      for (const node of nodes) {
        node.degree = degreeMap.get(node.id) || 0;
        node.radius = Math.min(12, 5 + node.degree * 1.5);
      }

      const filteredNodes = this.graphFilterShowOrphans
        ? nodes
        : nodes.filter((n) => n.degree > 0);

      return { nodes: filteredNodes, edges };
    })()
  );

  // --- Initializer & Remote Data Fetching ---

  async initialize() {
    this.isLoading = true;
    try {
      const [folders, notes, connections] = await Promise.all([
        notesService.fetchFolders(this.customClient),
        notesService.fetchNoteStubs(this.customClient),
        notesService.fetchConnections(this.customClient)
      ]);

      this.folders = folders;
      this.notes = notes;
      this.rebuildGraphRelations(connections);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Internal helper to build backlinks & outgoing relations from DB connections
   */
  private rebuildGraphRelations(
    connections: Array<{ id: string; source_note_id: string; target_note_id: string }>
  ) {
    const newBacklinks = new Map<string, Array<{ id: string; title: string }>>();
    const notesById = new Map(this.notes.map((n) => [n.id, n]));

    for (const conn of connections) {
      const sourceNote = notesById.get(conn.source_note_id);
      if (!sourceNote) continue;

      const current = newBacklinks.get(conn.target_note_id) || [];
      current.push({ id: sourceNote.id, title: sourceNote.title });
      newBacklinks.set(conn.target_note_id, current);
    }

    this.backlinks = newBacklinks;
  }

  // --- Tab & Pane Management ---

  openNoteInActivePane(noteId: string) {
    const noteStub = this.notes.find((n) => n.id === noteId);
    const title = noteStub ? noteStub.title : 'Untitled';

    const pane = this.activePane;
    if (!pane) return;

    // Check if tab already exists in this pane
    const existingIndex = pane.tabs.findIndex(
      (t) => t.type === 'note' && t.noteId === noteId
    );

    if (existingIndex >= 0) {
      pane.activeTabIndex = existingIndex;
    } else {
      pane.tabs.push({
        id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'note',
        noteId,
        title,
        pinned: false
      });
      pane.activeTabIndex = pane.tabs.length - 1;
    }

    // Preload note detail into cache
    this.loadNoteDetail(noteId);
  }

  openGraphInActivePane() {
    const pane = this.activePane;
    if (!pane) return;

    const existingIndex = pane.tabs.findIndex((t) => t.type === 'graph');
    if (existingIndex >= 0) {
      pane.activeTabIndex = existingIndex;
    } else {
      pane.tabs.push({
        id: `tab-graph-${Date.now()}`,
        type: 'graph',
        title: 'Graph View',
        pinned: false
      });
      pane.activeTabIndex = pane.tabs.length - 1;
    }
  }

  setActiveTab(paneId: string, tabIndex: number) {
    const pane = this.panes.find((p) => p.id === paneId);
    if (!pane || tabIndex < 0 || tabIndex >= pane.tabs.length) return;
    pane.activeTabIndex = tabIndex;
  }

  togglePinTab(paneId: string, tabIndex: number) {
    const pane = this.panes.find((p) => p.id === paneId);
    if (!pane || tabIndex < 0 || tabIndex >= pane.tabs.length) return;
    pane.tabs[tabIndex].pinned = !pane.tabs[tabIndex].pinned;
  }

  closeTab(paneId: string, tabIndex: number) {
    const pane = this.panes.find((p) => p.id === paneId);
    if (!pane || tabIndex < 0 || tabIndex >= pane.tabs.length) return;

    pane.tabs.splice(tabIndex, 1);

    if (pane.tabs.length === 0) {
      // If not the last pane, we can remove the pane
      if (this.panes.length > 1) {
        this.closePane(paneId);
        return;
      }
      pane.activeTabIndex = -1;
    } else if (pane.activeTabIndex >= pane.tabs.length) {
      pane.activeTabIndex = pane.tabs.length - 1;
    }
  }

  splitPaneRight(noteIdToOpen?: string) {
    const newPaneId = `pane-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPane: WorkspacePane = {
      id: newPaneId,
      tabs: [],
      activeTabIndex: -1
    };

    this.panes.push(newPane);
    this.activePaneId = newPaneId;

    if (noteIdToOpen) {
      this.openNoteInActivePane(noteIdToOpen);
    } else if (this.activeTab) {
      // Clone current tab into the new pane
      const current = this.activeTab;
      if (current.type === 'note' && current.noteId) {
        this.openNoteInActivePane(current.noteId);
      } else if (current.type === 'graph') {
        this.openGraphInActivePane();
      }
    }
  }

  closePane(paneId: string) {
    if (this.panes.length <= 1) return; // Keep at least one pane

    const idx = this.panes.findIndex((p) => p.id === paneId);
    if (idx < 0) return;

    this.panes.splice(idx, 1);

    if (this.activePaneId === paneId) {
      const nextActive = this.panes[Math.max(0, idx - 1)];
      this.activePaneId = nextActive.id;
    }
  }

  setActivePane(paneId: string) {
    if (this.panes.some((p) => p.id === paneId)) {
      this.activePaneId = paneId;
    }
  }

  // --- Note Content & Autosave ---

  async loadNoteDetail(id: string): Promise<NoteDetail | null> {
    if (this.activeNotesCache.has(id)) {
      return this.activeNotesCache.get(id)!;
    }

    try {
      const detail = await notesService.fetchNoteDetail(id, this.customClient);
      if (detail) {
        const nextCache = new Map(this.activeNotesCache);
        nextCache.set(id, detail);
        this.activeNotesCache = nextCache;
        this.parseOutgoingWikiLinks(detail.id, detail.content);
        return detail;
      }
    } catch (e) {
      console.error(`Failed to load note detail ${id}:`, e);
    }
    return null;
  }

  /**
   * Parse `[[Wiki Link]]` tokens from markdown content and update local outgoing link tracking
   */
  parseOutgoingWikiLinks(noteId: string, content: string) {
    const wikiRegex = /\[\[(.*?)\]\]/g;
    const links: Array<{ title: string; isResolved: boolean }> = [];
    let match;

    while ((match = wikiRegex.exec(content)) !== null) {
      const rawTarget = match[1].trim();
      if (!rawTarget) continue;

      // Strip display alias if present: [[Note Title|Display Alias]]
      const targetTitle = rawTarget.split('|')[0].trim();
      const isResolved = this.activeTitles.has(targetTitle.toLowerCase());

      if (!links.some((l) => l.title.toLowerCase() === targetTitle.toLowerCase())) {
        links.push({ title: targetTitle, isResolved });
      }
    }

    const nextOutgoing = new Map(this.outgoingLinks);
    nextOutgoing.set(noteId, links);
    this.outgoingLinks = nextOutgoing;
  }

  // Set of note IDs that have local changes waiting to be saved
  unsavedNotes = $state<Set<string>>(new Set());

  /**
   * Update note content locally immediately without auto-calling the API
   */
  updateNoteContentLocal(noteId: string, newContent: string) {
    const existing = this.activeNotesCache.get(noteId);
    if (!existing) return;

    // 1. Immediate in-memory update
    const updated: NoteDetail = {
      ...existing,
      content: newContent,
      updated_at: new Date().toISOString()
    };
    const nextCache = new Map(this.activeNotesCache);
    nextCache.set(noteId, updated);
    this.activeNotesCache = nextCache;

    // Update outgoing link parse
    this.parseOutgoingWikiLinks(noteId, newContent);

    // Track unsaved state
    const nextUnsaved = new Set(this.unsavedNotes);
    nextUnsaved.add(noteId);
    this.unsavedNotes = nextUnsaved;
  }

  /**
   * Explicitly persist note content to API on demand (e.g. Save button / Cmd+S)
   */
  async saveNoteContent(noteId: string, contentToSave?: string): Promise<boolean> {
    const note = this.activeNotesCache.get(noteId);
    const content = contentToSave !== undefined ? contentToSave : (note?.content ?? '');

    this.isSaving = true;
    try {
      await notesService.updateNoteContent(noteId, content, this.customClient);

      // Clear from unsaved
      const nextUnsaved = new Set(this.unsavedNotes);
      nextUnsaved.delete(noteId);
      this.unsavedNotes = nextUnsaved;
      return true;
    } catch (err) {
      console.error('Failed to save note:', err);
      return false;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Backward compatibility / optional debounced autosave helper
   */
  queueContentAutosave(noteId: string, newContent: string) {
    this.updateNoteContentLocal(noteId, newContent);
  }

  // --- CRUD Operations ---

  async createNewNote(title?: string, folder_id?: string | null): Promise<NoteDetail> {
    const uniqueTitle = title || this.generateUniqueUntitled();
    const created = await notesService.createNote(
      { title: uniqueTitle, content: '', folder_id },
      this.customClient
    );

    // Update stubs and cache
    this.notes = [
      ...this.notes,
      {
        id: created.id,
        folder_id: created.folder_id,
        title: created.title,
        updated_at: created.updated_at,
        deleted_at: null
      }
    ];

    const nextCache = new Map(this.activeNotesCache);
    nextCache.set(created.id, created);
    this.activeNotesCache = nextCache;

    // Open created note in active tab
    this.openNoteInActivePane(created.id);
    return created;
  }

  async renameNote(id: string, newTitle: string): Promise<void> {
    const updated = await notesService.renameNote(id, newTitle, this.customClient);

    // Update local stub list
    this.notes = this.notes.map((n) => (n.id === id ? { ...n, title: updated.title } : n));

    // Update active cache
    if (this.activeNotesCache.has(id)) {
      const nextCache = new Map(this.activeNotesCache);
      nextCache.set(id, { ...nextCache.get(id)!, title: updated.title });
      this.activeNotesCache = nextCache;
    }

    // Update open tabs title
    for (const pane of this.panes) {
      for (const tab of pane.tabs) {
        if (tab.type === 'note' && tab.noteId === id) {
          tab.title = updated.title;
        }
      }
    }
  }

  async deleteNote(id: string): Promise<void> {
    await notesService.deleteNote(id, this.customClient);

    // Remove from active notes list
    this.notes = this.notes.filter((n) => n.id !== id);

    // Remove from cache
    const nextCache = new Map(this.activeNotesCache);
    nextCache.delete(id);
    this.activeNotesCache = nextCache;

    // Close any tabs displaying this note
    for (const pane of this.panes) {
      const remainingTabs = pane.tabs.filter((t) => !(t.type === 'note' && t.noteId === id));
      pane.tabs = remainingTabs;
      if (pane.activeTabIndex >= pane.tabs.length) {
        pane.activeTabIndex = pane.tabs.length - 1;
      }
    }
  }

  async createNewFolder(name: string, parent_id?: string | null): Promise<FolderRecord> {
    const created = await notesService.createFolder(name, parent_id, this.customClient);
    this.folders = [...this.folders, created];
    return created;
  }

  async renameFolder(id: string, newName: string): Promise<void> {
    const updated = await notesService.renameFolder(id, newName, this.customClient);
    this.folders = this.folders.map((f) => (f.id === id ? updated : f));
  }

  async deleteFolder(targetFolderId: string, cascadeChildren: boolean): Promise<void> {
    await notesService.deleteFolder(targetFolderId, cascadeChildren, this.customClient);

    if (cascadeChildren) {
      // Find all nested folder IDs recursively
      const toRemove = new Set<string>();
      const gather = (fid: string) => {
        toRemove.add(fid);
        for (const f of this.folders) {
          if (f.parent_id === fid) {
            gather(f.id);
          }
        }
      };
      gather(targetFolderId);

      this.folders = this.folders.filter((f) => !toRemove.has(f.id));
      this.notes = this.notes.filter((n) => !n.folder_id || !toRemove.has(n.folder_id));
    } else {
      // Orphan children: move subfolders and notes to root
      this.folders = this.folders
        .filter((f) => f.id !== targetFolderId)
        .map((f) => (f.parent_id === targetFolderId ? { ...f, parent_id: null } : f));

      this.notes = this.notes.map((n) =>
        n.folder_id === targetFolderId ? { ...n, folder_id: null } : n
      );
    }

    this.deleteFolderModalOpen = false;
    this.pendingFolderToDelete = null;
  }

  async restoreNote(id: string): Promise<void> {
    await notesService.restoreNote(id, this.customClient);
    // Reload stubs
    const stubs = await notesService.fetchNoteStubs(this.customClient);
    this.notes = stubs;
  }

  async restoreFolder(id: string): Promise<void> {
    await notesService.restoreFolder(id, this.customClient);
    // Reload folders
    const folders = await notesService.fetchFolders(this.customClient);
    this.folders = folders;
  }

  async purgeItem(type: 'note' | 'folder', id: string): Promise<void> {
    await notesService.purgeItem(type, id, this.customClient);
  }

  private generateUniqueUntitled(): string {
    let count = 1;
    let title = 'Untitled';
    while (this.activeTitles.has(title.toLowerCase())) {
      count++;
      title = `Untitled ${count}`;
    }
    return title;
  }
}

/** Singleton instance for use across Svelte components */
export const notesStore = new NotesStore();
