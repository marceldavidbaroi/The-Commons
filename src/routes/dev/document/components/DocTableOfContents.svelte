<script lang="ts">
	let {
		content
	}: {
		content: string;
	} = $props();

	// Headings for table of contents
	let tableOfContents = $derived.by(() => {
		if (!content) return [];
		const lines = content.split('\n');
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

	function scrollToHeading(id: string) {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

{#if tableOfContents.length > 1}
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

<style>
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
