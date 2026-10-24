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
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children } = $props<{ children?: Snippet }>();

	let explorerOpen = $state<boolean>(true);

	onMount(() => {
		// Initialize vault notes, folders, and connections
		notesStore.initialize();

		// Keyboard shortcut handler for Cmd/Ctrl+P, Cmd/Ctrl+O, Cmd/Ctrl+B
		function handleGlobalKeydown(e: KeyboardEvent) {
			const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
			const modifier = isMac ? e.metaKey : e.ctrlKey;

			if (modifier && (e.key === 'p' || e.key === 'P' || e.key === 'o' || e.key === 'O')) {
				e.preventDefault();
				notesStore.commandPaletteOpen = !notesStore.commandPaletteOpen;
			} else if (modifier && (e.key === 'b' || e.key === 'B')) {
				e.preventDefault();
				explorerOpen = !explorerOpen;
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

		<!-- 2. Explorer Collapsible Sidebar -->
		{#if explorerOpen}
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

	<!-- 4. Bottom Status Bar (24px) -->
	<StatusBar />

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
		height: calc(100vh - 49px); /* Subtract top app header */
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
</style>
