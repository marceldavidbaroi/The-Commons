<script lang="ts">
	import { moviesStore } from '$lib/stores/movies.svelte';
	import type { RatingFilter, RecommendAudience, ReleaseEra } from '$lib/types/movies';

	interface Props {
		searchInputRef?: HTMLInputElement | null;
	}

	let { searchInputRef = $bindable(null) }: Props = $props();

	let searchText = $state(moviesStore.filters.search);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	const langNames = new Intl.DisplayNames(['en'], { type: 'language' });
	const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

	const ERAS: Array<{ value: ReleaseEra; label: string }> = [
		{ value: '2020s', label: '2020s' },
		{ value: '2010s', label: '2010s' },
		{ value: '2000s', label: '2000s' },
		{ value: '1990s', label: '1990s' },
		{ value: 'pre_1990', label: '< 1990' }
	];

	const AUDIENCES: Array<{ value: RecommendAudience; label: string }> = [
		{ value: 'partner', label: 'Partner' },
		{ value: 'friends', label: 'Friends' },
		{ value: 'family', label: 'Family' },
		{ value: 'cinephiles', label: 'Cinephiles' },
		{ value: 'solo_rewatch', label: 'Solo' },
		{ value: 'anyone', label: 'Anyone' }
	];

	const RATINGS: Array<{ value: RatingFilter; label: string }> = [
		{ value: 'all', label: 'All' },
		{ value: '9+', label: '9+' },
		{ value: '8+', label: '8+' },
		{ value: '7+', label: '7+' },
		{ value: 'unrated', label: 'Unrated' }
	];

	function formatLang(code: string): string {
		try {
			return langNames.of(code) ?? code.toUpperCase();
		} catch {
			return code.toUpperCase();
		}
	}

	function formatRegion(code: string): string {
		try {
			return regionNames.of(code) ?? code;
		} catch {
			return code;
		}
	}

	function applyAndReload() {
		moviesStore.syncToUrl();
		moviesStore.reloadList();
	}

	function onSearchInput(e: Event) {
		const val = (e.target as HTMLInputElement).value;
		searchText = val;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			moviesStore.filters.search = val;
			applyAndReload();
		}, 250);
	}

	function toggleArrayFilter<T extends string>(arr: T[], value: T): T[] {
		return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
	}

	function handleReset() {
		searchText = '';
		moviesStore.resetFilters();
		applyAndReload();
	}
</script>

<aside class="filter-sidebar">
	<div class="filter-section">
		<label class="filter-label" for="movie-search-input">Search Title</label>
		<input
			id="movie-search-input"
			bind:this={searchInputRef}
			type="text"
			class="search-input"
			placeholder="Search title... (/)"
			value={searchText}
			oninput={onSearchInput}
		/>
	</div>

	<div class="filter-section">
		<span class="filter-label">Media Type</span>
		<div class="pill-group">
			{#each [
				{ value: 'all', label: 'All' },
				{ value: 'movie', label: 'Movies' },
				{ value: 'series', label: 'Series' }
			] as mt}
				<button
					type="button"
					class="pill"
					class:active={moviesStore.filters.mediaType === mt.value}
					onclick={() => {
						moviesStore.filters.mediaType = mt.value as 'all' | 'movie' | 'series';
						applyAndReload();
					}}
				>
					{mt.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="filter-section">
		<span class="filter-label">Personal Rating</span>
		<div class="pill-group">
			{#each RATINGS as r}
				<button
					type="button"
					class="pill"
					class:active={moviesStore.filters.rating === r.value}
					onclick={() => {
						moviesStore.filters.rating = r.value;
						applyAndReload();
					}}
				>
					{r.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="filter-section">
		<span class="filter-label">Release Era</span>
		<div class="pill-group">
			{#each ERAS as era}
				<button
					type="button"
					class="pill"
					class:active={moviesStore.filters.era === era.value}
					onclick={() => {
						moviesStore.filters.era = moviesStore.filters.era === era.value ? null : era.value;
						applyAndReload();
					}}
				>
					{era.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="filter-section">
		<span class="filter-label">Audience</span>
		<div class="pill-group">
			{#each AUDIENCES as aud}
				<button
					type="button"
					class="pill"
					class:active={moviesStore.filters.audience.includes(aud.value)}
					onclick={() => {
						moviesStore.filters.audience = toggleArrayFilter(moviesStore.filters.audience, aud.value);
						applyAndReload();
					}}
				>
					{aud.label}
				</button>
			{/each}
		</div>
	</div>

	{#if moviesStore.facets.languages.length > 0}
		<div class="filter-section">
			<span class="filter-label">Language</span>
			<div class="pill-group">
				{#each moviesStore.facets.languages as lang}
					<button
						type="button"
						class="pill"
						class:active={moviesStore.filters.languages.includes(lang)}
						onclick={() => {
							moviesStore.filters.languages = toggleArrayFilter(moviesStore.filters.languages, lang);
							applyAndReload();
						}}
					>
						{formatLang(lang)}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if moviesStore.facets.origin_countries.length > 0}
		<div class="filter-section">
			<span class="filter-label">Origin Country</span>
			<div class="pill-group">
				{#each moviesStore.facets.origin_countries as country}
					<button
						type="button"
						class="pill"
						class:active={moviesStore.filters.originCountries.includes(country)}
						onclick={() => {
							moviesStore.filters.originCountries = toggleArrayFilter(
								moviesStore.filters.originCountries,
								country
							);
							applyAndReload();
						}}
					>
						{formatRegion(country)}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if moviesStore.facets.genres.length > 0}
		<div class="filter-section">
			<span class="filter-label">Genre</span>
			<div class="pill-group">
				{#each moviesStore.facets.genres as genre}
					<button
						type="button"
						class="pill"
						class:active={moviesStore.filters.genres.includes(genre)}
						onclick={() => {
							moviesStore.filters.genres = toggleArrayFilter(moviesStore.filters.genres, genre);
							applyAndReload();
						}}
					>
						{genre}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if moviesStore.facets.tags.length > 0}
		<div class="filter-section">
			<span class="filter-label">Tags</span>
			<div class="pill-group">
				{#each moviesStore.facets.tags as t}
					<button
						type="button"
						class="pill"
						class:active={moviesStore.filters.tags.includes(t.tag)}
						onclick={() => {
							moviesStore.filters.tags = toggleArrayFilter(moviesStore.filters.tags, t.tag);
							applyAndReload();
						}}
					>
						#{t.tag} ({t.count})
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if moviesStore.activeFilterCount > 0}
		<button type="button" class="reset-btn" onclick={handleReset}>
			Reset Filters ({moviesStore.activeFilterCount})
		</button>
	{/if}
</aside>

<style>
	.filter-sidebar {
		background: var(--bg-primary);
		border-right: 1px solid var(--border-subtle);
		padding: 14px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 16px;
		height: 100%;
	}

	.filter-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.filter-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.search-input {
		width: 100%;
		height: 32px;
		padding: 0 10px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		font-size: 13px;
		color: var(--text-primary);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.pill-group {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.pill {
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 11px;
		padding: 3px 8px;
		border-radius: 999px;
		cursor: pointer;
	}

	.pill:hover {
		background: var(--bg-tertiary);
	}

	.pill.active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.reset-btn {
		margin-top: auto;
		height: 32px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		color: var(--text-primary);
		cursor: pointer;
	}

	.reset-btn:hover {
		background: var(--bg-tertiary);
	}
</style>
