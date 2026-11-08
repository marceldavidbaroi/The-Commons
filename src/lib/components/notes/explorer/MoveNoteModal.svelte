opt<script lang="ts">
	import { fade, scale } from "svelte/transition";
	import { cubicOut } from "svelte/easing";
	import type { FolderRecord } from "$lib/types/notes";

	let {
		isOpen = false,
		noteTitle = "",
		currentFolderId = null,
		folders = [],
		onCancel,
		onConfirm,
	} = $props<{
		isOpen: boolean;
		noteTitle?: string;
		currentFolderId?: string | null;
		folders: FolderRecord[];
		onCancel: () => void;
		onConfirm: (targetFolderId: string | null) => void;
	}>();

	// Navigation state: current directory being viewed in the file manager
	let currentNavFolderId = $state<string | null>(null);
	// Single-click selection for the destination
	let selectedTargetFolderId = $state<string | null>(null);
	let searchQuery = $state<string>("");

	$effect(() => {
		if (isOpen) {
			searchQuery = "";
			// Default viewed location to the note's current folder or root
			currentNavFolderId = currentFolderId ?? null;
			// Default selection to current folder
			selectedTargetFolderId = currentFolderId ?? null;
		}
	});

	// Breadcrumb path from Root down to currentNavFolderId
	const breadcrumbs = $derived.by<{ id: string | null; name: string }[]>(
		() => {
			const crumbs: { id: string | null; name: string }[] = [
				{ id: null, name: "Root" },
			];
			if (!currentNavFolderId) return crumbs;

			const chain: { id: string; name: string }[] = [];
			let currId: string | null = currentNavFolderId;
			while (currId) {
				const folder = folders.find(
					(f: FolderRecord) => f.id === currId,
				);
				if (!folder) break;
				chain.unshift({ id: folder.id, name: folder.name });
				currId = folder.parent_id;
			}
			return [...crumbs, ...chain];
		},
	);

	// Items to show in file manager view
	// When searching: flat search across all folders
	// When browsing: items inside currentNavFolderId
	const visibleFolders = $derived.by<FolderRecord[]>(() => {
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			return folders.filter((f: FolderRecord) =>
				f.name.toLowerCase().includes(q),
			);
		}
		return folders.filter(
			(f: FolderRecord) => f.parent_id === currentNavFolderId,
		);
	});

	// Current folder object
	const activeNavFolder = $derived(
		currentNavFolderId
			? folders.find((f: FolderRecord) => f.id === currentNavFolderId) ||
					null
			: null,
	);

	function navigateUp() {
		if (!currentNavFolderId) return;
		const curr = folders.find(
			(f: FolderRecord) => f.id === currentNavFolderId,
		);
		currentNavFolderId = curr ? curr.parent_id : null;
		selectedTargetFolderId = currentNavFolderId;
	}

	function handleFolderClick(folderId: string) {
		// Single click: select destination folder
		selectedTargetFolderId = folderId;
	}

	function handleFolderDblClick(folderId: string) {
		// Double click: open folder into file manager
		currentNavFolderId = folderId;
		selectedTargetFolderId = folderId;
		searchQuery = "";
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.preventDefault();
			onCancel();
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (selectedTargetFolderId !== currentFolderId) {
				onConfirm(selectedTargetFolderId);
			}
		} else if (
			e.key === "Backspace" &&
			(e.target as HTMLElement)?.tagName !== "INPUT"
		) {
			if (currentNavFolderId) {
				e.preventDefault();
				navigateUp();
			}
		}
	}
</script>

<svelte:window onkeydown={isOpen ? handleKeyDown : undefined} />

