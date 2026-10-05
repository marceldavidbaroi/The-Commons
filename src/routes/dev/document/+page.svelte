<script lang="ts">
	import { onMount } from 'svelte';
	import mermaid from 'mermaid';
	import type { PageData } from './$types';
	import DocSidebar from './components/DocSidebar.svelte';
	import DocMarkdownView from './components/DocMarkdownView.svelte';
	import DocTableOfContents from './components/DocTableOfContents.svelte';
	import DocRouteMatrix from './components/DocRouteMatrix.svelte';
	import DocSchemaInspector from './components/DocSchemaInspector.svelte';
	import { getBadgeClass } from './components/docs-helpers';

	let { data }: { data: PageData } = $props();

	let selectedDocId = $state<string>('');
	let activeTab = $state<'rendered' | 'raw' | 'schema' | 'routes'>('rendered');
	let copiedText = $state<string | null>(null);
	let isMobileNavOpen = $state(false);
	let sidebarComponent: any;

	// Current active document
	let currentDoc = $derived.by(() => {
		return data.docs.find((d) => d.id === selectedDocId) || data.docs[0];
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
		if (doc?.featureFolder && sidebarComponent?.ensureFolderOpen) {
			sidebarComponent.ensureFolderOpen(doc.featureFolder);
		}
	}

	function copyToClipboard(text: string, label: string) {
		navigator.clipboard.writeText(text);
		copiedText = label;
		setTimeout(() => (copiedText = null), 2000);
	}

	onMount(() => {
		mermaid.initialize({
			startOnLoad: false,
			theme: 'base',
			securityLevel: 'loose',
			themeVariables: {
				darkMode: true,
				background: '#0d0e11',
				mainBkg: '#141416',
				primaryColor: '#18181b',
				primaryTextColor: '#f4f4f5',
				primaryBorderColor: '#27272a',
				lineColor: '#52525b',
				secondaryColor: '#141416',
				tertiaryColor: '#0d0e11',
				attributeBackgroundColorOdd: '#141416',
				attributeBackgroundColorEven: '#18181b',
				attributeTextColor: '#d4d4d8',
				entityBorder: '#27272a',
				entityTextColor: '#f4f4f5',
				actorBkg: '#141416',
				actorTextColor: '#f4f4f5',
				actorBorder: '#27272a',
				actorLineColor: '#52525b',
				signalColor: '#f4f4f5',
				signalTextColor: '#f4f4f5',
				labelBoxBkgColor: '#18181b',
				labelBoxBorderColor: '#27272a',
				labelTextColor: '#f4f4f5',
				loopTextColor: '#f4f4f5',
				noteBkgColor: '#18181b',
				noteTextColor: '#f4f4f5',
				noteBorderColor: '#27272a',
				nodeBorder: '#27272a',
				nodeTextColor: '#f4f4f5',
				fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
				fontSize: '12px'
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
		<DocSidebar
			bind:this={sidebarComponent}
			docs={data.docs}
			categoryGroups={data.categoryGroups}
			{selectedDocId}
			isOpen={isMobileNavOpen}
			onSelectDoc={selectDocument}
		/>

		<!-- Main Reader -->
		<main class="codex-content" class:wide-mode={activeTab === 'schema' || activeTab === 'routes'}>
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
										🌐 Routes
									</button>
									<button
										class:active={activeTab === 'schema'}
										onclick={() => (activeTab = 'schema')}
									>
										⚡ Schema
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

					{#if activeTab === 'rendered' || activeTab === 'raw'}
						<DocMarkdownView doc={currentDoc} {activeTab} />
					{:else if activeTab === 'routes'}
						<DocRouteMatrix routeMatrix={data.routeMatrix} featureFolder={currentDoc?.featureFolder} />
					{:else if activeTab === 'schema'}
						<DocSchemaInspector schema={data.schema} featureFolder={currentDoc?.featureFolder} />
					{/if}
				</article>
			{/if}
		</main>

		<!-- Table of Contents -->
		{#if activeTab === 'rendered' && currentDoc}
			<DocTableOfContents content={currentDoc.content} />
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

	.codex-content {
		flex: 1;
		padding: 2rem 3rem;
		max-width: 960px;
		min-width: 0;
	}

	.codex-content.wide-mode {
		max-width: 100%;
		padding: 1.5rem 2rem;
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
