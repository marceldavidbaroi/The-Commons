<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { moviesStore } from '$lib/stores/movies.svelte';
	import { downloadSampleTemplate, exportFilteredMovies } from '$lib/utils/movies-export';
	import MoviesHeader from './_components/MoviesHeader.svelte';
	import MoviesFilterSidebar from './_components/MoviesFilterSidebar.svelte';
	import MoviesList from './_components/MoviesList.svelte';
	import MovieDetailsPane from './_components/MovieDetailsPane.svelte';

	let searchInputRef = $state<HTMLInputElement | null>(null);
	let mobileFiltersOpen = $state(false);

	onMount(() => {
		moviesStore.hydrateFromUrl(page.url);
		moviesStore.loadInitial();
	});

	function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement | null;
		const isInput =
			target?.tagName === 'INPUT' ||
			target?.tagName === 'TEXTAREA' ||
			target?.tagName === 'SELECT';

		if (e.key === '/' && !isInput) {
			e.preventDefault();
			searchInputRef?.focus();
		} else if (e.key === 'Escape') {
			if (mobileFiltersOpen) {
				mobileFiltersOpen = false;
			} else if (moviesStore.rightPaneMode !== 'closed') {
				moviesStore.closeRightPane();
				moviesStore.syncToUrl();
			}
		}
	}
	function handleExport(format: 'xlsx' | 'csv' | 'template') {
		if (format === 'template') {
			downloadSampleTemplate();
			return;
		}
		exportFilteredMovies(moviesStore.activeTab, moviesStore.filters, moviesStore.sort, format);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="movies-workspace">
	<MoviesHeader
		onToggleMobileFilters={() => (mobileFiltersOpen = !mobileFiltersOpen)}
		onExport={handleExport}
	/>

	<div
		class="workspace-grid"
		class:has-right-pane={moviesStore.rightPaneMode !== 'closed'}
	>
		<div class="sidebar-slot" class:mobile-open={mobileFiltersOpen}>
			<MoviesFilterSidebar bind:searchInputRef />
		</div>

		<main class="list-slot">
			<MoviesList />
		</main>

		{#if moviesStore.rightPaneMode !== 'closed'}
			<div class="right-pane-slot">
				<MovieDetailsPane />
			</div>
		{/if}
	</div>
</div>

<style>
	.movies-workspace {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
		overflow: hidden;
	}

	.workspace-grid {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		position: relative;
	}

	.workspace-grid.has-right-pane {
		grid-template-columns: 260px minmax(0, 1fr) 400px;
	}

	.sidebar-slot,
	.list-slot,
	.right-pane-slot {
		min-height: 0;
		height: 100%;
	}

	@media (max-width: 1199px) {
		.workspace-grid,
		.workspace-grid.has-right-pane {
			grid-template-columns: 240px minmax(0, 1fr);
		}

		.right-pane-slot {
			position: absolute;
			top: 0;
			right: 0;
			bottom: 0;
			width: 400px;
			max-width: 100%;
			z-index: 20;
		}
	}

	@media (max-width: 767px) {
		.workspace-grid,
		.workspace-grid.has-right-pane {
			grid-template-columns: minmax(0, 1fr);
		}

		.sidebar-slot {
			display: none;
			position: absolute;
			inset: 0;
			z-index: 25;
		}

		.sidebar-slot.mobile-open {
			display: block;
		}

		.right-pane-slot {
			width: 100%;
		}
	}
</style>
