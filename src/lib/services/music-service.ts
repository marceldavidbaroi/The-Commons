import { getSupabaseClient } from '$lib/supabase';
import type { Song, SongCursor, SongFilters, SongInsert, SongUpdate } from '$lib/types/music';

export const MUSIC_PAGE_SIZE = 20;

const SONG_COLS =
	'id, user_id, title, artist, youtube_id, is_active, needs_attention, language, version, genre, vibe, energy, rating, play_count, last_played, created_at';

function applySongFilters<T>(query: T, filters: Partial<SongFilters>): T {
	let q = query as any;
	if (filters.language) q = q.eq('language', filters.language);
	if (filters.genre) q = q.eq('genre', filters.genre);
	if (filters.version) q = q.eq('version', filters.version);
	if (filters.energy) q = q.eq('energy', filters.energy);
	if (filters.minRating) q = q.gte('rating', filters.minRating);
	if (filters.needsAttention) q = q.eq('needs_attention', true);
	if (filters.vibe && filters.vibe.length > 0) {
		q = q.overlaps('vibe', filters.vibe);
	}
	if (filters.search && filters.search.trim()) {
		const term = `%${filters.search.trim()}%`;
		q = q.or(`title.ilike.${term},artist.ilike.${term}`);
	}
	return q as T;
}

export async function fetchSongs(
	filters: Partial<SongFilters>,
	cursor?: SongCursor | null
): Promise<{ songs: Song[]; hasMore: boolean }> {
	const supabase = getSupabaseClient() as any;
	let query = supabase
		.from('songs')
		.select(SONG_COLS)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(MUSIC_PAGE_SIZE + 1);

	query = applySongFilters(query, filters);

	if (cursor) {
		query = query.or(
			`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
		);
	}

	const { data, error } = await query;
	if (error) throw error;

	const rows = (data ?? []) as Song[];
	const hasMore = rows.length > MUSIC_PAGE_SIZE;
	return {
		songs: hasMore ? rows.slice(0, MUSIC_PAGE_SIZE) : rows,
		hasMore
	};
}

export async function fetchAllFilteredSongs(filters: Partial<SongFilters>): Promise<Song[]> {
	const supabase = getSupabaseClient() as any;
	let query = supabase
		.from('songs')
		.select(SONG_COLS)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false });

	query = applySongFilters(query, filters);

	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []) as Song[];
}

export async function fetchActiveSerialQueue(filters: Partial<SongFilters>): Promise<Song[]> {
	const supabase = getSupabaseClient() as any;
	let query = supabase
		.from('songs')
		.select(SONG_COLS)
		.eq('is_active', true)
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(50);

	query = applySongFilters(query, filters);

	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []) as Song[];
}

export async function findSongByYoutubeId(youtubeId: string): Promise<Song | null> {
	const supabase = getSupabaseClient() as any;
	const { data, error } = await supabase
		.from('songs')
		.select(SONG_COLS)
		.eq('youtube_id', youtubeId)
		.maybeSingle();

	if (error) throw error;
	return (data as Song | null) ?? null;
}

export async function createSong(payload: SongInsert): Promise<Song> {
	const supabase = getSupabaseClient() as any;
	const { data, error } = await supabase.from('songs').insert(payload).select(SONG_COLS).single();
	if (error) throw error;
	return data as Song;
}

export async function updateSong(id: number, payload: SongUpdate): Promise<Song> {
	const supabase = getSupabaseClient() as any;
	const { data, error } = await supabase
		.from('songs')
		.update(payload)
		.eq('id', id)
		.select(SONG_COLS)
		.single();

	if (error) throw error;
	return data as Song;
}

export async function deleteSong(id: number): Promise<void> {
	const supabase = getSupabaseClient() as any;
	const { error } = await supabase.from('songs').delete().eq('id', id);
	if (error) throw error;
}

export async function bulkInsertSongs(rows: SongInsert[]): Promise<Song[]> {
	if (rows.length === 0) return [];
	const supabase = getSupabaseClient() as any;
	const inserted: Song[] = [];

	for (let i = 0; i < rows.length; i += 100) {
		const chunk = rows.slice(i, i + 100);
		const { data, error } = await supabase
			.from('songs')
			.upsert(chunk, { onConflict: 'user_id,youtube_id', ignoreDuplicates: true })
			.select(SONG_COLS);

		if (error) throw error;
		if (data) inserted.push(...(data as Song[]));
	}

	return inserted;
}

export async function getShuffledQueue(filters: Partial<SongFilters>): Promise<Song[]> {
	const supabase = getSupabaseClient() as any;
	const rpcParams = {
		p_language: filters.language ?? null,
		p_genre: filters.genre ?? null,
		p_version: filters.version ?? null,
		p_vibe: filters.vibe && filters.vibe.length > 0 ? filters.vibe[0] : null,
		p_min_energy: filters.energy ?? null,
		p_max_energy: filters.energy ?? null,
		p_min_rating: filters.minRating ?? null,
		p_limit: 30
	};

	const { data, error } = await supabase.rpc('get_shuffled_queue', {
		...rpcParams,
		p_exclude_hours: 12
	});
	if (error) throw error;

	const firstPass = (data ?? []) as Song[];
	if (firstPass.length > 0) return firstPass;

	// Cooldown auto-fallback when all matching tracks were recently played
	const { data: fallbackData, error: fallbackError } = await supabase.rpc('get_shuffled_queue', {
		...rpcParams,
		p_exclude_hours: 0
	});
	if (fallbackError) throw fallbackError;
	return (fallbackData ?? []) as Song[];
}

export async function recordSongPlay(songId: number): Promise<void> {
	const supabase = getSupabaseClient() as any;
	const { error } = await supabase.rpc('record_song_play', { p_song_id: songId });
	if (error) throw error;
}

export async function markSongInactive(songId: number): Promise<Song> {
	return updateSong(songId, { is_active: false });
}
