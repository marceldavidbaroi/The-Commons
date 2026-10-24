<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import TreeFolder from './TreeFolder.svelte';
	import TreeFile from './TreeFile.svelte';
	import DeleteFolderModal from './DeleteFolderModal.svelte';
	import type { FolderRecord } from '$lib/types/notes';

	let searchQuery = $state<string>('');
	let isCollapsedAll = $state<boolean>(false);
	let isCreatingRootFolder = $state<boolean>(false);
	let isCreatingRootNote = $state<boolean>(false);
	let rootNewItemName = $state<string>('');
	let rootInputEl = $state<HTMLInputElement | null>(null);

	// Root folders (parent_id is null)
	const rootFolders = $derived(
		notesStore.folders.filter((f) => f.parent_id === null)
	);

	// Root notes (folder_id is null)
	const rootNotes = $derived(
		notesStore.notes.filter((n) => n.folder_id === null)
	);

	// Filtered notes when search query is active
	const searchResults = $derived(
		searchQuery.trim()
			? notesStore.notes.filter((n) =>
					n.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
			  )
			: null
	);

	function handleNewNote() {
		isCreatingRootNote = true;
		isCreatingRootFolder = false;
		rootNewItemName = '';
		setTimeout(() => rootInputEl?.focus(), 20);
	}

	function handleNewFolder() {
		isCreatingRootFolder = true;
		isCreatingRootNote = false;
		rootNewItemName = '';
		setTimeout(() => rootInputEl?.focus(), 20);
	}

	async function submitRootCreation() {
		const trimmed = rootNewItemName.trim();
		if (isCreatingRootNote) {
			isCreatingRootNote = false;
			await notesStore.createNewNote(trimmed || undefined, null);
		} else if (isCreatingRootFolder) {
			isCreatingRootFolder = false;
			if (trimmed) {
				await notesStore.createNewFolder(trimmed, null);
			}
		}
		rootNewItemName = '';
	}

	function cancelRootCreation() {
		isCreatingRootNote = false;
		isCreatingRootFolder = false;
		rootNewItemName = '';
	}

	function toggleCollapseAll() {
		isCollapsedAll = !isCollapsedAll;
	}

	function promptDeleteFolder(folder: FolderRecord) {
		notesStore.pendingFolderToDelete = { id: folder.id, name: folder.name };
		notesStore.deleteFolderModalOpen = true;
	}

	async function confirmDeleteFolder(cascadeChildren: boolean) {
		if (!notesStore.pendingFolderToDelete) return;
		await notesStore.deleteFolder(notesStore.pendingFolderToDelete.id, cascadeChildren);
	}

	function handleSelectNote(id: string) {
		notesStore.openNoteInActivePane(id);
	}

	function handleSplitOpenNote(id: string) {
		notesStore.splitPaneRight(id);
	}
</script>

