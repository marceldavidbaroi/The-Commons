<script lang="ts">
	import type { NoteStub } from '$lib/types/notes';
	import { notesStore } from '$lib/state/notes.svelte';

	let {
		note,
		depth = 0,
		onSelectNote,
		onSplitOpenNote
	} = $props<{
		note: NoteStub;
		depth?: number;
		onSelectNote: (id: string) => void;
		onSplitOpenNote?: (id: string) => void;
	}>();

	let isEditing = $state<boolean>(false);
	let editedTitle = $state<string>(note.title);
	let showMenu = $state<boolean>(false);
	let inputEl = $state<HTMLInputElement | null>(null);

	// Check if this note is currently active in the active pane
	const isActive = $derived(
		notesStore.activeTab?.type === 'note' && notesStore.activeTab.noteId === note.id
	);

	function handleClick(e: MouseEvent) {
		if (isEditing) return;

		// Alt/Cmd+Click triggers split pane
		if (e.altKey || e.metaKey || e.ctrlKey) {
			e.preventDefault();
			if (onSplitOpenNote) {
				onSplitOpenNote(note.id);
			} else {
				notesStore.splitPaneRight(note.id);
			}
		} else {
			onSelectNote(note.id);
		}
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		showMenu = !showMenu;
	}

	function startRenaming() {
		showMenu = false;
		editedTitle = note.title;
		isEditing = true;
		setTimeout(() => {
			inputEl?.focus();
			inputEl?.select();
		}, 20);
	}

	async function submitRename() {
		if (!isEditing) return;
		isEditing = false;
		const trimmed = editedTitle.trim();
		if (trimmed && trimmed !== note.title) {
			await notesStore.renameNote(note.id, trimmed);
		} else {
			editedTitle = note.title;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			submitRename();
		} else if (e.key === 'Escape') {
			isEditing = false;
			editedTitle = note.title;
		}
	}

	async function handleDelete() {
		showMenu = false;
		await notesStore.deleteNote(note.id);
	}
</script>

<div
	class="tree-file-row {isActive ? 'active' : ''}"
	style="padding-left: {0.5 + depth * 0.875}rem"
	onclick={handleClick}
	oncontextmenu={handleContextMenu}
	role="button"
	tabindex="0"
	aria-selected={isActive}
	data-testid="tree-note-{note.id}"
>
	<div class="note-icon">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
			<line x1="16" y1="13" x2="8" y2="13" />
			<line x1="16" y1="17" x2="8" y2="17" />
		</svg>
	</div>

	{#if isEditing}
		<!-- svelte-ignore a11y_autofocus -->
		<input
			bind:this={inputEl}
			type="text"
			class="rename-input"
			bind:value={editedTitle}
			onblur={submitRename}
			onkeydown={handleKeyDown}
			onclick={(e) => e.stopPropagation()}
		/>
	{:else}
		<span class="note-title" title={note.title}>{note.title}</span>
	{/if}

	<div class="file-hover-actions">
		<button
			type="button"
			class="icon-action-btn"
			title="Split view"
			onclick={(e) => {
				e.stopPropagation();
				notesStore.splitPaneRight(note.id);
			}}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="3" width="18" height="18" rx="2" />
				<line x1="12" y1="3" x2="12" y2="21" />
			</svg>
		</button>

		<button
			type="button"
			class="icon-action-btn"
			title="More options"
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
					startRenaming();
				}}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M12 20h9" />
					<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
				</svg>
				<span>Rename Note</span>
			</button>

			<button
				type="button"
				class="menu-item"
				role="menuitem"
				onclick={(e) => {
					e.stopPropagation();
					showMenu = false;
					notesStore.splitPaneRight(note.id);
				}}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<line x1="12" y1="3" x2="12" y2="21" />
				</svg>
				<span>Open to the Right</span>
			</button>

			<div class="menu-divider"></div>

			<button
				type="button"
				class="menu-item danger"
				role="menuitem"
				onclick={(e) => {
					e.stopPropagation();
					handleDelete();
				}}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="3 6 5 6 21 6" />
					<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
				</svg>
				<span>Move to Trash</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.tree-file-row {
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

	.tree-file-row:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.tree-file-row.active {
		background-color: var(--bg-surface);
		color: var(--primary);
		font-weight: 500;
	}

	.note-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.tree-file-row.active .note-icon {
		color: var(--primary);
	}

	.note-icon svg {
		width: 13px;
		height: 13px;
	}

	.note-title {
		flex: 1;
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

	.file-hover-actions {
		display: none;
		align-items: center;
		gap: 0.125rem;
	}

	.tree-file-row:hover .file-hover-actions {
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
