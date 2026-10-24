<script lang="ts">
	import type { FolderRecord, NoteStub } from '$lib/types/notes';
	import { notesStore } from '$lib/state/notes.svelte';
	import TreeFile from './TreeFile.svelte';
	import TreeFolder from './TreeFolder.svelte';

	let {
		folder,
		depth = 0,
		allFolders,
		allNotes,
		isCollapsedAll = false,
		onSelectNote,
		onSplitOpenNote,
		onPromptDeleteFolder
	} = $props<{
		folder: FolderRecord;
		depth?: number;
		allFolders: FolderRecord[];
		allNotes: NoteStub[];
		isCollapsedAll?: boolean;
		onSelectNote: (id: string) => void;
		onSplitOpenNote?: (id: string) => void;
		onPromptDeleteFolder: (folder: FolderRecord) => void;
	}>();

	let isOpen = $state<boolean>(true);
	let isEditing = $state<boolean>(false);
	let editedName = $state<string>(folder.name);
	let showMenu = $state<boolean>(false);
	let isCreatingNoteInside = $state<boolean>(false);
	let isCreatingSubfolder = $state<boolean>(false);
	let newChildName = $state<string>('');
	let inputEl = $state<HTMLInputElement | null>(null);
	let childInputEl = $state<HTMLInputElement | null>(null);

	// Sync with parent collapse all
	$effect(() => {
		if (isCollapsedAll) {
			isOpen = false;
		}
	});

	// Direct child folders and notes
	const childFolders = $derived(
		allFolders.filter((f: FolderRecord) => f.parent_id === folder.id)
	);

	const childNotes = $derived(
		allNotes.filter((n: NoteStub) => n.folder_id === folder.id)
	);

	function toggleOpen() {
		if (isEditing) return;
		isOpen = !isOpen;
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		showMenu = !showMenu;
	}

	function startRenaming() {
		showMenu = false;
		editedName = folder.name;
		isEditing = true;
		setTimeout(() => {
			inputEl?.focus();
			inputEl?.select();
		}, 20);
	}

	async function submitRename() {
		if (!isEditing) return;
		isEditing = false;
		const trimmed = editedName.trim();
		if (trimmed && trimmed !== folder.name) {
			await notesStore.renameFolder(folder.id, trimmed);
		} else {
			editedName = folder.name;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			submitRename();
		} else if (e.key === 'Escape') {
			isEditing = false;
			editedName = folder.name;
		}
	}

	function startNewNote() {
		showMenu = false;
		isOpen = true;
		isCreatingNoteInside = true;
		newChildName = '';
		setTimeout(() => childInputEl?.focus(), 20);
	}

	function startNewSubfolder() {
		showMenu = false;
		isOpen = true;
		isCreatingSubfolder = true;
		newChildName = '';
		setTimeout(() => childInputEl?.focus(), 20);
	}

	async function submitCreateChild() {
		const trimmed = newChildName.trim();
		if (isCreatingNoteInside) {
			isCreatingNoteInside = false;
			await notesStore.createNewNote(trimmed || undefined, folder.id);
		} else if (isCreatingSubfolder) {
			isCreatingSubfolder = false;
			if (trimmed) {
				await notesStore.createNewFolder(trimmed, folder.id);
			}
		}
		newChildName = '';
	}

	function cancelCreateChild() {
		isCreatingNoteInside = false;
		isCreatingSubfolder = false;
		newChildName = '';
	}
</script>

