import * as musicService from '$lib/services/music-service';
import { MUSIC_FILTERS, type PlayMode, type Song, type SongCursor, type SongFilters, type SongInsert, type SongUpdate } from '$lib/types/music';

const DEFAULT_FILTERS: SongFilters = {
	search: '',
	language: [],
	genre: [],
	version: [],
	vibe: [],
	energy: null,
	minRating: null,
	needsAttention: false
};

class MusicStore {
	songs = $state<Song[]>([]);
	loading = $state(false);
	loadingMore = $state(false);
	hasMore = $state(false);
	cursor = $state<SongCursor | null>(null);
	error = $state<string | null>(null);

	filters = $state<SongFilters>({ ...DEFAULT_FILTERS });

	filterOptions = $state<{
		language: string[];
		genre: string[];
		version: string[];
		vibe: string[];
	}>({
		language: [...MUSIC_FILTERS.language],
		genre: [...MUSIC_FILTERS.genre],
		version: [...MUSIC_FILTERS.version],
		vibe: [...MUSIC_FILTERS.vibe]
	});

	// Playback & Queue
	queue = $state<Song[]>([]);
	currentIndex = $state<number>(-1);
	playMode = $state<PlayMode>('shuffle');
	isPlaying = $state(false);

	// Inline Drawer State
	activeDrawer = $state<'none' | 'song' | 'excel'>('none');
	editingSong = $state<Song | null>(null);

	currentTrack = $derived<Song | null>(
		this.currentIndex >= 0 && this.currentIndex < this.queue.length
			? this.queue[this.currentIndex]
			: null
	);

	upNext = $derived<Song[]>(
		this.currentIndex >= 0 ? this.queue.slice(this.currentIndex + 1, this.currentIndex + 4) : []
	);

	hasActiveFilters = $derived(
		Boolean(
			this.filters.search.trim() ||
				this.filters.language.length > 0 ||
				this.filters.genre.length > 0 ||
				this.filters.version.length > 0 ||
				this.filters.vibe.length > 0 ||
				this.filters.energy ||
				this.filters.minRating ||
				this.filters.needsAttention
		)
	);

	async loadFilterOptions(): Promise<void> {
		try {
			const opts = await musicService.fetchMusicFilterOptions();
			this.filterOptions = {
				language: opts.language.length > 0 ? opts.language : [...MUSIC_FILTERS.language],
				genre: opts.genre.length > 0 ? opts.genre : [...MUSIC_FILTERS.genre],
				version: opts.version.length > 0 ? opts.version : [...MUSIC_FILTERS.version],
				vibe: opts.vibe.length > 0 ? opts.vibe : [...MUSIC_FILTERS.vibe]
			};
		} catch {
			// Keep default MUSIC_FILTERS fallback
		}
	}

	async loadInitial(): Promise<void> {
		this.loading = true;
		this.error = null;
		void this.loadFilterOptions();
		try {
			const res = await musicService.fetchSongs(this.filters, null);
			this.songs = res.songs;
			this.hasMore = res.hasMore;
			const last = res.songs[res.songs.length - 1];
			this.cursor = last ? { created_at: last.created_at, id: last.id } : null;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load songs';
		} finally {
			this.loading = false;
		}
	}

	async loadMore(): Promise<void> {
		if (!this.hasMore || this.loadingMore || !this.cursor) return;
		this.loadingMore = true;
		try {
			const res = await musicService.fetchSongs(this.filters, this.cursor);
			this.songs = [...this.songs, ...res.songs];
			this.hasMore = res.hasMore;
			const last = res.songs[res.songs.length - 1];
			this.cursor = last ? { created_at: last.created_at, id: last.id } : null;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load more songs';
		} finally {
			this.loadingMore = false;
		}
	}

	resetFilters(): void {
		this.filters = { ...DEFAULT_FILTERS, language: [], genre: [], version: [], vibe: [] };
		void this.loadInitial();
	}

	openAddDrawer(): void {
		this.editingSong = null;
		this.activeDrawer = this.activeDrawer === 'song' && !this.editingSong ? 'none' : 'song';
	}

	openEditDrawer(song: Song): void {
		this.editingSong = song;
		this.activeDrawer = 'song';
	}

	openExcelDrawer(): void {
		this.editingSong = null;
		this.activeDrawer = this.activeDrawer === 'excel' ? 'none' : 'excel';
	}

	closeDrawer(): void {
		this.activeDrawer = 'none';
		this.editingSong = null;
	}

	async addSong(payload: SongInsert): Promise<Song> {
		const created = await musicService.createSong(payload);
		this.songs = [created, ...this.songs];
		return created;
	}

