<script lang="ts">
	import { musicStore } from '$lib/stores/music.svelte';
	import { getYoutubeQueueUrl } from '$lib/utils/music';
	import YouTubeStage from './YouTubeStage.svelte';

	interface Props {
		onPlayerReady?: (player: any) => void;
	}

	let { onPlayerReady }: Props = $props();

	const LANGUAGES = ['bangla', 'hindi', 'punjabi', 'english', 'instrumental'] as const;
	const GENRES = ['pop', 'electronic', 'folk', 'rock', 'bollywood', 'lofi', 'classic'] as const;
	const VERSIONS = ['original', 'lofi', 'remix', 'mashup', 'cover', 'live'] as const;
	const VIBES = ['coding', 'drive', 'late_night', 'nostalgic', 'workout', 'chill', 'romantic'] as const;

	function setSingleFilter(key: 'language' | 'genre' | 'version', val: string | null) {
		musicStore.filters[key] = musicStore.filters[key] === val ? null : val;
		void musicStore.loadInitial();
	}

	function toggleVibe(vibe: string) {
		const current = musicStore.filters.vibe;
		musicStore.filters.vibe = current.includes(vibe)
			? current.filter((v) => v !== vibe)
			: [...current, vibe];
		void musicStore.loadInitial();
	}

	function setEnergy(level: number) {
		musicStore.filters.energy = musicStore.filters.energy === level ? null : level;
		void musicStore.loadInitial();
	}

	function setMinRating(rating: number | null) {
		musicStore.filters.minRating = musicStore.filters.minRating === rating ? null : rating;
		void musicStore.loadInitial();
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

<aside class="w-full lg:w-[340px] lg:shrink-0 lg:sticky lg:top-4 flex flex-col gap-3">
	<!-- 1. Filter & Playback Launcher -->
	<div class="border border-border rounded-md bg-card p-3 flex flex-col gap-3">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				Filters & Queue
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

		<!-- Language -->
		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Language</span>
			<div class="flex flex-wrap gap-1">
				<button
					type="button"
					onclick={() => setSingleFilter('language', null)}
					class="px-2 py-0.5 text-xs rounded border cursor-pointer transition-colors {musicStore.filters.language === null
						? 'bg-primary text-primary-foreground border-primary'
						: 'border-border text-muted-foreground hover:text-foreground'}"
				>
					All
				</button>
				{#each LANGUAGES as lang}
					<button
						type="button"
						onclick={() => setSingleFilter('language', lang)}
						class="px-2 py-0.5 text-xs rounded border capitalize cursor-pointer transition-colors {musicStore.filters.language === lang
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{lang}
					</button>
				{/each}
			</div>
		</div>

		<!-- Genre -->
		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Genre</span>
			<div class="flex flex-wrap gap-1">
				<button
					type="button"
					onclick={() => setSingleFilter('genre', null)}
					class="px-2 py-0.5 text-xs rounded border cursor-pointer transition-colors {musicStore.filters.genre === null
						? 'bg-primary text-primary-foreground border-primary'
						: 'border-border text-muted-foreground hover:text-foreground'}"
				>
					All
				</button>
				{#each GENRES as genre}
					<button
						type="button"
						onclick={() => setSingleFilter('genre', genre)}
						class="px-2 py-0.5 text-xs rounded border capitalize cursor-pointer transition-colors {musicStore.filters.genre === genre
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{genre}
					</button>
				{/each}
			</div>
		</div>

		<!-- Version -->
		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Version</span>
			<div class="flex flex-wrap gap-1">
				<button
					type="button"
					onclick={() => setSingleFilter('version', null)}
					class="px-2 py-0.5 text-xs rounded border cursor-pointer transition-colors {musicStore.filters.version === null
						? 'bg-primary text-primary-foreground border-primary'
						: 'border-border text-muted-foreground hover:text-foreground'}"
				>
					All
				</button>
				{#each VERSIONS as ver}
					<button
						type="button"
						onclick={() => setSingleFilter('version', ver)}
						class="px-2 py-0.5 text-xs rounded border capitalize cursor-pointer transition-colors {musicStore.filters.version === ver
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{ver}
					</button>
				{/each}
			</div>
		</div>

		<!-- Vibe -->
		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Vibe</span>
			<div class="flex flex-wrap gap-1">
				{#each VIBES as vibe}
					<button
						type="button"
						onclick={() => toggleVibe(vibe)}
						class="px-2 py-0.5 text-xs rounded border cursor-pointer transition-colors {musicStore.filters.vibe.includes(vibe)
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						#{vibe}
					</button>
				{/each}
			</div>
		</div>

		<!-- Energy & Min Rating -->
		<div class="grid grid-cols-2 gap-2">
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
				<span class="text-[11px] font-medium text-muted-foreground">Min Rating</span>
				<div class="flex gap-1">
					{#each [null, 3, 4, 5] as r}
						<button
							type="button"
							onclick={() => setMinRating(r)}
							class="flex-1 py-0.5 text-xs rounded border cursor-pointer transition-colors {musicStore.filters.minRating === r
								? 'bg-primary text-primary-foreground border-primary'
								: 'border-border text-muted-foreground hover:text-foreground'}"
						>
							{r === null ? 'Any' : `${r}★`}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Needs Attention -->
		<button
			type="button"
			onclick={toggleNeedsAttention}
			class="w-full py-1 px-2 text-xs rounded border text-left flex items-center justify-between cursor-pointer transition-colors {musicStore.filters.needsAttention
				? 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400'
				: 'border-border text-muted-foreground hover:text-foreground'}"
		>
			<span>Needs Attention</span>
			<span class="text-[11px]">{musicStore.filters.needsAttention ? 'ON' : 'OFF'}</span>
		</button>

		<!-- Playback Launchers -->
		<div class="pt-2 border-t border-border flex flex-col gap-2">
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
					class="py-1.5 px-2.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90 cursor-pointer transition-opacity"
				>
					🔀 Shuffle
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
	</div>

	<YouTubeStage {onPlayerReady} />
</aside>
