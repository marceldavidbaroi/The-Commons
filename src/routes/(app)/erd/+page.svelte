<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { erStore } from '$lib/stores/er.svelte';
	import type { ErDiagram } from '$lib/types/er';

	let search = $state('');
	let showNewForm = $state(false);
	let newDiagramName = $state('');
	let creating = $state(false);
	let deleteTarget = $state<ErDiagram | null>(null);
	let deleting = $state(false);

	onMount(() => {
		erStore.loadDiagrams();
	});

	const filteredDiagrams = $derived.by(() => {
		const q = search.trim().toLowerCase();
		if (!q) return erStore.diagrams;
		return erStore.diagrams.filter((d) => d.name.toLowerCase().includes(q));
	});

	async function handleCreate(event: Event) {
		event.preventDefault();
		const name = newDiagramName.trim();
		if (!name || creating) return;
		creating = true;
		try {
			const created = await erStore.createDiagram({ name, source_type: 'ddl' });
			newDiagramName = '';
			showNewForm = false;
			await goto(`/erd/${created.id}`);
		} finally {
			creating = false;
		}
	}

	async function handleConfirmDelete() {
		if (!deleteTarget || deleting) return;
		deleting = true;
		try {
			await erStore.deleteDiagram(deleteTarget.id);
			deleteTarget = null;
		} finally {
			deleting = false;
		}
	}
</script>

