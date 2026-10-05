<script lang="ts">
	import type { RouteMatrixData } from '$lib/server/routes-loader';
	import { getFeatureRoutePaths, getFeatureComponentNames } from './docs-helpers';

	let {
		routeMatrix,
		featureFolder
	}: {
		routeMatrix?: RouteMatrixData;
		featureFolder?: string;
	} = $props();

	let routeSearch = $state('');
	let routeScope = $state<'feature' | 'all'>('feature');

	let featureRoutes = $derived.by(() => {
		if (!routeMatrix?.routes) return [];
		if (routeScope === 'all' || !featureFolder) return routeMatrix.routes;
		const paths = getFeatureRoutePaths(featureFolder);
		if (paths.length === 0) return [];
		return routeMatrix.routes.filter((r) =>
			paths.some((p) => r.urlPath.toLowerCase() === p.toLowerCase() || r.urlPath.toLowerCase().startsWith(p.toLowerCase() + '/'))
		);
	});

	let featureComponents = $derived.by(() => {
		if (!routeMatrix?.components) return [];
		if (routeScope === 'all' || !featureFolder) return routeMatrix.components;
		const compNames = getFeatureComponentNames(featureFolder);
		if (compNames.length === 0) return [];
		return routeMatrix.components.filter((c) => compNames.includes(c.name));
	});

	let filteredRoutes = $derived.by(() => {
		const q = routeSearch.toLowerCase().trim();
		if (!q) return featureRoutes;
		return featureRoutes.filter(
			(r) =>
				r.urlPath.toLowerCase().includes(q) ||
				(r.group && r.group.toLowerCase().includes(q)) ||
				r.serverMethods.some((m) => m.toLowerCase().includes(q)) ||
				(r.files.page && r.files.page.toLowerCase().includes(q)) ||
				(r.files.server && r.files.server.toLowerCase().includes(q))
		);
	});

	let filteredComponents = $derived.by(() => {
		const q = routeSearch.toLowerCase().trim();
		if (!q) return featureComponents;
		return featureComponents.filter(
			(c) => c.name.toLowerCase().includes(q) || c.relativePath.toLowerCase().includes(q)
		);
	});
</script>

