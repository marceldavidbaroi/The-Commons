<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { quickNoteStore, type QuickNoteViewMode } from '$lib/state/quick-note.svelte';
	import type { QuickNote } from '$lib/types/quick-note';
	import QuickNoteList from '$lib/components/quick-note/QuickNoteList.svelte';
	import QuickNoteEditor from '$lib/components/quick-note/QuickNoteEditor.svelte';
	import QuickNotePasscodeModal from '$lib/components/quick-note/QuickNotePasscodeModal.svelte';
	import { hasQuickNotePasscode } from '$lib/services/quick-note-service';

	let modalOpen = $state(false);
	let modalMode = $state<'set' | 'verify'>('verify');
	let modalTitle = $state<string | undefined>(undefined);
	let pendingAction = $state<(() => void) | null>(null);

	let urlId = $derived.by(() => {
		const raw = page.url.searchParams.get('id');
		if (!raw) return null;
		const parsed = Number(raw);
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	});

	let hasMobileDetail = $derived(urlId !== null);

	onMount(async () => {
		await quickNoteStore.loadInitial();
		if (urlId !== null) {
			await quickNoteStore.ensureSelectedLoaded(urlId);
		} else if (quickNoteStore.notes.length > 0 && window.innerWidth > 768) {
			const firstId = quickNoteStore.notes[0].id;
			quickNoteStore.selectedId = firstId;
		}
	});

	$effect(() => {
		if (urlId !== null && quickNoteStore.selectedId !== urlId) {
			quickNoteStore.ensureSelectedLoaded(urlId);
		}
	});

	function selectNote(note: QuickNote) {
		quickNoteStore.selectedId = note.id;
		goto(`/quick-note?id=${note.id}`, { keepFocus: true, noScroll: true });
	}

	async function handleCreateNew() {
		const created = await quickNoteStore.createNew();
		if (created) {
			goto(`/quick-note?id=${created.id}`, { keepFocus: true, noScroll: true });
		}
	}

	async function handleDuplicate(note: QuickNote) {
		const created = await quickNoteStore.duplicate(note);
		if (created) {
			goto(`/quick-note?id=${created.id}`, { keepFocus: true, noScroll: true });
		}
	}

	function handleBack() {
		quickNoteStore.selectedId = null;
		goto('/quick-note', { keepFocus: true, noScroll: true });
	}

	async function handleChangeViewMode(mode: QuickNoteViewMode) {
		quickNoteStore.viewMode = mode;
		if (mode === 'trash') {
			await quickNoteStore.loadTrashed();
		}
	}

	async function handleToggleLock(note: QuickNote) {
		if (!note.is_locked) {
			const hasPasscode = await hasQuickNotePasscode();
			if (!hasPasscode) {
				modalMode = 'set';
				modalTitle = 'Set Lock Passcode';
				pendingAction = () => quickNoteStore.setLocked(note, true);
				modalOpen = true;
				return;
			}
			await quickNoteStore.setLocked(note, true);
			return;
		}

		if (quickNoteStore.isUnlocked(note.id)) {
			await quickNoteStore.setLocked(note, false);
			return;
		}

		modalMode = 'verify';
		modalTitle = 'Unlock Note';
		pendingAction = () => quickNoteStore.setLocked(note, false);
		modalOpen = true;
	}

	function handleRequestUnlock(note: QuickNote) {
		modalMode = 'verify';
		modalTitle = 'Unlock Note';
		pendingAction = () => quickNoteStore.unlockNote(note.id);
		modalOpen = true;
	}

	function handleDelete(note: QuickNote) {
		if (note.is_locked && !quickNoteStore.isUnlocked(note.id)) {
			modalMode = 'verify';
			modalTitle = 'Unlock to Delete';
			pendingAction = () => quickNoteStore.softDelete(note.id);
			modalOpen = true;
			return;
		}
		quickNoteStore.softDelete(note.id);
	}

	function handleHardDelete(note: QuickNote) {
		if (note.is_locked && !quickNoteStore.isUnlocked(note.id)) {
			modalMode = 'verify';
			modalTitle = 'Unlock to Delete Permanently';
			pendingAction = () => {
				if (confirm('Permanently delete this note? This cannot be undone.')) {
					quickNoteStore.hardDelete(note.id);
				}
			};
			modalOpen = true;
			return;
		}
		if (confirm('Permanently delete this note? This cannot be undone.')) {
			quickNoteStore.hardDelete(note.id);
		}
	}

	function handleModalSuccess() {
		modalOpen = false;
		const action = pendingAction;
		pendingAction = null;
		action?.();
	}
</script>

<div class="qn-shell" class:mobile-detail={hasMobileDetail}>
	<div class="qn-list-col">
		<QuickNoteList
			notes={quickNoteStore.filteredNotes}
			selectedId={quickNoteStore.selectedId}
			viewMode={quickNoteStore.viewMode}
			searchQuery={quickNoteStore.searchQuery}
			loading={quickNoteStore.loading}
			loadingMore={quickNoteStore.loadingMore}
			hasMore={quickNoteStore.viewMode === 'all'
				? quickNoteStore.hasMoreActive
				: quickNoteStore.hasMoreTrashed}
			onCreateNew={handleCreateNew}
			onSelect={selectNote}
			onChangeViewMode={handleChangeViewMode}
			onSearchChange={(q) => (quickNoteStore.searchQuery = q)}
			onLoadMore={() => quickNoteStore.loadMore()}
			onTogglePin={(note) => quickNoteStore.togglePin(note)}
			onToggleLock={handleToggleLock}
			onDuplicate={handleDuplicate}
			onDelete={handleDelete}
			onRestore={(note) => quickNoteStore.restore(note.id)}
			onHardDelete={handleHardDelete}
		/>
	</div>

	<div class="qn-editor-col">
		<QuickNoteEditor
			note={quickNoteStore.selectedNote}
			isUnlocked={quickNoteStore.selectedNote
				? quickNoteStore.isUnlocked(quickNoteStore.selectedNote.id)
				: false}
			saving={quickNoteStore.saving}
			onBack={handleBack}
			onSave={(id, payload) => quickNoteStore.saveNote(id, payload)}
			onTogglePin={(note) => quickNoteStore.togglePin(note)}
			onToggleLock={handleToggleLock}
			onLockNow={(note) => quickNoteStore.lockNoteNow(note.id)}
			onRequestUnlock={handleRequestUnlock}
			onDuplicate={handleDuplicate}
			onDelete={handleDelete}
			onRestore={(note) => quickNoteStore.restore(note.id)}
			onHardDelete={handleHardDelete}
		/>
	</div>
</div>

<QuickNotePasscodeModal
	open={modalOpen}
	mode={modalMode}
	title={modalTitle}
	onCancel={() => {
		modalOpen = false;
		pendingAction = null;
	}}
	onSuccess={handleModalSuccess}
/>

<style>
	.qn-shell {
		display: grid;
		grid-template-columns: 300px 1fr;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
		background-color: var(--bg-primary);
	}

	.qn-list-col,
	.qn-editor-col {
		height: 100%;
		min-height: 0;
		overflow: hidden;
	}

	@media (max-width: 768px) {
		.qn-shell {
			grid-template-columns: 1fr;
		}

		.qn-editor-col {
			display: none;
		}

		.qn-shell.mobile-detail .qn-list-col {
			display: none;
		}

		.qn-shell.mobile-detail .qn-editor-col {
			display: block;
		}
	}
</style>
