<script lang="ts">
	import { moviesStore } from '$lib/stores/movies.svelte';
	import type { MovieTab } from '$lib/types/movies';

	interface Props {
		onToggleMobileFilters?: () => void;
		onExport?: (format: 'xlsx' | 'csv' | 'template') => void;
	}

	let { onToggleMobileFilters, onExport }: Props = $props();
	let copied = $state(false);
	let exportOpen = $state(false);

	const watchedCount = $derived(moviesStore.facets.counts_by_status.watched ?? 0);
	const watchlistCount = $derived(moviesStore.facets.counts_by_status.watchlist ?? 0);
	const recCount = $derived(moviesStore.facets.recommendation_count ?? 0);

	function selectTab(tab: MovieTab) {
		if (moviesStore.activeTab === tab) return;
		moviesStore.activeTab = tab;
		moviesStore.syncToUrl();
		moviesStore.reloadList();
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Ignore clipboard errors
		}
	}

	function handleExport(format: 'xlsx' | 'csv' | 'template') {
		exportOpen = false;
		onExport?.(format);
	}
</script>

<header class="movies-header">
	<div class="header-left">
		{#if onToggleMobileFilters}
			<button type="button" class="btn-secondary mobile-filter-btn" onclick={onToggleMobileFilters}>
				Filters{moviesStore.activeFilterCount > 0 ? ` (${moviesStore.activeFilterCount})` : ''}
			</button>
		{/if}
		<h1 class="page-title">/movies</h1>
		<nav class="tabs" aria-label="Movie lists">
			<button
				type="button"
				class="tab-btn"
				class:active={moviesStore.activeTab === 'watched'}
				onclick={() => selectTab('watched')}
			>
				Watched ({watchedCount})
			</button>
			<button
				type="button"
				class="tab-btn"
				class:active={moviesStore.activeTab === 'watchlist'}
				onclick={() => selectTab('watchlist')}
			>
				Wish List ({watchlistCount})
			</button>
			<button
				type="button"
				class="tab-btn"
				class:active={moviesStore.activeTab === 'recommendations'}
				onclick={() => selectTab('recommendations')}
			>
				Recommendations ({recCount})
			</button>
		</nav>
	</div>

	<div class="header-actions">
		<div class="export-wrap">
			<button
				type="button"
				class="btn-secondary"
				onclick={() => (exportOpen = !exportOpen)}
			>
				Export ▾
			</button>
			{#if exportOpen}
				<div class="export-menu">
					<button type="button" onclick={() => handleExport('xlsx')}>Export .xlsx</button>
					<button type="button" onclick={() => handleExport('csv')}>Export .csv</button>
					<button type="button" onclick={() => handleExport('template')}>Sample Template</button>
				</div>
			{/if}
		</div>
		<button type="button" class="btn-secondary" onclick={() => moviesStore.openImport()}>
			Import
		</button>
		<button type="button" class="btn-secondary" onclick={copyLink}>
			{copied ? 'Copied' : 'Copy Link'}
		</button>
		<button type="button" class="btn-primary" onclick={() => moviesStore.openAdd()}>
			+ Add
		</button>
	</div>
</header>

<style>
	.movies-header {
		height: 52px;
		padding: 0 16px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
	}

	.page-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
		white-space: nowrap;
	}

	.tabs {
		display: flex;
		align-items: center;
		gap: 4px;
		background: var(--bg-tertiary);
		padding: 3px;
		border-radius: 6px;
	}

	.tab-btn {
		border: none;
		background: transparent;
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 500;
		padding: 4px 10px;
		border-radius: 4px;
		cursor: pointer;
		white-space: nowrap;
	}

	.tab-btn.active {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn-secondary {
		height: 30px;
		padding: 0 10px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}

	.btn-secondary:hover {
		background: var(--bg-tertiary);
	}

	.btn-primary {
		height: 30px;
		padding: 0 12px;
		background: var(--primary);
		border: 1px solid var(--primary);
		border-radius: 6px;
		color: var(--primary-foreground);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}

	.export-wrap {
		position: relative;
	}

	.export-menu {
		position: absolute;
		top: 34px;
		right: 0;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		padding: 4px;
		display: flex;
		flex-direction: column;
		min-width: 140px;
		z-index: 30;
	}

	.export-menu button {
		border: none;
		background: transparent;
		text-align: left;
		padding: 6px 10px;
		font-size: 12px;
		color: var(--text-primary);
		border-radius: 4px;
		cursor: pointer;
	}

	.export-menu button:hover {
		background: var(--bg-tertiary);
	}

	.mobile-filter-btn {
		display: none;
	}

	@media (max-width: 767px) {
		.movies-header {
			padding: 0 10px;
		}
		.mobile-filter-btn {
			display: inline-flex;
			align-items: center;
		}
		.page-title,
		.export-wrap,
		.header-actions > button:nth-child(2),
		.header-actions > button:nth-child(3) {
			display: none;
		}
		.tabs {
			overflow-x: auto;
		}
	}
</style>
