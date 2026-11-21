<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { musicStore } from '$lib/stores/music.svelte';

	interface Props {
		onPlayerReady?: (player: any) => void;
	}

	let { onPlayerReady }: Props = $props();

	let containerEl: HTMLDivElement | null = null;
	let player: any = null;
	let playerReady = $state(false);
	let loadedVideoId: string | null = null;
	let isLoadingTrack = false;
	let loadingTimer: ReturnType<typeof setTimeout> | null = null;

	function loadTrack(videoId: string) {
		if (!player || !playerReady) return;
		isLoadingTrack = true;
		if (loadingTimer) clearTimeout(loadingTimer);
		loadingTimer = setTimeout(() => {
			isLoadingTrack = false;
		}, 1500);
		loadedVideoId = videoId;
		player.loadVideoById(videoId);
	}

	function initPlayer() {
		const YT = (window as any).YT;
		if (!YT?.Player || !containerEl || player) return;

		player = new YT.Player(containerEl, {
			width: '308',
			height: '173',
			videoId: musicStore.currentTrack?.youtube_id ?? '',
			playerVars: {
				autoplay: 1,
				rel: 0,
				modestbranding: 1
			},
			events: {
				onReady: () => {
					playerReady = true;
					onPlayerReady?.(player);
					if (musicStore.currentTrack && musicStore.isPlaying) {
						loadTrack(musicStore.currentTrack.youtube_id);
					}
				},
				onStateChange: (e: { data: number }) => {
					// 0 = ENDED, 1 = PLAYING, 2 = PAUSED
					if (e.data === 0) {
						isLoadingTrack = false;
						void musicStore.handleTrackEnded();
					} else if (e.data === 1) {
						isLoadingTrack = false;
						if (loadingTimer) clearTimeout(loadingTimer);
						musicStore.isPlaying = true;
					} else if (e.data === 2 && !isLoadingTrack) {
						musicStore.isPlaying = false;
					}
				},
				onError: () => {
					void musicStore.handleTrackError();
				}
			}
		});
	}

	onMount(() => {
		if ((window as any).YT?.Player) {
			initPlayer();
		} else {
			const prev = (window as any).onYouTubeIframeAPIReady;
			(window as any).onYouTubeIframeAPIReady = () => {
				prev?.();
				initPlayer();
			};
			if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
				const tag = document.createElement('script');
				tag.src = 'https://www.youtube.com/iframe_api';
				document.head.appendChild(tag);
			}
		}
	});

	onDestroy(() => {
		try {
			player?.destroy?.();
		} catch {
			// Ignore cleanup errors
		}
		player = null;
		playerReady = false;
	});

	$effect(() => {
		const track = musicStore.currentTrack;
		if (!player || !playerReady || !track) return;
		if (track.youtube_id !== loadedVideoId) {
			loadTrack(track.youtube_id);
		}
	});

	$effect(() => {
		if (!player || !playerReady || !musicStore.currentTrack) return;
		try {
			if (musicStore.isPlaying) {
				player.playVideo?.();
			} else {
				player.pauseVideo?.();
			}
		} catch {
			// Ignore if player not yet ready
		}
	});
</script>

<div class="border border-border rounded-md bg-card p-3 flex flex-col gap-2.5">
	<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
		Embedded Stage
	</span>

	<!-- Strictly >= 200px x 200px / 308x173px, never display: none -->
	<div class="w-[308px] h-[173px] mx-auto bg-black rounded overflow-hidden border border-border">
		<div bind:this={containerEl} class="w-full h-full"></div>
	</div>

	{#if musicStore.upNext.length > 0}
		<div class="pt-2 border-t border-border flex flex-col gap-1">
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
						×
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
