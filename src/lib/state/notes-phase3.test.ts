import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotesStore } from './notes.svelte';
import type { FolderRecord, NoteStub } from '$lib/types/notes';

describe('Phase 3: Vault Explorer & Recycle Bin Store Logic', () => {
  let store: NotesStore;

  const mockFolders: FolderRecord[] = [
    {
      id: 'folder-root-1',
      parent_id: null,
      name: 'Archive',
      created_at: '2026-01-01T00:00:00Z',
      deleted_at: null
    },
    {
      id: 'folder-child-1',
      parent_id: 'folder-root-1',
      name: 'Sub-Archive',
      created_at: '2026-01-01T00:00:00Z',
      deleted_at: null
    }
  ];

  const mockNotes: NoteStub[] = [
    {
      id: 'note-root-1',
      folder_id: null,
      title: 'Welcome Note',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null
    },
    {
      id: 'note-child-1',
      folder_id: 'folder-root-1',
      title: 'Nested Note',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null
    }
  ];

  beforeEach(() => {
    store = new NotesStore();
    store.folders = [...mockFolders];
    store.notes = [...mockNotes];
  });

  it('manages modal and drawer toggles correctly', () => {
    expect(store.recycleBinOpen).toBe(false);
    expect(store.deleteFolderModalOpen).toBe(false);
    expect(store.pendingFolderToDelete).toBeNull();

    // Trigger delete folder modal
    store.pendingFolderToDelete = { id: 'folder-root-1', name: 'Archive' };
    store.deleteFolderModalOpen = true;

    expect(store.deleteFolderModalOpen).toBe(true);
    expect(store.pendingFolderToDelete?.name).toBe('Archive');

    // Trigger recycle bin
    store.recycleBinOpen = true;
    expect(store.recycleBinOpen).toBe(true);
  });

  it('computes hierarchy groupings for folders and notes', () => {
    const rootFolders = store.folders.filter((f) => f.parent_id === null);
    const childFolders = store.folders.filter((f) => f.parent_id === 'folder-root-1');
    const rootNotes = store.notes.filter((n) => n.folder_id === null);
    const childNotes = store.notes.filter((n) => n.folder_id === 'folder-root-1');

    expect(rootFolders).toHaveLength(1);
    expect(rootFolders[0].name).toBe('Archive');

    expect(childFolders).toHaveLength(1);
    expect(childFolders[0].name).toBe('Sub-Archive');

    expect(rootNotes).toHaveLength(1);
    expect(rootNotes[0].title).toBe('Welcome Note');

    expect(childNotes).toHaveLength(1);
    expect(childNotes[0].title).toBe('Nested Note');
  });

  it('handles cascade folder deletion in local state correctly', async () => {
    // Mock deleteFolder service call
    vi.spyOn(store, 'deleteFolder').mockImplementation(async (targetId: string, cascade: boolean) => {
      if (cascade) {
        store.folders = store.folders.filter((f) => f.id !== targetId && f.parent_id !== targetId);
        store.notes = store.notes.filter((n) => n.folder_id !== targetId);
      }
      store.deleteFolderModalOpen = false;
      store.pendingFolderToDelete = null;
    });

    await store.deleteFolder('folder-root-1', true);

    expect(store.folders.some((f) => f.id === 'folder-root-1')).toBe(false);
    expect(store.folders.some((f) => f.id === 'folder-child-1')).toBe(false);
    expect(store.notes.some((n) => n.id === 'note-child-1')).toBe(false);
    expect(store.notes.some((n) => n.id === 'note-root-1')).toBe(true);
  });

  it('handles orphan folder deletion in local state correctly', async () => {
    // Mock deleteFolder service call for orphan strategy
    vi.spyOn(store, 'deleteFolder').mockImplementation(async (targetId: string, cascade: boolean) => {
      if (!cascade) {
        store.folders = store.folders
          .filter((f) => f.id !== targetId)
          .map((f) => (f.parent_id === targetId ? { ...f, parent_id: null } : f));
        store.notes = store.notes.map((n) =>
          n.folder_id === targetId ? { ...n, folder_id: null } : n
        );
      }
      store.deleteFolderModalOpen = false;
      store.pendingFolderToDelete = null;
    });

    await store.deleteFolder('folder-root-1', false);

    // Parent folder is gone
    expect(store.folders.some((f) => f.id === 'folder-root-1')).toBe(false);
    // Subfolder was orphaned to root
    const subfolder = store.folders.find((f) => f.id === 'folder-child-1');
    expect(subfolder).toBeDefined();
    expect(subfolder?.parent_id).toBeNull();
    // Child note was orphaned to root
    const nestedNote = store.notes.find((n) => n.id === 'note-child-1');
    expect(nestedNote).toBeDefined();
    expect(nestedNote?.folder_id).toBeNull();
  });
});