<aside class="file-tree-sidebar" aria-label="Vault Explorer">
	<!-- Vault Action Header -->
	<div class="tree-header">
		<div class="header-label">
			<span class="vault-title">Vault Explorer</span>
			<span class="items-count" title="Total active notes">
				{notesStore.notes.length} notes
			</span>
		</div>

		<div class="header-actions">
			<button
				type="button"
				class="action-btn"
				title="New Note"
				aria-label="New Note"
				onclick={handleNewNote}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<line x1="12" y1="11" x2="12" y2="17" />
					<line x1="9" y1="14" x2="15" y2="14" />
				</svg>
			</button>

			<button
				type="button"
				class="action-btn"
				title="New Folder"
				aria-label="New Folder"
				onclick={handleNewFolder}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
					<line x1="12" y1="11" x2="12" y2="17" />
					<line x1="9" y1="14" x2="15" y2="14" />
				</svg>
			</button>

			<button
				type="button"
				class="action-btn"
				title={isCollapsedAll ? 'Expand all folders' : 'Collapse all folders'}
				aria-label="Toggle collapse all"
				onclick={toggleCollapseAll}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="4 14 10 14 10 20" />
					<polyline points="20 10 14 10 14 4" />
					<line x1="14" y1="10" x2="21" y2="3" />
					<line x1="3" y1="21" x2="10" y2="14" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Inline Quick Search Filter -->
	<div class="tree-search">
		<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
		<input
			type="search"
			placeholder="Filter notes..."
			bind:value={searchQuery}
			class="tree-search-input"
		/>
	</div>

	<!-- File & Folder Tree Canvas -->
	<div class="tree-content">
		<!-- Root Creation Input Row -->
		{#if isCreatingRootNote || isCreatingRootFolder}
			<div class="root-creation-row">
				<div class="creation-icon">
					{#if isCreatingRootFolder}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						</svg>
					{/if}
				</div>
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:this={rootInputEl}
					type="text"
					class="root-input"
					placeholder={isCreatingRootFolder ? 'Folder name...' : 'Note title...'}
					bind:value={rootNewItemName}
					onblur={submitRootCreation}
					onkeydown={(e) => {
						if (e.key === 'Enter') submitRootCreation();
						if (e.key === 'Escape') cancelRootCreation();
					}}
				/>
			</div>
		{/if}

		{#if searchResults !== null}
			<!-- Search filter results flat list -->
			{#if searchResults.length === 0}
				<div class="empty-search">
					<span>No notes matching "{searchQuery}"</span>
				</div>
			{:else}
				<div class="search-results-list">
					{#each searchResults as note (note.id)}
						<TreeFile
							{note}
							depth={0}
							onSelectNote={handleSelectNote}
							onSplitOpenNote={handleSplitOpenNote}
						/>
					{/each}
				</div>
			{/if}
		{:else}
			<!-- Normal Hierarchy View -->
			{#if rootFolders.length === 0 && rootNotes.length === 0}
				<div class="empty-vault">
					<p class="empty-title">Vault is empty</p>
					<button
						type="button"
						class="btn-quick-new"
						onclick={handleNewNote}
					>
						+ Create First Note
					</button>
				</div>
			{:else}
				<!-- Root folders with children -->
				{#each rootFolders as folder (folder.id)}
					<TreeFolder
						{folder}
						depth={0}
						allFolders={notesStore.folders}
						allNotes={notesStore.notes}
						{isCollapsedAll}
						onSelectNote={handleSelectNote}
						onSplitOpenNote={handleSplitOpenNote}
						onPromptDeleteFolder={promptDeleteFolder}
					/>
				{/each}

				<!-- Root notes -->
				{#each rootNotes as note (note.id)}
					<TreeFile
						{note}
						depth={0}
						onSelectNote={handleSelectNote}
						onSplitOpenNote={handleSplitOpenNote}
					/>
				{/each}
			{/if}
		{/if}
	</div>

	<!-- Folder Deletion Confirmation Modal -->
	<DeleteFolderModal
		isOpen={notesStore.deleteFolderModalOpen}
		folderName={notesStore.pendingFolderToDelete?.name}
		onCancel={() => {
			notesStore.deleteFolderModalOpen = false;
			notesStore.pendingFolderToDelete = null;
		}}
		onConfirm={confirmDeleteFolder}
	/>
</aside>

<style>
	.file-tree-sidebar {
		width: 250px;
		min-width: 200px;
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
		border-right: 1px solid var(--border-subtle);
		user-select: none;
	}

	.tree-header {
		height: 40px;
		padding: 0 0.625rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
	}

	.header-label {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		min-width: 0;
	}

	.vault-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.items-count {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.125rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-sm);
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
		transition: all 0.12s ease;
	}

	.action-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border-color: var(--border-subtle);
	}

	.action-btn svg {
		width: 14px;
		height: 14px;
	}

	.tree-search {
		position: relative;
		padding: 0.375rem 0.5rem;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 0.875rem;
		width: 13px;
		height: 13px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.tree-search-input {
		width: 100%;
		height: 24px;
		padding: 0 0.375rem 0 1.625rem;
		font-size: 0.75rem;
		background: var(--bg-primary);
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.tree-search-input:focus {
		border-color: var(--border-focus);
	}

	.tree-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.375rem 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
	}

	.root-creation-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		height: 28px;
		padding: 0 0.5rem;
	}

	.creation-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		color: var(--text-muted);
	}

	.creation-icon svg {
		width: 13px;
		height: 13px;
	}

	.root-input {
		flex: 1;
		height: 22px;
		padding: 0 0.375rem;
		font-size: 0.75rem;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-focus);
		border-radius: var(--radius-sm);
		outline: none;
	}

	.empty-vault {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 1rem;
		text-align: center;
		gap: 0.5rem;
	}

	.empty-title {
		font-size: 0.8125rem;
		color: var(--text-muted);
		margin: 0;
	}

	.btn-quick-new {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--primary);
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.625rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-quick-new:hover {
		background: var(--bg-tertiary);
		border-color: var(--border-focus);
	}

	.empty-search {
		padding: 1.5rem 0.5rem;
		text-align: center;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.search-results-list {
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
	}
</style>
