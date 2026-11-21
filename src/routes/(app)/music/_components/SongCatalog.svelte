<script lang="ts">
	import { musicStore } from '$lib/stores/music.svelte';
	import { getYoutubeWatchUrl } from '$lib/utils/music';
</script>

<section class="flex-1 min-w-0 flex flex-col gap-2">
	<!-- Status / Tally -->
	<div class="flex items-center justify-between text-xs text-muted-foreground px-1">
		<span>Showing {musicStore.songs.length} loaded tracks</span>
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
							{#if song.version !== 'original'}
								<span class="px-1.5 py-0 text-[10px] rounded border border-border text-muted-foreground capitalize shrink-0">
									{song.version}
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
						<span class="px-1.5 py-0.5 text-[11px] rounded border border-border capitalize">
							{song.language}
						</span>
						<span class="px-1.5 py-0.5 text-[11px] rounded border border-border capitalize">
							{song.genre}
						</span>
						<span class="w-8 text-right tabular-nums">⚡{song.energy}</span>
						<span class="w-8 text-right tabular-nums">★{song.rating}</span>
						<span class="w-10 text-right tabular-nums text-[11px]">{song.play_count}x</span>
					</div>

					<!-- Row Quick Actions -->
					<div class="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
						<button
							type="button"
							onclick={() => musicStore.queueNext(song)}
							title="Queue Next"
							class="px-1.5 py-1 text-[11px] rounded border border-border hover:bg-accent cursor-pointer"
						>
							+Next
						</button>
						<a
							href={getYoutubeWatchUrl(song.youtube_id)}
							target="_blank"
							rel="noopener noreferrer"
							title="Open on YouTube"
							class="px-1.5 py-1 text-[11px] rounded border border-border hover:bg-accent"
						>
							↗
						</a>
						<button
							type="button"
							onclick={() => musicStore.openEditDrawer(song)}
							title="Edit Song"
							class="px-1.5 py-1 text-[11px] rounded border border-border hover:bg-accent cursor-pointer"
						>
							Edit
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
