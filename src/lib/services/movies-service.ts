import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { getSupabaseClient } from '$lib/supabase';
import type {
	Movie,
	MovieCursor,
	MovieFacets,
	MovieFilters,
	MovieSort,
	MovieTab,
	MovieUpdatePayload,
	MovieUpsertPayload,
	TmdbHydratedMovie,
	TmdbSearchResult
} from '$lib/types/movies';

export const MOVIES_PAGE_SIZE = 50;

export const MOVIE_COLS =
	'id, tmdb_id, media_type, imdb_id, imdb_url, letterboxd_url, title, release_year, original_language, origin_countries, genres, poster_path, trailer_youtube_key, series_progress, status, rating, tags, recommend_to, notes, watched_at, rewatch_count';

function applyMovieFilters<T>(
	query: T,
	tab: MovieTab,
	filters: Partial<MovieFilters>
): T {
	let q = query as any;

	if (tab === 'watched') {
		q = q.eq('status', 'watched');
	} else if (tab === 'watchlist') {
		q = q.eq('status', 'watchlist');
	} else if (tab === 'dropped') {
		q = q.eq('status', 'dropped');
	} else if (tab === 'recommendations') {
		q = q.eq('status', 'watched').or('recommend_to.neq.{},rating.gte.8.0');
	}

	if (filters.search && filters.search.trim()) {
		q = q.ilike('title', `%${filters.search.trim()}%`);
	}

	if (filters.mediaType && filters.mediaType !== 'all') {
		q = q.eq('media_type', filters.mediaType);
	}

	if (filters.languages && filters.languages.length > 0) {
		q = q.in('original_language', filters.languages);
	}

	if (filters.originCountries && filters.originCountries.length > 0) {
		q = q.overlaps('origin_countries', filters.originCountries);
	}

	if (filters.genres && filters.genres.length > 0) {
		q = q.contains('genres', filters.genres);
	}

	if (filters.era) {
		if (filters.era === '2020s') q = q.gte('release_year', 2020).lte('release_year', 2029);
		else if (filters.era === '2010s') q = q.gte('release_year', 2010).lte('release_year', 2019);
		else if (filters.era === '2000s') q = q.gte('release_year', 2000).lte('release_year', 2009);
		else if (filters.era === '1990s') q = q.gte('release_year', 1990).lte('release_year', 1999);
		else if (filters.era === 'pre_1990') q = q.lt('release_year', 1990);
	}

	if (filters.audience && filters.audience.length > 0) {
		q = q.overlaps('recommend_to', filters.audience);
	}

	if (filters.rating && filters.rating !== 'all') {
		if (filters.rating === '9+') q = q.gte('rating', 9.0);
		else if (filters.rating === '8+') q = q.gte('rating', 8.0);
		else if (filters.rating === '7+') q = q.gte('rating', 7.0);
		else if (filters.rating === 'unrated') q = q.is('rating', null);
	}

	if (filters.tags && filters.tags.length > 0) {
		q = q.contains('tags', filters.tags);
	}

	return q as T;
}

