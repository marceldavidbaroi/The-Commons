<script lang="ts">
	import { onMount } from 'svelte';
	import { notesStore } from '$lib/state/notes.svelte';
	import ActivityRibbon from '$lib/components/notes/workspace/ActivityRibbon.svelte';
	import FileTree from '$lib/components/notes/explorer/FileTree.svelte';
	import WorkspaceGrid from '$lib/components/notes/workspace/WorkspaceGrid.svelte';
	import StatusBar from '$lib/components/notes/workspace/StatusBar.svelte';
	import CommandPalette from '$lib/components/notes/workspace/CommandPalette.svelte';
	import RecycleBinDrawer from '$lib/components/notes/trash/RecycleBinDrawer.svelte';
	import DeleteFolderModal from '$lib/components/notes/explorer/DeleteFolderModal.svelte';
	import ContextDock from '$lib/components/notes/dock/ContextDock.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children } = $props<{ children?: Snippet }>();

	let explorerOpen = $state<boolean>(true);
	let lastActiveNoteId = $state<string | null>(null);
	let initialized = $state<boolean>(false);

	const isGraphRoute = $derived(page.url.pathname.includes('/notes/graph'));

	$effect(() => {
		const currentId =
			notesStore.activeTab?.type === 'note' ? (notesStore.activeTab.noteId ?? null) : null;
		if (currentId !== lastActiveNoteId) {
			lastActiveNoteId = currentId;
			if (typeof window !== 'undefined' && window.innerWidth <= 768 && currentId) {
				explorerOpen = false;
			}
		}

		if (initialized && !isGraphRoute) {
			const urlNoteId = page.url.searchParams.get('note');
			if (urlNoteId !== currentId) {
				const url = new URL(page.url);
				if (currentId) {
					url.searchParams.set('note', currentId);
				} else {
					url.searchParams.delete('note');
				}
				goto(url, { replaceState: true, keepFocus: true, noScroll: true });
			}
		}
	});

	onMount(() => {
		if (window.innerWidth <= 768) {
			explorerOpen = false;
		}

		const initialNoteId = page.url.searchParams.get('note');

		// Initialize vault notes, folders, and connections
		notesStore.initialize().then(() => {
			if (initialNoteId && notesStore.notes.some((n) => n.id === initialNoteId)) {
				notesStore.openNoteInActivePane(initialNoteId);
			}
			initialized = true;
		});

		// Keyboard shortcut handler for Cmd/Ctrl+P, Cmd/Ctrl+O
		function handleGlobalKeydown(e: KeyboardEvent) {
			const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
			const modifier = isMac ? e.metaKey : e.ctrlKey;

			if (modifier && (e.key === 'p' || e.key === 'P' || e.key === 'o' || e.key === 'O')) {
				e.preventDefault();
				notesStore.commandPaletteOpen = !notesStore.commandPaletteOpen;
			} else if (e.key === 'Escape') {
				if (notesStore.commandPaletteOpen) {
					notesStore.commandPaletteOpen = false;
				}
				if (notesStore.recycleBinOpen) {
					notesStore.recycleBinOpen = false;
				}
				if (notesStore.deleteFolderModalOpen) {
					notesStore.deleteFolderModalOpen = false;
				}
			}
		}

		window.addEventListener('keydown', handleGlobalKeydown);
		return () => {
			window.removeEventListener('keydown', handleGlobalKeydown);
		};
	});

	function toggleExplorer() {
		explorerOpen = !explorerOpen;
	}

	async function confirmDeleteFolder(cascadeChildren: boolean) {
		if (!notesStore.pendingFolderToDelete) return;
		await notesStore.deleteFolder(notesStore.pendingFolderToDelete.id, cascadeChildren);
	}
</script>

