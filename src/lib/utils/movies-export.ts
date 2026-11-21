import * as XLSX from 'xlsx';
import { fetchMoviesPage } from '$lib/services/movies-service';
import type { Movie, MovieCursor, MovieFilters, MovieSort, MovieTab } from '$lib/types/movies';

const EXPORT_BATCH_SIZE = 500;

function toExportRow(m: Movie) {
	return {
		Title: m.title,
		Year: m.release_year ?? '',
		Status: m.status,
		Rating: m.rating ?? '',
		'Watched Date': m.watched_at ?? '',
		Rewatches: m.rewatch_count,
		Language: m.original_language ?? '',
		Countries: m.origin_countries.join(', '),
		Genres: m.genres.join(', '),
		Tags: m.tags.join(', '),
		'Recommend To': m.recommend_to.join(', '),
		Notes: m.notes ?? '',
		'TMDB ID': m.tmdb_id,
		'IMDb URL': m.imdb_url ?? '',
		'Letterboxd URL': m.letterboxd_url ?? ''
	};
}

export async function exportFilteredMovies(
	tab: MovieTab,
	filters: MovieFilters,
	sort: MovieSort,
	format: 'xlsx' | 'csv'
): Promise<number> {
	const allRows: Movie[] = [];
	let cursor: MovieCursor | null = null;
	let hasMore = true;

	while (hasMore) {
		const page = await fetchMoviesPage(tab, filters, sort, cursor, EXPORT_BATCH_SIZE);
		allRows.push(...page.movies);
		hasMore = page.hasMore;

		const last = page.movies[page.movies.length - 1];
		if (!last) break;
		cursor = {
			id: last.id,
			watched_at: last.watched_at,
			rating: last.rating,
			release_year: last.release_year,
			title: last.title
		};
	}

	const sheet = XLSX.utils.json_to_sheet(allRows.map(toExportRow));
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, sheet, 'Movies');

	const dateStr = new Date().toISOString().slice(0, 10);
	if (format === 'csv') {
		XLSX.writeFile(wb, `movies-${tab}-${dateStr}.csv`, { bookType: 'csv' });
	} else {
		XLSX.writeFile(wb, `movies-${tab}-${dateStr}.xlsx`);
	}

	return allRows.length;
}

export function downloadSampleTemplate(): void {
	const sampleRows = [
		{
			Title: 'Past Lives',
			Year: 2023,
			Status: 'watched',
			Rating: 9.0,
			'Watched Date': '2024-02-14',
			Tags: 'romance, indie',
			'Recommend To': 'partner, cinephiles',
			Notes: 'Quiet and devastating.'
		},
		{
			Title: 'Parasite',
			Year: 2019,
			Status: 'watchlist',
			Rating: '',
			'Watched Date': '',
			Tags: 'thriller',
			'Recommend To': '',
			Notes: ''
		}
	];

	const sheet = XLSX.utils.json_to_sheet(sampleRows);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, sheet, 'Template');
	XLSX.writeFile(wb, 'movies-import-template.xlsx');
}
