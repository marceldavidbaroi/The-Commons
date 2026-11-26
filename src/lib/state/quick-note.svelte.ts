import type { QuickNote, UpdateQuickNotePayload } from '$lib/types/quick-note';
import {
	fetchQuickNotes,
	fetchTrashedQuickNotes,
	fetchQuickNoteById,
	createQuickNote,
	duplicateQuickNote,
	updateQuickNote,
	togglePinQuickNote,
	toggleLockQuickNote,
	softDeleteQuickNote,
	restoreQuickNote,
	hardDeleteQuickNote
} from '$lib/services/quick-note-service';

export type QuickNoteViewMode = 'all' | 'trash';

function sortActiveNotes(notes: QuickNote[]): QuickNote[] {
	return [...notes].sort((a, b) => {
		if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
		const timeDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
		if (timeDiff !== 0) return timeDiff;
		return b.id - a.id;
	});
}

class QuickNoteStore {
	notes = $state<QuickNote[]>([]);
	trashedNotes = $state<QuickNote[]>([]);
	selectedId = $state<number | null>(null);
	viewMode = $state<QuickNoteViewMode>('all');
	searchQuery = $state<string>('');
	unlockedIds = $state<Set<number>>(new Set());

	loading = $state<boolean>(false);
	loadingMore = $state<boolean>(false);
	hasMoreActive = $state<boolean>(true);
	hasMoreTrashed = $state<boolean>(true);
	saving = $state<boolean>(false);
	error = $state<string | null>(null);

	filteredNotes = $derived.by(() => {
		const source = this.viewMode === 'all' ? this.notes : this.trashedNotes;
		const q = this.searchQuery.trim().toLowerCase();
		if (!q) return source;
		return source.filter((note) => {
			const titleMatch = note.title.toLowerCase().includes(q);
			const previewMatch = !note.is_locked && note.preview.toLowerCase().includes(q);
			return titleMatch || previewMatch;
		});
	});

	selectedNote = $derived.by(() => {
		if (this.selectedId === null) return null;
		return (
			this.notes.find((n) => n.id === this.selectedId) ??
			this.trashedNotes.find((n) => n.id === this.selectedId) ??
			null
		);
	});

	isUnlocked(id: number): boolean {
		return this.unlockedIds.has(id);
	}

	unlockNote(id: number): void {
		const next = new Set(this.unlockedIds);
		next.add(id);
		this.unlockedIds = next;
	}

	lockNoteNow(id: number): void {
		if (!this.unlockedIds.has(id)) return;
		const next = new Set(this.unlockedIds);
		next.delete(id);
		this.unlockedIds = next;
	}

	async loadInitial(): Promise<void> {
		if (this.notes.length > 0) return;
		this.loading = true;
		this.error = null;
		try {
			const fetched = await fetchQuickNotes();
			this.notes = fetched;
			this.hasMoreActive = fetched.length === 20;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load notes';
		} finally {
			this.loading = false;
		}
	}

	async loadTrashed(): Promise<void> {
		if (this.trashedNotes.length > 0) return;
		this.loading = true;
		this.error = null;
		try {
			const fetched = await fetchTrashedQuickNotes();
			this.trashedNotes = fetched;
			this.hasMoreTrashed = fetched.length === 20;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load trash';
		} finally {
			this.loading = false;
		}
	}