{#if isOpen}
	<div
		class="modal-backdrop"
		onclick={onCancel}
		role="presentation"
		transition:fade={{ duration: 180, easing: cubicOut }}
	></div>

	<div
		class="move-note-modal"
		role="dialog"
		aria-labelledby="move-note-title"
		aria-modal="true"
		transition:scale={{
			start: 0.95,
			duration: 220,
			opacity: 0,
			easing: cubicOut,
		}}
	>
		<!-- Modal Header -->
		<div class="modal-header">
			<div class="header-icon">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
					/>
					<line x1="12" y1="11" x2="12" y2="17" />
					<line x1="9" y1="14" x2="15" y2="14" />
				</svg>
			</div>
			<div class="header-text">
				<h3 id="move-note-title" class="modal-title">Move Note</h3>
				<span class="note-name-tag"
					>"{noteTitle || "Selected Note"}"</span
				>
			</div>
		</div>

		<!-- File Manager Toolbar / Breadcrumb Bar -->
		<div class="fm-toolbar">
			<button
				type="button"
				class="nav-btn"
				title="Go to parent folder"
				disabled={currentNavFolderId === null}
				onclick={navigateUp}
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<line x1="19" y1="12" x2="5" y2="12" />
					<polyline points="12 19 5 12 12 5" />
				</svg>
			</button>

			<!-- Breadcrumbs Path -->
			<div class="breadcrumbs-container">
				{#each breadcrumbs as crumb, idx}
					{#if idx > 0}
						<span class="crumb-separator">/</span>
					{/if}
					<button
						type="button"
						class="crumb-btn"
						class:active={crumb.id === currentNavFolderId}
						onclick={() => {
							currentNavFolderId = crumb.id;
							selectedTargetFolderId = crumb.id;
							searchQuery = "";
						}}
					>
						{crumb.name}
					</button>
				{/each}
			</div>

			<!-- Select Current Folder CTA if inside a directory -->
			<button
				type="button"
				class="select-this-folder-btn"
				class:selected={selectedTargetFolderId === currentNavFolderId}
				onclick={() => (selectedTargetFolderId = currentNavFolderId)}
				title="Select this open folder as destination"
			>
				{selectedTargetFolderId === currentNavFolderId
					? "✓ Target"
					: "Select here"}
			</button>
		</div>

		<!-- Search filter -->
		<div class="search-input-wrapper">
			<svg
				class="search-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<input
				type="text"
				class="folder-search-input"
				placeholder="Search all folders..."
				bind:value={searchQuery}
			/>
		</div>

		<!-- File Manager File/Folder Canvas -->
		<div class="fm-viewport" role="listbox">
			{#if !searchQuery.trim()}
				<!-- Option to select Root directly when browsing root -->
				{#if currentNavFolderId === null}
					{@const isSelected = selectedTargetFolderId === null}
					{@const isCurrent = currentFolderId === null}
					<div
						class="fm-row"
						class:selected={isSelected}
						class:current={isCurrent}
						role="option"
						aria-selected={isSelected}
						onclick={() => (selectedTargetFolderId = null)}
					>
						<div class="row-icon root-icon">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
								/>
								<polyline points="9 22 9 12 15 12 15 22" />
							</svg>
						</div>
						<div class="row-info">
							<span class="row-name">Root Directory</span>
							<span class="row-hint">Place at top-level</span>
						</div>
						{#if isCurrent}
							<span class="badge current-badge"
								>Current location</span
							>
						{/if}
					</div>
				{/if}
			{/if}

			{#if visibleFolders.length === 0}
				<div class="empty-folder-state">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
					>
						<path
							d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
						/>
					</svg>
					<span
						>{searchQuery
							? "No matching folders"
							: "This folder is empty"}</span
					>
				</div>
			{:else}
				{#each visibleFolders as folder (folder.id)}
					{@const isSelected = selectedTargetFolderId === folder.id}
					{@const isCurrent = currentFolderId === folder.id}
					<div
						class="fm-row"
						class:selected={isSelected}
						class:current={isCurrent}
						role="option"
						aria-selected={isSelected}
						onclick={() => handleFolderClick(folder.id)}
						ondblclick={() => handleFolderDblClick(folder.id)}
					>
						<div class="row-icon folder-icon">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
								/>
							</svg>
						</div>

						<div class="row-info">
							<span class="row-name">{folder.name}</span>
							{#if searchQuery}
								<span class="row-hint">Direct match</span>
							{:else}
								<span class="row-hint"
									>Double-click to open</span
								>
							{/if}
						</div>

						{#if isCurrent}
							<span class="badge current-badge">Current</span>
						{/if}

						<button
							type="button"
							class="row-open-btn"
							title="Open folder"
							onclick={(e) => {
								e.stopPropagation();
								handleFolderDblClick(folder.id);
							}}
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</button>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Footer selection preview and Actions -->
		<div class="modal-footer">
			<div class="destination-summary">
				<span class="dest-label">Destination:</span>
				<span class="dest-target">
					{#if selectedTargetFolderId === null}
						📁 Root
					{:else}
						{@const dest = folders.find(
							(f: FolderRecord) =>
								f.id === selectedTargetFolderId,
						)}
						📁 {dest ? dest.name : "Unknown"}
					{/if}
				</span>
			</div>

			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-secondary"
					onclick={onCancel}
				>
					Cancel
				</button>
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => onConfirm(selectedTargetFolderId)}
					disabled={selectedTargetFolderId === currentFolderId}
				>
					Move Note Here
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(31, 28, 25, 0.45);
		z-index: 120;
	}

	.move-note-modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 92%;
		max-width: 520px;
		background: var(--bg-secondary);
		border-radius: var(--radius-md);
		box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
		z-index: 121;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		border: 1px solid var(--border-subtle);
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.header-icon {
		width: 34px;
		height: 34px;
		border-radius: var(--radius-sm);
		background: rgba(var(--primary-rgb, 120, 100, 220), 0.12);
		color: var(--primary);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.header-icon svg {
		width: 18px;
		height: 18px;
	}

	.header-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.modal-title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.note-name-tag {
		font-size: 0.8125rem;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* File Manager Toolbar / Breadcrumb */
	.fm-toolbar {
		display: flex;
		align-items: center;
		gap: 6px;
		background: var(--bg-primary);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
	}

	.nav-btn {
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.12s ease;
	}

	.nav-btn:hover:not(:disabled) {
		background: var(--bg-secondary);
		border-color: var(--border-medium);
	}

	.nav-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.nav-btn svg {
		width: 14px;
		height: 14px;
	}

	.breadcrumbs-container {
		display: flex;
		align-items: center;
		gap: 3px;
		flex: 1;
		overflow-x: auto;
		white-space: nowrap;
		font-size: 0.78125rem;
		scrollbar-width: none;
	}

	.breadcrumbs-container::-webkit-scrollbar {
		display: none;
	}

	.crumb-separator {
		color: var(--text-muted);
		opacity: 0.6;
	}

	.crumb-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		padding: 2px 4px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: inherit;
		transition: all 0.1s ease;
	}

	.crumb-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.crumb-btn.active {
		font-weight: 600;
		color: var(--primary);
	}

	.select-this-folder-btn {
		font-size: 0.72rem;
		padding: 3px 8px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.12s ease;
	}

	.select-this-folder-btn:hover {
		color: var(--text-primary);
		background: var(--bg-secondary);
	}

	.select-this-folder-btn.selected {
		background: rgba(var(--primary-rgb, 120, 100, 220), 0.15);
		color: var(--primary);
		border-color: var(--primary);
		font-weight: 500;
	}

	/* Search bar */
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

	.folder-search-input {
		width: 100%;
		height: 32px;
		padding: 0 0.625rem 0 2rem;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		font-size: 0.8125rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.folder-search-input:focus {
		border-color: var(--primary);
	}

	/* File Manager Viewport */
	.fm-viewport {
		min-height: 220px;
		max-height: 260px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 6px;
	}

	.fm-row {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.625rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition:
			background-color 0.12s ease,
			border-color 0.12s ease;
		user-select: none;
		border: 1px solid transparent;
	}

	.fm-row:hover {
		background: var(--bg-tertiary);
	}

	.fm-row.selected {
		background: rgba(var(--primary-rgb, 120, 100, 220), 0.12);
		border-color: rgba(var(--primary-rgb, 120, 100, 220), 0.35);
	}

	.row-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		background: var(--bg-secondary);
		color: var(--primary);
		flex-shrink: 0;
	}

	.row-icon svg {
		width: 16px;
		height: 16px;
	}

	.row-icon.root-icon {
		color: var(--text-secondary);
	}

	.row-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.row-name {
		font-size: 0.84rem;
		font-weight: 500;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row-hint {
		font-size: 0.72rem;
		color: var(--text-muted);
	}

	.row-open-btn {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		cursor: pointer;
		flex-shrink: 0;
		opacity: 0.5;
		transition: all 0.12s ease;
	}

	.fm-row:hover .row-open-btn {
		opacity: 1;
	}

	.row-open-btn:hover {
		background: var(--bg-secondary);
		color: var(--primary);
	}

	.row-open-btn svg {
		width: 14px;
		height: 14px;
	}

	.current-badge {
		font-size: 0.6875rem;
		padding: 2px 6px;
		border-radius: 3px;
		background: var(--bg-tertiary);
		color: var(--text-muted);
		border: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.empty-folder-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 180px;
		color: var(--text-muted);
		font-size: 0.8125rem;
	}

	.empty-folder-state svg {
		width: 28px;
		height: 28px;
		opacity: 0.4;
	}

	/* Footer */
	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 0.25rem;
	}

	.destination-summary {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8125rem;
		min-width: 0;
	}

	.dest-label {
		color: var(--text-muted);
	}

	.dest-target {
		font-weight: 600;
		color: var(--primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.btn {
		font-size: 0.8125rem;
		font-weight: 500;
		padding: 0.45rem 0.875rem;
		border-radius: var(--radius-sm);
		border: none;
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.btn-secondary {
		background: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
	}

	.btn-secondary:hover {
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	.btn-primary {
		background: var(--primary);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		opacity: 0.9;
	}

	.btn-primary:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
