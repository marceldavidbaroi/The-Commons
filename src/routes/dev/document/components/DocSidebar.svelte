<script lang="ts">
	import type { DocItem, DocCategoryGroup } from '$lib/server/docs-loader';
	import { getBadgeClass } from './docs-helpers';

	let {
		docs,
		categoryGroups,
		selectedDocId,
		isOpen,
		onSelectDoc
	}: {
		docs: DocItem[];
		categoryGroups: DocCategoryGroup[];
		selectedDocId: string;
		isOpen: boolean;
		onSelectDoc: (id: string) => void;
	} = $props();

	let searchQuery = $state('');
	let selectedBadgeFilter = $state<string | null>(null);
	let openFolders = $state<Record<string, boolean>>({});

	// Filtered list of docs
	let filteredDocs = $derived.by(() => {
		const query = searchQuery.toLowerCase().trim();
		return docs.filter((doc) => {
			const matchesSearch =
				!query ||
				doc.title.toLowerCase().includes(query) ||
				doc.content.toLowerCase().includes(query) ||
				doc.filePath.toLowerCase().includes(query);
			const matchesBadge = !selectedBadgeFilter || doc.typeBadge === selectedBadgeFilter;
			return matchesSearch && matchesBadge;
		});
	});

	function toggleFolder(folderName: string) {
		openFolders[folderName] = !openFolders[folderName];
	}

	export function ensureFolderOpen(folderName: string) {
		openFolders[folderName] = true;
	}
</script>