<div class="tree-folder-wrapper" data-testid="tree-folder-{folder.id}">
	<div
		class="tree-folder-row"
		style="padding-left: {0.5 + depth * 0.875}rem"
		onclick={toggleOpen}
		oncontextmenu={handleContextMenu}
		role="button"
		tabindex="0"
		aria-expanded={isOpen}
	>
		<!-- Expand / Collapse chevron -->
		<button
			type="button"
			class="chevron-btn {isOpen ? 'open' : ''}"
			onclick={(e) => {
				e.stopPropagation();
				isOpen = !isOpen;
			}}
			aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="9 18 15 12 9 6" />
			</svg>
		</button>

		<!-- Folder Icon -->
		<div class="folder-icon">
			{#if isOpen}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
				</svg>
			{/if}
		</div>

		{#if isEditing}
			<!-- svelte-ignore a11y_autofocus -->
			<input
				bind:this={inputEl}
				type="text"
				class="rename-input"
				bind:value={editedName}
				onblur={submitRename}
				onkeydown={handleKeyDown}
				onclick={(e) => e.stopPropagation()}
			/>
		{:else}
			<span class="folder-name" title={folder.name}>{folder.name}</span>
		{/if}

		<div class="folder-hover-actions">
			<button
				type="button"
				class="icon-action-btn"
				title="New note inside"
				onclick={(e) => {
					e.stopPropagation();
					startNewNote();
				}}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</button>

			<button
				type="button"
				class="icon-action-btn"
				title="Folder actions"
				onclick={(e) => {
					e.stopPropagation();
					showMenu = !showMenu;
				}}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="1" />
					<circle cx="12" cy="5" r="1" />
					<circle cx="12" cy="19" r="1" />
				</svg>
			</button>
		</div>

		{#if showMenu}
			<div
				class="context-menu-backdrop"
				onclick={(e) => {
					e.stopPropagation();
					showMenu = false;
				}}
				role="presentation"
			></div>
			<div class="context-menu" role="menu">
				<button
					type="button"
					class="menu-item"
					role="menuitem"
					onclick={(e) => {
						e.stopPropagation();
						startNewNote();
					}}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					<span>New Note</span>
				</button>

				<button
					type="button"
					class="menu-item"
					role="menuitem"
					onclick={(e) => {
						e.stopPropagation();
						startNewSubfolder();
					}}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
						<line x1="12" y1="11" x2="12" y2="17" />
						<line x1="9" y1="14" x2="15" y2="14" />
					</svg>
					<span>New Subfolder</span>
				</button>

				<button
					type="button"
					class="menu-item"
					role="menuitem"
					onclick={(e) => {
						e.stopPropagation();
						startRenaming();
					}}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M12 20h9" />
						<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
					</svg>
					<span>Rename Folder</span>
				</button>

				<div class="menu-divider"></div>

				<button
					type="button"
					class="menu-item danger"
					role="menuitem"
					onclick={(e) => {
						e.stopPropagation();
						showMenu = false;
						onPromptDeleteFolder(folder);
					}}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
					<span>Delete Folder...</span>
				</button>
			</div>
		{/if}
	</div>

	<!-- Children subtree container with guide lines -->
	{#if isOpen}
		<div class="folder-children" style="--guide-left: {1.1 + depth * 0.875}rem">
			<!-- Inline input for creating note inside this folder -->
			{#if isCreatingNoteInside || isCreatingSubfolder}
				<div class="inline-creation-row" style="padding-left: {0.5 + (depth + 1) * 0.875}rem">
					<div class="creation-icon">
						{#if isCreatingSubfolder}
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
						bind:this={childInputEl}
						type="text"
						class="inline-input"
						placeholder={isCreatingSubfolder ? 'Folder name...' : 'Note title...'}
						bind:value={newChildName}
						onblur={submitCreateChild}
						onkeydown={(e) => {
							if (e.key === 'Enter') submitCreateChild();
							if (e.key === 'Escape') cancelCreateChild();
						}}
					/>
				</div>
			{/if}

			<!-- Subfolders -->
			{#each childFolders as subfolder (subfolder.id)}
				<TreeFolder
					folder={subfolder}
					depth={depth + 1}
					{allFolders}
					{allNotes}
					{isCollapsedAll}
					{onSelectNote}
					{onSplitOpenNote}
					{onPromptDeleteFolder}
				/>
			{/each}

			<!-- Notes inside folder -->
			{#each childNotes as note (note.id)}
				<TreeFile
					{note}
					depth={depth + 1}
					{onSelectNote}
					{onSplitOpenNote}
				/>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tree-folder-wrapper {
		display: flex;
		flex-direction: column;
	}

	.tree-folder-row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		height: 28px;
		padding-right: 0.5rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.8125rem;
		color: var(--text-secondary);
		user-select: none;
		transition: background-color 0.12s ease, color 0.12s ease;
	}

	.tree-folder-row:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.chevron-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		padding: 0;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		transition: transform 0.15s ease;
	}

	.chevron-btn.open {
		transform: rotate(90deg);
	}

	.chevron-btn svg {
		width: 12px;
		height: 12px;
	}

	.folder-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		color: var(--primary);
		flex-shrink: 0;
	}

	.folder-icon svg {
		width: 13px;
		height: 13px;
	}

	.folder-name {
		flex: 1;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1;
	}

	.rename-input {
		flex: 1;
		height: 20px;
		padding: 0 0.25rem;
		font-size: 0.8125rem;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-focus);
		border-radius: var(--radius-sm);
		outline: none;
	}

	.folder-hover-actions {
		display: none;
		align-items: center;
		gap: 0.125rem;
	}

	.tree-folder-row:hover .folder-hover-actions {
		display: flex;
	}

	.icon-action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: var(--radius-sm);
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
	}

	.icon-action-btn:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.icon-action-btn svg {
		width: 12px;
		height: 12px;
	}

	.folder-children {
		position: relative;
		display: flex;
		flex-direction: column;
	}

	/* Subtle indentation guide line */
	.folder-children::before {
		content: '';
		position: absolute;
		left: var(--guide-left, 1rem);
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--border-subtle);
		opacity: 0.7;
	}

	.inline-creation-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		height: 28px;
		padding-right: 0.5rem;
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
		width: 12px;
		height: 12px;
	}

	.inline-input {
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

	.context-menu-backdrop {
		position: fixed;
		inset: 0;
		z-index: 110;
	}

	.context-menu {
		position: absolute;
		top: 100%;
		right: 0.5rem;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
		z-index: 111;
		min-width: 150px;
		padding: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.menu-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		width: 100%;
	}

	.menu-item:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.menu-item svg {
		width: 13px;
		height: 13px;
	}

	.menu-item.danger {
		color: var(--danger, #ef4444);
	}

	.menu-item.danger:hover {
		background: color-mix(in srgb, var(--danger, #ef4444) 10%, transparent);
	}

	.menu-divider {
		height: 1px;
		background: var(--border-subtle);
		margin: 0.125rem 0;
	}
</style>