function applySortAndCursor<T>(
	query: T,
	sort: MovieSort,
	cursor?: MovieCursor | null
): T {
	let q = query as any;

	if (sort === 'watched_at') {
		q = q.order('watched_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
		if (cursor) {
			if (cursor.watched_at !== null) {
				q = q.or(
					`watched_at.lt.${cursor.watched_at},and(watched_at.eq.${cursor.watched_at},id.lt.${cursor.id}),watched_at.is.null`
				);
			} else {
				q = q.is('watched_at', null).lt('id', cursor.id);
			}
		}
	} else if (sort === 'rating') {
		q = q.order('rating', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
		if (cursor) {
			if (cursor.rating !== null) {
				q = q.or(
					`rating.lt.${cursor.rating},and(rating.eq.${cursor.rating},id.lt.${cursor.id}),rating.is.null`
				);
			} else {
				q = q.is('rating', null).lt('id', cursor.id);
			}
		}
	} else if (sort === 'release_year') {
		q = q.order('release_year', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
		if (cursor) {
			if (cursor.release_year !== null) {
				q = q.or(
					`release_year.lt.${cursor.release_year},and(release_year.eq.${cursor.release_year},id.lt.${cursor.id}),release_year.is.null`
				);
			} else {
				q = q.is('release_year', null).lt('id', cursor.id);
			}
		}
	} else {
		q = q.order('title', { ascending: true }).order('id', { ascending: false });
		if (cursor) {
			const escaped = cursor.title.replace(/"/g, '\\"');
			q = q.or(`title.gt."${escaped}",and(title.eq."${escaped}",id.lt.${cursor.id})`);
		}
	}

	return q as T;
}

export async function fetchMoviesPage(
	tab: MovieTab,
	filters: Partial<MovieFilters>,
	sort: MovieSort = 'watched_at',
	cursor?: MovieCursor | null,
	pageSize: number = MOVIES_PAGE_SIZE
): Promise<{ movies: Movie[]; hasMore: boolean }> {
	const supabase = getSupabaseClient() as any;
	let query = supabase
		.from('movies')
		.select(MOVIE_COLS)
		.limit(pageSize + 1);

	query = applyMovieFilters(query, tab, filters);
	query = applySortAndCursor(query, sort, cursor);

	const { data, error } = await query;
	if (error) throw error;

	const rows = (data ?? []) as Movie[];
	const hasMore = rows.length > pageSize;
	return {
		movies: hasMore ? rows.slice(0, pageSize) : rows,
		hasMore
	};
}

export async function fetchMovieById(id: string): Promise<Movie | null> {
	const supabase = getSupabaseClient() as any;
	const { data, error } = await supabase
		.from('movies')
		.select(MOVIE_COLS)
		.eq('id', id)
		.maybeSingle();

	if (error) throw error;
	return (data as Movie | null) ?? null;
}

export async function fetchMovieFacets(): Promise<MovieFacets> {
	const supabase = getSupabaseClient() as any;
	const { data, error } = await supabase.rpc('get_movie_facets');
	if (error) throw error;
	return (data ?? {
		counts_by_status: {},
		recommendation_count: 0,
		languages: [],
		origin_countries: [],
		genres: [],
		tags: []
	}) as MovieFacets;
}

export async function upsertMovie(payload: MovieUpsertPayload): Promise<Movie> {
	const supabase = getSupabaseClient() as any;
	if (payload.tmdb_id) {
		const { data, error } = await supabase
			.from('movies')
			.upsert(payload, { onConflict: 'user_id,media_type,tmdb_id' })
			.select(MOVIE_COLS)
			.single();

		if (error) throw error;
		return data as Movie;
	}

	const { data, error } = await supabase
		.from('movies')
		.insert(payload)
		.select(MOVIE_COLS)
		.single();

	if (error) throw error;
	return data as Movie;
}

export async function updateMovie(id: string, payload: MovieUpdatePayload): Promise<Movie> {
	const supabase = getSupabaseClient() as any;
	const { data, error } = await supabase
		.from('movies')
		.update(payload)
		.eq('id', id)
		.select(MOVIE_COLS)
		.single();

	if (error) throw error;
	return data as Movie;
}

export async function deleteMovie(id: string): Promise<void> {
	const supabase = getSupabaseClient() as any;
	const { error } = await supabase.from('movies').delete().eq('id', id);
	if (error) throw error;
}

export async function deleteAllDroppedMovies(): Promise<void> {
	const supabase = getSupabaseClient() as any;
	const { error } = await supabase.from('movies').delete().eq('status', 'dropped');
	if (error) throw error;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
	const supabase = getSupabaseClient();
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session?.access_token) {
		throw new Error('Not authenticated');
	}

	return {
		Authorization: `Bearer ${session.access_token}`,
		'Content-Type': 'application/json'
	};
}

export async function fetchTmdbRecommendations(
	tmdbId?: number | null,
	mediaType: 'movie' | 'series' = 'movie'
): Promise<TmdbSearchResult[]> {
	const headers = await getAuthHeaders();
	const params = new URLSearchParams({ action: 'recommendations', media_type: mediaType });
	if (tmdbId) params.set('tmdb_id', String(tmdbId));

	const res = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/tmdb-proxy?${params.toString()}`, {
		headers
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error ?? `TMDB recommendations failed (${res.status})`);
	}
	const data = (await res.json()) as { results: TmdbSearchResult[] };
	return data.results ?? [];
}

export async function searchTmdb(
	q: string,
	year?: number | null,
	mediaType: 'all' | 'movie' | 'series' = 'all'
): Promise<TmdbSearchResult[]> {
	const headers = await getAuthHeaders();
	const params = new URLSearchParams({ action: 'search', q, media_type: mediaType });
	if (year) params.set('year', String(year));

	const res = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/tmdb-proxy?${params.toString()}`, {
		headers
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error ?? `TMDB search failed (${res.status})`);
	}
	const data = (await res.json()) as { results: TmdbSearchResult[] };
	return data.results ?? [];
}

export async function hydrateTmdb(
	tmdbId: number,
	mediaType: 'movie' | 'series' = 'movie'
): Promise<TmdbHydratedMovie> {
	const headers = await getAuthHeaders();
	const params = new URLSearchParams({
		action: 'hydrate',
		tmdb_id: String(tmdbId),
		media_type: mediaType
	});

	const res = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/tmdb-proxy?${params.toString()}`, {
		headers
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error ?? `TMDB hydrate failed (${res.status})`);
	}
	const data = (await res.json()) as { movie: TmdbHydratedMovie };
	return data.movie;
}

export async function batchHydrateTmdb(
	items: Array<{ tmdb_id?: number; title?: string; release_year?: number | null }>
): Promise<
	Array<{
		index: number;
		matched: boolean;
		movie: TmdbHydratedMovie | null;
		error: string | null;
	}>
> {
	const headers = await getAuthHeaders();
	const res = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/tmdb-proxy`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ action: 'batch_hydrate', items })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.error ?? `TMDB batch hydrate failed (${res.status})`);
	}
	const data = (await res.json()) as {
		results: Array<{
			index: number;
			matched: boolean;
			movie: TmdbHydratedMovie | null;
			error: string | null;
		}>;
	};
	return data.results ?? [];
}
