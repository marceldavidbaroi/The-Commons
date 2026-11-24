import { getSupabaseClient } from '$lib/supabase';
import type { PlayMode, Song, SongCursor, SongFilters, SongInsert, SongUpdate } from '$lib/types/music';

export const MUSIC_PAGE_SIZE = 20;

const SONG_COLS =
	'id, user_id, title, artist, youtube_id, is_active, needs_attention, language, version, genre, vibe, energy, rating, play_count, last_played, created_at';

function applySongFilters<T>(query: T, filters: Partial<SongFilters>): T {
	let q = query as any;
	if (filters.language && filters.language.length > 0) q = q.overlaps('language', filters.language);
	if (filters.genre && filters.genre.length > 0) q = q.overlaps('genre', filters.genre);
	if (filters.version && filters.version.length > 0) q = q.overlaps('version', filters.version);
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

	let effectiveCursor = cursor ?? null;

	// On initial load (no cursor), pick a random starting point in the filtered range
	if (!effectiveCursor) {
		const [oldestRes, newestRes] = await Promise.all([
			applySongFilters(
				supabase.from('songs').select('created_at').order('created_at', { ascending: true }).limit(1),
				filters
			).maybeSingle(),
			applySongFilters(
				supabase.from('songs').select('created_at').order('created_at', { ascending: false }).limit(1),
				filters
			).maybeSingle()
		]);
		const minMs = oldestRes.data?.created_at ? new Date(oldestRes.data.created_at).getTime() : NaN;
		const maxMs = newestRes.data?.created_at ? new Date(newestRes.data.created_at).getTime() : NaN;
		if (Number.isFinite(minMs) && Number.isFinite(maxMs) && maxMs > minMs) {
			const randomMs = minMs + Math.random() * (maxMs - minMs);
			effectiveCursor = { created_at: new Date(randomMs).toISOString(), id: 2147483647 };
		}
	}

	const runQuery = async (c: SongCursor | null) => {
		let query = supabase
			.from('songs')
			.select(SONG_COLS)
			.order('created_at', { ascending: false })
			.order('id', { ascending: false })
			.limit(MUSIC_PAGE_SIZE + 1);

		query = applySongFilters(query, filters);

		if (c) {
			query = query.or(
				`created_at.lt.${c.created_at},and(created_at.eq.${c.created_at},id.lt.${c.id})`
			);
		}

		const { data, error } = await query;
		if (error) throw error;
		return (data ?? []) as Song[];
	};

	let rows = await runQuery(effectiveCursor);

	// If random starting point landed near the tail with fewer than 20 rows, fall back to top
	if (!cursor && effectiveCursor && rows.length < MUSIC_PAGE_SIZE) {
		rows = await runQuery(null);
	}

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

export async function findSongById(id: number): Promise<Song | null> {
	const supabase = getSupabaseClient() as any;
	const { data, error } = await supabase
		.from('songs')
		.select(SONG_COLS)
		.eq('id', id)
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

export async function fetchMusicPlayMode(): Promise<PlayMode> {
	const supabase = getSupabaseClient();
	const { data, error } = await supabase.auth.getUser();
	if (error || !data?.user) return 'shuffle';
	return data.user.user_metadata?.music_play_mode === 'serial' ? 'serial' : 'shuffle';
}

export async function saveMusicPlayMode(mode: PlayMode): Promise<void> {
	const supabase = getSupabaseClient();
	await supabase.auth.updateUser({ data: { music_play_mode: mode } });
}

export async function fetchSongStats(): Promise<{ total: number; favourites: number }> {
	const supabase = getSupabaseClient() as any;
	const [totalRes, favRes] = await Promise.all([
		supabase.from('songs').select('id', { count: 'exact', head: true }),
		supabase.from('songs').select('id', { count: 'exact', head: true }).eq('rating', 5)
	]);
	if (totalRes.error) throw totalRes.error;
	if (favRes.error) throw favRes.error;
	return {
		total: totalRes.count ?? 0,
		favourites: favRes.count ?? 0
	};
}

export async function resetAllFavourites(): Promise<void> {
	const supabase = getSupabaseClient() as any;
	const { error } = await supabase.from('songs').update({ rating: 3 }).eq('rating', 5);
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
	if (filters.search?.trim() || filters.needsAttention) {
		const list = await fetchActiveSerialQueue(filters);
		for (let i = list.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[list[i], list[j]] = [list[j], list[i]];
		}
		return list;
	}

	const supabase = getSupabaseClient() as any;
	const rpcParams = {
		p_language: filters.language && filters.language.length > 0 ? filters.language : null,
		p_genre: filters.genre && filters.genre.length > 0 ? filters.genre : null,
		p_version: filters.version && filters.version.length > 0 ? filters.version : null,
		p_vibe: filters.vibe && filters.vibe.length > 0 ? filters.vibe : null,
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

export async function fetchMusicFilterOptions(): Promise<{
	language: string[];
	genre: string[];
	version: string[];
	vibe: string[];
}> {
	const supabase = getSupabaseClient() as any;
	const { data, error } = await supabase.rpc('get_music_filter_options');
	if (error) throw error;
	return {
		language: data?.language ?? [],
		genre: data?.genre ?? [],
		version: data?.version ?? [],
		vibe: data?.vibe ?? []
	};
}