<div class="routes-live-container">
	<div class="schema-banner">
		<div class="schema-banner-text">
			<h3>Auto-Generated SvelteKit Route & API Matrix</h3>
			<p>
				Showing <strong>{filteredRoutes.length}</strong> {routeScope === 'feature' ? `routes related to ${featureFolder || 'current doc'}` : 'total routes in app'}.
			</p>
		</div>
		<div class="banner-controls">
			<div class="scope-toggle">
				<button
					class:active={routeScope === 'feature'}
					onclick={() => (routeScope = 'feature')}
				>
					{featureFolder || 'This Feature'}
				</button>
				<button
					class:active={routeScope === 'all'}
					onclick={() => (routeScope = 'all')}
				>
					All Routes ({routeMatrix?.routes?.length || 0})
				</button>
			</div>
			<input
				type="search"
				placeholder="Search path, group, method..."
				bind:value={routeSearch}
				class="schema-search-input"
			/>
		</div>
	</div>

	{#if filteredRoutes.length === 0 && filteredComponents.length === 0}
		<div class="empty-state-banner">
			<p>No dedicated routes or components registered for <strong>{featureFolder || 'this feature'}</strong> yet.</p>
			<button class="btn btn-outline" onclick={() => (routeScope = 'all')}>
				View All Routes ({routeMatrix?.routes?.length || 0})
			</button>
		</div>
	{:else}
		{#if filteredRoutes.length > 0}
			<div class="routes-table-container">
				<table class="routes-matrix-table">
					<thead>
						<tr>
							<th>URL Route</th>
							<th>Layout Group</th>
							<th>Type</th>
							<th>Server Handlers</th>
							<th>Source Files</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredRoutes as r}
							<tr>
								<td class="url-path-cell">
									<a href={r.urlPath} target="_blank" class="url-link">
										<code>{r.urlPath}</code>
									</a>
								</td>
								<td>
									{#if r.group}
										<span class="group-pill">{r.group}</span>
									{:else}
										<span class="group-pill root">root</span>
									{/if}
								</td>
								<td>
									<div class="type-indicators">
										{#if r.hasPage}
											<span class="route-badge page">Page</span>
										{/if}
										{#if r.hasServerEndpoint}
											<span class="route-badge api">API</span>
										{/if}
										{#if r.hasPageServer}
											<span class="route-badge server">Loader</span>
										{/if}
									</div>
								</td>
								<td>
									{#if r.serverMethods.length > 0}
										<div class="method-pills">
											{#each r.serverMethods as m}
												<span class="method-pill {m.toLowerCase()}">{m}</span>
											{/each}
										</div>
									{:else}
										<span class="text-muted-dash">—</span>
									{/if}
								</td>
								<td class="files-cell">
									{#if r.files.page}
										<span class="file-tag"><code>{r.files.page}</code></span>
									{/if}
									{#if r.files.server}
										<span class="file-tag server"><code>{r.files.server}</code></span>
									{/if}
									{#if r.files.pageServer}
										<span class="file-tag loader"><code>{r.files.pageServer}</code></span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#if filteredComponents.length > 0}
			<div class="component-matrix-section">
				<h4 class="component-section-title">Associated UI Components</h4>
				<div class="component-grid">
					{#each filteredComponents as c}
						<div class="component-card">
							<div class="comp-icon">🧩</div>
							<div class="comp-info">
								<span class="comp-name">{c.name}</span>
								<span class="comp-path"><code>{c.filePath}</code></span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.routes-live-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.schema-banner {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1rem 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.schema-banner-text h3 {
		font-size: 0.9375rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0 0 0.25rem 0;
	}

	.schema-banner-text p {
		font-size: 0.75rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.banner-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.scope-toggle {
		display: flex;
		background: var(--bg-tertiary);
		padding: 0.1875rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		gap: 0.125rem;
	}

	.scope-toggle button {
		background: transparent;
		border: none;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-secondary);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.scope-toggle button.active {
		background: var(--bg-surface);
		color: var(--primary);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.schema-search-input {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		padding: 0.4375rem 0.75rem;
		font-size: 0.75rem;
		color: var(--text-primary);
		border-radius: var(--radius-sm);
		outline: none;
		min-width: 220px;
	}

	.schema-search-input:focus {
		border-color: var(--primary);
	}

	.empty-state-banner {
		background: var(--bg-surface);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 2.5rem 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.btn.btn-outline {
		background: transparent;
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.routes-table-container {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		overflow-x: auto;
	}

	.routes-matrix-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8125rem;
		text-align: left;
	}

	.routes-matrix-table th {
		background: var(--bg-tertiary);
		padding: 0.625rem 0.875rem;
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-subtle);
	}

	.routes-matrix-table td {
		padding: 0.625rem 0.875rem;
		border-bottom: 1px solid var(--border-subtle);
		vertical-align: middle;
	}

	.routes-matrix-table tr:last-child td {
		border-bottom: none;
	}

	.routes-matrix-table tr:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.url-path-cell {
		font-family: var(--font-mono);
		font-weight: 600;
	}

	.url-link {
		color: var(--primary);
		text-decoration: none;
	}

	.url-link:hover {
		text-decoration: underline;
	}

	.group-pill {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		background: rgba(168, 85, 247, 0.1);
		color: #c084fc;
		border: 1px solid rgba(168, 85, 247, 0.2);
	}

	.group-pill.root {
		background: var(--bg-tertiary);
		color: var(--text-muted);
		border-color: transparent;
	}

	.type-indicators {
		display: flex;
		gap: 0.25rem;
	}

	.route-badge {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-sm);
		font-weight: 600;
	}

	.route-badge.page { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
	.route-badge.api { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
	.route-badge.server { background: rgba(34, 197, 94, 0.15); color: #4ade80; }

	.method-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.method-pill {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		font-weight: 700;
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
	}

	.method-pill.get { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
	.method-pill.post { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
	.method-pill.delete { background: rgba(239, 68, 68, 0.15); color: #f87171; }
	.method-pill.put, .method-pill.patch { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
	.method-pill.load { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
	.method-pill.actions { background: rgba(20, 184, 166, 0.15); color: #2dd4bf; }

	.text-muted-dash {
		color: var(--text-muted);
	}

	.files-cell {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
	}

	.file-tag {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--text-secondary);
	}

	.file-tag.server { color: #fbbf24; }
	.file-tag.loader { color: #4ade80; }

	.component-matrix-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.component-section-title {
		font-size: 0.8125rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin: 0;
	}

	.component-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.75rem;
	}

	.component-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.comp-icon {
		font-size: 1.25rem;
	}

	.comp-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		overflow: hidden;
	}

	.comp-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.comp-path code {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
	}
</style>
