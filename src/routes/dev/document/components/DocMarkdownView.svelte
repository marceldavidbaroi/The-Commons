<script lang="ts">
	import { tick } from 'svelte';
	import { marked } from 'marked';
	import mermaid from 'mermaid';
	import type { DocItem } from '$lib/server/docs-loader';

	let {
		doc,
		activeTab
	}: {
		doc: DocItem;
		activeTab: 'rendered' | 'raw';
	} = $props();

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
		if (!doc) return '';
		return marked.parse(doc.content, { async: false, renderer }) as string;
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
</script>

{#if activeTab === 'raw'}
	<pre class="raw-code"><code>{doc.content}</code></pre>
{:else}
	<div class="markdown-body">
		{@html renderedHtml}
	</div>
{/if}

<style>
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
		background-color: #0d0e11;
		background-image: radial-gradient(#27272a 1px, transparent 1px);
		background-size: 20px 20px;
		border: 1px solid #27272a;
		border-radius: var(--radius-md);
		padding: 2rem 1.5rem;
		margin: 1.5rem 0;
		overflow-x: auto;
	}

	.markdown-body :global(.mermaid svg) {
		max-width: 100%;
		height: auto;
	}

	.markdown-body :global(.mermaid text),
	.markdown-body :global(.mermaid .node text),
	.markdown-body :global(.mermaid .messageText),
	.markdown-body :global(.mermaid .actor text),
	.markdown-body :global(.mermaid .entity text),
	.markdown-body :global(.mermaid .labelText) {
		fill: #f4f4f5 !important;
		color: #f4f4f5 !important;
		font-weight: 500;
		font-family: var(--font-mono, ui-monospace, monospace) !important;
		font-size: 12px;
	}

	.markdown-body :global(.mermaid .row text) {
		fill: #d4d4d8 !important;
	}

	.markdown-body :global(.mermaid .relationshipLine) {
		stroke: #52525b !important;
		stroke-width: 1.25px !important;
	}

	.markdown-body :global(.mermaid .node rect),
	.markdown-body :global(.mermaid .node circle),
	.markdown-body :global(.mermaid .node polygon),
	.markdown-body :global(.mermaid .actor),
	.markdown-body :global(.mermaid .entityBox) {
		stroke: #27272a !important;
		stroke-width: 1px !important;
		fill: #141416 !important;
		rx: 6px;
		ry: 6px;
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
</style>
