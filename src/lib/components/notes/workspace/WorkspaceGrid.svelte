<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import PaneContainer from './PaneContainer.svelte';
</script>

<div class="workspace-grid" role="main" aria-label="Notes Workspace Panes">
	{#if notesStore.panes.length === 0}
		<div class="empty-workspace">
			<p>No active panes.</p>
		</div>
	{:else}
		{#each notesStore.panes as pane (pane.id)}
			<PaneContainer {pane} />
		{/each}
	{/if}
</div>

<style>
	.workspace-grid {
		display: flex;
		flex-direction: row;
		flex: 1 1 0%;
		height: 100%;
		overflow: hidden;
		background: var(--bg-secondary);
	}

	.empty-workspace {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		color: var(--text-muted);
	}
</style>
