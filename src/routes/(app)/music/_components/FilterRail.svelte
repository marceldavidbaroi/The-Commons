<script lang="ts">
	import { musicStore } from '$lib/stores/music.svelte';
	import { getYoutubeQueueUrl } from '$lib/utils/music';
	import HeartIcon from './HeartIcon.svelte';

	const LANGUAGES = $derived(musicStore.filterOptions.language);
	const GENRES = $derived(musicStore.filterOptions.genre);
	const VERSIONS = $derived(musicStore.filterOptions.version);
	const VIBES = $derived(musicStore.filterOptions.vibe);

	function toggleArrayFilter(key: 'language' | 'genre' | 'version' | 'vibe', val: string | null) {
		if (val === null) {
			musicStore.filters[key] = [];
		} else {
			const current = musicStore.filters[key];
			musicStore.filters[key] = current.includes(val)
				? current.filter((v) => v !== val)
				: [...current, val];
		}
		void musicStore.loadInitial();
	}

	function setEnergy(level: number) {
		musicStore.filters.energy = musicStore.filters.energy === level ? null : level;
		void musicStore.loadInitial();
	}

	function toggleFavouriteFilter() {
		musicStore.filters.minRating = musicStore.filters.minRating === 5 ? null : 5;
		void musicStore.loadInitial();
	}

	let confirmingResetFavs = $state(false);
	let resetConfirmText = $state('');
	let resettingFavs = $state(false);

	function openResetModal() {
		resetConfirmText = '';
		confirmingResetFavs = true;
	}

	async function handleResetFavourites() {
		if (resetConfirmText.trim().toLowerCase() !== 'reset') return;
		resettingFavs = true;
		try {
			await musicStore.resetAllFavourites();
			confirmingResetFavs = false;
			resetConfirmText = '';
		} finally {
			resettingFavs = false;
		}
	}

	function toggleNeedsAttention() {
		musicStore.filters.needsAttention = !musicStore.filters.needsAttention;
		void musicStore.loadInitial();
	}

	const youtubeQueueHref = $derived(
		musicStore.queue.length > 0
			? getYoutubeQueueUrl(musicStore.queue.map((s) => s.youtube_id))
			: musicStore.songs.length > 0
				? getYoutubeQueueUrl(musicStore.songs.filter((s) => s.is_active).map((s) => s.youtube_id))
				: null
	);
</script>