<aside class="codex-sidebar" class:open={isOpen}>
	<div class="search-section">
		<input
			type="search"
			placeholder="Search specifications, schemas..."
			bind:value={searchQuery}
			class="search-input"
		/>

		<div class="badge-filters">
			{#each ['Spec', 'Schema', 'Architecture', 'API Contract', 'PRD'] as badge}
				<button
					class="filter-pill"
					class:active={selectedBadgeFilter === badge}
					onclick={() =>
						(selectedBadgeFilter = selectedBadgeFilter === badge ? null : badge)}
				>
					{badge}
				</button>
			{/each}
		</div>
	</div>

	<div class="tree-content">
		{#if searchQuery || selectedBadgeFilter}
			<div class="tree-group">
				<div class="group-title">Matching Specs ({filteredDocs.length})</div>
				{#each filteredDocs as doc}
					<button
						class="doc-item-btn"
						class:active={selectedDocId === doc.id}
						onclick={() => onSelectDoc(doc.id)}
					>
						<div class="doc-item-row">
							<span class="doc-item-title">{doc.title}</span>
							<span class="badge {getBadgeClass(doc.typeBadge)}">{doc.typeBadge}</span>
						</div>
						<span class="doc-item-path">{doc.filePath}</span>
					</button>
				{/each}
			</div>
		{:else}
			{#each categoryGroups as group}
				<div class="tree-group">
					<div class="group-title">
						<span>{group.name}</span>
						<span class="group-count">{group.docs.length}</span>
					</div>

					{#if group.featureSubGroups && group.featureSubGroups.length > 0}
						{#each group.featureSubGroups as subGroup}
							{@const isFolderOpen = Boolean(openFolders[subGroup.featureName])}
							<div class="subgroup-container">
								<button
									class="subgroup-toggle"
									onclick={() => toggleFolder(subGroup.featureName)}
								>
									<span class="folder-icon">{isFolderOpen ? '📂' : '📁'}</span>
									<span class="subgroup-name">{subGroup.featureName}</span>
									<span class="chevron">{isFolderOpen ? '▾' : '▸'}</span>
								</button>

								{#if isFolderOpen}
									<div class="subgroup-items">
										{#each subGroup.docs as doc}
											<button
												class="sub-doc-btn"
												class:active={selectedDocId === doc.id}
												onclick={() => onSelectDoc(doc.id)}
											>
												<span class="sub-doc-title">
													{doc.filePath.split('/').pop()?.replace(/\.(md|ts)$/, '')}
												</span>
												<span class="badge {getBadgeClass(doc.typeBadge)}">{doc.typeBadge}</span>
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					{:else}
						<div class="flat-items">
							{#each group.docs as doc}
								<button
									class="doc-item-btn"
									class:active={selectedDocId === doc.id}
									onclick={() => onSelectDoc(doc.id)}
								>
									<div class="doc-item-row">
										<span class="doc-item-title">{doc.title}</span>
										<span class="badge {getBadgeClass(doc.typeBadge)}">{doc.typeBadge}</span>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</aside>

<style>
	.codex-sidebar {
		width: 280px;
		background: var(--bg-secondary);
		border-right: 1px solid var(--border-subtle);
		height: calc(100vh - 56px);
		position: sticky;
		top: 56px;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		z-index: 20;
	}

	@media (max-width: 768px) {
		.codex-sidebar {
			position: fixed;
			top: 56px;
			left: 0;
			bottom: 0;
			transform: translateX(-100%);
			transition: transform 0.2s ease-in-out;
			box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
		}

		.codex-sidebar.open {
			transform: translateX(0);
		}
	}

	.search-section {
		padding: 1rem 0.875rem 0.75rem 0.875rem;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.search-input {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
		color: var(--text-primary);
		border-radius: var(--radius-sm);
		outline: none;
		width: 100%;
	}

	.search-input:focus {
		border-color: var(--primary);
	}

	.badge-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.filter-pill {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
		cursor: pointer;
	}

	.filter-pill.active {
		background: var(--primary);
		color: #ffffff;
		border-color: var(--primary);
	}

	.tree-content {
		padding: 0.75rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		flex: 1;
	}

	.tree-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.group-title {
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.25rem 0.5rem;
		display: flex;
		justify-content: space-between;
	}

	.group-count {
		font-size: 0.625rem;
		font-weight: 500;
		color: var(--text-muted);
	}

	.subgroup-container {
		display: flex;
		flex-direction: column;
	}

	.subgroup-toggle {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		background: transparent;
		border: none;
		color: var(--text-primary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		border-radius: var(--radius-sm);
		text-align: left;
	}

	.subgroup-toggle:hover {
		background: var(--bg-tertiary);
	}

	.subgroup-name {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.subgroup-items {
		padding-left: 0.875rem;
		border-left: 1px solid var(--border-subtle);
		margin-left: 0.875rem;
		margin-top: 0.125rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.sub-doc-btn, .doc-item-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.3125rem 0.5rem;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: 0.75rem;
		cursor: pointer;
		text-align: left;
		gap: 0.375rem;
	}

	.sub-doc-btn:hover, .doc-item-btn:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.sub-doc-btn.active, .doc-item-btn.active {
		background: var(--bg-surface);
		color: var(--text-primary);
		font-weight: 600;
	}

	.doc-item-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		gap: 0.375rem;
	}

	.doc-item-title {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.doc-item-path {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sub-doc-title {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.badge {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		flex-shrink: 0;
	}

	.badge-spec { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: rgba(59, 130, 246, 0.4); font-weight: 600; }
	.badge-prd { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border-color: rgba(59, 130, 246, 0.3); }
	.badge-tdd { background: rgba(168, 85, 247, 0.15); color: #c084fc; border-color: rgba(168, 85, 247, 0.3); }
	.badge-schema { background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.3); }
	.badge-api { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); }
	.badge-matrix { background: rgba(20, 184, 166, 0.15); color: #2dd4bf; border-color: rgba(20, 184, 166, 0.3); }
	.badge-arch { background: rgba(6, 182, 212, 0.15); color: #22d3ee; border-color: rgba(6, 182, 212, 0.3); }
	.badge-stub { background: rgba(249, 115, 22, 0.15); color: #fb923c; border-color: rgba(249, 115, 22, 0.3); }
	.badge-default { background: var(--bg-tertiary); color: var(--text-secondary); }
</style>
