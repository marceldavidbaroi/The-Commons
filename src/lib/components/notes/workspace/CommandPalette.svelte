<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import type { NoteStub } from '$lib/types/notes';
	import { fade } from 'svelte/transition';

	let {
		isOpen = false,
		onClose
	} = $props<{
		isOpen: boolean;
		onClose: () => void;
	}>();

	let searchQuery = $state<string>('');
	let selectedIndex = $state<number>(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	// Filter active notes
	const filteredNotes = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) {
			// Show recent notes first
			return [...notesStore.notes].sort(
				(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
			).slice(0, 15);
		}
		return notesStore.notes
			.filter((n) => n.title.toLowerCase().includes(q))
			.slice(0, 15);
	});

	$effect(() => {
		if (isOpen) {
			searchQuery = '';
			selectedIndex = 0;
			setTimeout(() => {
				inputEl?.focus();
			}, 30);
		}
	});

	// Reset selectedIndex when results length changes
	$effect(() => {
		if (selectedIndex >= filteredNotes.length) {
			selectedIndex = Math.max(0, filteredNotes.length - 1);
		}
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (filteredNotes.length > 0) {
				selectedIndex = (selectedIndex + 1) % filteredNotes.length;
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (filteredNotes.length > 0) {
				selectedIndex = (selectedIndex - 1 + filteredNotes.length) % filteredNotes.length;
			}
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (filteredNotes.length > 0 && filteredNotes[selectedIndex]) {
				selectNote(filteredNotes[selectedIndex]);
			} else if (searchQuery.trim()) {
				// Create new note with search query title if none found
				createAndOpenNewNote(searchQuery.trim());
			}
		}
	}

	function selectNote(note: NoteStub) {
		notesStore.openNoteInActivePane(note.id);
		onClose();
	}

	async function createAndOpenNewNote(title: string) {
		const newNote = await notesStore.createNewNote(title);
		if (newNote) {
			notesStore.openNoteInActivePane(newNote.id);
		}
		onClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}
</script>

{#if isOpen}
	<div
		class="command-palette-backdrop"
		role="presentation"
		onclick={handleBackdropClick}
		transition:fade={{ duration: 120 }}
	>
		<div
			class="command-palette-dialog"
			role="dialog"
			aria-modal="true"
			aria-label="Quick Switcher"
		>
			<!-- Search Bar -->
			<div class="palette-input-wrapper">
				<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>

				<input
					bind:this={inputEl}
					type="text"
					class="palette-input"
					placeholder="Type a note title to jump to or create..."
					bind:value={searchQuery}
					onkeydown={handleKeyDown}
				/>

				<div class="palette-badges">
					<span class="key-badge">ESC to close</span>
				</div>
			</div>

			<!-- Result List -->
			<div class="palette-results" role="listbox">
				{#if filteredNotes.length === 0}
					<div class="empty-results">
						{#if searchQuery.trim()}
							<div class="create-hint-row" onclick={() => createAndOpenNewNote(searchQuery.trim())} role="option" aria-selected="true" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter') createAndOpenNewNote(searchQuery.trim()); }}>
								<span class="create-plus">+</span>
								<span>Create new note: <strong>"{searchQuery.trim()}"</strong></span>
								<span class="key-badge">Press Enter</span>
							</div>
						{:else}
							<span>No notes found</span>
						{/if}
					</div>
				{:else}
					{#each filteredNotes as note, idx (note.id)}
						{@const isSelected = idx === selectedIndex}
						<div
							class="result-item"
							class:selected={isSelected}
							role="option"
							aria-selected={isSelected}
							tabindex="0"
							onclick={() => selectNote(note)}
							onmouseenter={() => (selectedIndex = idx)}
							onkeydown={(e) => {
								if (e.key === 'Enter') selectNote(note);
							}}
						>
							<div class="item-left">
								<svg class="note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
									<polyline points="14 2 14 8 20 8" />
								</svg>
								<span class="note-title">{note.title}</span>
							</div>

							{#if note.folder_id}
								{@const folder = notesStore.folders.find((f) => f.id === note.folder_id)}
								<span class="folder-breadcrumb">
									{folder ? folder.name : 'Folder'}
								</span>
							{/if}
						</div>
					{/each}
				{/if}
			</div>

			<!-- Footer -->
			<div class="palette-footer">
				<div class="footer-hint">
					<kbd>↑</kbd> <kbd>↓</kbd> to navigate
				</div>
				<div class="footer-hint">
					<kbd>↵</kbd> to open
				</div>
				<div class="footer-hint">
					<kbd>esc</kbd> to dismiss
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.command-palette-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		z-index: 1000;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding-top: 15vh;
	}

	.command-palette-dialog {
		width: 100%;
		max-width: 580px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.16);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.palette-input-wrapper {
		display: flex;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border-subtle);
		gap: 10px;
	}

	.search-icon {
		width: 18px;
		height: 18px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.palette-input {
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-family: var(--font-sans);
		font-size: 15px;
		color: var(--text-primary);
	}

	.palette-input::placeholder {
		color: var(--text-muted);
	}

	.key-badge {
		font-size: 11px;
		color: var(--text-muted);
		background: var(--bg-tertiary);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		font-family: var(--font-mono);
	}

	.palette-results {
		max-height: 340px;
		overflow-y: auto;
		padding: 6px;
	}

	.result-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		user-select: none;
		transition: background 0.12s ease;
		outline: none;
	}

	.result-item.selected {
		background: var(--bg-surface);
	}

	.item-left {
		display: flex;
		align-items: center;
		gap: 8px;
		overflow: hidden;
	}

	.note-icon {
		width: 15px;
		height: 15px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.result-item.selected .note-icon {
		color: var(--primary);
	}

	.note-title {
		font-size: 13px;
		color: var(--text-primary);
		font-weight: 400;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-item.selected .note-title {
		font-weight: 500;
	}

	.folder-breadcrumb {
		font-size: 11px;
		color: var(--text-muted);
		background: var(--bg-tertiary);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	.empty-results {
		padding: 20px 16px;
		text-align: center;
		font-size: 13px;
		color: var(--text-muted);
	}

	.create-hint-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		cursor: pointer;
		color: var(--text-primary);
		text-align: left;
	}

	.create-plus {
		font-weight: 600;
		color: var(--primary);
		margin-right: 6px;
	}

	.palette-footer {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px 16px;
		background: var(--bg-tertiary);
		border-top: 1px solid var(--border-subtle);
		font-size: 11px;
		color: var(--text-muted);
	}

	.footer-hint {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	kbd {
		display: inline-block;
		padding: 1px 4px;
		font-family: var(--font-mono);
		font-size: 10px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 3px;
		color: var(--text-secondary);
	}
</style>
