<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { marked } from 'marked';
	import mermaid from 'mermaid';
	import type { PageData } from './$types';
	import type { DocItem } from '$lib/server/docs-loader';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedBadgeFilter = $state<string | null>(null);
	let selectedDocId = $state<string>('');
	let activeTab = $state<'rendered' | 'raw' | 'schema' | 'routes'>('rendered');
	let schemaSearch = $state('');
	let routeSearch = $state('');
	let schemaScope = $state<'feature' | 'all'>('feature');
	let routeScope = $state<'feature' | 'all'>('feature');

	// Map feature folder names to exact database tables
	function getFeatureTableNames(featureName?: string): string[] {
		if (!featureName) return [];
		const lower = featureName.toLowerCase();
		if (lower.includes('task')) return ['tasks', 'task_tags'];
		if (lower.includes('goal')) return ['goals', 'goal_tags'];
		if (lower.includes('diary') || lower.includes('journal')) return ['diaries', 'diary_entries', 'diary_entry_tags'];
		if (lower.includes('tag')) return ['tags', 'tag_categories'];
		if (lower.includes('auth') || lower.includes('access')) return ['allowed_members', 'profiles'];
		if (lower.includes('passport') || lower.includes('profile')) return ['profiles'];
		if (lower.includes('homeops') || lower.includes('inventory')) return ['user_items'];
		return [];
	}

	// Filtered tables for schema view
	let featureTables = $derived.by(() => {
		if (!data.schema?.tables) return [];
		if (schemaScope === 'all' || !currentDoc?.featureFolder) return data.schema.tables;
		const tableNames = getFeatureTableNames(currentDoc.featureFolder);
		if (tableNames.length === 0) return data.schema.tables;
		return data.schema.tables.filter((t) => tableNames.includes(t.name));
	});

	let filteredSchemaTables = $derived.by(() => {
		const q = schemaSearch.toLowerCase().trim();
		if (!q) return featureTables;
		return featureTables.filter(
			(t) =>
				t.name.toLowerCase().includes(q) ||
				t.columns.some((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q))
		);
	});

	// Map feature folder names to exact route paths
	function getFeatureRoutePaths(featureName?: string): string[] {
		if (!featureName) return [];
		const lower = featureName.toLowerCase();
		if (lower.includes('task')) return ['/tasks'];
		if (lower.includes('goal')) return ['/goals'];
		if (lower.includes('diary') || lower.includes('journal')) return ['/diary', '/diary/[id]'];
		if (lower.includes('auth') || lower.includes('access')) return ['/login', '/auth/callback', '/admin', '/admin/login'];
		if (lower.includes('passport') || lower.includes('profile')) return ['/profile'];
		if (lower.includes('homeops') || lower.includes('inventory')) return ['/homeops'];
		if (lower.includes('tag')) return [];
		return [];
	}

	function getFeatureComponentNames(featureName?: string): string[] {
		if (!featureName) return [];
		const lower = featureName.toLowerCase();
		if (lower.includes('tag')) return ['TagManagementSidePanel.svelte', 'TagPicker.svelte'];
		if (lower.includes('task')) return ['TaskSidePanel.svelte', 'TagManagementSidePanel.svelte'];
		return [];
	}

	// Filtered routes for routes matrix view
	let featureRoutes = $derived.by(() => {
		if (!data.routeMatrix?.routes) return [];
		if (routeScope === 'all' || !currentDoc?.featureFolder) return data.routeMatrix.routes;
		const paths = getFeatureRoutePaths(currentDoc.featureFolder);
		if (paths.length === 0) return [];
		return data.routeMatrix.routes.filter((r) =>
			paths.some((p) => r.urlPath.toLowerCase() === p.toLowerCase() || r.urlPath.toLowerCase().startsWith(p.toLowerCase() + '/'))
		);
	});

	let featureComponents = $derived.by(() => {
		if (!data.routeMatrix?.components) return [];
		if (routeScope === 'all' || !currentDoc?.featureFolder) return data.routeMatrix.components;
		const compNames = getFeatureComponentNames(currentDoc.featureFolder);
		if (compNames.length === 0) return [];
		return data.routeMatrix.components.filter((c) => compNames.includes(c.name));
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
	let copiedText = $state<string | null>(null);
	let isMobileNavOpen = $state(false);
	let openFolders = $state<Record<string, boolean>>({});

	// Filtered list of docs
	let filteredDocs = $derived.by(() => {
		const query = searchQuery.toLowerCase().trim();
		return data.docs.filter((doc) => {
			const matchesSearch =
				!query ||
				doc.title.toLowerCase().includes(query) ||
				doc.content.toLowerCase().includes(query) ||
				doc.filePath.toLowerCase().includes(query);
			const matchesBadge = !selectedBadgeFilter || doc.typeBadge === selectedBadgeFilter;
			return matchesSearch && matchesBadge;
		});
	});

	// Current active document
	let currentDoc = $derived.by(() => {
		return data.docs.find((d) => d.id === selectedDocId) || data.docs[0];
	});

	// Custom marked renderer for mermaid code blocks
	const renderer = new marked.Renderer();
	const originalCodeRenderer = renderer.code.bind(renderer);
	renderer.code = function (token: any) {
		const lang = (token.lang || '').match(/\S*/)?.[0];
		if (lang === 'mermaid') {
			return `<div class="mermaid">${token.text}</div>`;
		}
		return originalCodeRenderer(token);
	};

	// Render markdown HTML
	let renderedHtml = $derived.by(() => {
		if (!currentDoc) return '';
		return marked.parse(currentDoc.content, { async: false, renderer }) as string;
	});

	// Render mermaid diagrams whenever HTML or activeTab updates
	$effect(() => {
		if (activeTab === 'rendered' && renderedHtml) {
			tick().then(() => {
				try {
					mermaid.run({
						nodes: document.querySelectorAll('.mermaid')
					});
				} catch (err) {
					console.error('Mermaid render error:', err);
				}
			});
		}
	});

	// Headings for table of contents
	let tableOfContents = $derived.by(() => {
		if (!currentDoc) return [];
		const lines = currentDoc.content.split('\n');
		const headings: { text: string; level: number; id: string }[] = [];

		for (const line of lines) {
			const h2Match = line.match(/^##\s+(.*)/);
			const h3Match = line.match(/^###\s+(.*)/);

			if (h2Match) {
				const text = h2Match[1].replace(/\[(.*?)\]\(.*?\)/g, '$1').trim();
				const id = text.toLowerCase().replace(/[^\w]+/g, '-');
				headings.push({ text, level: 2, id });
			} else if (h3Match) {
				const text = h3Match[1].replace(/\[(.*?)\]\(.*?\)/g, '$1').trim();
				const id = text.toLowerCase().replace(/[^\w]+/g, '-');
				headings.push({ text, level: 3, id });
			}
		}
		return headings;
	});

	function selectDocument(docId: string, updateUrl = true) {
		selectedDocId = docId;
		isMobileNavOpen = false;

		if (updateUrl && typeof window !== 'undefined') {
			const url = new URL(window.location.href);
			url.searchParams.set('doc', docId);
			window.history.replaceState({ docId }, '', url.toString());
		}

		const doc = data.docs.find((d) => d.id === docId);
		if (doc?.featureFolder) {
			openFolders[doc.featureFolder] = true;
		}
	}

	function toggleFolder(folderName: string) {
		openFolders[folderName] = !openFolders[folderName];
	}

	function copyToClipboard(text: string, label: string) {
		navigator.clipboard.writeText(text);
		copiedText = label;
		setTimeout(() => (copiedText = null), 2000);
	}

	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	onMount(() => {
		mermaid.initialize({
			startOnLoad: false,
			theme: 'base',
			securityLevel: 'loose',
			themeVariables: {
				darkMode: true,
				background: '#161922',
				mainBkg: '#1e2230',
				primaryColor: '#282d3f',
				primaryTextColor: '#f3f4f6',
				primaryBorderColor: '#3b82f6',
				lineColor: '#94a3b8',
				secondaryColor: '#1e293b',
				tertiaryColor: '#0f172a',
				// Entity Relationship Diagram Specific
				attributeBackgroundColorOdd: '#1e2230',
				attributeBackgroundColorEven: '#161922',
				attributeTextColor: '#e2e8f0',
				entityBorder: '#3b82f6',
				entityTextColor: '#ffffff',
				// Sequence Diagram Specific
				actorBkg: '#1e2230',
				actorTextColor: '#f8fafc',
				actorBorder: '#3b82f6',
				actorLineColor: '#64748b',
				signalColor: '#e2e8f0',
				signalTextColor: '#f8fafc',
				labelBoxBkgColor: '#1e2230',
				labelBoxBorderColor: '#475569',
				labelTextColor: '#f8fafc',
				loopTextColor: '#f8fafc',
				noteBkgColor: '#2d3748',
				noteTextColor: '#f8fafc',
				noteBorderColor: '#4b5563',
				// Flowchart specific
				nodeBorder: '#3b82f6',
				nodeTextColor: '#f8fafc',
				fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
				fontSize: '13px'
			}
		});

		const searchParams = new URLSearchParams(window.location.search);
		const urlDoc = searchParams.get('doc');
		if (urlDoc) {
			const match = data.docs.find(
				(d) =>
					d.id.toLowerCase() === urlDoc.toLowerCase() ||
					d.relativePath.toLowerCase().includes(urlDoc.toLowerCase())
			);
			if (match) {
				selectDocument(match.id, false);
			}
		}
	});

	function getBadgeClass(badge: string) {
		switch (badge) {
			case 'Spec':
				return 'badge-spec';
			case 'PRD':
				return 'badge-prd';
			case 'TDD':
				return 'badge-tdd';
			case 'Schema':
				return 'badge-schema';
			case 'API Contract':
				return 'badge-api';
			case 'Matrix':
				return 'badge-matrix';
			case 'Architecture':
				return 'badge-arch';
			case 'Code Stub':
				return 'badge-stub';
			default:
				return 'badge-default';
		}
	}
</script>

<svelte:head>
	<title>{currentDoc ? `${currentDoc.title} | Developer Documentation` : 'Developer Documentation'}</title>
</svelte:head>

<div class="codex-container">
	<!-- Top Bar -->
	<header class="codex-header">
		<div class="header-left">
			<button class="mobile-toggle" onclick={() => (isMobileNavOpen = !isMobileNavOpen)}>
				☰
			</button>
			<div class="header-brand">
				<span class="brand-glyph">📚</span>
				<span class="brand-title">The Commons Docs</span>
				<span class="brand-tag">Living Specs</span>
			</div>
		</div>

		<div class="header-right">
			<a href="/tasks" class="back-link">Return to App →</a>
		</div>
	</header>

	<div class="codex-layout">
		<!-- Sidebar / Specs Tree -->
		<aside class="codex-sidebar" class:open={isMobileNavOpen}>
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
								onclick={() => selectDocument(doc.id)}
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
					{#each data.categoryGroups as group}
						<div class="tree-group">
							<div class="group-title">
								<span>{group.name}</span>
								<span class="group-count">{group.docs.length}</span>
							</div>

							{#if group.featureSubGroups && group.featureSubGroups.length > 0}
								{#each group.featureSubGroups as subGroup}
									{@const isOpen = Boolean(openFolders[subGroup.featureName])}
									<div class="subgroup-container">
										<button
											class="subgroup-toggle"
											onclick={() => toggleFolder(subGroup.featureName)}
										>
											<span class="folder-icon">{isOpen ? '📂' : '📁'}</span>
											<span class="subgroup-name">{subGroup.featureName}</span>
											<span class="chevron">{isOpen ? '▾' : '▸'}</span>
										</button>

										{#if isOpen}
											<div class="subgroup-items">
												{#each subGroup.docs as doc}
													<button
														class="sub-doc-btn"
														class:active={selectedDocId === doc.id}
														onclick={() => selectDocument(doc.id)}
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
											onclick={() => selectDocument(doc.id)}
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

		<!-- Main Reader -->
		<main class="codex-content">
			{#if currentDoc}
				<article class="doc-viewer">
					<header class="doc-header">
						<div class="doc-breadcrumbs">
							<span>Docs</span>
							<span>›</span>
							<span>{currentDoc.category}</span>
							{#if currentDoc.featureFolder}
								<span>›</span>
								<span class="feature-highlight">{currentDoc.featureFolder}</span>
							{/if}
							<span>›</span>
							<span class="active-crumb">{currentDoc.title}</span>
						</div>

						<div class="doc-title-row">
							<div>
								<div class="title-with-badge">
									<h1 class="doc-h1">{currentDoc.title}</h1>
									<span class="badge {getBadgeClass(currentDoc.typeBadge)}">{currentDoc.typeBadge}</span>
								</div>

								<div class="copy-helpers">
									<button
										class="copy-chip"
										onclick={() => copyToClipboard(currentDoc.filePath, 'path')}
									>
										<span>{copiedText === 'path' ? '✓ Copied' : currentDoc.filePath}</span>
									</button>
									<button
										class="copy-chip"
										onclick={() =>
											copyToClipboard(`See [${currentDoc.title}](${currentDoc.filePath})`, 'ref')}
									>
										<span>{copiedText === 'ref' ? '✓ Copied Ref' : 'Copy Prompt Ref'}</span>
									</button>
								</div>
							</div>

							<div class="header-tabs">
								<div class="tab-toggle">
									<button
										class:active={activeTab === 'rendered'}
										onclick={() => (activeTab = 'rendered')}
									>
										Docs
									</button>
									<button
										class:active={activeTab === 'routes'}
										onclick={() => (activeTab = 'routes')}
									>
										🌐 Routes ({filteredRoutes.length})
									</button>
									<button
										class:active={activeTab === 'schema'}
										onclick={() => (activeTab = 'schema')}
									>
										⚡ Schema ({filteredSchemaTables.length})
									</button>
									<button
										class:active={activeTab === 'raw'}
										onclick={() => (activeTab = 'raw')}
									>
										Source
									</button>
								</div>
							</div>
						</div>

						<div class="doc-meta">
							<span>~{currentDoc.readingTimeMin} min read</span>
							<span>•</span>
							<span>{currentDoc.wordCount} words</span>
						</div>
					</header>

					{#if activeTab === 'raw'}
						<pre class="raw-code"><code>{currentDoc.content}</code></pre>
					{:else if activeTab === 'routes'}
						<div class="routes-live-container">
							<div class="schema-banner">
								<div class="schema-banner-text">
									<h3>Auto-Generated SvelteKit Route & API Matrix</h3>
									<p>
										Showing <strong>{filteredRoutes.length}</strong> {routeScope === 'feature' ? `routes related to ${currentDoc?.featureFolder || 'current doc'}` : 'total routes in app'}.
									</p>
								</div>
								<div class="banner-controls">
									<div class="scope-toggle">
										<button
											class:active={routeScope === 'feature'}
											onclick={() => (routeScope = 'feature')}
										>
											{currentDoc?.featureFolder || 'This Feature'}
										</button>
										<button
											class:active={routeScope === 'all'}
											onclick={() => (routeScope = 'all')}
										>
											All Routes ({data.routeMatrix?.routes?.length || 0})
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
									<p>No dedicated routes or components registered for <strong>{currentDoc?.featureFolder || 'this feature'}</strong> yet.</p>
									<button class="btn btn-outline" onclick={() => (routeScope = 'all')}>
										View All Routes ({data.routeMatrix?.routes?.length || 0})
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
					{:else if activeTab === 'schema'}
						<div class="schema-live-container">
							<div class="schema-banner">
								<div class="schema-banner-text">
									<h3>Auto-Generated Database Schema</h3>
									<p>
										Showing <strong>{filteredSchemaTables.length}</strong> {schemaScope === 'feature' ? `tables related to ${currentDoc?.featureFolder || 'current doc'}` : 'total tables in Postgres'}.
									</p>
								</div>
								<div class="banner-controls">
									<div class="scope-toggle">
										<button
											class:active={schemaScope === 'feature'}
											onclick={() => (schemaScope = 'feature')}
										>
											{currentDoc?.featureFolder || 'This Feature'}
										</button>
										<button
											class:active={schemaScope === 'all'}
											onclick={() => (schemaScope = 'all')}
										>
											All Tables ({data.schema?.tables?.length || 0})
										</button>
									</div>
									<input
										type="search"
										placeholder="Filter tables or columns..."
										bind:value={schemaSearch}
										class="schema-search-input"
									/>
								</div>
							</div>

							<div class="schema-tables-grid">
								{#each filteredSchemaTables as table}
									<div class="schema-table-card">
										<div class="table-card-header">
											<span class="table-icon">🗄️</span>
											<span class="table-name">{table.name}</span>
											<span class="col-count">{table.columns.length} columns</span>
										</div>

										<table class="columns-table">
											<thead>
												<tr>
													<th>Column</th>
													<th>Type</th>
													<th>Nullable</th>
												</tr>
											</thead>
											<tbody>
												{#each table.columns as col}
													<tr>
														<td class="col-name-cell">
															<code>{col.name}</code>
														</td>
														<td class="col-type-cell">
															<span class="type-pill">{col.type}</span>
														</td>
														<td class="col-null-cell">
															{col.isNullable ? 'YES' : 'NO'}
														</td>
													</tr>
												{/each}
											</tbody>
										</table>

										{#if table.relationships && table.relationships.length > 0}
											<div class="table-relations">
												<span class="rel-title">Foreign Keys:</span>
												{#each table.relationships as rel}
													<div class="rel-item">
														<span>↳ <code>{rel.columns.join(', ')}</code> → <code>{rel.referencedRelation}({rel.referencedColumns.join(', ')})</code></span>
													</div>
												{/each}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="markdown-body">
							{@html renderedHtml}
						</div>
					{/if}
				</article>
			{/if}
		</main>

		<!-- Table of Contents -->
		{#if tableOfContents.length > 1 && activeTab === 'rendered'}
			<aside class="codex-toc">
				<div class="toc-title">ON THIS PAGE</div>
				<nav class="toc-nav">
					{#each tableOfContents as heading}
						<button
							class="toc-item"
							class:sub={heading.level === 3}
							onclick={() => scrollToHeading(heading.id)}
						>
							{heading.text}
						</button>
					{/each}
				</nav>

				<button class="scroll-top-btn" onclick={scrollToTop}>
					↑ Back to top
				</button>
			</aside>
		{/if}
	</div>
</div>

<style>
	.codex-container {
		min-height: 100vh;
		background: var(--bg-primary);
		color: var(--text-primary);
		display: flex;
		flex-direction: column;
	}

	.codex-header {
		height: 56px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
		position: sticky;
		top: 0;
		z-index: 30;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.mobile-toggle {
		display: none;
		background: transparent;
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	@media (max-width: 768px) {
		.mobile-toggle {
			display: block;
		}
	}

	.header-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.brand-glyph {
		font-size: 1.25rem;
	}

	.brand-title {
		font-weight: 700;
		font-size: 0.9375rem;
	}

	.brand-tag {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		color: var(--accent);
	}

	.back-link {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.back-link:hover {
		color: var(--primary);
	}

	.codex-layout {
		display: flex;
		flex: 1;
		position: relative;
	}

	/* Sidebar */
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
		flex-shrink: 0;
	}

	@media (max-width: 768px) {
		.codex-sidebar {
			position: fixed;
			left: 0;
			bottom: 0;
			z-index: 40;
			transform: translateX(-100%);
			transition: transform 0.2s ease;
		}
		.codex-sidebar.open {
			transform: translateX(0);
		}
	}

	.search-section {
		padding: 0.875rem;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.search-input {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		padding: 0.4375rem 0.625rem;
		font-size: 0.75rem;
		color: var(--text-primary);
		border-radius: var(--radius-sm);
		outline: none;
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

	.doc-item-path {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
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

	/* Main Canvas */
	.codex-content {
		flex: 1;
		padding: 2rem 3rem;
		max-width: 900px;
		min-width: 0;
	}

	.doc-breadcrumbs {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}

	.feature-highlight {
		color: var(--primary);
	}

	.active-crumb {
		color: var(--text-primary);
	}

	.doc-title-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-top: 0.75rem;
		gap: 1rem;
	}

	.title-with-badge {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.doc-h1 {
		font-size: 1.75rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}

	.copy-helpers {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.copy-chip {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		cursor: pointer;
	}

	.copy-chip:hover {
		border-color: var(--primary);
		color: var(--primary);
	}

	.tab-toggle {
		display: flex;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.125rem;
	}

	.tab-toggle button {
		background: transparent;
		border: none;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		color: var(--text-muted);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.tab-toggle button.active {
		background: var(--bg-surface);
		color: var(--text-primary);
		font-weight: 600;
	}

	.doc-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
		margin-top: 0.75rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.raw-code {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.25rem;
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		white-space: pre-wrap;
		overflow-x: auto;
		margin-top: 1.5rem;
	}

	/* Markdown Content Styles */
	.markdown-body {
		margin-top: 1.5rem;
		line-height: 1.7;
		font-size: 0.9375rem;
		color: var(--text-secondary);
	}

	.markdown-body :global(h1),
	.markdown-body :global(h2),
	.markdown-body :global(h3),
	.markdown-body :global(h4) {
		color: var(--text-primary);
		margin-top: 1.75rem;
		margin-bottom: 0.75rem;
		font-weight: 700;
	}

	.markdown-body :global(h2) {
		font-size: 1.35rem;
		border-bottom: 1px solid var(--border-subtle);
		padding-bottom: 0.375rem;
	}

	.markdown-body :global(h3) {
		font-size: 1.125rem;
	}

	.markdown-body :global(p) {
		margin-bottom: 1rem;
	}

	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}

	.markdown-body :global(li) {
		margin-bottom: 0.25rem;
	}

	.markdown-body :global(code) {
		font-family: var(--font-mono);
		background: rgba(158, 90, 60, 0.08);
		border: 1px solid rgba(158, 90, 60, 0.18);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.8125rem;
		color: #9E5A3C;
		font-weight: 500;
	}

	:root[data-theme="midnight"] .markdown-body :global(code),
	:root.dark .markdown-body :global(code) {
		background: rgba(212, 155, 85, 0.15);
		border-color: rgba(212, 155, 85, 0.3);
		color: #f6ad55;
	}

	.markdown-body :global(pre) {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1rem;
		overflow-x: auto;
		margin-bottom: 1.25rem;
	}

	.markdown-body :global(pre code) {
		background: transparent;
		padding: 0;
		color: var(--text-primary);
	}

	.markdown-body :global(.mermaid) {
		display: flex;
		justify-content: center;
		background: #11141c;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 1.75rem 1.25rem;
		margin: 1.5rem 0;
		overflow-x: auto;
	}

	.markdown-body :global(.mermaid svg) {
		max-width: 100%;
		height: auto;
	}

	/* High-contrast crisp diagram text */
	.markdown-body :global(.mermaid text),
	.markdown-body :global(.mermaid .node text),
	.markdown-body :global(.mermaid .messageText),
	.markdown-body :global(.mermaid .actor text),
	.markdown-body :global(.mermaid .entity text),
	.markdown-body :global(.mermaid .labelText) {
		fill: #f1f5f9 !important;
		color: #f1f5f9 !important;
		font-weight: 500;
		font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
	}

	.markdown-body :global(.mermaid .row text) {
		fill: #e2e8f0 !important;
	}

	.markdown-body :global(.mermaid .relationshipLine) {
		stroke: #60a5fa !important;
		stroke-width: 1.5px !important;
	}

	.markdown-body :global(.mermaid .node rect),
	.markdown-body :global(.mermaid .node circle),
	.markdown-body :global(.mermaid .node polygon),
	.markdown-body :global(.mermaid .actor) {
		stroke: #3b82f6 !important;
		stroke-width: 1.5px !important;
		fill: #1e2433 !important;
	}

	.markdown-body :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1.25rem;
	}

	.markdown-body :global(th),
	.markdown-body :global(td) {
		border: 1px solid var(--border-subtle);
		padding: 0.5rem 0.75rem;
		text-align: left;
		font-size: 0.8125rem;
	}

	.markdown-body :global(th) {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.markdown-body :global(blockquote) {
		border-left: 3px solid var(--primary);
		padding-left: 1rem;
		margin-left: 0;
		margin-bottom: 1rem;
		color: var(--text-primary);
		background: var(--bg-tertiary);
		padding: 0.75rem 1rem;
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	/* Right TOC */
	.codex-toc {
		width: 220px;
		height: calc(100vh - 56px);
		position: sticky;
		top: 56px;
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		overflow-y: auto;
	}

	@media (max-width: 1100px) {
		.codex-toc {
			display: none;
		}
	}

	.toc-title {
		font-size: 0.6875rem;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.toc-nav {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.toc-item {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 0.75rem;
		text-align: left;
		cursor: pointer;
		line-height: 1.3;
		padding: 0.125rem 0;
	}

	.toc-item.sub {
		padding-left: 0.75rem;
		color: var(--text-muted);
	}

	.toc-item:hover {
		color: var(--primary);
	}

	.scroll-top-btn {
		margin-top: 1rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		font-size: 0.6875rem;
		text-align: left;
		cursor: pointer;
	}

	.scroll-top-btn:hover {
		color: var(--text-primary);
	}

	/* Live Schema Viewer Styles */
	.schema-live-container {
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

	.schema-banner-text code {
		background: var(--bg-tertiary);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: 0.6875rem;
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

	.schema-tables-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
		gap: 1.25rem;
	}

	.schema-table-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.table-card-header {
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
		padding: 0.625rem 0.875rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.table-name {
		font-size: 0.8125rem;
		font-weight: 700;
		font-family: var(--font-mono);
		color: var(--text-primary);
		flex: 1;
	}

	.col-count {
		font-size: 0.6875rem;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}

	.columns-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.columns-table th {
		text-align: left;
		padding: 0.375rem 0.75rem;
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
	}

	.columns-table td {
		padding: 0.375rem 0.75rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.columns-table tr:last-child td {
		border-bottom: none;
	}

	.col-name-cell code {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--text-primary);
	}

	.type-pill {
		font-family: var(--font-mono);
		font-size: 0.625rem;
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-sm);
		background: rgba(59, 130, 246, 0.1);
		color: #60a5fa;
		border: 1px solid rgba(59, 130, 246, 0.2);
	}

	.col-null-cell {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
	}

	.table-relations {
		background: var(--bg-secondary);
		border-top: 1px solid var(--border-subtle);
		padding: 0.5rem 0.75rem;
		font-size: 0.6875rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.rel-title {
		font-weight: 700;
		color: var(--text-muted);
		font-size: 0.625rem;
		text-transform: uppercase;
	}

	.rel-item {
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 0.6875rem;
	}

	/* Routes Matrix Styles */
	.routes-live-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-top: 1rem;
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
