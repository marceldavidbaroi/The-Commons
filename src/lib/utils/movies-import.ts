import * as XLSX from 'xlsx';
import { getSupabaseClient } from '$lib/supabase';
import { batchHydrateTmdb } from '$lib/services/movies-service';
import type {
	MovieStatus,
	MovieUpsertPayload,
	RecommendAudience,
	SeriesProgress
} from '$lib/types/movies';

export interface ParsedImportRow {
	title: string;
	media_type: 'movie' | 'series';
	release_year: number | null;
	status: MovieStatus;
	rating: number | null;
	watched_at: string | null;
	tags: string[];
	recommend_to: RecommendAudience[];
	notes: string | null;
	original_language: string | null;
	origin_countries: string[];
	genres: string[];
	trailer_youtube_key: string | null;
	series_progress: SeriesProgress | null;
	tmdb_id?: number;
}

export interface UnmatchedImportRow {
	Title: string;
	Year: number | string;
	Reason: string;
}

export interface ImportSummary {
	totalParsed: number;
	imported: number;
	unmatched: UnmatchedImportRow[];
}

const VALID_AUDIENCES = new Set<RecommendAudience>([
	'anyone',
	'partner',
	'friends',
	'family',
	'cinephiles',
	'solo_rewatch'
]);

function parseRating(raw: unknown, isLetterboxd: boolean): number | null {
	if (raw === null || raw === undefined || raw === '') return null;
	const num = Number(raw);
	if (!Number.isFinite(num) || num <= 0) return null;
	const scaled = isLetterboxd && num <= 5 ? num * 2 : num;
	const clamped = Math.min(10, Math.max(0.5, Math.round(scaled * 2) / 2));
	return clamped;
}

function parseYear(raw: unknown): number | null {
	if (raw === null || raw === undefined || raw === '') return null;
	const y = Number.parseInt(String(raw), 10);
	return Number.isFinite(y) && y >= 1888 && y <= 2100 ? y : null;
}

function parseList(raw: unknown): string[] {
	if (!raw) return [];
	return String(raw)
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
}

function parseSeriesProgress(
	seasonsRaw: unknown,
	watchedRaw: unknown
): SeriesProgress | null {
	const seasonMap = new Map<number, { season: number; episode_count: number; watched: number[] }>();

	if (seasonsRaw) {
		for (const part of String(seasonsRaw).split(',')) {
			const [sStr, cStr] = part.trim().split(':');
			const season = Number.parseInt(sStr, 10);
			const episode_count = Number.parseInt(cStr, 10);
			if (Number.isFinite(season) && season > 0 && Number.isFinite(episode_count) && episode_count > 0) {
				seasonMap.set(season, { season, episode_count, watched: [] });
			}
		}
	}

	if (watchedRaw) {
		for (const part of String(watchedRaw).split(';')) {
			const [sPart, epsPart] = part.trim().split(':');
			if (!sPart || !epsPart) continue;
			const season = Number.parseInt(sPart.replace(/^s/i, '').trim(), 10);
			if (!Number.isFinite(season) || season <= 0) continue;
			const watched = epsPart
				.split(',')
				.map((e) => Number.parseInt(e.trim(), 10))
				.filter((e) => Number.isFinite(e) && e > 0);
			const existing = seasonMap.get(season);
			if (existing) {
				existing.watched = Array.from(new Set([...existing.watched, ...watched])).sort((a, b) => a - b);
			} else {
				const maxEp = Math.max(...watched, 1);
				seasonMap.set(season, { season, episode_count: maxEp, watched });
			}
		}
	}

	if (seasonMap.size === 0) return null;
	return {
		seasons: Array.from(seasonMap.values()).sort((a, b) => a.season - b.season)
	};
}

