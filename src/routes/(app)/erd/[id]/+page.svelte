<script lang="ts">
	import { page } from '$app/state';
	import { erStore, UNGROUPED_KEY } from '$lib/stores/er.svelte';
	import ImportSqlModal from '$lib/components/er/ImportSqlModal.svelte';
	import NewGroupModal from '$lib/components/er/NewGroupModal.svelte';

	const diagramId = $derived(page.params.id ?? '');

	let search = $state('');
	let showImportModal = $state(false);
	let importInitialTab = $state<'sql' | 'groups' | 'live'>('sql');
	let showNewGroupModal = $state(false);

	const COLOR_HEX: Record<string, string> = {
		slate: '#94a3b8',
		blue: '#3b82f6',
		emerald: '#10b981',
		amber: '#f59e0b',
		rose: '#f43f5e',
		violet: '#8b5cf6'
	};

	$effect(() => {
		if (diagramId) {
			erStore.loadDiagrams();
			erStore.selectDiagram(diagramId);
		}
	});

	const topLevelGroups = $derived.by(() => {
		const q = search.trim().toLowerCase();
		const parents = erStore.groups.filter((g) => !g.parent_id);
		if (!q) return parents;
		return parents.filter((g) => {
			if (g.name.toLowerCase().includes(q)) return true;
			return erStore.groups.some(
				(c) => c.parent_id === g.id && c.name.toLowerCase().includes(q)
			);
		});
	});

	function getSubGroups(parentId: string) {
		return erStore.groups.filter((g) => g.parent_id === parentId);
	}

	function getTotalTableCount(parentId: string): number {
		let total = erStore.groupCounts[parentId] ?? 0;
		for (const sub of getSubGroups(parentId)) {
			total += erStore.groupCounts[sub.id] ?? 0;
		}
		return total;
	}

	function openImport(tab: 'sql' | 'groups' | 'live') {
		importInitialTab = tab;
		showImportModal = true;
	}
</script>

<div class="erd-diagram-page">
	<header class="erd-page-header">
		<div class="erd-tier-1">
			<nav class="erd-breadcrumb" aria-label="Breadcrumb">
				<a href="/erd" class="erd-crumb-link">ER Study</a>
				<span class="erd-crumb-sep">/</span>
				<h1 class="erd-crumb-current">{erStore.activeDiagram?.name ?? 'Diagram'}</h1>
			</nav>

			<div class="erd-actions">
				<button type="button" class="erd-btn erd-btn-secondary" onclick={() => (showNewGroupModal = true)}>
					+ Group
				</button>
				<button type="button" class="erd-btn erd-btn-secondary" onclick={() => openImport('sql')}>
					+ Import SQL
				</button>
				<button type="button" class="erd-btn erd-btn-secondary" onclick={() => openImport('groups')}>
					+ Import Groups
				</button>
				<button type="button" class="erd-btn erd-btn-ghost" onclick={() => openImport('live')}>
					Sync Schema
				</button>
			</div>
		</div>

		<div class="erd-tier-2">
			<input
				type="search"
				class="erd-search"
				placeholder="Filter feature groups..."
				bind:value={search}
			/>
			<span class="erd-tally">
				{topLevelGroups.length} group(s) · {erStore.groupCounts[UNGROUPED_KEY] ?? 0} ungrouped
			</span>
		</div>
	</header>

	{#if erStore.error}
		<div class="erd-error-banner">{erStore.error}</div>
	{/if}

	{#if erStore.loadingGroups}
		<div class="erd-empty">Loading groups...</div>
	{:else}
		<div class="erd-cards-grid">
			{#each topLevelGroups as group (group.id)}
				{@const subs = getSubGroups(group.id)}
				{@const totalTables = getTotalTableCount(group.id)}
				<a href="/erd/{diagramId}/groups/{group.id}" class="erd-group-card">
					<div class="erd-card-head">
						<div class="erd-card-title-row">
							<span
								class="erd-color-dot"
								style:background={COLOR_HEX[group.color] ?? COLOR_HEX.slate}
							></span>
							<h2>{group.name}</h2>
						</div>
						<span class="erd-count-pill">{totalTables} tables</span>
					</div>

					{#if subs.length > 0}
						<div class="erd-sub-preview">
							{#each subs as sub (sub.id)}
								<span class="erd-sub-chip">
									{sub.name} ({erStore.groupCounts[sub.id] ?? 0})
								</span>
							{/each}
						</div>
					{:else}
						<p class="erd-card-hint">Open group diagram</p>
					{/if}
				</a>
			{/each}

			<a href="/erd/{diagramId}/groups/{UNGROUPED_KEY}" class="erd-group-card erd-ungrouped-card">
				<div class="erd-card-head">
					<div class="erd-card-title-row">
						<span class="erd-color-dot" style:background="#64748b"></span>
						<h2>Ungrouped</h2>
					</div>
					<span class="erd-count-pill">{erStore.groupCounts[UNGROUPED_KEY] ?? 0} tables</span>
				</div>
				<p class="erd-card-hint">Tables not yet assigned to any feature group</p>
			</a>
		</div>
	{/if}

	<ImportSqlModal
		open={showImportModal}
		initialTab={importInitialTab}
		onClose={() => (showImportModal = false)}
	/>

	<NewGroupModal
		open={showNewGroupModal}
		onClose={() => (showNewGroupModal = false)}
	/>
</div>

<style>
	.erd-diagram-page {
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
	.erd-tier-2 {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.erd-breadcrumb {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.erd-crumb-link {
		font-size: 13px;
		color: var(--text-secondary);
		text-decoration: none;
	}

	.erd-crumb-link:hover {
		color: var(--text-primary);
	}

	.erd-crumb-sep {
		color: var(--text-secondary);
		font-size: 13px;
	}

	.erd-crumb-current {
		margin: 0;
		font-size: 17px;
		font-weight: 600;
	}

	.erd-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.erd-search {
		height: 32px;
		width: 260px;
		padding: 0 10px;
		border-radius: 6px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-size: 13px;
	}

	.erd-tally {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.erd-cards-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
		gap: 12px;
	}

	.erd-group-card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		border-radius: 8px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s ease;
	}

	.erd-group-card:hover {
		border-color: var(--primary);
	}

	.erd-ungrouped-card {
		border-style: dashed;
	}

	.erd-card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.erd-card-title-row {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.erd-color-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.erd-card-title-row h2 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.erd-count-pill {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 999px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.erd-sub-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.erd-sub-chip {
		font-size: 11px;
		padding: 2px 7px;
		border-radius: 5px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.erd-card-hint {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.erd-empty {
		padding: 48px 16px;
		text-align: center;
		color: var(--text-secondary);
	}

	.erd-error-banner {
		padding: 8px 12px;
		border-radius: 6px;
		background: rgba(239, 68, 68, 0.14);
		border: 1px solid rgba(239, 68, 68, 0.35);
		color: #f87171;
		font-size: 12px;
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

	.erd-btn-secondary {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.erd-btn-ghost {
		background: transparent;
		border-color: transparent;
		color: var(--text-secondary);
	}
</style>
