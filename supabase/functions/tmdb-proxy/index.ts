import { createClient } from 'jsr:@supabase/supabase-js@2';

const TMDB_BASE = 'https://api.themoviedb.org/3';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' }
	});
}

function parseReleaseYear(releaseDate?: string | null): number | null {
	if (!releaseDate || releaseDate.length < 4) return null;
	const year = Number.parseInt(releaseDate.slice(0, 4), 10);
	return Number.isFinite(year) ? year : null;
}

interface TmdbSearchResult {
	id: number;
	title: string;
	release_date?: string;
	poster_path?: string | null;
}

interface TmdbMovieDetail {
	id: number;
	imdb_id?: string | null;
	external_ids?: { imdb_id?: string | null };
	title: string;
	release_date?: string;
	original_language?: string | null;
	origin_country?: string[];
	production_countries?: Array<{ iso_3166_1: string }>;
	genres?: Array<{ name: string }>;
	poster_path?: string | null;
	videos?: {
		results?: Array<{ site?: string; type?: string; key?: string }>;
	};
}

interface HydratedMovie {
	tmdb_id: number;
	imdb_id: string | null;
	title: string;
	release_year: number | null;
	original_language: string | null;
	origin_countries: string[];
	genres: string[];
	poster_path: string | null;
	trailer_youtube_key: string | null;
}

async function tmdbFetch<T>(path: string, tmdbToken: string): Promise<T> {
	const res = await fetch(`${TMDB_BASE}${path}`, {
		headers: {
			Authorization: `Bearer ${tmdbToken}`,
			Accept: 'application/json'
		}
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`TMDB ${res.status}: ${text}`);
	}
	return (await res.json()) as T;
}

async function searchMovies(
	query: string,
	year: string | null,
	tmdbToken: string
) {
	const params = new URLSearchParams({
		query,
		include_adult: 'false',
		language: 'en-US',
		page: '1'
	});
	if (year && /^\d{4}$/.test(year)) {
		params.set('year', year);
	}
	const data = await tmdbFetch<{ results?: TmdbSearchResult[] }>(
		`/search/movie?${params.toString()}`,
		tmdbToken
	);
	return (data.results ?? []).slice(0, 8).map((m) => ({
		tmdb_id: m.id,
		title: m.title,
		release_year: parseReleaseYear(m.release_date),
		poster_path: m.poster_path ?? null
	}));
}

async function hydrateMovie(tmdbId: number, tmdbToken: string): Promise<HydratedMovie> {
	const data = await tmdbFetch<TmdbMovieDetail>(
		`/movie/${tmdbId}?append_to_response=videos,external_ids&language=en-US`,
		tmdbToken
	);

	const originCountries =
		data.origin_country && data.origin_country.length > 0
			? data.origin_country
			: (data.production_countries ?? []).map((c) => c.iso_3166_1).filter(Boolean);

	const trailer = (data.videos?.results ?? []).find(
		(v) => v.site === 'YouTube' && v.type === 'Trailer' && v.key
	);

	return {
		tmdb_id: data.id,
		imdb_id: data.imdb_id ?? data.external_ids?.imdb_id ?? null,
		title: data.title,
		release_year: parseReleaseYear(data.release_date),
		original_language: data.original_language ? data.original_language.toLowerCase() : null,
		origin_countries: originCountries,
		genres: (data.genres ?? []).map((g) => g.name).filter(Boolean),
		poster_path: data.poster_path ?? null,
		trailer_youtube_key: trailer?.key ?? null
	};
}

async function mapWithConcurrency<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let nextIndex = 0;

	async function worker() {
		while (nextIndex < items.length) {
			const idx = nextIndex++;
			results[idx] = await fn(items[idx], idx);
		}
	}

	const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
	await Promise.all(workers);
	return results;
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	const authHeader = req.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return jsonResponse({ error: 'Missing Authorization header' }, 401);
	}

	const supabaseUrl = Deno.env.get('SUPABASE_URL');
	const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
	const tmdbToken = Deno.env.get('TMDB_READ_ACCESS_TOKEN');

	if (!supabaseUrl || !supabaseAnonKey) {
		return jsonResponse({ error: 'Supabase environment not configured' }, 500);
	}
	if (!tmdbToken) {
		return jsonResponse({ error: 'TMDB_READ_ACCESS_TOKEN secret not configured' }, 500);
	}

	const supabase = createClient(supabaseUrl, supabaseAnonKey, {
		global: { headers: { Authorization: authHeader } }
	});

	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return jsonResponse({ error: 'Unauthorized' }, 401);
	}

	try {
		if (req.method === 'GET') {
			const url = new URL(req.url);
			const action = url.searchParams.get('action');

			if (action === 'search') {
				const q = url.searchParams.get('q')?.trim() ?? '';
				if (!q) return jsonResponse({ error: 'Missing q parameter' }, 400);
				const year = url.searchParams.get('year');
				const results = await searchMovies(q, year, tmdbToken);
				return jsonResponse({ results });
			}

			if (action === 'hydrate') {
				const rawId = url.searchParams.get('tmdb_id');
				const tmdbId = rawId ? Number.parseInt(rawId, 10) : NaN;
				if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
					return jsonResponse({ error: 'Invalid tmdb_id parameter' }, 400);
				}
				const movie = await hydrateMovie(tmdbId, tmdbToken);
				return jsonResponse({ movie });
			}

			return jsonResponse({ error: 'Unsupported GET action' }, 400);
		}

		if (req.method === 'POST') {
			const body = (await req.json()) as {
				action?: string;
				items?: Array<{ tmdb_id?: number; title?: string; release_year?: number | null }>;
			};

			if (body.action !== 'batch_hydrate') {
				return jsonResponse({ error: 'Unsupported POST action' }, 400);
			}

			const items = body.items ?? [];
			if (!Array.isArray(items) || items.length === 0) {
				return jsonResponse({ results: [] });
			}
			if (items.length > 25) {
				return jsonResponse({ error: 'Maximum 25 items per batch_hydrate request' }, 400);
			}

			const results = await mapWithConcurrency(items, 10, async (item, index) => {
				try {
					let targetTmdbId = item.tmdb_id;
					if (!targetTmdbId && item.title) {
						const matches = await searchMovies(
							item.title,
							item.release_year ? String(item.release_year) : null,
							tmdbToken
						);
						targetTmdbId = matches[0]?.tmdb_id;
					}

					if (!targetTmdbId) {
						return { index, matched: false, movie: null, error: 'No TMDB match found' };
					}

					const movie = await hydrateMovie(targetTmdbId, tmdbToken);
					return { index, matched: true, movie, error: null };
				} catch (err) {
					return {
						index,
						matched: false,
						movie: null,
						error: err instanceof Error ? err.message : 'Hydration failed'
					};
				}
			});

			return jsonResponse({ results });
		}

		return jsonResponse({ error: 'Method not allowed' }, 405);
	} catch (err) {
		return jsonResponse(
			{ error: err instanceof Error ? err.message : 'Internal server error' },
			500
		);
	}
});
