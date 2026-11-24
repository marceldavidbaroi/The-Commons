<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { musicStore } from '$lib/stores/music.svelte';

	let containerEl = $state<HTMLDivElement | null>(null);
	let pillEl = $state<HTMLDivElement | null>(null);
	let player: any = null;
	let ytApiReady = $state(false);
	let playerReady = $state(false);
	let loadedVideoId: string | null = null;
	let isLoadingTrack = false;
	let loadingTimer: ReturnType<typeof setTimeout> | null = null;

	// Drag state (null = default top-right)
	let pos = $state<{ left: number; top: number } | null>(null);
	let dragging = false;
	let dragMoved = false;
	let startX = 0;
	let startY = 0;
	let origLeft = 0;
	let origTop = 0;

	const isOnMusicPage = $derived(page.url.pathname.startsWith('/music'));

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
			width: '220',
			height: '220',
			videoId: musicStore.currentTrack?.youtube_id ?? '',
			playerVars: {
				autoplay: 1,
				rel: 0,
				modestbranding: 1
			},
			events: {
				onReady: () => {
					playerReady = true;
					musicStore.ytPlayer = player;
					if (musicStore.currentTrack && musicStore.isPlaying) {
						loadTrack(musicStore.currentTrack.youtube_id);
					}
				},
				onStateChange: (e: { data: number }) => {
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
			ytApiReady = true;
			initPlayer();
		} else {
			const prev = (window as any).onYouTubeIframeAPIReady;
			(window as any).onYouTubeIframeAPIReady = () => {
				prev?.();
				ytApiReady = true;
				initPlayer();
			};
			if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
				const tag = document.createElement('script');
				tag.src = 'https://www.youtube.com/iframe_api';
				document.head.appendChild(tag);
			}
		}
	});

	$effect(() => {
		if (ytApiReady && containerEl && !player) {
			initPlayer();
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
		musicStore.ytPlayer = null;
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

	function togglePlayPause() {
		musicStore.isPlaying = !musicStore.isPlaying;
	}

	function stopPlayback() {
		musicStore.isPlaying = false;
		musicStore.queue = [];
		musicStore.currentIndex = -1;
	}

	function handlePointerDown(e: PointerEvent) {
		if ((e.target as HTMLElement)?.closest('button')) return;
		if (!pillEl) return;
		const rect = pillEl.getBoundingClientRect();
		dragging = true;
		dragMoved = false;
		startX = e.clientX;
		startY = e.clientY;
		origLeft = rect.left;
		origTop = rect.top;
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragging || !pillEl) return;
		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
			dragMoved = true;
		}
		if (!dragMoved) return;
		const maxLeft = window.innerWidth - pillEl.offsetWidth - 8;
		const maxTop = window.innerHeight - pillEl.offsetHeight - 8;
		pos = {
			left: Math.max(8, Math.min(maxLeft, origLeft + dx)),
			top: Math.max(8, Math.min(maxTop, origTop + dy))
		};
	}

	function handlePointerUp() {
		dragging = false;
	}
</script>

<svelte:window onpointermove={handlePointerMove} onpointerup={handlePointerUp} />

{#if musicStore.currentTrack}
	{@const track = musicStore.currentTrack}

	<!-- Persistent YouTube iframe (>= 200x200, never display: none) -->
	<div
		style="position: fixed; bottom: 0; right: 0; width: 220px; height: 220px; opacity: 0; pointer-events: none; z-index: -1; overflow: hidden;"
	>
		<div bind:this={containerEl} style="width: 100%; height: 100%;"></div>
	</div>

	<!-- Compact draggable floating mini-player on non-music routes -->
	{#if !isOnMusicPage}
		<div
			bind:this={pillEl}
			onpointerdown={handlePointerDown}
			style="position: fixed; {pos ? `left: ${pos.left}px; top: ${pos.top}px;` : 'top: 1rem; right: 1rem;'} z-index: 50; max-width: 360px; background-color: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 9999px; box-shadow: 0 6px 20px rgba(0,0,0,0.18); padding: 0.35rem 0.625rem; display: flex; align-items: center; gap: 0.4rem; cursor: grab; user-select: none; touch-action: none;"
		>
			<a
				href="/music"
				onclick={(e) => {
					if (dragMoved) e.preventDefault();
				}}
				title="{track.title}{track.artist ? ` · ${track.artist}` : ''} (Open Music)"
				style="min-width: 0; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 500; color: var(--text-primary); text-decoration: none;"
			>
				{track.title}
			</a>

			<div style="display: flex; align-items: center; gap: 0.15rem; flex-shrink: 0;">
				<button
					type="button"
					onclick={() => musicStore.prevTrack()}
					title="Previous"
					aria-label="Previous"
					style="border: none; background: transparent; padding: 4px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
					</svg>
				</button>

				<button
					type="button"
					onclick={togglePlayPause}
					title={musicStore.isPlaying ? 'Pause' : 'Play'}
					aria-label={musicStore.isPlaying ? 'Pause' : 'Play'}
					style="width: 26px; height: 26px; border-radius: 9999px; border: none; background-color: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0;"
				>
					{#if musicStore.isPlaying}
						<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 5h4v14H6zm8 0h4v14h-4z" />
						</svg>
					{:else}
						<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 1px;">
							<path d="M8 5v14l11-7z" />
						</svg>
					{/if}
				</button>

				<button
					type="button"
					onclick={() => void musicStore.nextTrack()}
					title="Next"
					aria-label="Next"
					style="border: none; background: transparent; padding: 4px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
					</svg>
				</button>

				<button
					type="button"
					onclick={() => void musicStore.toggleFavourite(track)}
					title={track.rating === 5 ? 'Remove from favourites' : 'Add to favourites'}
					aria-label={track.rating === 5 ? 'Remove from favourites' : 'Add to favourites'}
					style="border: none; background: transparent; padding: 4px; color: {track.rating === 5 ? '#ef4444' : 'var(--text-muted)'}; cursor: pointer; display: flex; align-items: center; justify-content: center;"
				>
					<svg width="13" height="13" viewBox="0 0 24 24" fill={track.rating === 5 ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
					</svg>
				</button>

				<button
					type="button"
					onclick={stopPlayback}
					title="Stop"
					aria-label="Stop"
					style="border: none; background: transparent; padding: 4px; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center;"
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="6" width="12" height="12" rx="1" />
					</svg>
				</button>
			</div>
		</div>
	{/if}
{/if}
