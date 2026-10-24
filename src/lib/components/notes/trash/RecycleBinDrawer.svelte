<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { TrashedItem } from '$lib/types/notes';
	import TrashedItemRow from './TrashedItemRow.svelte';
	import * as notesService from '$lib/services/notes-service';
	import { notesStore } from '$lib/state/notes.svelte';

	let {
		isOpen = false,
		onClose
	} = $props<{
		isOpen: boolean;
		onClose: () => void;
	}>();

	let items = $state<TrashedItem[]>([]);
	let isLoading = $state<boolean>(false);
	let filter = $state<'all' | 'notes' | 'folders'>('all');
	let searchQuery = $state<string>('');
	let itemToPurge = $state<TrashedItem | null>(null);

	$effect(() => {
		if (isOpen) {
			loadTrashedItems();
		}
	});

	async function loadTrashedItems() {
		isLoading = true;
		try {
			const { notes, folders } = await notesService.fetchRecycleBin();
			const mappedNotes: TrashedItem[] = notes.map((n) => ({
				id: n.id,
				type: 'note',
				name: n.title,
				deleted_at: n.deleted_at || new Date().toISOString(),
				parent_id: n.folder_id
			}));
			const mappedFolders: TrashedItem[] = folders.map((f) => ({
				id: f.id,
				type: 'folder',
				name: f.name,
				deleted_at: f.deleted_at || new Date().toISOString(),
				parent_id: f.parent_id
			}));

			items = [...mappedNotes, ...mappedFolders].sort(
				(a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
			);
		} catch (err) {
			console.error('Failed to load recycle bin items:', err);
		} finally {
			isLoading = false;
		}
	}

	async function handleRestore(item: TrashedItem) {
		try {
			if (item.type === 'note') {
				await notesStore.restoreNote(item.id);
			} else {
				await notesStore.restoreFolder(item.id);
			}
			items = items.filter((i) => !(i.id === item.id && i.type === item.type));
		} catch (err) {
			console.error('Failed to restore item:', err);
		}
	}

	function promptPurge(item: TrashedItem) {
		itemToPurge = item;
	}

	async function confirmPurge() {
		if (!itemToPurge) return;
		const target = itemToPurge;
		try {
			await notesStore.purgeItem(target.type, target.id);
			items = items.filter((i) => !(i.id === target.id && i.type === target.type));
			itemToPurge = null;
		} catch (err) {
			console.error('Failed to purge item permanently:', err);
		}
	}

	const filteredItems = $derived(
		items.filter((item) => {
			if (filter === 'notes' && item.type !== 'note') return false;
			if (filter === 'folders' && item.type !== 'folder') return false;
			if (searchQuery.trim()) {
				return item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
			}
			return true;
		})
	);
</script>

{#if isOpen}
	<div
		class="drawer-backdrop"
		onclick={onClose}
		role="presentation"
		transition:fade={{ duration: 180, easing: cubicOut }}
	></div>

	<div
		class="recycle-bin-drawer"
		role="dialog"
		aria-modal="true"
		aria-label="Recycle Bin"
		transition:fly={{ x: 360, duration: 250, opacity: 1, easing: cubicOut }}
	>
		<header class="drawer-header">
			<div class="header-title-block">
				<div class="drawer-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
				</div>
				<div>
					<h2 class="drawer-title">Recycle Bin</h2>
					<p class="drawer-subtitle">Restore or permanently purge deleted files</p>
				</div>
			</div>
			<button
				type="button"
				class="close-btn"
				onclick={onClose}
				aria-label="Close Recycle Bin"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</header>

		<div class="drawer-toolbar">
			<div class="search-input-wrapper">
				<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					type="search"
					placeholder="Filter trashed items..."
					bind:value={searchQuery}
					class="search-input"
				/>
			</div>

			<div class="filter-pills">
				<button
					type="button"
					class="pill {filter === 'all' ? 'active' : ''}"
					onclick={() => (filter = 'all')}
				>
					All ({items.length})
				</button>
				<button
					type="button"
					class="pill {filter === 'notes' ? 'active' : ''}"
					onclick={() => (filter = 'notes')}
				>
					Notes ({items.filter((i) => i.type === 'note').length})
				</button>
				<button
					type="button"
					class="pill {filter === 'folders' ? 'active' : ''}"
					onclick={() => (filter = 'folders')}
				>
					Folders ({items.filter((i) => i.type === 'folder').length})
				</button>
			</div>
		</div>

		<div class="drawer-content">
			{#if isLoading}
				<div class="empty-state">
					<span class="spinner"></span>
					<p>Loading trashed assets...</p>
				</div>
			{:else if filteredItems.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
						</svg>
					</div>
					<p class="empty-text">Recycle Bin is empty</p>
					<span class="empty-subtext">Deleted folders and notes will appear here</span>
				</div>
			{:else}
				<div class="items-list">
					{#each filteredItems as item (item.type + '-' + item.id)}
						<TrashedItemRow
							{item}
							onRestore={handleRestore}
							onPurge={promptPurge}
						/>
					{/each}
				</div>
			{/if}
		</div>

		{#if itemToPurge}
			<div class="purge-dialog-backdrop" onclick={() => (itemToPurge = null)} role="presentation"></div>
			<div class="purge-dialog" role="dialog" aria-modal="true">
				<h4 class="purge-title">Permanently Purge?</h4>
				<p class="purge-desc">
					Are you sure you want to permanently delete <strong>"{itemToPurge.name}"</strong>? This will purge all associated history and connections. This cannot be undone.
				</p>
				<div class="purge-actions">
					<button
						type="button"
						class="btn-secondary"
						onclick={() => (itemToPurge = null)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="btn-danger"
						onclick={confirmPurge}
					>
						Purge Permanently
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.drawer-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(25, 20, 16, 0.4);
		z-index: 100;
	}

	.recycle-bin-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 420px;
		max-width: 90vw;
		background: var(--bg-primary);
		border-left: 1px solid var(--border-subtle);
		box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
		z-index: 101;
		display: flex;
		flex-direction: column;
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
	}

	.header-title-block {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.drawer-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		color: var(--primary);
	}

	.drawer-icon svg {
		width: 18px;
		height: 18px;
	}

	.drawer-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.drawer-subtitle {
		font-size: 0.6875rem;
		color: var(--text-muted);
		margin: 0;
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.close-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border-color: var(--border-subtle);
	}

	.close-btn svg {
		width: 16px;
		height: 16px;
	}

	.drawer-toolbar {
		padding: 0.75rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 0.625rem;
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.375rem 0.625rem 0.375rem 2rem;
		font-size: 0.8125rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-primary);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--border-focus);
	}

	.filter-pills {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.pill {
		padding: 0.25rem 0.625rem;
		border-radius: var(--radius-full);
		font-size: 0.6875rem;
		font-weight: 500;
		cursor: pointer;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		transition: all 0.15s ease;
	}

	.pill:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.pill.active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground, #ffffff);
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.25rem;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--text-muted);
	}

	.empty-icon {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		background: var(--bg-surface);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.75rem;
		color: var(--text-muted);
	}

	.empty-icon svg {
		width: 20px;
		height: 20px;
	}

	.empty-text {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-secondary);
		margin: 0;
	}

	.empty-subtext {
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border-subtle);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: 0.75rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.purge-dialog-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 102;
	}

	.purge-dialog {
		position: absolute;
		bottom: 1.5rem;
		left: 1.5rem;
		right: 1.5rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		z-index: 103;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.purge-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--danger, #ef4444);
		margin: 0;
	}

	.purge-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.4;
	}

	.purge-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.btn-secondary,
	.btn-danger {
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-secondary {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.btn-secondary:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.btn-danger {
		background: var(--danger, #ef4444);
		border: 1px solid transparent;
		color: #ffffff;
	}

	.btn-danger:hover {
		opacity: 0.9;
	}
</style>
