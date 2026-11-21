<script lang="ts">
	import { musicStore } from '$lib/stores/music.svelte';
	import { findSongByYoutubeId } from '$lib/services/music-service';
	import { extractYoutubeId, getYoutubeThumbnail } from '$lib/utils/music';

	const LANGUAGES = ['bangla', 'hindi', 'punjabi', 'english', 'instrumental'] as const;
	const GENRES = ['pop', 'electronic', 'folk', 'rock', 'bollywood', 'lofi', 'classic'] as const;
	const VERSIONS = ['original', 'lofi', 'remix', 'mashup', 'cover', 'live'] as const;
	const PRESET_VIBES = ['coding', 'drive', 'late_night', 'nostalgic', 'workout', 'chill', 'romantic'] as const;

	let urlInput = $state('');
	let youtubeId = $state<string | null>(null);
	let title = $state('');
	let artist = $state('');
	let language = $state('bangla');
	let genre = $state('pop');
	let version = $state('original');
	let vibe = $state<string[]>([]);
	let customVibe = $state('');
	let energy = $state(3);
	let rating = $state(3);
	let isActive = $state(true);

	let saving = $state(false);
	let formError = $state<string | null>(null);
	let duplicateNotice = $state<string | null>(null);

	// Sync form fields when editingSong changes
	$effect(() => {
		const song = musicStore.editingSong;
		if (song) {
			urlInput = song.youtube_id;
			youtubeId = song.youtube_id;
			title = song.title;
			artist = song.artist ?? '';
			language = song.language;
			genre = song.genre;
			version = song.version;
			vibe = [...song.vibe];
			energy = song.energy;
			rating = song.rating;
			isActive = song.is_active;
			formError = null;
			duplicateNotice = null;
		} else {
			resetFields();
		}
	});

	function resetFields() {
		urlInput = '';
		youtubeId = null;
		title = '';
		artist = '';
		language = 'bangla';
		genre = 'pop';
		version = 'original';
		vibe = [];
		customVibe = '';
		energy = 3;
		rating = 3;
		isActive = true;
		formError = null;
		duplicateNotice = null;
	}

	async function handleUrlBlurOrPaste() {
		const extracted = extractYoutubeId(urlInput);
		youtubeId = extracted;
		if (!extracted || musicStore.editingSong) return;

		try {
			const existing = await findSongByYoutubeId(extracted);
			if (existing) {
				duplicateNotice = `Already in catalog — switched to Edit mode.`;
				musicStore.editingSong = existing;
			} else {
				duplicateNotice = null;
			}
		} catch {
			// Ignore lookup errors
		}
	}

	function toggleVibe(tag: string) {
		vibe = vibe.includes(tag) ? vibe.filter((v) => v !== tag) : [...vibe, tag];
	}

	function handleCustomVibeKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const tag = customVibe.trim().toLowerCase();
			if (tag && !vibe.includes(tag)) {
				vibe = [...vibe, tag];
			}
			customVibe = '';
		}
	}

	async function handleQuickAdd() {
		const id = extractYoutubeId(urlInput);
		if (!id) {
			formError = 'Valid YouTube URL or 11-char ID is required.';
			return;
		}
		if (!title.trim()) {
			formError = 'Title is required.';
			return;
		}

		saving = true;
		formError = null;
		try {
			await musicStore.addSong({
				youtube_id: id,
				title: title.trim(),
				artist: artist.trim() || null,
				needs_attention: true
			});
			resetFields();
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Failed to quick add song';
		} finally {
			saving = false;
		}
	}

	async function handleSave(playNextAfter = false) {
		const id = extractYoutubeId(urlInput);
		if (!id) {
			formError = 'Valid YouTube URL or 11-char ID is required.';
			return;
		}
		if (!title.trim()) {
			formError = 'Title is required.';
			return;
		}

		saving = true;
		formError = null;
		try {
			const payload = {
				youtube_id: id,
				title: title.trim(),
				artist: artist.trim() || null,
				language,
				genre,
				version,
				vibe,
				energy,
				rating,
				is_active: isActive,
				needs_attention: false
			};

			const saved = musicStore.editingSong
				? await musicStore.saveSongEdit(musicStore.editingSong.id, payload)
				: await musicStore.addSong(payload);

			if (playNextAfter) {
				musicStore.queueNext(saved);
			}
			musicStore.closeDrawer();
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Failed to save song';
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!musicStore.editingSong) return;
		saving = true;
		try {
			await musicStore.removeSong(musicStore.editingSong.id);
			musicStore.closeDrawer();
		} catch (err) {
			formError = err instanceof Error ? err.message : 'Failed to delete song';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && musicStore.activeDrawer === 'song') {
			musicStore.closeDrawer();
		}
	}}
/>

