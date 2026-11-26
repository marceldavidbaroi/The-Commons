<script lang="ts">
	import type { QuickNote } from '$lib/types/quick-note';
	import type { QuickNoteViewMode } from '$lib/state/quick-note.svelte';
	import QuickNoteListItem from './QuickNoteListItem.svelte';

	interface Props {
		notes: QuickNote[];
		selectedId: number | null;
		viewMode: QuickNoteViewMode;
		searchQuery: string;
		loading: boolean;
		loadingMore: boolean;
		hasMore: boolean;
		onCreateNew: () => void;
		onSelect: (note: QuickNote) => void;
		onChangeViewMode: (mode: QuickNoteViewMode) => void;
		onSearchChange: (q: string) => void;
		onLoadMore: () => void;
		onTogglePin: (note: QuickNote) => void;
		onToggleLock: (note: QuickNote) => void;
		onDuplicate: (note: QuickNote) => void;
		onDelete: (note: QuickNote) => void;
		onRestore: (note: QuickNote) => void;
		onHardDelete: (note: QuickNote) => void;
	}

	let {
		notes,
		selectedId,
		viewMode,
		searchQuery,
		loading,
		loadingMore,
		hasMore,
		onCreateNew,
		onSelect,
		onChangeViewMode,
		onSearchChange,
		onLoadMore,
		onTogglePin,
		onToggleLock,
		onDuplicate,
		onDelete,
		onRestore,
		onHardDelete
	}: Props = $props();
</script>

<aside class="qn-list-pane">
	<div class="qn-list-header">
		<h1 class="qn-heading">Quick Note</h1>
		<button type="button" class="qn-new-btn" onclick={onCreateNew}>+ New</button>
	</div>

	<div class="qn-toolbar">
		<input
			type="search"
			class="qn-search"
			placeholder="Search notes..."
			value={searchQuery}
			oninput={(e) => onSearchChange(e.currentTarget.value)}
		/>
		<div class="qn-tabs" role="tablist">
			<button
				type="button"
				role="tab"
				aria-selected={viewMode === 'all'}
				class="qn-tab"
				class:active={viewMode === 'all'}
				onclick={() => onChangeViewMode('all')}
			>
				All
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={viewMode === 'trash'}
				class="qn-tab"
				class:active={viewMode === 'trash'}
				onclick={() => onChangeViewMode('trash')}
			>
				Trash
			</button>
		</div>
	</div>

	<div class="qn-list-scroll">
		{#if loading && notes.length === 0}
			<div class="qn-empty">Loading notes...</div>
		{:else if notes.length === 0}
			<div class="qn-empty">
				<p>{viewMode === 'trash' ? 'Trash is empty' : 'No notes yet'}</p>
				{#if viewMode === 'all'}
					<button type="button" class="qn-empty-btn" onclick={onCreateNew}>Create Note</button>
				{/if}
			</div>
		{:else}
			{#each notes as note (note.id)}
				<QuickNoteListItem
					{note}
					selected={selectedId === note.id}
					isTrash={viewMode === 'trash'}
					{onSelect}
					{onTogglePin}
					{onToggleLock}
					{onDuplicate}
					{onDelete}
					{onRestore}
					{onHardDelete}
				/>
			{/each}

			{#if hasMore}
				<div class="qn-load-more">
					<button type="button" class="qn-load-more-btn" disabled={loadingMore} onclick={onLoadMore}>
						{loadingMore ? 'Loading...' : 'Load More'}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</aside>

<style>
	.qn-list-pane {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: var(--bg-secondary);
		border-right: 1px solid var(--border-color);
	}

	.qn-list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0.75rem 0.5rem;
	}

	.qn-heading {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.qn-new-btn {
		background-color: var(--primary, #9E5A3C);
		color: var(--primary-foreground, #fff);
		border: none;
		border-radius: 0.375rem;
		padding: 0.35rem 0.65rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
	}

	.qn-toolbar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 0.75rem 0.625rem;
		border-bottom: 1px solid var(--border-color);
	}

	.qn-search {
		flex: 1;
		min-width: 0;
		padding: 0.35rem 0.55rem;
		font-size: 0.8rem;
		border: 1px solid var(--border-color);
		border-radius: 0.375rem;
		background-color: var(--bg-primary);
		color: var(--text-primary);
	}

	.qn-tabs {
		display: flex;
		background-color: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 0.375rem;
		padding: 0.125rem;
		flex-shrink: 0;
	}

	.qn-tab {
		background: transparent;
		border: none;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
		border-radius: 0.25rem;
		cursor: pointer;
	}

	.qn-tab.active {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
		font-weight: 600;
	}

	.qn-list-scroll {
		flex: 1;
		overflow-y: auto;
	}

	.qn-empty {
		padding: 2rem 1rem;
		text-align: center;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.qn-empty-btn {
		margin-top: 0.5rem;
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--border-color);
		background-color: var(--bg-primary);
		color: var(--text-primary);
		border-radius: 0.375rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.qn-load-more {
		padding: 0.75rem;
		text-align: center;
	}

	.qn-load-more-btn {
		padding: 0.35rem 0.75rem;
		font-size: 0.8rem;
		border: 1px solid var(--border-color);
		background-color: var(--bg-primary);
		color: var(--text-secondary);
		border-radius: 0.375rem;
		cursor: pointer;
	}
</style>