<aside class="w-full lg:w-[340px] lg:shrink-0 flex flex-col gap-3">
	<!-- 1. Pinned Playback Launchers -->
	<div class="border border-border rounded-md bg-card p-3 flex flex-col gap-2">
		<div class="grid grid-cols-2 gap-2">
			<button
				type="button"
				onclick={() => musicStore.playSerial()}
				class="py-1.5 px-2.5 text-xs font-medium rounded border border-border hover:bg-accent cursor-pointer transition-colors"
			>
				▶ Play Serial
			</button>
			<button
				type="button"
				onclick={() => musicStore.playShuffled()}
				class="py-1.5 px-2.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity inline-flex items-center justify-center gap-1.5"
			>
				<svg
					class="w-3.5 h-3.5 shrink-0"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m18 14 4 4-4 4" />
					<path d="m18 2 4 4-4 4" />
					<path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
					<path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
					<path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
				</svg>
				Shuffle
			</button>
		</div>

		{#if youtubeQueueHref}
			<a
				href={youtubeQueueHref}
				target="_blank"
				rel="noopener noreferrer"
				class="text-center text-xs text-muted-foreground hover:text-foreground hover:underline py-0.5"
			>
				↗ Open Queue in YouTube
			</a>
		{/if}
	</div>

	<!-- 2. Embedded YouTube Stage -->
	{#if musicStore.upNext.length > 0}
		<div class="border border-border rounded-md bg-card p-3 flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Up Next ({musicStore.upNext.length})</span>
			{#each musicStore.upNext as nextSong, offset (nextSong.id)}
				{@const queueIdx = musicStore.currentIndex + 1 + offset}
				<div class="flex items-center justify-between gap-2 text-xs py-0.5">
					<button
						type="button"
						onclick={() => musicStore.jumpToQueueIndex(queueIdx)}
						class="truncate text-left hover:text-primary cursor-pointer flex-1"
					>
						{offset + 1}. {nextSong.title}
						{#if nextSong.artist}
							<span class="text-muted-foreground">— {nextSong.artist}</span>
						{/if}
					</button>
					<button
						type="button"
						onclick={() => musicStore.removeFromQueue(nextSong.id)}
						title="Remove from queue"
						class="text-muted-foreground hover:text-destructive cursor-pointer px-1"
					>
						✕
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- 3. Compact Filters -->
	<div class="border border-border rounded-md bg-card p-3 flex flex-col gap-2.5">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Filters
			</span>
			{#if musicStore.hasActiveFilters}
				<button
					type="button"
					onclick={() => musicStore.resetFilters()}
					class="text-xs text-primary hover:underline cursor-pointer"
				>
					Reset
				</button>
			{/if}
		</div>

		<!-- Language (always visible, compact) -->
		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Language</span>
			<div class="flex flex-wrap gap-1">
				<button
					type="button"
					onclick={() => toggleArrayFilter('language', null)}
					class="px-2 py-0.5 text-xs rounded border cursor-pointer transition-colors {musicStore.filters.language.length === 0
						? 'bg-primary text-primary-foreground border-primary'
						: 'border-border text-muted-foreground hover:text-foreground'}"
				>
					All
				</button>
				{#each LANGUAGES as lang}
					<button
						type="button"
						onclick={() => toggleArrayFilter('language', lang)}
						class="px-2 py-0.5 text-xs rounded border capitalize cursor-pointer transition-colors {musicStore.filters.language.includes(lang)
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{lang}
					</button>
				{/each}
			</div>
		</div>

		<!-- Energy & Min Rating -->
		<div class="flex flex-col gap-2">
			<div class="flex flex-col gap-1">
				<span class="text-[11px] font-medium text-muted-foreground">Energy</span>
				<div class="flex gap-1">
					{#each [1, 2, 3, 4, 5] as lvl}
						<button
							type="button"
							onclick={() => setEnergy(lvl)}
							class="flex-1 py-0.5 text-xs rounded border cursor-pointer transition-colors {musicStore.filters.energy === lvl
								? 'bg-primary text-primary-foreground border-primary'
								: 'border-border text-muted-foreground hover:text-foreground'}"
						>
							{lvl}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-1">
				<div class="flex items-center justify-between">
					<span class="text-[11px] font-medium text-muted-foreground">Favourite</span>
					<button
						type="button"
						onclick={openResetModal}
						class="text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
					>
						Reset All
					</button>
				</div>
				<button
					type="button"
					onclick={toggleFavouriteFilter}
					aria-pressed={musicStore.filters.minRating === 5}
					class="w-full py-1 px-2 text-xs rounded border cursor-pointer transition-colors flex items-center justify-center gap-1.5 {musicStore.filters.minRating === 5
						? 'bg-primary text-primary-foreground border-primary'
						: 'border-border text-muted-foreground hover:text-foreground'}"
				>
					<HeartIcon filled={musicStore.filters.minRating === 5} size={12} />
					<span>Favourites Only</span>
				</button>
			</div>
		</div>

		<!-- Collapsible Genre -->
		<details style="border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
			<summary style="font-size: 11px; font-weight: 500; color: var(--text-muted); cursor: pointer; display: flex; justify-content: space-between;">
				<span>Genre {musicStore.filters.genre.length > 0 ? `(${musicStore.filters.genre.length})` : ''}</span>
				<span>▾</span>
			</summary>
			<div class="flex flex-wrap gap-1" style="margin-top: 0.5rem; max-height: 260px; overflow-y: auto;">
				<button
					type="button"
					onclick={() => toggleArrayFilter('genre', null)}
					class="px-2 py-0.5 text-xs rounded border cursor-pointer {musicStore.filters.genre.length === 0 ? 'bg-primary text-primary-foreground border-primary' : ''}"
				>
					All
				</button>
				{#each GENRES as genre}
					<button
						type="button"
						onclick={() => toggleArrayFilter('genre', genre)}
						class="px-2 py-0.5 text-xs rounded border capitalize cursor-pointer {musicStore.filters.genre.includes(genre) ? 'bg-primary text-primary-foreground border-primary' : ''}"
					>
						{genre}
					</button>
				{/each}
			</div>
		</details>

		<!-- Collapsible Version -->
		<details style="border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
			<summary style="font-size: 11px; font-weight: 500; color: var(--text-muted); cursor: pointer; display: flex; justify-content: space-between;">
				<span>Version {musicStore.filters.version.length > 0 ? `(${musicStore.filters.version.length})` : ''}</span>
				<span>▾</span>
			</summary>
			<div class="flex flex-wrap gap-1" style="margin-top: 0.5rem; max-height: 260px; overflow-y: auto;">
				<button
					type="button"
					onclick={() => toggleArrayFilter('version', null)}
					class="px-2 py-0.5 text-xs rounded border cursor-pointer {musicStore.filters.version.length === 0 ? 'bg-primary text-primary-foreground border-primary' : ''}"
				>
					All
				</button>
				{#each VERSIONS as ver}
					<button
						type="button"
						onclick={() => toggleArrayFilter('version', ver)}
						class="px-2 py-0.5 text-xs rounded border capitalize cursor-pointer {musicStore.filters.version.includes(ver) ? 'bg-primary text-primary-foreground border-primary' : ''}"
					>
						{ver}
					</button>
				{/each}
			</div>
		</details>

		<!-- Collapsible Vibe -->
		<details style="border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
			<summary style="font-size: 11px; font-weight: 500; color: var(--text-muted); cursor: pointer; display: flex; justify-content: space-between;">
				<span>Vibe {musicStore.filters.vibe.length > 0 ? `(${musicStore.filters.vibe.length})` : ''}</span>
				<span>▾</span>
			</summary>
			<div class="flex flex-wrap gap-1" style="margin-top: 0.5rem; max-height: 260px; overflow-y: auto;">
				{#each VIBES as vibe}
					<button
						type="button"
						onclick={() => toggleArrayFilter('vibe', vibe)}
						class="px-2 py-0.5 text-xs rounded border cursor-pointer {musicStore.filters.vibe.includes(vibe) ? 'bg-primary text-primary-foreground border-primary' : ''}"
					>
						#{vibe}
					</button>
				{/each}
			</div>
		</details>

		<!-- Needs Attention -->
		<button
			type="button"
			onclick={toggleNeedsAttention}
			class="w-full py-1 px-2 text-xs rounded border text-left flex items-center justify-between cursor-pointer transition-colors"
		>
			<span>Needs Attention</span>
			<span class="text-[11px]">{musicStore.filters.needsAttention ? 'ON' : 'OFF'}</span>
		</button>
	</div>
</aside>

{#if confirmingResetFavs}
	<div
		role="dialog"
		aria-modal="true"
		aria-labelledby="reset-favs-title"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
	>
		<div class="w-full max-w-sm rounded-md border border-border bg-card p-4 shadow-lg flex flex-col gap-3">
			<h3 id="reset-favs-title" class="text-sm font-semibold">Reset All Favourites</h3>
			<p class="text-xs text-muted-foreground">
				This will remove the favourite status from all songs in your library. Type <strong>reset</strong> below to confirm.
			</p>
			<input
				type="text"
				bind:value={resetConfirmText}
				placeholder="Type reset to confirm"
				class="w-full px-2.5 py-1.5 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-destructive"
			/>
			<div class="flex items-center justify-end gap-2">
				<button
					type="button"
					onclick={() => (confirmingResetFavs = false)}
					class="px-3 py-1 text-xs rounded border border-border hover:bg-accent cursor-pointer"
				>
					Cancel
				</button>
				<button
					type="button"
					disabled={resettingFavs || resetConfirmText.trim().toLowerCase() !== 'reset'}
					onclick={handleResetFavourites}
					class="px-3 py-1 text-xs font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-40 cursor-pointer"
				>
					{resettingFavs ? 'Resetting...' : 'Reset All Favourites'}
				</button>
			</div>
		</div>
	</div>
{/if}
