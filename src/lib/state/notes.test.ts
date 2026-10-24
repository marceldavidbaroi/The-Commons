import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotesStore } from '$lib/state/notes.svelte';
import type { NoteDetail } from '$lib/types/notes';
import * as notesService from '$lib/services/notes-service';

vi.mock('$lib/services/notes-service', () => ({
  fetchFolders: vi.fn(),
  fetchNoteStubs: vi.fn(),
  fetchNoteDetail: vi.fn(),
  createNote: vi.fn(),
  updateNoteContent: vi.fn(),
  renameNote: vi.fn(),
  deleteNote: vi.fn(),
  createFolder: vi.fn(),
  renameFolder: vi.fn(),
  deleteFolder: vi.fn(),
  restoreNote: vi.fn(),
  restoreFolder: vi.fn(),
  purgeItem: vi.fn(),
  fetchRecycleBin: vi.fn(),
  fetchConnections: vi.fn()
}));

describe('NotesStore Svelte 5 Runes State & In-Memory Cache', () => {
  let store: NotesStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new NotesStore();
  });

  it('initializes vault data and computes activeTitles and title map', async () => {
    vi.mocked(notesService.fetchFolders).mockResolvedValue([
      { id: 'f-1', name: 'Personal', parent_id: null, created_at: '2026-10-24T00:00:00Z', deleted_at: null }
    ]);
    vi.mocked(notesService.fetchNoteStubs).mockResolvedValue([
      { id: 'n-1', folder_id: 'f-1', title: 'Welcome Note', updated_at: '2026-10-24T00:00:00Z', deleted_at: null },
      { id: 'n-2', folder_id: null, title: 'Ideas', updated_at: '2026-10-24T00:00:00Z', deleted_at: null }
    ]);
    vi.mocked(notesService.fetchConnections).mockResolvedValue([
      { id: 'c-1', source_note_id: 'n-1', target_note_id: 'n-2' }
    ]);

    await store.initialize();

    expect(store.folders).toHaveLength(1);
    expect(store.notes).toHaveLength(2);
    expect(store.activeTitles.has('welcome note')).toBe(true);
    expect(store.activeTitles.has('ideas')).toBe(true);
    expect(store.activeTitles.has('nonexistent')).toBe(false);

    // Verify backlinks calculation
    const backlinks = store.backlinks.get('n-2');
    expect(backlinks).toHaveLength(1);
    expect(backlinks![0].title).toBe('Welcome Note');
  });

  it('opens note into active pane tab and updates cache', async () => {
    store.notes = [
      { id: 'note-100', folder_id: null, title: 'Deep Work', updated_at: '2026-10-24T00:00:00Z', deleted_at: null }
    ];

    const noteDetail: NoteDetail = {
      id: 'note-100',
      folder_id: null,
      title: 'Deep Work',
      content: 'Focus on [[Ideas]] and [[Missing Project]].',
      created_at: '2026-10-24T00:00:00Z',
      updated_at: '2026-10-24T00:00:00Z'
    };

    vi.mocked(notesService.fetchNoteDetail).mockResolvedValue(noteDetail);

    store.openNoteInActivePane('note-100');

    expect(store.activePane.tabs).toHaveLength(1);
    expect(store.activeTab?.title).toBe('Deep Work');

    // Wait for async loadNoteDetail
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(store.activeNote?.content).toBe(noteDetail.content);
    expect(store.activeNotesCache.get('note-100')).toBeDefined();

    // Verify outgoing wiki-link parsing
    const outgoing = store.outgoingLinks.get('note-100');
    expect(outgoing).toBeDefined();
    expect(outgoing?.map((o) => o.title)).toContain('Ideas');
    expect(outgoing?.map((o) => o.title)).toContain('Missing Project');
  });

  it('supports splitting panes, closing tabs, and switching active panes', () => {
    store.notes = [
      { id: 'n-1', folder_id: null, title: 'Note 1', updated_at: '2026-10-24T00:00:00Z', deleted_at: null },
      { id: 'n-2', folder_id: null, title: 'Note 2', updated_at: '2026-10-24T00:00:00Z', deleted_at: null }
    ];

    store.openNoteInActivePane('n-1');
    expect(store.panes).toHaveLength(1);

    // Split pane to the right
    store.splitPaneRight('n-2');
    expect(store.panes).toHaveLength(2);
    expect(store.activePane.tabs[0].noteId).toBe('n-2');

    // Close tab in split pane
    const splitPaneId = store.activePane.id;
    store.closeTab(splitPaneId, 0);

    // Closing last tab in split pane should remove the pane
    expect(store.panes).toHaveLength(1);
  });

  it('debounces note content autosave', async () => {
    const noteDetail: NoteDetail = {
      id: 'n-save',
      folder_id: null,
      title: 'Saving Note',
      content: 'Initial text',
      created_at: '2026-10-24T00:00:00Z',
      updated_at: '2026-10-24T00:00:00Z'
    };

    store.activeNotesCache = new Map([['n-save', noteDetail]]);
    vi.mocked(notesService.updateNoteContent).mockResolvedValue({
      ...noteDetail,
      content: 'Updated content'
    });

    // 1. Local update records unsaved changes without firing remote update
    store.updateNoteContentLocal('n-save', 'Updated content');

    expect(store.unsavedNotes.has('n-save')).toBe(true);
    expect(store.activeNotesCache.get('n-save')?.content).toBe('Updated content');
    expect(notesService.updateNoteContent).not.toHaveBeenCalled();

    // 2. Explicit save triggers updateNoteContent and clears unsaved state
    await store.saveNoteContent('n-save');

    expect(notesService.updateNoteContent).toHaveBeenCalledWith('n-save', 'Updated content', undefined);
    expect(store.unsavedNotes.has('n-save')).toBe(false);
  });
});