<div class="border border-border rounded-md bg-card p-3 flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
			{musicStore.editingSong ? 'Edit Song' : 'Add Song'}
		</span>
		<div class="flex items-center gap-2">
			{#if duplicateNotice}
				<span class="text-xs text-amber-600 dark:text-amber-400">{duplicateNotice}</span>
			{/if}
			{#if formError}
				<span class="text-xs text-destructive">{formError}</span>
			{/if}
			<button
				type="button"
				onclick={() => musicStore.closeDrawer()}
				class="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
			>
				✕ Close (Esc)
			</button>
		</div>
	</div>

	<!-- Row 1: Link & Identity -->
	<div class="flex flex-col md:flex-row gap-3 items-start">
		{#if youtubeId}
			<img
				src={getYoutubeThumbnail(youtubeId)}
				alt="Thumbnail preview"
				class="w-[120px] h-[68px] object-cover rounded border border-border shrink-0"
			/>
		{/if}

		<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 w-full">
			<div class="flex flex-col gap-1">
				<label for="yt-url" class="text-[11px] font-medium text-muted-foreground">YouTube URL / ID *</label>
				<input
					id="yt-url"
					type="text"
					bind:value={urlInput}
					onblur={handleUrlBlurOrPaste}
					onpaste={() => setTimeout(handleUrlBlurOrPaste, 0)}
					placeholder="https://youtube.com/watch?v=..."
					class="h-8 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label for="song-title" class="text-[11px] font-medium text-muted-foreground">Title *</label>
				<input
					id="song-title"
					type="text"
					bind:value={title}
					onkeydown={(e) => {
						if (e.key === 'Enter' && !musicStore.editingSong) {
							e.preventDefault();
							void handleQuickAdd();
						}
					}}
					placeholder="Song title"
					class="h-8 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
				/>
			</div>

			<div class="flex flex-col gap-1">
				<label for="song-artist" class="text-[11px] font-medium text-muted-foreground">Artist</label>
				<input
					id="song-artist"
					type="text"
					bind:value={artist}
					placeholder="Artist / Band (optional)"
					class="h-8 px-2 text-xs rounded border border-border bg-background focus:outline-none focus:border-primary"
				/>
			</div>
		</div>
	</div>

	<!-- Row 2: Classification & Taste -->
	<div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
		<div class="flex flex-col gap-1">
			<label for="song-lang" class="text-[11px] font-medium text-muted-foreground">Language</label>
			<select
				id="song-lang"
				bind:value={language}
				class="h-8 px-2 text-xs rounded border border-border bg-background capitalize"
			>
				{#each LANGUAGES as l}
					<option value={l}>{l}</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-1">
			<label for="song-genre" class="text-[11px] font-medium text-muted-foreground">Genre</label>
			<select
				id="song-genre"
				bind:value={genre}
				class="h-8 px-2 text-xs rounded border border-border bg-background capitalize"
			>
				{#each GENRES as g}
					<option value={g}>{g}</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-1">
			<label for="song-ver" class="text-[11px] font-medium text-muted-foreground">Version</label>
			<select
				id="song-ver"
				bind:value={version}
				class="h-8 px-2 text-xs rounded border border-border bg-background capitalize"
			>
				{#each VERSIONS as v}
					<option value={v}>{v}</option>
				{/each}
			</select>
		</div>

		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Energy (1–5)</span>
			<div class="flex gap-1 h-8">
				{#each [1, 2, 3, 4, 5] as lvl}
					<button
						type="button"
						onclick={() => (energy = lvl)}
						class="flex-1 text-xs rounded border cursor-pointer {energy === lvl
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{lvl}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Rating (1–5)</span>
			<div class="flex gap-1 h-8">
				{#each [1, 2, 3, 4, 5] as r}
					<button
						type="button"
						onclick={() => (rating = r)}
						class="flex-1 text-xs rounded border cursor-pointer {rating === r
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{r}★
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Vibe Chips -->
	<div class="flex flex-wrap items-center gap-1.5">
		<span class="text-[11px] font-medium text-muted-foreground mr-1">Vibe:</span>
		{#each Array.from(new Set([...PRESET_VIBES, ...vibe])) as tag}
			<button
				type="button"
				onclick={() => toggleVibe(tag)}
				class="px-2 py-0.5 text-xs rounded border cursor-pointer {vibe.includes(tag)
					? 'bg-primary text-primary-foreground border-primary'
					: 'border-border text-muted-foreground hover:text-foreground'}"
			>
				#{tag}
			</button>
		{/each}
		<input
			type="text"
			bind:value={customVibe}
			onkeydown={handleCustomVibeKeydown}
			placeholder="+ custom vibe (Enter)"
			class="h-6 px-2 text-xs rounded border border-border bg-background w-36 focus:outline-none focus:border-primary"
		/>
	</div>

	<!-- Row 3: Actions -->
	<div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
		<div class="flex items-center gap-2">
			{#if musicStore.editingSong}
				<label class="flex items-center gap-1.5 text-xs cursor-pointer">
					<input type="checkbox" bind:checked={isActive} />
					<span>Active (playable)</span>
				</label>
				<button
					type="button"
					disabled={saving}
					onclick={handleDelete}
					class="px-2.5 py-1 text-xs rounded border border-destructive/50 text-destructive hover:bg-destructive/10 cursor-pointer"
				>
					Delete
				</button>
			{:else}
				<button
					type="button"
					disabled={saving}
					onclick={handleQuickAdd}
					class="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-accent cursor-pointer"
				>
					⚡ Quick Add (Needs Tagging)
				</button>
			{/if}
		</div>

		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => musicStore.closeDrawer()}
				class="px-3 py-1.5 text-xs rounded border border-border hover:bg-accent cursor-pointer"
			>
				Cancel
			</button>
			<button
				type="button"
				disabled={saving}
				onclick={() => handleSave(true)}
				class="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-accent cursor-pointer"
			>
				Save & Play Next
			</button>
			<button
				type="button"
				disabled={saving}
				onclick={() => handleSave(false)}
				class="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
			>
				{saving ? 'Saving...' : 'Save Song'}
			</button>
		</div>
	</div>
</div>
