<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import GraphView from '$lib/components/notes/graph/GraphView.svelte';
	import { goto } from '$app/navigation';

	let graphData = $derived(notesStore.graphData);

	function handleNodeClick(nodeId: string, isGhost: boolean, title: string) {
		if (isGhost) {
			notesStore.createNewNote(title).then((newNote) => {
				goto('/notes');
			});
		} else {
			notesStore.openNoteInActivePane(nodeId);
			goto('/notes');
		}
	}
</script>

<svelte:head>
	<title>Graph View — The Commons</title>
</svelte:head>

<div class="full-graph-page">
	<div class="graph-top-nav">
		<button
			type="button"
			class="back-to-vault-btn"
			onclick={() => goto('/notes')}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="m15 18-6-6 6-6" />
			</svg>
			<span>Back to Workspace</span>
		</button>

		<div class="graph-stats">
			<span class="stat-badge">{graphData.nodes.length} nodes</span>
			<span class="stat-badge">{graphData.edges.length} links</span>
		</div>
	</div>

	<div class="graph-canvas-fill">
		<GraphView
			nodes={graphData.nodes}
			edges={graphData.edges}
			onNodeClick={handleNodeClick}
		/>
	</div>
</div>

<style>
	.full-graph-page {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
		background: var(--bg-primary);
	}

	.graph-top-nav {
		position: absolute;
		top: 14px;
		right: 14px;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.back-to-vault-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		font-size: 12px;
		font-weight: 500;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		cursor: pointer;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
		transition: background 0.1s ease;
	}

	.back-to-vault-btn:hover {
		background: var(--bg-tertiary);
	}

	.back-to-vault-btn svg {
		width: 14px;
		height: 14px;
	}

	.graph-stats {
		display: flex;
		gap: 6px;
	}

	.stat-badge {
		font-size: 11px;
		padding: 4px 8px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		font-family: monospace;
	}

	.graph-canvas-fill {
		flex: 1;
		width: 100%;
		height: 100%;
	}
</style>