export async function parseImportFile(file: File): Promise<ParsedImportRow[]> {
	const buf = await file.arrayBuffer();
	const wb = XLSX.read(buf, { type: 'array' });
	const firstSheet = wb.Sheets[wb.SheetNames[0]];
	if (!firstSheet) return [];

	const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
	if (rawRows.length === 0) return [];

	const headers = Object.keys(rawRows[0]).map((h) => h.toLowerCase());
	const isLetterboxd = headers.includes('name') && headers.includes('letterboxd uri');

	const deduped = new Map<string, ParsedImportRow>();

	for (const row of rawRows) {
		const title = String(
			isLetterboxd ? row['Name'] ?? '' : row['Title'] ?? row['title'] ?? ''
		).trim();
		if (!title) continue;

		const rawType = String(row['Type'] ?? row['type'] ?? row['Media Type'] ?? '').toLowerCase().trim();
		const media_type: 'movie' | 'series' = rawType === 'series' || rawType === 'tv' ? 'series' : 'movie';

		const year = parseYear(isLetterboxd ? row['Year'] : row['Year'] ?? row['year']);
		const key = `${media_type}::${title.toLowerCase()}::${year ?? ''}`;

		const rawStatus = String(row['Status'] ?? row['status'] ?? '').toLowerCase();
		const status: MovieStatus =
			rawStatus === 'watchlist' || rawStatus === 'dropped' || rawStatus === 'watched'
				? rawStatus
				: isLetterboxd
					? 'watched'
					: 'watchlist';

		const rating = parseRating(row['Rating'] ?? row['rating'], isLetterboxd);
		const watchedAtRaw = String(
			row['Watched Date'] ?? row['WatchedDate'] ?? row['Date'] ?? ''
		).trim();
		const watched_at = /^\d{4}-\d{2}-\d{2}$/.test(watchedAtRaw) ? watchedAtRaw : null;

		const tags = parseList(row['Tags'] ?? row['tags']);
		const recommend_to = parseList(row['Recommend To'] ?? row['recommend_to']).filter((a) =>
			VALID_AUDIENCES.has(a as RecommendAudience)
		) as RecommendAudience[];
		const notes = String(row['Notes'] ?? row['notes'] ?? '').trim() || null;
		const original_language =
			String(row['Language'] ?? row['original_language'] ?? '').trim().toLowerCase() || null;
		const origin_countries = String(row['Countries'] ?? row['origin_countries'] ?? '')
			.split(',')
			.map((s) => s.trim().toUpperCase())
			.filter(Boolean);
		const genres = String(row['Genres'] ?? row['genres'] ?? '')
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		const trailer_youtube_key =
			String(row['Trailer Key'] ?? row['trailer_youtube_key'] ?? '').trim() || null;
		const series_progress =
			media_type === 'series'
				? parseSeriesProgress(row['Seasons'] ?? row['seasons'], row['Watched Episodes'] ?? row['watched_episodes'])
				: null;
		const tmdbRaw = Number.parseInt(String(row['TMDB ID'] ?? row['tmdb_id'] ?? ''), 10);

		deduped.set(key, {
			title,
			media_type,
			release_year: year,
			status,
			rating,
			watched_at,
			tags,
			recommend_to,
			notes,
			original_language,
			origin_countries,
			genres,
			trailer_youtube_key,
			series_progress,
			...(Number.isFinite(tmdbRaw) && tmdbRaw > 0 ? { tmdb_id: tmdbRaw } : {})
		});
	}

	return Array.from(deduped.values());
}

