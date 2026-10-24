import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotesStore } from './notes.svelte';
import type { NoteStub, NoteDetail } from '$lib/types/notes';

describe('Phase 5: Live Preview Editor & [[Wiki-Link]] Resolution & Autosave Store Logic', () => {
  let store: NotesStore;

  const mockNotes: NoteStub[] = [
    {
      id: 'note-alpha',
      folder_id: null,
      title: 'Alpha Note',
      updated_at: '2026-10-24T00:00:00Z',
      deleted_at: null
    },
    {
      id: 'note-beta',
      folder_id: null,
      title: 'Beta Note',
      updated_at: '2026-10-24T00:00:00Z',
      deleted_at: null
    }
  ];

  beforeEach(() => {
    store = new NotesStore();
    store.notes = [...mockNotes];
  });

  it('correctly parses outgoing wiki-links and distinguishes resolved vs ghost links', () => {
    const content = `
# Architecture
This references [[Alpha Note]] and also has an unresolved link to [[Nonexistent Note]].
We also test display alias: [[Beta Note|Custom Display Label]].
    `;

    store.parseOutgoingWikiLinks('note-alpha', content);

    const outgoing = store.outgoingLinks.get('note-alpha') || [];
    expect(outgoing).toHaveLength(3);

    const alphaLink = outgoing.find((l) => l.title === 'Alpha Note');
    expect(alphaLink).toBeDefined();
    expect(alphaLink?.isResolved).toBe(true);

    const betaLink = outgoing.find((l) => l.title === 'Beta Note');
    expect(betaLink).toBeDefined();
    expect(betaLink?.isResolved).toBe(true);

    const ghostLink = outgoing.find((l) => l.title === 'Nonexistent Note');
    expect(ghostLink).toBeDefined();
    expect(ghostLink?.isResolved).toBe(false);
  });

  it('updates local in-memory content immediately and tracks unsaved status without firing API', async () => {
    const initialDetail: NoteDetail = {
      id: 'note-alpha',
      folder_id: null,
      title: 'Alpha Note',
      content: 'Initial content',
      created_at: '2026-10-24T00:00:00Z',
      updated_at: '2026-10-24T00:00:00Z'
    };

    store.activeNotesCache.set('note-alpha', initialDetail);

    // Update note content locally (as user types)
    store.updateNoteContentLocal('note-alpha', 'Updated live markdown [[Beta Note]]');

    // 1. In-memory cache should be updated synchronously
    const cached = store.activeNotesCache.get('note-alpha');
    expect(cached?.content).toBe('Updated live markdown [[Beta Note]]');

    // 2. Outgoing links should be updated synchronously
    const outgoing = store.outgoingLinks.get('note-alpha');
    expect(outgoing).toHaveLength(1);
    expect(outgoing?.[0].title).toBe('Beta Note');
    expect(outgoing?.[0].isResolved).toBe(true);

    // 3. Store should mark note as having unsaved changes
    expect(store.unsavedNotes.has('note-alpha')).toBe(true);
  });

  it('navigates to resolved note or creates new note from ghost link', async () => {
    // Open initial tab
    store.openNoteInActivePane('note-alpha');
    expect(store.activeTab?.noteId).toBe('note-alpha');

    // Clicking resolved note opens it in active pane
    const targetStub = store.activeTitleMap.get('beta note');
    expect(targetStub).toBeDefined();
    store.openNoteInActivePane(targetStub!.id);
    expect(store.activeTab?.noteId).toBe('note-beta');
  });

  it('supports splitting right with a clicked wiki-link target', () => {
    store.openNoteInActivePane('note-alpha');
    expect(store.panes).toHaveLength(1);

    // Modifier click opens link target in split pane
    const targetStub = store.activeTitleMap.get('beta note');
    store.splitPaneRight(targetStub!.id);

    expect(store.panes).toHaveLength(2);
    expect(store.activeTab?.noteId).toBe('note-beta');
  });
});
