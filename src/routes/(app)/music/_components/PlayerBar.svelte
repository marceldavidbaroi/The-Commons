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
	let confirmingDelete = $state(false);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		musicStore.currentTrack?.id;
		confirmingDelete = false;
	});

	async function confirmDeleteCurrent() {
		const track = musicStore.currentTrack;
		if (!track) return;
		confirmingDelete = false;
		await musicStore.removeSong(track.id);
	}

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
	<footer
		style="position: fixed; bottom: 0; left: 0; right: 0; height: 72px; border-top: 1px solid var(--border-subtle); background-color: var(--bg-secondary); z-index: 50; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem;"
	>
		<!-- Left Zone: Now Playing -->
		<div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0; flex: 1 1 0%;">
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
					<span class="capitalize">· {track.language.join(', ')}</span>
					<span class="capitalize">· {track.genre.join(', ')}</span>
					<span>· ⚡{track.energy}</span>
				</div>
			</div>
		</div>

		<!-- Center Zone: Transport & Scrubber -->
		<div style="display: flex; flex-direction: column; align-items: center; gap: 0.375rem; flex: 1 1 0%; max-width: 28rem;">
			<div style="display: flex; align-items: center; gap: 0.75rem;">
				<button
					type="button"
					onclick={() => musicStore.prevTrack()}
					title="Previous"
					aria-label="Previous"
					style="padding: 0.375rem; border: none; background: transparent; color: var(--text-secondary); display: flex; align-items: center; justify-content: center;"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
					</svg>
				</button>
				<button
					type="button"
					onclick={togglePlayPause}
					title="Play / Pause (Space)"
					aria-label="Play / Pause"
					style="width: 34px; height: 34px; border-radius: 9999px; border: none; background-color: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; padding: 0;"
				>
					{#if musicStore.isPlaying}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 5h4v14H6zm8 0h4v14h-4z" />
						</svg>
					{:else}
						<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 2px;">
							<path d="M8 5v14l11-7z" />
						</svg>
					{/if}
				</button>
				<button
					type="button"
					onclick={() => musicStore.nextTrack()}
					title="Next"
					aria-label="Next"
					style="padding: 0.375rem; border: none; background: transparent; color: var(--text-secondary); display: flex; align-items: center; justify-content: center;"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
					</svg>
				</button>
				<button
					type="button"
					onclick={togglePlayMode}
					title="Mode: {musicStore.playMode}"
					aria-label="Toggle Play Mode"
					style="padding: 0.375rem; border: none; background: transparent; color: {musicStore.playMode === 'shuffle' ? 'var(--primary)' : 'var(--text-muted)'}; display: flex; align-items: center; justify-content: center;"
				>
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="16 3 21 3 21 8" />
						<line x1="4" y1="20" x2="21" y2="3" />
						<polyline points="21 16 21 21 16 21" />
						<line x1="15" y1="15" x2="21" y2="21" />
						<line x1="4" y1="4" x2="9" y2="9" />
					</svg>
				</button>
			</div>

			<div style="width: 100%; display: flex; align-items: center; gap: 0.5rem; font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums;">
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
					style="flex: 1; height: 4px; background-color: var(--border-subtle); border-radius: 9999px; overflow: hidden; cursor: pointer; position: relative;"
				>
					<div style="height: 100%; background-color: var(--primary); width: {progress}%; border-radius: 9999px;"></div>
				</div>
				<span>{formatTime(duration)}</span>
			</div>
		</div>

		<!-- Right Zone: Quick Telemetry & Link Health -->
		<div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; flex: 1 1 0%;">
			<div style="display: flex; align-items: center; gap: 2px;">
				{#each [1, 2, 3, 4, 5] as r}
					<button
						type="button"
						onclick={() => setRating(r)}
						title="Rate {r} stars"
						style="border: none; background: transparent; padding: 2px; font-size: 14px; line-height: 1; color: {track.rating >= r ? '#f59e0b' : 'var(--text-muted)'}; opacity: {track.rating >= r ? 1 : 0.35};"
					>
						★
					</button>
				{/each}
			</div>

			<button
				type="button"
				onclick={toggleMute}
				title={muted ? 'Unmute' : 'Mute'}
				aria-label={muted ? 'Unmute' : 'Mute'}
				style="border: none; background: transparent; padding: 0.375rem; color: var(--text-secondary); display: flex; align-items: center; justify-content: center;"
			>
				{#if muted}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
						<line x1="23" y1="9" x2="17" y2="15" />
						<line x1="17" y1="9" x2="23" y2="15" />
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
						<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
					</svg>
				{/if}
			</button>

			<button
				type="button"
				onclick={() => musicStore.handleTrackError()}
				title="Flag dead link & skip"
				aria-label="Flag dead link & skip"
				style="border: none; background: transparent; padding: 0.375rem; color: #f59e0b; display: flex; align-items: center; justify-content: center;"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
					<path d="M12 9v4" />
					<path d="M12 17h.01" />
				</svg>
			</button>

			{#if confirmingDelete}
				<div style="display: flex; align-items: center; gap: 4px;">
					<button
						type="button"
						onclick={confirmDeleteCurrent}
						style="padding: 0.25rem 0.5rem; font-size: 11px; font-weight: 500; border-radius: 4px; border: 1px solid #ef4444; background: #ef4444; color: #fff;"
					>
						Confirm
					</button>
					<button
						type="button"
						onclick={() => (confirmingDelete = false)}
						style="padding: 0.25rem 0.4rem; font-size: 11px; border-radius: 4px; border: 1px solid var(--border-subtle); background: transparent; color: var(--text-muted);"
					>
						✕
					</button>
				</div>
			{:else}
				<button
					type="button"
					onclick={() => (confirmingDelete = true)}
					title="Delete song"
					aria-label="Delete song"
					style="border: none; background: transparent; padding: 0.375rem; color: #ef4444; display: flex; align-items: center; justify-content: center;"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 6h18" />
						<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
						<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
					</svg>
				</button>
			{/if}
		</div>
	</footer>
{/if}
