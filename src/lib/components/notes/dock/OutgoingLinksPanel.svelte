<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';

	let outgoingLinks = $derived(notesStore.activeOutgoingLinks);
	let isCollapsed = $state<boolean>(false);

	function handleLinkClick(title: string, isResolved: boolean) {
		if (isResolved) {
			const stub = notesStore.activeTitleMap.get(title.toLowerCase());
			if (stub) {
				notesStore.openNoteInActivePane(stub.id);
			}
		} else {
			// Ghost link - clicking creates the note
			notesStore.createNewNote(title);
		}
	}
</script>

<div class="panel-section">
	<button
		type="button"
		class="section-header"
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
		<span class="header-title">Outgoing Links</span>
		<span class="count-pill">{outgoingLinks.length}</span>
	</button>

	{#if !isCollapsed}
		<div class="links-list">
			{#if outgoingLinks.length === 0}
				<div class="empty-hint">No outgoing [[links]] found.</div>
			{:else}
				{#each outgoingLinks as link (link.title)}
					<button
						type="button"
						class="outgoing-item"
						class:ghost={!link.isResolved}
						onclick={() => handleLinkClick(link.title, link.isResolved)}
						title={link.isResolved ? `Open note: ${link.title}` : `Create note: ${link.title}`}
					>
						<span class="link-bullet" class:ghost-bullet={!link.isResolved}></span>
						<span class="link-title">{link.title}</span>
						{#if !link.isResolved}
							<span class="ghost-badge">ghost</span>
						{/if}
					</button>
				{/each}
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
		padding: 8px 12px;
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--text-secondary);
		gap: 6px;
		user-select: none;
		text-align: left;
		transition: background 0.1s ease;
	}

	.section-header:hover {
		background: var(--bg-tertiary);
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
		flex: 1;
	}

	.count-pill {
		font-size: 10px;
		background: var(--bg-tertiary);
		color: var(--text-muted);
		padding: 1px 6px;
		border-radius: 9999px;
		font-weight: 500;
	}

	.links-list {
		display: flex;
		flex-direction: column;
		padding: 4px 8px 10px 8px;
		gap: 2px;
	}

	.outgoing-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 8px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		color: var(--text-secondary);
		transition: background 0.1s ease, color 0.1s ease;
	}

	.outgoing-item:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.outgoing-item.ghost {
		color: var(--text-muted);
	}

	.link-bullet {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--primary);
		flex-shrink: 0;
	}

	.link-bullet.ghost-bullet {
		background: transparent;
		border: 1px dashed var(--text-muted);
	}

	.link-title {
		font-size: 12px;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ghost-badge {
		font-size: 9px;
		text-transform: uppercase;
		padding: 1px 4px;
		background: var(--bg-tertiary);
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		letter-spacing: 0.02em;
	}

	.empty-hint {
		font-size: 11px;
		color: var(--text-muted);
		padding: 6px 8px;
		font-style: italic;
	}
</style>
