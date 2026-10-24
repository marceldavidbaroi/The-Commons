<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import GraphView from '../graph/GraphView.svelte';

	let activeNote = $derived(notesStore.activeNote);
	let localDepth = $state<number>(1);
	let isCollapsed = $state<boolean>(false);

	// Compute scoped local graph data for active note
	let localGraph = $derived.by(() => {
		if (!activeNote) return { nodes: [], edges: [] };
		return notesStore.getLocalGraphData(activeNote.id, localDepth);
	});
</script>

<div class="panel-section">
	<div class="section-header">
		<button
			type="button"
			class="header-toggle"
			onclick={() => (isCollapsed = !isCollapsed)}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="chevron-icon"
				class:rotated={isCollapsed}
			>
				<polyline points="6 9 12 15 18 9" />
			</svg>
			<span class="header-title">Local Graph</span>
		</button>

		<div class="depth-selector">
			<span class="depth-label">Hops:</span>
			{#each [1, 2, 3] as d}
				<button
					type="button"
					class="depth-btn"
					class:active={localDepth === d}
					onclick={() => (localDepth = d)}
				>
					{d}
				</button>
			{/each}
		</div>
	</div>

	{#if !isCollapsed}
		<div class="mini-graph-container">
			{#if !activeNote}
				<div class="mini-empty-state">
					<span>No active note selected</span>
				</div>
			{:else}
				<GraphView
					nodes={localGraph.nodes}
					edges={localGraph.edges}
					highlightNodeId={activeNote.id}
					isMini={true}
				/>
			{/if}
		</div>
	{/if}
</div>

<style>
	.panel-section {
		display: flex;
		flex-direction: column;
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		gap: 6px;
		user-select: none;
	}

	.header-toggle {
		display: flex;
		align-items: center;
		gap: 6px;
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--text-secondary);
		padding: 0;
	}

	.header-toggle:hover {
		color: var(--text-primary);
	}

	.chevron-icon {
		width: 14px;
		height: 14px;
		transition: transform 0.15s ease;
	}

	.chevron-icon.rotated {
		transform: rotate(-90deg);
	}

	.header-title {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.depth-selector {
		display: flex;
		align-items: center;
		gap: 3px;
	}

	.depth-label {
		font-size: 10px;
		color: var(--text-muted);
		margin-right: 2px;
	}

	.depth-btn {
		width: 18px;
		height: 18px;
		font-size: 10px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.1s ease, color 0.1s ease;
	}

	.depth-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.depth-btn.active {
		background: var(--primary);
		color: #ffffff;
		border-color: var(--primary);
	}

	.mini-graph-container {
		width: 100%;
		height: 200px;
		background: var(--bg-primary);
		position: relative;
		overflow: hidden;
		border-top: 1px solid var(--border-subtle);
	}

	.mini-empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-size: 11px;
		color: var(--text-muted);
		font-style: italic;
	}
</style>