export async function runMovieImport(
	rows: ParsedImportRow[],
	onProgress?: (done: number, total: number) => void
): Promise<ImportSummary> {
	const supabase = getSupabaseClient() as any;
	const unmatched: UnmatchedImportRow[] = [];
	const toUpsert: MovieUpsertPayload[] = [];

	// Hydrate in batches of 25
	for (let i = 0; i < rows.length; i += 25) {
		const batch = rows.slice(i, i + 25);
		const hydrated = await batchHydrateTmdb(
			batch.map((r) => ({
				tmdb_id: r.tmdb_id,
				media_type: r.media_type,
				title: r.title,
				release_year: r.release_year
			}))
		);

		for (const res of hydrated) {
			const src = batch[res.index];
			if (!res.matched || !res.movie) {
				toUpsert.push({
					tmdb_id: null,
					media_type: 'movie',
					imdb_id: null,
					title: src.title,
					release_year: src.release_year,
					original_language: src.original_language,
					origin_countries: src.origin_countries,
					genres: src.genres,
					poster_path: null,
					trailer_youtube_key: src.trailer_youtube_key,
					series_progress: null,
					status: src.status,
					rating: src.rating,
					watched_at: src.watched_at,
					tags: src.tags,
					recommend_to: src.recommend_to,
					notes: src.notes
				});
				continue;
			}

			toUpsert.push({
				...res.movie,
				original_language: res.movie.original_language ?? src.original_language,
				origin_countries:
					res.movie.origin_countries.length > 0 ? res.movie.origin_countries : src.origin_countries,
				genres: res.movie.genres.length > 0 ? res.movie.genres : src.genres,
				trailer_youtube_key: res.movie.trailer_youtube_key ?? src.trailer_youtube_key,
				series_progress: src.series_progress ?? res.movie.series_progress,
				status: src.status,
				rating: src.rating,
				watched_at: src.watched_at,
				tags: src.tags,
				recommend_to: src.recommend_to,
				notes: src.notes
			});
		}

		onProgress?.(Math.min(i + 25, rows.length), rows.length);
	}

	// 1. Upsert TMDB-matched rows idempotently
	const tmdbRows = toUpsert.filter((r) => r.tmdb_id !== null && r.tmdb_id !== undefined);
	const manualRows = toUpsert.filter((r) => !r.tmdb_id);

	let imported = 0;
	for (let i = 0; i < tmdbRows.length; i += 50) {
		const chunk = tmdbRows.slice(i, i + 50);
		const { error } = await supabase
			.from('movies')
			.upsert(chunk, { onConflict: 'user_id,media_type,tmdb_id' });
		if (error) throw error;
		imported += chunk.length;
	}

	// 2. Idempotently update or insert manual rows (tmdb_id is null)
	if (manualRows.length > 0) {
		const { data: existingManual, error: fetchErr } = await supabase
			.from('movies')
			.select('id, media_type, title, release_year')
			.is('tmdb_id', null);
		if (fetchErr) throw fetchErr;

		const existingMap = new Map<string, string>();
		for (const row of existingManual ?? []) {
			const k = `${row.media_type}::${String(row.title).toLowerCase()}::${row.release_year ?? ''}`;
			existingMap.set(k, row.id);
		}

		const toInsert: MovieUpsertPayload[] = [];
		for (const row of manualRows) {
			const k = `${row.media_type ?? 'movie'}::${row.title.toLowerCase()}::${row.release_year ?? ''}`;
			const existingId = existingMap.get(k);
			if (existingId) {
				const { error: updErr } = await supabase
					.from('movies')
					.update({
						status: row.status,
						rating: row.rating,
						watched_at: row.watched_at,
						tags: row.tags,
						recommend_to: row.recommend_to,
						notes: row.notes
					})
					.eq('id', existingId);
				if (updErr) throw updErr;
				imported += 1;
			} else {
				toInsert.push(row);
			}
		}

		for (let i = 0; i < toInsert.length; i += 50) {
			const chunk = toInsert.slice(i, i + 50);
			const { error: insErr } = await supabase.from('movies').insert(chunk);
			if (insErr) throw insErr;
			imported += chunk.length;
		}
	}

	return {
		totalParsed: rows.length,
		imported,
		unmatched
	};
}

export function downloadUnmatchedRows(unmatched: UnmatchedImportRow[]): void {
	const sheet = XLSX.utils.json_to_sheet(unmatched);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, sheet, 'Unmatched');
	XLSX.writeFile(wb, 'movies-unmatched.xlsx');
}
