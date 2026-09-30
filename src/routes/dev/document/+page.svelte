<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import type { PageData } from './$types';
	import type { DocItem } from '$lib/server/docs-loader';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedBadgeFilter = $state<string | null>(null);
	let selectedDocId = $state<string>('');
	let activeTab = $state<'rendered' | 'raw'>('rendered');
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

	// Render markdown HTML
	let renderedHtml = $derived.by(() => {
		if (!currentDoc) return '';
		return marked.parse(currentDoc.content, { async: false }) as string;
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
	<title>{currentDoc ? `${currentDoc.title} | Documentation Codex` : 'Documentation Codex'}</title>
</svelte:head>

<div class="codex-container">
	<!-- Top Bar -->
	<header class="codex-header">
		<div class="header-left">
			<button class="mobile-toggle" onclick={() => (isMobileNavOpen = !isMobileNavOpen)}>
				☰
			</button>
			<div class="header-brand">
				<span class="brand-glyph">🏛️</span>
				<span class="brand-title">The Commons Codex</span>
				<span class="brand-tag">v2 Specs</span>
			</div>
		</div>

		<div class="header-right">
			<a href="/app" class="back-link">Return to Sanctuary →</a>
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
					{#each ['PRD', 'Schema', 'API Contract', 'TDD', 'Code Stub'] as badge}
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
		background: var(--bg-tertiary);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.8125rem;
		color: var(--accent);
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
</style>