	async loadMore(): Promise<void> {
		if (this.loadingMore) return;
		if (this.viewMode === 'all' && !this.hasMoreActive) return;
		if (this.viewMode === 'trash' && !this.hasMoreTrashed) return;

		this.loadingMore = true;
		try {
			if (this.viewMode === 'all') {
				const last = this.notes[this.notes.length - 1];
				if (!last) return;
				const next = await fetchQuickNotes({
					is_pinned: last.is_pinned,
					updated_at: last.updated_at,
					id: last.id
				});
				this.notes = [...this.notes, ...next];
				this.hasMoreActive = next.length === 20;
			} else {
				const last = this.trashedNotes[this.trashedNotes.length - 1];
				if (!last || !last.deleted_at) return;
				const next = await fetchTrashedQuickNotes({
					deleted_at: last.deleted_at,
					id: last.id
				});
				this.trashedNotes = [...this.trashedNotes, ...next];
				this.hasMoreTrashed = next.length === 20;
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load more notes';
		} finally {
			this.loadingMore = false;
		}
	}

	async ensureSelectedLoaded(id: number): Promise<void> {
		this.selectedId = id;
		const exists =
			this.notes.some((n) => n.id === id) || this.trashedNotes.some((n) => n.id === id);
		if (exists) return;

		try {
			const note = await fetchQuickNoteById(id);
			if (!note) return;
			if (note.deleted_at) {
				this.trashedNotes = [note, ...this.trashedNotes];
			} else {
				this.notes = sortActiveNotes([note, ...this.notes]);
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load note';
		}
	}

	async createNew(): Promise<QuickNote | null> {
		try {
			const created = await createQuickNote();
			this.notes = sortActiveNotes([created, ...this.notes]);
			this.viewMode = 'all';
			this.selectedId = created.id;
			return created;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to create note';
			return null;
		}
	}

	async duplicate(note: QuickNote): Promise<QuickNote | null> {
		try {
			const created = await duplicateQuickNote(note);
			this.notes = sortActiveNotes([created, ...this.notes]);
			this.viewMode = 'all';
			this.selectedId = created.id;
			return created;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to duplicate note';
			return null;
		}
	}

	async saveNote(id: number, payload: UpdateQuickNotePayload): Promise<QuickNote | null> {
		this.saving = true;
		this.error = null;
		try {
			const updated = await updateQuickNote(id, payload);
			this.notes = sortActiveNotes(this.notes.map((n) => (n.id === id ? updated : n)));
			return updated;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to save note';
			return null;
		} finally {
			this.saving = false;
		}
	}

	async togglePin(note: QuickNote): Promise<void> {
		const nextPinned = !note.is_pinned;
		try {
			const updated = await togglePinQuickNote(note.id, nextPinned);
			this.notes = sortActiveNotes(this.notes.map((n) => (n.id === note.id ? updated : n)));
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to update pin';
		}
	}

	async setLocked(note: QuickNote, isLocked: boolean): Promise<void> {
		try {
			const updated = await toggleLockQuickNote(note.id, isLocked);
			this.notes = this.notes.map((n) => (n.id === note.id ? updated : n));
			if (isLocked) {
				this.lockNoteNow(note.id);
			} else {
				this.unlockNote(note.id);
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to update lock';
		}
	}

	async softDelete(id: number): Promise<void> {
		try {
			const deleted = await softDeleteQuickNote(id);
			this.notes = this.notes.filter((n) => n.id !== id);
			this.trashedNotes = [deleted, ...this.trashedNotes];
			this.lockNoteNow(id);
			if (this.selectedId === id) {
				this.selectedId = this.notes[0]?.id ?? null;
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to delete note';
		}
	}

	async restore(id: number): Promise<void> {
		try {
			const restored = await restoreQuickNote(id);
			this.trashedNotes = this.trashedNotes.filter((n) => n.id !== id);
			this.notes = sortActiveNotes([restored, ...this.notes]);
			if (this.selectedId === id) {
				this.selectedId = this.trashedNotes[0]?.id ?? null;
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to restore note';
		}
	}

	async hardDelete(id: number): Promise<void> {
		try {
			await hardDeleteQuickNote(id);
			this.trashedNotes = this.trashedNotes.filter((n) => n.id !== id);
			this.lockNoteNow(id);
			if (this.selectedId === id) {
				this.selectedId = this.trashedNotes[0]?.id ?? null;
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to permanently delete note';
		}
	}
}

export const quickNoteStore = new QuickNoteStore();
