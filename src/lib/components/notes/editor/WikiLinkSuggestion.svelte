<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import type { NoteStub } from '$lib/types/notes';

	let {
		query = '',
		position = { top: 0, left: 0 },
		onSelect,
		onClose
	} = $props<{
		query: string;
		position: { top: number; left: number };
		onSelect: (noteTitle: string) => void;
		onClose: () => void;
	}>();

	let selectedIndex = $state<number>(0);

	// Filter notes based on the query typed after [[
	const filteredNotes = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			// Show up to 10 most recently updated notes
			return [...notesStore.notes]
				.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
				.slice(0, 10);
		}
		return notesStore.notes
			.filter((n) => n.title.toLowerCase().includes(q))
			.slice(0, 10);
	});

	// If query doesn't exactly match an existing note, show an option to link/create new
	const hasExactMatch = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return true;
		return notesStore.notes.some((n) => n.title.toLowerCase() === q);
	});

	$effect(() => {
		// Reset selected index when query changes
		if (query !== undefined) {
			selectedIndex = 0;
		}
	});

	$effect(() => {
		const maxIndex = filteredNotes.length + (!hasExactMatch && query.trim() ? 1 : 0) - 1;
		if (selectedIndex > maxIndex) {
			selectedIndex = Math.max(0, maxIndex);
		}
	});

	export function handleKeyDown(e: KeyboardEvent): boolean {
		const totalItems = filteredNotes.length + (!hasExactMatch && query.trim() ? 1 : 0);
		if (totalItems === 0) {
			if (e.key === 'Escape') {
				onClose();
				return true;
			}
			return false;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = (selectedIndex + 1) % totalItems;
			return true;
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = (selectedIndex - 1 + totalItems) % totalItems;
			return true;
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			e.preventDefault();
			confirmSelection();
			return true;
		} else if (e.key === 'Escape') {
			e.preventDefault();
			onClose();
			return true;
		}

		return false;
	}

	function confirmSelection() {
		if (selectedIndex < filteredNotes.length) {
			const selected = filteredNotes[selectedIndex];
			onSelect(selected.title);
		} else if (!hasExactMatch && query.trim()) {
			// Select the newly typed title
			onSelect(query.trim());
		}
	}
</script>

<div
	class="wiki-popup"
	role="listbox"
	aria-label="Note link suggestions"
	style="top: {position.top}px; left: {position.left}px;"
>
	<div class="wiki-popup-header">
		<span class="header-icon">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
				<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
			</svg>
		</span>
		<span class="header-text">Link to Note</span>
		{#if query.trim()}
			<span class="header-query">"{query}"</span>
		{/if}
	</div>

	<div class="wiki-popup-list">
		{#if filteredNotes.length === 0 && (!query.trim() || hasExactMatch)}
			<div class="wiki-empty">No matching notes found</div>
		{:else}
			{#each filteredNotes as note, index}
				<button
					type="button"
					role="option"
					aria-selected={index === selectedIndex}
					class="wiki-item"
					class:selected={index === selectedIndex}
					onclick={() => onSelect(note.title)}
					onmouseenter={() => (selectedIndex = index)}
				>
					<span class="note-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
					</span>
					<span class="note-title">{note.title}</span>
					<span class="item-enter-hint">↵</span>
				</button>
			{/each}

			{#if !hasExactMatch && query.trim()}
				{@const newIndex = filteredNotes.length}
				<button
					type="button"
					role="option"
					aria-selected={newIndex === selectedIndex}
					class="wiki-item create-new"
					class:selected={newIndex === selectedIndex}
					onclick={() => onSelect(query.trim())}
					onmouseenter={() => (selectedIndex = newIndex)}
				>
					<span class="note-icon create-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
					</span>
					<span class="note-title">
						Link to new note: <strong>"{query.trim()}"</strong>
					</span>
					<span class="badge-ghost">ghost</span>
					<span class="item-enter-hint">↵</span>
				</button>
			{/if}
		{/if}
	</div>
</div>

<style>
	.wiki-popup {
		position: absolute;
		z-index: 100;
		width: 320px;
		max-height: 280px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		font-family: var(--font-sans);
		font-size: 13px;
	}

	.wiki-popup-header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
	}

	.header-icon svg {
		width: 13px;
		height: 13px;
		display: block;
	}

	.header-query {
		color: var(--primary);
		text-transform: none;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.wiki-popup-list {
		overflow-y: auto;
		padding: 4px;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.wiki-empty {
		padding: 12px;
		text-align: center;
		font-size: 12px;
		color: var(--text-muted);
	}

	.wiki-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 10px;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		color: var(--text-secondary);
		text-align: left;
		cursor: pointer;
		transition: background 0.1s ease, color 0.1s ease;
	}

	.wiki-item.selected,
	.wiki-item:hover {
		background: var(--bg-hover);
		color: var(--text-primary);
	}

	.note-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.note-icon svg {
		width: 14px;
		height: 14px;
	}

	.wiki-item.selected .note-icon {
		color: var(--primary);
	}

	.note-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 450;
	}

	.note-title strong {
		color: var(--text-primary);
		font-weight: 600;
	}

	.badge-ghost {
		font-size: 10px;
		padding: 1px 5px;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-muted);
		border: 1px dashed var(--border-subtle);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.item-enter-hint {
		font-size: 11px;
		color: var(--text-muted);
		opacity: 0;
		transition: opacity 0.1s ease;
	}

	.wiki-item.selected .item-enter-hint {
		opacity: 0.8;
	}

	.wiki-item.create-new {
		color: var(--primary);
	}

	.create-icon {
		color: var(--primary);
	}
</style>
