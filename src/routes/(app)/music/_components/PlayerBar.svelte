<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { musicStore } from '$lib/stores/music.svelte';
	import { getYoutubeThumbnail, getYoutubeWatchUrl } from '$lib/utils/music';

	interface Props {
		player: any;
	}

	let { player }: Props = $props();

	let currentTime = $state(0);
	let duration = $state(0);
	let muted = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	function formatTime(sec: number): string {
		if (!Number.isFinite(sec) || sec < 0) return '00:00';
		const m = Math.floor(sec / 60);
		const s = Math.floor(sec % 60);
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	onMount(() => {
		pollTimer = setInterval(() => {
			if (!player || !musicStore.currentTrack) return;
			try {
				const t = player.getCurrentTime?.();
				const d = player.getDuration?.();
				if (typeof t === 'number') currentTime = t;
				if (typeof d === 'number') duration = d;
			} catch {
				// Ignore polling errors
			}
		}, 500);
	});

	onDestroy(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	function handleSeek(e: MouseEvent) {
		if (!player || !duration) return;
		const bar = e.currentTarget as HTMLDivElement;
		const rect = bar.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const target = ratio * duration;
		player.seekTo?.(target, true);
		currentTime = target;
	}

	function togglePlayPause() {
		musicStore.isPlaying = !musicStore.isPlaying;
	}

	function toggleMute() {
		if (!player) return;
		if (muted) {
			player.unMute?.();
			muted = false;
		} else {
			player.mute?.();
			muted = true;
		}
	}

	function togglePlayMode() {
		if (musicStore.playMode === 'shuffle') {
			void musicStore.playSerial();
		} else {
			void musicStore.playShuffled();
		}
	}

	async function setRating(rating: number) {
		const track = musicStore.currentTrack;
		if (!track) return;
		await musicStore.saveSongEdit(track.id, { rating });
	}
</script>

<svelte:window
	onkeydown={(e) => {
		const tag = (e.target as HTMLElement)?.tagName;
		if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && musicStore.currentTrack) {
			e.preventDefault();
			togglePlayPause();
		}
	}}
/>

{#if musicStore.currentTrack}
	{@const track = musicStore.currentTrack}
	{@const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}
	<footer class="fixed bottom-0 left-0 right-0 h-[72px] border-t border-border bg-card z-40 px-4 flex items-center justify-between gap-4">
		<!-- Left Zone: Now Playing -->
		<div class="flex items-center gap-3 min-w-0 w-1/3">
			<img
				src={getYoutubeThumbnail(track.youtube_id)}
				alt={track.title}
				class="w-12 h-12 rounded object-cover border border-border shrink-0"
			/>
			<div class="min-w-0 flex flex-col">
				<div class="flex items-center gap-2 min-w-0">
					<span class="text-sm font-medium truncate">{track.title}</span>
					<a
						href={getYoutubeWatchUrl(track.youtube_id)}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[11px] text-primary hover:underline shrink-0"
					>
						↗ YouTube
					</a>
				</div>
				<div class="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
					<span class="truncate">{track.artist ?? 'Unknown'}</span>
					<span class="capitalize">· {track.language}</span>
					<span class="capitalize">· {track.genre}</span>
					<span>· ⚡{track.energy}</span>
				</div>
			</div>
		</div>

		<!-- Center Zone: Transport & Scrubber -->
		<div class="flex flex-col items-center gap-1.5 w-1/3 max-w-md">
			<div class="flex items-center gap-3">
				<button
					type="button"
					onclick={() => musicStore.prevTrack()}
					title="Previous"
					class="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
				>
					⏮
				</button>
				<button
					type="button"
					onclick={togglePlayPause}
					title="Play / Pause (Space)"
					class="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs cursor-pointer"
				>
					{musicStore.isPlaying ? '❚❚' : '▶'}
				</button>
				<button
					type="button"
					onclick={() => musicStore.nextTrack()}
					title="Next"
					class="text-sm text-muted-foreground hover:text-foreground cursor-pointer"
				>
					⏭
				</button>
				<button
					type="button"
					onclick={togglePlayMode}
					title="Mode: {musicStore.playMode}"
					class="text-xs px-1.5 py-0.5 rounded border border-border capitalize cursor-pointer {musicStore.playMode === 'shuffle'
						? 'text-primary border-primary'
						: 'text-muted-foreground'}"
				>
					🔁 {musicStore.playMode}
				</button>
			</div>

			<div class="w-full flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
				<span>{formatTime(currentTime)}</span>
				<div
					role="slider"
					tabindex="0"
					aria-label="Seek"
					aria-valuemin={0}
					aria-valuemax={duration}
					aria-valuenow={currentTime}
					onclick={handleSeek}
					onkeydown={() => {}}
					class="flex-1 h-1.5 bg-border rounded-full overflow-hidden cursor-pointer"
				>
					<div class="h-full bg-primary" style="width: {progress}%"></div>
				</div>
				<span>{formatTime(duration)}</span>
			</div>
		</div>

		<!-- Right Zone: Quick Telemetry & Link Health -->
		<div class="flex items-center justify-end gap-3 w-1/3">
			<div class="hidden md:flex items-center gap-0.5">
				{#each [1, 2, 3, 4, 5] as r}
					<button
						type="button"
						onclick={() => setRating(r)}
						title="Rate {r} stars"
						class="text-xs cursor-pointer {track.rating >= r ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-500'}"
					>
						★
					</button>
				{/each}
			</div>

			<button
				type="button"
				onclick={toggleMute}
				title={muted ? 'Unmute' : 'Mute'}
				class="text-xs px-2 py-1 rounded border border-border hover:bg-accent cursor-pointer"
			>
				{muted ? '🔇' : '🔊'}
			</button>

			<button
				type="button"
				onclick={() => musicStore.handleTrackError()}
				title="Flag dead link & skip"
				class="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
			>
				⚠ Dead
			</button>
		</div>
	</footer>
{/if}
