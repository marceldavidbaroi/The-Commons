<script lang="ts">
	import { musicStore } from '$lib/stores/music.svelte';
	import { getYoutubeWatchUrl } from '$lib/utils/music';
	import HeartIcon from './HeartIcon.svelte';
</script>

<section class="flex-1 min-w-0 flex flex-col gap-2">
	<!-- Status / Tally -->
	<div class="flex items-center justify-between text-xs text-muted-foreground px-1">
		<span>
			Total: <strong class="text-foreground font-medium">{musicStore.totalSongs}</strong>
			· Favourites: <strong class="text-foreground font-medium">{musicStore.favouriteSongs}</strong>
			· Showing {musicStore.songs.length}
		</span>
		{#if musicStore.error}
			<span class="text-destructive">{musicStore.error}</span>
		{/if}
	</div>

	{#if musicStore.loading}
		<div class="border border-border rounded-md bg-card p-6 text-center text-sm text-muted-foreground">
			Loading catalog...
		</div>
	{:else if musicStore.songs.length === 0}
		<div class="border border-border rounded-md bg-card p-8 text-center flex flex-col items-center gap-3">
			<p class="text-sm text-muted-foreground">No songs match your current filters.</p>
			<div class="flex gap-2">
				{#if musicStore.hasActiveFilters}
					<button
						type="button"
						onclick={() => musicStore.resetFilters()}
						class="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-accent cursor-pointer"
					>
						Reset Filters
					</button>
				{/if}
				<button
					type="button"
					onclick={() => musicStore.openAddDrawer()}
					class="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
				>
					+ Add Song
				</button>
			</div>
		</div>
	{:else}
		<div class="border border-border rounded-md bg-card divide-y divide-border overflow-hidden">
			{#each musicStore.songs as song (song.id)}
				{@const isCurrent = musicStore.currentTrack?.id === song.id}
				<div
					class="group flex items-center gap-3 py-2 px-3 min-h-[44px] transition-colors hover:bg-accent/50 {isCurrent
						? 'bg-accent/60 border-l-2 border-l-primary'
						: ''} {!song.is_active ? 'opacity-55' : ''}"
				>
					<!-- Play Trigger -->
					<button
						type="button"
						onclick={() => musicStore.playTrackNow(song)}
						title="Play now"
						class="w-6 h-6 shrink-0 rounded flex items-center justify-center text-xs cursor-pointer {isCurrent
							? 'text-primary font-bold'
							: 'text-muted-foreground opacity-60 group-hover:opacity-100 hover:text-foreground'}"
					>
						{isCurrent && musicStore.isPlaying ? '❚❚' : '▶'}
					</button>

					<!-- Track Identity -->
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-1.5 min-w-0">
							<span class="text-sm font-medium truncate">{song.title}</span>
							{#if song.version.some((v) => v !== 'original')}
								<span class="px-1.5 py-0 text-[10px] rounded border border-border text-muted-foreground capitalize shrink-0">
									{song.version.join(', ')}
								</span>
							{/if}
							{#if song.needs_attention}
								<span class="px-1.5 py-0 text-[10px] rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
									Needs Tagging
								</span>
							{/if}
							{#if !song.is_active}
								<span class="px-1.5 py-0 text-[10px] rounded bg-destructive/15 text-destructive shrink-0">
									Inactive
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-2 text-xs text-muted-foreground truncate">
							<span>{song.artist ?? 'Unknown Artist'}</span>
							{#if song.vibe.length > 0}
								<span class="truncate text-[11px] opacity-80">
									{song.vibe.map((v) => `#${v}`).join(' ')}
								</span>
							{/if}
						</div>
					</div>

					<!-- Classification & Telemetry -->
					<div class="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
						<span class="px-1.5 py-0.5 text-[11px] rounded border border-border capitalize max-w-[90px] truncate">
							{song.language.join(', ')}
						</span>
						<span class="px-1.5 py-0.5 text-[11px] rounded border border-border capitalize max-w-[140px] truncate">
							{song.genre.join(', ')}
						</span>
						<span class="w-8 text-right tabular-nums">⚡{song.energy}</span>
						<button
							type="button"
							onclick={() => musicStore.toggleFavourite(song)}
							title={song.rating === 5 ? 'Remove from favourites' : 'Add to favourites'}
							aria-label={song.rating === 5 ? 'Remove from favourites' : 'Add to favourites'}
							aria-pressed={song.rating === 5}
							style="border: none; background: transparent;"
							class="p-1 rounded hover:bg-accent cursor-pointer flex items-center justify-center transition-colors {song.rating === 5 ? 'text-red-500' : 'text-muted-foreground/40 hover:text-muted-foreground'}"
						>
							<HeartIcon filled={song.rating === 5} size={14} />
						</button>
						<span class="w-10 text-right tabular-nums text-[11px]">{song.play_count}x</span>
					</div>

					<!-- Row Quick Actions -->
					<div class="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
						<button
							type="button"
							onclick={() => musicStore.queueNext(song)}
							title="Queue Next"
							aria-label="Queue Next"
							class="p-1 rounded border border-border hover:bg-accent cursor-pointer flex items-center justify-center"
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M5 12h14" /><path d="M12 5v14" />
							</svg>
						</button>
						<a
							href={getYoutubeWatchUrl(song.youtube_id)}
							target="_blank"
							rel="noopener noreferrer"
							title="Open on YouTube"
							aria-label="Open on YouTube"
							class="p-1 rounded border border-border hover:bg-accent flex items-center justify-center"
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M7 17 17 7" /><path d="M7 7h10v10" />
							</svg>
						</a>
						<button
							type="button"
							onclick={() => musicStore.openEditDrawer(song)}
							title="Edit Song"
							aria-label="Edit Song"
							class="p-1 rounded border border-border hover:bg-accent cursor-pointer flex items-center justify-center"
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
							</svg>
						</button>
						<button
							type="button"
							onclick={() => musicStore.removeSong(song.id)}
							title="Delete Song"
							aria-label="Delete Song"
							class="p-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer flex items-center justify-center"
						>
							<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
							</svg>
						</button>
					</div>
				</div>
			{/each}
		</div>

		{#if musicStore.hasMore}
			<div class="flex justify-center pt-2">
				<button
					type="button"
					disabled={musicStore.loadingMore}
					onclick={() => musicStore.loadMore()}
					class="px-4 py-1.5 text-xs font-medium rounded border border-border bg-card hover:bg-accent disabled:opacity-50 cursor-pointer"
				>
					{musicStore.loadingMore ? 'Loading...' : 'Load More (20)'}
				</button>
			</div>
		{/if}
	{/if}
</section>
