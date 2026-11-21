<script lang="ts">
	import { onMount } from 'svelte';
	import './music.css';
	import { musicStore } from '$lib/stores/music.svelte';
	import { fetchAllFilteredSongs } from '$lib/services/music-service';
	import { exportSongsToExcel } from '$lib/utils/music';
	import FilterRail from './_components/FilterRail.svelte';
	import SongCatalog from './_components/SongCatalog.svelte';
	import SongFormDrawer from './_components/SongFormDrawer.svelte';
	import ExcelImportDrawer from './_components/ExcelImportDrawer.svelte';
	import PlayerBar from './_components/PlayerBar.svelte';

	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let exporting = $state(false);
	let ytPlayer = $state<any>(null);

	onMount(() => {
		void musicStore.loadInitial();
	});

	function handleSearchInput(e: Event) {
		const value = (e.currentTarget as HTMLInputElement).value;
		musicStore.filters.search = value;
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			void musicStore.loadInitial();
		}, 300);
	}

	async function handleExport() {
		if (exporting) return;
		exporting = true;
		try {
			const allMatching = await fetchAllFilteredSongs(musicStore.filters);
			exportSongsToExcel(allMatching, 'xlsx');
		} finally {
			exporting = false;
		}
	}
</script>

<div class="music-page">
	<!-- Top Header Bar (56px) -->
	<header class="h-14 border-b border-border flex items-center justify-between gap-3">
		<div class="flex items-center gap-3 min-w-0 flex-1">
			<h1 class="text-base font-semibold tracking-tight shrink-0">/music</h1>
			<input
				type="search"
				value={musicStore.filters.search}
				oninput={handleSearchInput}
				placeholder="Search title or artist..."
				class="w-full max-w-xs h-8 px-2.5 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
			/>
		</div>

		<div class="flex items-center gap-2 shrink-0">
			<button
				type="button"
				onclick={() => musicStore.openAddDrawer()}
				class="h-8 px-3 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
			>
				+ Add Song
			</button>
			<button
				type="button"
				onclick={() => musicStore.openExcelDrawer()}
				class="h-8 px-3 text-xs font-medium rounded border border-border hover:bg-accent cursor-pointer"
			>
				↑ Import Excel
			</button>
			<button
				type="button"
				disabled={exporting}
				onclick={handleExport}
				class="h-8 px-3 text-xs font-medium rounded border border-border hover:bg-accent disabled:opacity-50 cursor-pointer"
			>
				{exporting ? 'Exporting...' : '↓ Export Excel'}
			</button>
		</div>
	</header>

	<!-- Collapsible Inline Drawers -->
	{#if musicStore.activeDrawer === 'song'}
		<SongFormDrawer />
	{:else if musicStore.activeDrawer === 'excel'}
		<ExcelImportDrawer />
	{/if}

	<!-- 2-Column Split Workspace -->
	<div class="music-workspace">
		<FilterRail onPlayerReady={(p) => (ytPlayer = p)} />
		<SongCatalog />
	</div>

	<PlayerBar player={ytPlayer} />
</div>
