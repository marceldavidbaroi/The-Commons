<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';

	let backlinks = $derived(notesStore.activeBacklinks);
	let unlinkedMentions = $derived(notesStore.activeUnlinkedMentions);
	let isCollapsed = $state<boolean>(false);
	let isUnlinkedCollapsed = $state<boolean>(false);

	function handleBacklinkClick(noteId: string) {
		notesStore.openNoteInActivePane(noteId);
	}

	function handleMentionClick(noteId: string) {
		notesStore.openNoteInActivePane(noteId);
	}
</script>

<div class="panel-section">
	<!-- Linked Mentions / Backlinks -->
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
		<span class="header-title">Linked Mentions</span>
		<span class="count-pill">{backlinks.length}</span>
	</button>

	{#if !isCollapsed}
		<div class="mentions-list">
			{#if backlinks.length === 0}
				<div class="empty-hint">No incoming backlinks found.</div>
			{:else}
				{#each backlinks as link (link.id)}
					<button
						type="button"
						class="mention-item"
						onclick={() => handleBacklinkClick(link.id)}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="link-icon">
							<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
							<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
						</svg>
						<span class="mention-title">{link.title}</span>
					</button>
				{/each}
			{/if}
		</div>
	{/if}

	<!-- Unlinked Mentions -->
	<button
		type="button"
		class="section-header unlinked-header"
		onclick={() => (isUnlinkedCollapsed = !isUnlinkedCollapsed)}
	>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="chevron-icon"
			class:rotated={isUnlinkedCollapsed}
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
		<span class="header-title">Unlinked Mentions</span>
		<span class="count-pill">{unlinkedMentions.length}</span>
	</button>

	{#if !isUnlinkedCollapsed}
		<div class="mentions-list">
			{#if unlinkedMentions.length === 0}
				<div class="empty-hint">No unlinked mentions.</div>
			{:else}
				{#each unlinkedMentions as mention (mention.id)}
					<button
						type="button"
						class="unlinked-item"
						onclick={() => handleMentionClick(mention.id)}
					>
						<div class="unlinked-title-row">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="link-icon">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
							<span class="mention-title">{mention.title}</span>
						</div>
						<div class="mention-snippet">{mention.snippet}</div>
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

	.unlinked-header {
		border-top: 1px solid var(--border-subtle);
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

	.mentions-list {
		display: flex;
		flex-direction: column;
		padding: 4px 8px 10px 8px;
		gap: 2px;
	}

	.mention-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 8px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		color: var(--text-secondary);
		transition: background 0.1s ease, color 0.1s ease;
	}

	.mention-item:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.link-icon {
		width: 13px;
		height: 13px;
		color: var(--primary);
		flex-shrink: 0;
	}

	.mention-title {
		font-size: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.unlinked-item {
		display: flex;
		flex-direction: column;
		padding: 6px 8px;
		border: none;
		background: transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		gap: 3px;
		transition: background 0.1s ease;
	}

	.unlinked-item:hover {
		background: var(--bg-tertiary);
	}

	.unlinked-title-row {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--text-primary);
	}

	.mention-snippet {
		font-size: 11px;
		color: var(--text-muted);
		line-height: 1.3;
		overflow: hidden;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.empty-hint {
		font-size: 11px;
		color: var(--text-muted);
		padding: 6px 8px;
		font-style: italic;
	}
</style>
