<script lang="ts">
	import { musicStore } from '$lib/stores/music.svelte';
	import { MUSIC_FILTERS } from '$lib/types/music';
	import { findSongByYoutubeId } from '$lib/services/music-service';
	import { extractYoutubeId, getYoutubeThumbnail } from '$lib/utils/music';
	import HeartIcon from './HeartIcon.svelte';

	const LANGUAGES = $derived(musicStore.filterOptions.language);
	const GENRES = $derived(musicStore.filterOptions.genre);
	const VERSIONS = $derived(musicStore.filterOptions.version);
	const PRESET_VIBES = $derived(musicStore.filterOptions.vibe);

	let urlInput = $state('');
	let youtubeId = $state<string | null>(null);
	let title = $state('');
	let artist = $state('');
	let language = $state<string[]>(['bangla']);
	let genre = $state<string[]>(['pop']);
	let version = $state<string[]>(['original']);
	let vibe = $state<string[]>([]);
	let customVibe = $state('');
	let energy = $state(3);
	let rating = $state(3);
	let isActive = $state(true);

	let saving = $state(false);
	let formError = $state<string | null>(null);
	let duplicateNotice = $state<string | null>(null);
	let promptCopied = $state(false);
	let aiPasteInput = $state('');

	// Sync form fields when editingSong changes
	$effect(() => {
		const song = musicStore.editingSong;
		if (song) {
			urlInput = song.youtube_id;
			youtubeId = song.youtube_id;
			title = song.title;
			artist = song.artist ?? '';
			language = [...song.language];
			genre = [...song.genre];
			version = [...song.version];
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
		language = ['bangla'];
		genre = ['pop'];
		version = ['original'];
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

	function toggleArrayItem(arr: string[], val: string): string[] {
		return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
	}

	function toggleVibe(tag: string) {
		vibe = toggleArrayItem(vibe, tag);
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

	async function copyAiPrompt() {
		const urlPart = urlInput.trim() || '[PASTE YOUTUBE URL HERE]';
		const prompt = `Analyze this song: ${urlPart}

Return ONLY a valid JSON object (no markdown, no explanation) with these exact keys:
{
  "youtube_url": "${urlPart}",
  "title": "clean song title",
  "artist": "primary artist / featuring",
  "language": ["choose 1+ from: ${LANGUAGES.join(', ')}"],
  "genre": ["choose 1+ from: ${GENRES.join(', ')}"],
  "version": ["choose 1+ from: ${VERSIONS.join(', ')}"],
  "vibe": ["choose 2-5 from: ${PRESET_VIBES.join(', ')}"],
  "energy": 3
}
Notes: "energy" must be an integer 1 (very chill) to 5 (high energy).`;

		try {
			await navigator.clipboard.writeText(prompt);
			promptCopied = true;
			setTimeout(() => (promptCopied = false), 2000);
		} catch {
			formError = 'Failed to copy prompt to clipboard';
		}
	}

	function applyAiJson(raw: string = aiPasteInput) {
		const trimmed = raw.trim();
		if (!trimmed) return;
		formError = null;
		try {
			const cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
			const parsed = JSON.parse(cleaned) as Record<string, unknown>;

			if (typeof parsed.youtube_url === 'string' && parsed.youtube_url.trim() && !parsed.youtube_url.includes('[PASTE')) {
				const rawUrl = parsed.youtube_url.trim();
				const mdLinkMatch = rawUrl.match(/^\[.*?\]\((https?:\/\/[^)]+)\)$/);
				urlInput = mdLinkMatch ? mdLinkMatch[1] : rawUrl.replace(/^\[|\]$/g, '');
				void handleUrlBlurOrPaste();
			}
			if (typeof parsed.title === 'string' && parsed.title.trim()) {
				title = parsed.title.trim();
			}
			if (typeof parsed.artist === 'string') {
				artist = parsed.artist.trim();
			}
			if (Array.isArray(parsed.language)) {
				const langs = parsed.language.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
				if (langs.length > 0) language = langs;
			}
			if (Array.isArray(parsed.genre)) {
				const genres = parsed.genre.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
				if (genres.length > 0) genre = genres;
			}
			if (Array.isArray(parsed.version)) {
				const versions = parsed.version.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
				if (versions.length > 0) version = versions;
			}
			if (Array.isArray(parsed.vibe)) {
				vibe = parsed.vibe.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
			}
			if (typeof parsed.energy === 'number' && parsed.energy >= 1 && parsed.energy <= 5) {
				energy = Math.round(parsed.energy);
			}
			aiPasteInput = '';
		} catch {
			formError = 'Invalid JSON from AI. Paste the JSON object returned by the prompt.';
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
				onclick={copyAiPrompt}
				title="Copy AI prompt to fill song details"
				class="px-2 py-0.5 text-xs rounded border border-border hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
			>
				{promptCopied ? '✓ Copied Prompt' : 'Prompt'}
			</button>
			<button
				type="button"
				onclick={() => musicStore.closeDrawer()}
				class="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
			>
				✕ Close (Esc)
			</button>
		</div>
	</div>

	<!-- Quick AI JSON Paste -->
	<div class="flex items-center gap-2">
		<input
			type="text"
			bind:value={aiPasteInput}
			onpaste={(e) => {
				const pasted = e.clipboardData?.getData('text') ?? '';
				if (pasted) {
					e.preventDefault();
					aiPasteInput = pasted;
					applyAiJson(pasted);
				}
			}}
			placeholder="Paste AI JSON response here to auto-fill..."
			class="flex-1 px-2.5 py-1 text-xs rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
		/>
		<button
			type="button"
			onclick={() => applyAiJson()}
			disabled={!aiPasteInput.trim()}
			class="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent disabled:opacity-40 cursor-pointer"
		>
			Fill
		</button>
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
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Language</span>
			<div class="flex flex-wrap gap-1">
				{#each LANGUAGES as l}
					<button
						type="button"
						onclick={() => (language = toggleArrayItem(language, l))}
						class="px-2 py-0.5 text-xs rounded border capitalize cursor-pointer {language.includes(l)
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{l}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Genre</span>
			<div class="flex flex-wrap gap-1">
				{#each GENRES as g}
					<button
						type="button"
						onclick={() => (genre = toggleArrayItem(genre, g))}
						class="px-2 py-0.5 text-xs rounded border capitalize cursor-pointer {genre.includes(g)
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{g}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-1">
			<span class="text-[11px] font-medium text-muted-foreground">Version</span>
			<div class="flex flex-wrap gap-1">
				{#each VERSIONS as v}
					<button
						type="button"
						onclick={() => (version = toggleArrayItem(version, v))}
						class="px-2 py-0.5 text-xs rounded border capitalize cursor-pointer {version.includes(v)
							? 'bg-primary text-primary-foreground border-primary'
							: 'border-border text-muted-foreground hover:text-foreground'}"
					>
						{v}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="grid grid-cols-2 gap-2">

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
			<span class="text-[11px] font-medium text-muted-foreground">Favourite</span>
			<button
				type="button"
				onclick={() => (rating = rating === 5 ? 3 : 5)}
				aria-pressed={rating === 5}
				class="h-8 px-3 text-xs rounded border cursor-pointer flex items-center justify-center gap-1.5 transition-colors {rating === 5
					? 'bg-red-500/10 text-red-500 border-red-500/40'
					: 'border-border text-muted-foreground hover:text-foreground'}"
			>
				<HeartIcon filled={rating === 5} size={14} />
				<span>{rating === 5 ? 'Favourited' : 'Add to Favourites'}</span>
			</button>
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