<div class="erd-index-page">
	<header class="erd-page-header">
		<div class="erd-tier-1">
			<div class="erd-title-wrap">
				<h1>ER Study</h1>
				<span class="erd-count-badge">{erStore.diagrams.length}</span>
			</div>
			<button
				type="button"
				class="erd-btn erd-btn-primary"
				onclick={() => (showNewForm = !showNewForm)}
			>
				+ New Diagram
			</button>
		</div>

		{#if showNewForm}
			<form class="erd-create-bar" onsubmit={handleCreate}>
				<input
					type="text"
					class="erd-input"
					placeholder="Diagram name (e.g. Brandwala Wholesale)..."
					bind:value={newDiagramName}
					required
				/>
				<button type="submit" class="erd-btn erd-btn-primary" disabled={creating}>
					{creating ? 'Creating...' : 'Create'}
				</button>
				<button
					type="button"
					class="erd-btn erd-btn-ghost"
					onclick={() => (showNewForm = false)}
				>
					Cancel
				</button>
			</form>
		{:else}
			<div class="erd-tier-2">
				<input
					type="search"
					class="erd-search"
					placeholder="Search diagrams..."
					bind:value={search}
				/>
				<span class="erd-tally">{filteredDiagrams.length} diagram(s)</span>
			</div>
		{/if}
	</header>

	{#if erStore.error}
		<div class="erd-error-banner">{erStore.error}</div>
	{/if}

	{#if erStore.loadingDiagrams && !erStore.diagramsLoaded}
		<div class="erd-empty">Loading diagrams...</div>
	{:else if filteredDiagrams.length === 0}
		<div class="erd-empty">
			<p>{erStore.diagrams.length === 0 ? 'No ER diagrams yet.' : 'No matching diagrams.'}</p>
			{#if erStore.diagrams.length === 0}
				<button
					type="button"
					class="erd-btn erd-btn-primary"
					onclick={() => (showNewForm = true)}
				>
					+ Create First Diagram
				</button>
			{/if}
		</div>
	{:else}
		<div class="erd-cards-grid">
			{#each filteredDiagrams as diagram (diagram.id)}
				<article class="erd-card">
					<a href="/erd/{diagram.id}" class="erd-card-link">
						<div class="erd-card-top">
							<h2 class="erd-card-title">{diagram.name}</h2>
							<span class="erd-source-badge">{diagram.source_type}</span>
						</div>
						<div class="erd-card-meta">
							Updated {new Date(diagram.updated_at).toLocaleDateString()}
						</div>
					</a>
					<div class="erd-card-actions">
						<button
							type="button"
							class="erd-delete-btn"
							onclick={() => (deleteTarget = diagram)}
						>
							Delete
						</button>
					</div>
				</article>
			{/each}
		</div>

		{#if erStore.diagramsHasMore}
			<div class="erd-load-more">
				<button
					type="button"
					class="erd-btn erd-btn-secondary"
					disabled={erStore.loadingDiagrams}
					onclick={() => erStore.loadMoreDiagrams()}
				>
					{erStore.loadingDiagrams ? 'Loading...' : 'Load More'}
				</button>
			</div>
		{/if}
	{/if}

	{#if deleteTarget}
		<div
			class="erd-modal-backdrop"
			role="presentation"
			onclick={() => !deleting && (deleteTarget = null)}
		>
			<div
				class="erd-confirm-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Delete Diagram"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && !deleting && (deleteTarget = null)}
			>
				<h2>Delete Diagram</h2>
				<p>
					Delete <strong>{deleteTarget.name}</strong>? This permanently removes all groups,
					tables, relations, and study notes in this diagram.
				</p>
				<div class="erd-confirm-actions">
					<button
						type="button"
						class="erd-btn erd-btn-ghost"
						disabled={deleting}
						onclick={() => (deleteTarget = null)}
					>
						Cancel
					</button>
					<button
						type="button"
						class="erd-btn erd-btn-danger"
						disabled={deleting}
						onclick={handleConfirmDelete}
					>
						{deleting ? 'Deleting...' : 'Delete Diagram'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.erd-index-page {
		display: flex;
		flex-direction: column;
		gap: 16px;
		color: var(--text-primary);
	}

	.erd-page-header {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.erd-tier-1,
	.erd-tier-2,
	.erd-create-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.erd-title-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.erd-title-wrap h1 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
	}

	.erd-count-badge {
		font-size: 11px;
		font-weight: 600;
		padding: 1px 7px;
		border-radius: 999px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.erd-input,
	.erd-search {
		height: 32px;
		padding: 0 10px;
		border-radius: 6px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 13px;
	}

	.erd-input {
		flex: 1;
	}

	.erd-search {
		width: 260px;
	}

	.erd-tally {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.erd-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
	}

	.erd-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		transition: border-color 0.15s ease;
	}

	.erd-card:hover {
		border-color: var(--primary);
	}

	.erd-card-link {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
		text-decoration: none;
		color: inherit;
	}

	.erd-card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.erd-card-title {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.erd-source-badge {
		font-size: 10px;
		text-transform: uppercase;
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 4px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.erd-card-meta {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.erd-card-actions {
		display: flex;
		justify-content: flex-end;
		padding: 6px 14px 10px;
		border-top: 1px solid var(--border-subtle);
	}

	.erd-delete-btn {
		background: transparent;
		border: none;
		color: #f87171;
		font-size: 12px;
		cursor: pointer;
		padding: 2px 4px;
	}

	.erd-empty {
		padding: 48px 16px;
		text-align: center;
		color: var(--text-secondary);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.erd-error-banner {
		padding: 8px 12px;
		border-radius: 6px;
		background: rgba(239, 68, 68, 0.14);
		border: 1px solid rgba(239, 68, 68, 0.35);
		color: #f87171;
		font-size: 12px;
	}

	.erd-load-more {
		display: flex;
		justify-content: center;
		padding-top: 8px;
	}

	.erd-btn {
		height: 30px;
		padding: 0 12px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid var(--border-subtle);
	}

	.erd-btn-primary {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.erd-btn-secondary {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.erd-btn-ghost {
		background: transparent;
		border-color: transparent;
		color: var(--text-secondary);
	}

	.erd-btn-danger {
		background: #dc2626;
		border-color: #dc2626;
		color: #ffffff;
	}

	.erd-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgba(0, 0, 0, 0.58);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	}

	.erd-confirm-modal {
		width: 100%;
		max-width: 400px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		padding: 16px;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.erd-confirm-modal h2 {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}

	.erd-confirm-modal p {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.erd-confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 4px;
	}
</style>
