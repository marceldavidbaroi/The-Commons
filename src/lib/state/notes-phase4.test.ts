import { describe, it, expect, beforeEach } from 'vitest';
import { NotesStore } from './notes.svelte';
import type { NoteStub } from '$lib/types/notes';

describe('Phase 4: Workspace Shell, Route Layout & Multi-Pane Grid Store Logic', () => {
  let store: NotesStore;

  const mockNotes: NoteStub[] = [
    {
      id: 'note-1',
      folder_id: null,
      title: 'First Note',
      updated_at: '2026-10-24T00:00:00Z',
      deleted_at: null
    },
    {
      id: 'note-2',
      folder_id: null,
      title: 'Second Note',
      updated_at: '2026-10-24T00:00:00Z',
      deleted_at: null
    },
    {
      id: 'note-3',
      folder_id: null,
      title: 'Third Note',
      updated_at: '2026-10-24T00:00:00Z',
      deleted_at: null
    }
  ];

  beforeEach(() => {
    store = new NotesStore();
    store.notes = [...mockNotes];
  });

  it('manages tab pinning, activation, and active pane selection', () => {
    // Open two notes into active pane
    store.openNoteInActivePane('note-1');
    store.openNoteInActivePane('note-2');

    expect(store.activePane.tabs).toHaveLength(2);
    expect(store.activePane.activeTabIndex).toBe(1);
    expect(store.activeTab?.title).toBe('Second Note');

    // Switch active tab
    store.setActiveTab(store.activePane.id, 0);
    expect(store.activePane.activeTabIndex).toBe(0);
    expect(store.activeTab?.title).toBe('First Note');

    // Pin tab
    expect(store.activeTab?.pinned).toBe(false);
    store.togglePinTab(store.activePane.id, 0);
    expect(store.activePane.tabs[0].pinned).toBe(true);

    // Unpin tab
    store.togglePinTab(store.activePane.id, 0);
    expect(store.activePane.tabs[0].pinned).toBe(false);
  });

  it('handles splitting right and maintains pane focus independently', () => {
    store.openNoteInActivePane('note-1');
    expect(store.panes).toHaveLength(1);
    const initialPaneId = store.activePaneId;

    // Split right with note-2
    store.splitPaneRight('note-2');
    expect(store.panes).toHaveLength(2);
    expect(store.activePaneId).not.toBe(initialPaneId);
    expect(store.activeTab?.noteId).toBe('note-2');

    // Switch focus back to initial pane
    store.setActivePane(initialPaneId);
    expect(store.activePaneId).toBe(initialPaneId);
    expect(store.activeTab?.noteId).toBe('note-1');
  });

  it('toggles command palette and quick switcher state', () => {
    expect(store.commandPaletteOpen).toBe(false);
    store.commandPaletteOpen = true;
    expect(store.commandPaletteOpen).toBe(true);
    store.commandPaletteOpen = false;
    expect(store.commandPaletteOpen).toBe(false);
  });

  it('handles closing tabs and collapses split panes when empty', () => {
    store.openNoteInActivePane('note-1');
    store.splitPaneRight('note-2');

    expect(store.panes).toHaveLength(2);
    const rightPaneId = store.activePaneId;

    // Close tab in right pane
    store.closeTab(rightPaneId, 0);

    // Right pane should automatically collapse since tabs length becomes 0
    expect(store.panes).toHaveLength(1);
  });
});