	async saveSongEdit(id: number, payload: SongUpdate): Promise<Song> {
		const updated = await musicService.updateSong(id, payload);
		this.songs = this.songs.map((s) => (s.id === id ? updated : s));
		this.queue = this.queue.map((s) => (s.id === id ? updated : s));
		return updated;
	}

	async removeSong(id: number): Promise<void> {
		await musicService.deleteSong(id);
		this.songs = this.songs.filter((s) => s.id !== id);
		this.queue = this.queue.filter((s) => s.id !== id);
	}

	async bulkImport(rows: SongInsert[]): Promise<Song[]> {
		const inserted = await musicService.bulkInsertSongs(rows);
		if (inserted.length > 0) {
			this.songs = [...inserted, ...this.songs];
		}
		return inserted;
	}

	async playSerial(): Promise<void> {
		this.playMode = 'serial';
		const list = await musicService.fetchActiveSerialQueue(this.filters);
		if (list.length > 0) {
			this.queue = list;
			this.currentIndex = 0;
			this.isPlaying = true;
		}
	}

	async playShuffled(): Promise<void> {
		this.playMode = 'shuffle';
		const list = await musicService.getShuffledQueue(this.filters);
		if (list.length > 0) {
			this.queue = list;
			this.currentIndex = 0;
			this.isPlaying = true;
		}
	}

	playTrackNow(song: Song): void {
		const existingIdx = this.queue.findIndex((s) => s.id === song.id);
		if (existingIdx !== -1) {
			this.currentIndex = existingIdx;
		} else {
			this.queue = [song, ...this.queue];
			this.currentIndex = 0;
		}
		this.isPlaying = true;
	}

	queueNext(song: Song): void {
		const filtered = this.queue.filter((s) => s.id !== song.id);
		if (this.currentIndex < 0) {
			this.queue = [song, ...filtered];
			this.currentIndex = 0;
			this.isPlaying = true;
			return;
		}
		const insertAt = this.currentIndex + 1;
		this.queue = [...filtered.slice(0, insertAt), song, ...filtered.slice(insertAt)];
	}

	removeFromQueue(songId: number): void {
		const idx = this.queue.findIndex((s) => s.id === songId);
		if (idx === -1) return;
		this.queue = this.queue.filter((s) => s.id !== songId);
		if (idx < this.currentIndex) {
			this.currentIndex -= 1;
		} else if (idx === this.currentIndex && this.currentIndex >= this.queue.length) {
			this.currentIndex = this.queue.length - 1;
		}
	}

	jumpToQueueIndex(idx: number): void {
		if (idx >= 0 && idx < this.queue.length) {
			this.currentIndex = idx;
			this.isPlaying = true;
		}
	}

	async nextTrack(): Promise<void> {
		if (this.queue.length === 0) return;
		if (this.currentIndex + 1 < this.queue.length) {
			this.currentIndex += 1;
			this.isPlaying = true;
		} else {
			this.isPlaying = false;
		}

		// Infinite queue refill when fewer than 3 tracks remain
		if (this.playMode === 'shuffle' && this.queue.length - this.currentIndex <= 3) {
			try {
				const more = await musicService.getShuffledQueue(this.filters);
				const existingIds = new Set(this.queue.map((s) => s.id));
				const unique = more.filter((s) => !existingIds.has(s.id));
				if (unique.length > 0) {
					this.queue = [...this.queue, ...unique];
				}
			} catch {
				// Non-fatal refill error
			}
		}
	}

	prevTrack(): void {
		if (this.currentIndex > 0) {
			this.currentIndex -= 1;
			this.isPlaying = true;
		}
	}

	async handleTrackEnded(): Promise<void> {
		const track = this.currentTrack;
		if (track) {
			void musicService.recordSongPlay(track.id);
			const now = new Date().toISOString();
			this.songs = this.songs.map((s) =>
				s.id === track.id ? { ...s, play_count: s.play_count + 1, last_played: now } : s
			);
			this.queue = this.queue.map((s) =>
				s.id === track.id ? { ...s, play_count: s.play_count + 1, last_played: now } : s
			);
		}
		await this.nextTrack();
	}

	async handleTrackError(): Promise<void> {
		const track = this.currentTrack;
		if (track) {
			try {
				const updated = await musicService.markSongInactive(track.id);
				this.songs = this.songs.map((s) => (s.id === track.id ? updated : s));
			} catch {
				// Ignore error marking inactive
			}
		}
		await this.nextTrack();
	}
}

export const musicStore = new MusicStore();