<div class="notes-shell">
	<!-- Main 4-Tier Interactive Layout Body -->
	<div class="shell-body">
		<!-- 1. Activity Ribbon (44px) -->
		<ActivityRibbon
			{explorerOpen}
			onToggleExplorer={toggleExplorer}
		/>

		<!-- 2. Explorer Collapsible Sidebar / Mobile Drawer -->
		{#if explorerOpen}
			<button
				type="button"
				class="mobile-drawer-backdrop"
				aria-label="Close Explorer"
				onclick={() => (explorerOpen = false)}
			></button>
			<div class="explorer-panel">
				<FileTree />
			</div>
		{/if}

		<!-- 3. Center Workspace Area (Split Grid or nested route children) -->
		<div class="workspace-area">
			{#if children}
				{@render children()}
			{:else}
				<WorkspaceGrid />
			{/if}
		</div>

		<!-- 4. Context Dock / Inspector (Backlinks, Outgoing, Local Graph) -->
		{#if !page.url.pathname.includes('/notes/graph')}
			<ContextDock />
		{/if}
	</div>

	<!-- 4. Bottom Status Bar (24px desktop) -->
	<StatusBar />

	<!-- Mobile Bottom Action Bar (<= 768px) -->
	<nav class="mobile-bottom-bar" aria-label="Notes Mobile Actions">
		<button
			type="button"
			class="mobile-bar-btn"
			class:active={explorerOpen}
			aria-label="Files & Folders"
			onclick={toggleExplorer}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mobile-bar-icon">
				<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
			</svg>
			<span>Files</span>
		</button>

		<button
			type="button"
			class="mobile-bar-btn"
			aria-label="Quick Switcher"
			onclick={() => (notesStore.commandPaletteOpen = true)}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mobile-bar-icon">
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<span>Search</span>
		</button>

		<button
			type="button"
			class="mobile-bar-btn"
			aria-label="New Note"
			onclick={() => {
				if (isGraphRoute) goto('/notes');
				notesStore.createNewNote();
			}}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mobile-bar-icon">
				<path d="M12 5v14" />
				<path d="M5 12h14" />
			</svg>
			<span>New</span>
		</button>

		<button
			type="button"
			class="mobile-bar-btn"
			class:active={isGraphRoute}
			aria-label="Graph View"
			onclick={() => goto(isGraphRoute ? '/notes' : '/notes/graph')}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mobile-bar-icon">
				<circle cx="6" cy="6" r="3" />
				<circle cx="18" cy="18" r="3" />
				<circle cx="18" cy="6" r="3" />
				<circle cx="6" cy="18" r="3" />
				<line x1="8.5" y1="7.5" x2="15.5" y2="16.5" />
				<line x1="8.5" y1="16.5" x2="15.5" y2="7.5" />
			</svg>
			<span>Graph</span>
		</button>

		{#if !isGraphRoute}
			<button
				type="button"
				class="mobile-bar-btn"
				class:active={notesStore.contextDockOpen}
				aria-label="Inspector"
				onclick={() => (notesStore.contextDockOpen = !notesStore.contextDockOpen)}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mobile-bar-icon">
					<rect width="18" height="18" x="3" y="3" rx="2" />
					<path d="M15 3v18" />
				</svg>
				<span>Links</span>
			</button>
		{/if}

		<button
			type="button"
			class="mobile-bar-btn"
			class:active={notesStore.recycleBinOpen}
			aria-label="Recycle Bin"
			onclick={() => (notesStore.recycleBinOpen = true)}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mobile-bar-icon">
				<path d="M3 6h18" />
				<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
				<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
			</svg>
			<span>Trash</span>
		</button>
	</nav>

	<!-- Modals and Overlays -->
	<CommandPalette
		isOpen={notesStore.commandPaletteOpen}
		onClose={() => (notesStore.commandPaletteOpen = false)}
	/>

	<RecycleBinDrawer
		isOpen={notesStore.recycleBinOpen}
		onClose={() => (notesStore.recycleBinOpen = false)}
	/>

	<DeleteFolderModal
		isOpen={notesStore.deleteFolderModalOpen}
		folderName={notesStore.pendingFolderToDelete?.name || ''}
		onConfirm={confirmDeleteFolder}
		onCancel={() => {
			notesStore.deleteFolderModalOpen = false;
			notesStore.pendingFolderToDelete = null;
		}}
	/>
</div>

<style>
	.notes-shell {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		width: 100%;
		overflow: hidden;
		background: var(--bg-primary);
	}

	.shell-body {
		display: flex;
		flex-direction: row;
		flex: 1 1 0%;
		min-height: 0;
		overflow: hidden;
		position: relative;
	}

	.explorer-panel {
		width: 260px;
		min-width: 220px;
		max-width: 380px;
		height: 100%;
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		flex-shrink: 0;
	}

	.workspace-area {
		flex: 1 1 0%;
		min-width: 0;
		height: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: var(--bg-secondary);
	}

	.mobile-drawer-backdrop,
	.mobile-bottom-bar {
		display: none;
	}

	@media (max-width: 768px) {
		.notes-shell {
			height: calc(100dvh - 48px);
		}

		.mobile-drawer-backdrop {
			display: block;
			position: fixed;
			inset: 48px 0 0 0;
			background: rgba(0, 0, 0, 0.35);
			z-index: 40;
			border: none;
			padding: 0;
			cursor: pointer;
		}

		.explorer-panel {
			position: fixed;
			top: 48px;
			left: 0;
			bottom: calc(50px + env(safe-area-inset-bottom, 0px));
			width: min(300px, 85vw);
			min-width: 0;
			max-width: none;
			height: auto;
			z-index: 45;
			box-shadow: 4px 0 16px rgba(0, 0, 0, 0.15);
		}

		.mobile-bottom-bar {
			display: flex;
			align-items: center;
			justify-content: space-around;
			height: calc(50px + env(safe-area-inset-bottom, 0px));
			padding: 0 4px env(safe-area-inset-bottom, 0px);
			background: var(--bg-tertiary);
			border-top: 1px solid var(--border-subtle);
			flex-shrink: 0;
			z-index: 35;
		}

		.mobile-bar-btn {
			min-width: 44px;
			height: 44px;
			display: inline-flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 2px;
			border: none;
			background: transparent;
			color: var(--text-secondary);
			border-radius: var(--radius-sm);
			cursor: pointer;
			font-size: 10px;
			padding: 0 6px;
		}

		.mobile-bar-btn.active {
			color: var(--primary);
		}

		.mobile-bar-icon {
			width: 18px;
			height: 18px;
		}
	}
</style>
