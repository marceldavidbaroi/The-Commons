import * as XLSX from 'xlsx';
import { getSupabaseClient } from '$lib/supabase';
import { batchHydrateTmdb } from '$lib/services/movies-service';
import type { MovieStatus, MovieUpsertPayload, RecommendAudience } from '$lib/types/movies';

export interface ParsedImportRow {
	title: string;
	release_year: number | null;
	status: MovieStatus;
	rating: number | null;
	watched_at: string | null;
	tags: string[];
	recommend_to: RecommendAudience[];
	notes: string | null;
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

		const year = parseYear(isLetterboxd ? row['Year'] : row['Year'] ?? row['year']);
		const key = `${title.toLowerCase()}::${year ?? ''}`;

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
		const tmdbRaw = Number.parseInt(String(row['TMDB ID'] ?? row['tmdb_id'] ?? ''), 10);

		deduped.set(key, {
			title,
			release_year: year,
			status,
			rating,
			watched_at,
			tags,
			recommend_to,
			notes,
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
				title: r.title,
				release_year: r.release_year
			}))
		);

		for (const res of hydrated) {
			const src = batch[res.index];
			if (!res.matched || !res.movie) {
				toUpsert.push({
					tmdb_id: null,
					imdb_id: null,
					title: src.title,
					release_year: src.release_year,
					original_language: null,
					origin_countries: [],
					genres: [],
					poster_path: null,
					trailer_youtube_key: null,
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

	// Chunked upsert (50/chunk)
	let imported = 0;
	for (let i = 0; i < toUpsert.length; i += 50) {
		const chunk = toUpsert.slice(i, i + 50);
		const { error } = await supabase
			.from('movies')
			.upsert(chunk, { onConflict: 'user_id,tmdb_id' });
		if (error) throw error;
		imported += chunk.length;
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
