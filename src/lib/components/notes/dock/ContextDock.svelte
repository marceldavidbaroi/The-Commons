<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import LocalGraph from './LocalGraph.svelte';
	import BacklinksPanel from './BacklinksPanel.svelte';
	import OutgoingLinksPanel from './OutgoingLinksPanel.svelte';

	let isOpen = $derived(notesStore.contextDockOpen);

	function toggleDock() {
		notesStore.contextDockOpen = !notesStore.contextDockOpen;
	}
</script>

{#if isOpen}
	<aside class="context-dock" aria-label="Context Inspector Dock">
		<div class="dock-header">
			<div class="header-left">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="dock-icon">
					<circle cx="12" cy="12" r="3" />
					<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
				</svg>
				<span class="dock-title">Inspector</span>
			</div>
			<button
				type="button"
				class="dock-close-btn"
				onclick={toggleDock}
				title="Close Inspector"
				aria-label="Close Inspector"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		<div class="dock-body">
			<!-- 1. Scoped Mini Local Graph -->
			<LocalGraph />

			<!-- 2. Backlinks & Unlinked Mentions -->
			<BacklinksPanel />

			<!-- 3. Outgoing Wiki-Links -->
			<OutgoingLinksPanel />
		</div>
	</aside>
{/if}

<style>
	.context-dock {
		width: 270px;
		min-width: 240px;
		max-width: 380px;
		height: 100%;
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		flex-shrink: 0;
		overflow: hidden;
	}

	.dock-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-tertiary);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.dock-icon {
		width: 14px;
		height: 14px;
		color: var(--text-secondary);
	}

	.dock-title {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.dock-close-btn {
		width: 20px;
		height: 20px;
		padding: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.1s ease, color 0.1s ease;
	}

	.dock-close-btn:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.dock-close-btn svg {
		width: 14px;
		height: 14px;
	}

	.dock-body {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}
</style>
