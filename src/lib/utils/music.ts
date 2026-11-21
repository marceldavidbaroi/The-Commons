import * as XLSX from 'xlsx';
import type { ParsedSongRow, Song, SongInsert } from '$lib/types/music';

const YT_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export const MUSIC_IMPORT_PROMPT = `Format the songs as a CSV or Excel (.xlsx) table with these exact column headers:
title, artist, youtube_url, language, genre, version, vibe, energy, rating

Rules:
- title (required): Song title
- artist (required): Artist or band name
- youtube_url (required): Full YouTube URL or 11-char video ID
- language (optional, comma-separated): e.g. "bangla, hindi" (default: "bangla")
- genre (optional, comma-separated): e.g. "pop, electronic" (default: "pop")
- version (optional, comma-separated): e.g. "original, lofi" (default: "original")
- vibe (optional, comma-separated): e.g. "coding, late_night" (default: empty)
- energy (optional, integer 1-5): default 3
- rating (optional, integer 1-5): default 3

Note: language, genre, version, and vibe each support multiple values in a single cell separated by commas.`;

function parseCommaList(raw: unknown, fallback: string[] = []): string[] {
	const str = String(raw ?? '').trim();
	if (!str) return fallback;
	return Array.from(
		new Set(
			str
				.split(',')
				.map((v) => v.trim().toLowerCase())
				.filter(Boolean)
		)
	);
}

/**
 * Extracts an 11-character YouTube video ID from a URL or raw ID.
 * Supports watch?v=, youtu.be/, music.youtube.com/watch?v=, and raw IDs.
 */
export function extractYoutubeId(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	if (YT_ID_REGEX.test(trimmed)) {
		return trimmed;
	}

	try {
		const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
		const host = url.hostname.replace(/^www\./, '');

		if (host === 'youtu.be') {
			const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
			return YT_ID_REGEX.test(id) ? id : null;
		}

		if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'm.youtube.com') {
			const v = url.searchParams.get('v') ?? '';
			if (YT_ID_REGEX.test(v)) return v;

			const parts = url.pathname.split('/').filter(Boolean);
			const embedIdx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live');
			if (embedIdx !== -1 && parts[embedIdx + 1] && YT_ID_REGEX.test(parts[embedIdx + 1])) {
				return parts[embedIdx + 1];
			}
		}
	} catch {
		return null;
	}

	return null;
}

export function getYoutubeThumbnail(youtubeId: string): string {
	return `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`;
}

export function getYoutubeWatchUrl(youtubeId: string): string {
	return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export function getYoutubeQueueUrl(youtubeIds: string[]): string {
	const limited = youtubeIds.slice(0, 50).join(',');
	return `https://www.youtube.com/watch_videos?video_ids=${limited}`;
}

export function downloadSampleTemplate(): void {
	const sampleRows = [
		{
			title: 'Jhumka',
			artist: 'Xefer x Muza',
			youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			language: 'bangla',
			genre: 'electronic',
			version: 'original',
			vibe: 'party, drive',
			energy: 4,
			rating: 5
		},
		{
			title: 'Dhulabali',
			artist: 'Ashes',
			youtube_url: 'dQw4w9WgXcQ',
			language: 'bangla',
			genre: 'rock',
			version: 'original',
			vibe: 'late_night, nostalgic',
			energy: 3,
			rating: 4
		}
	];

	const ws = XLSX.utils.json_to_sheet(sampleRows);
	ws['!cols'] = [
		{ wch: 24 },
		{ wch: 22 },
		{ wch: 44 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 24 },
		{ wch: 8 },
		{ wch: 8 }
	];
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Songs');
	XLSX.writeFile(wb, 'music-import-template.xlsx');
}

export async function parseSpreadsheetFile(
	file: File,
	existingYoutubeIds: Set<string>
): Promise<ParsedSongRow[]> {
	const buffer = await file.arrayBuffer();
	const wb = XLSX.read(buffer, { type: 'array' });
	const firstSheet = wb.Sheets[wb.SheetNames[0]];
	if (!firstSheet) return [];

	const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });
	const seenInFile = new Set<string>();

	return rawRows.map((raw, idx) => {
		const rowNumber = idx + 2;
		const title = String(raw.title ?? '').trim();
		const artist = String(raw.artist ?? '').trim();
		const ytRaw = String(raw.youtube_url ?? raw.youtube_id ?? '').trim();
		const youtubeId = extractYoutubeId(ytRaw);

		if (!title) {
			return { rowNumber, status: 'invalid', reason: 'Missing title' };
		}
		if (!artist) {
			return { rowNumber, status: 'invalid', reason: 'Missing artist' };
		}
		if (!youtubeId) {
			return { rowNumber, status: 'invalid', reason: 'Invalid or missing YouTube URL/ID' };
		}
		if (existingYoutubeIds.has(youtubeId) || seenInFile.has(youtubeId)) {
			return { rowNumber, status: 'duplicate', reason: `Duplicate YouTube ID (${youtubeId})` };
		}

		seenInFile.add(youtubeId);

		const language = parseCommaList(raw.language, ['bangla']);
		const genre = parseCommaList(raw.genre, ['pop']);
		const version = parseCommaList(raw.version, ['original']);
		const vibe = parseCommaList(raw.vibe, []);

		const parsedEnergy = Number(raw.energy);
		const energy = Number.isFinite(parsedEnergy) && parsedEnergy >= 1 && parsedEnergy <= 5 ? Math.round(parsedEnergy) : 3;

		const parsedRating = Number(raw.rating);
		const rating = Number.isFinite(parsedRating) && parsedRating >= 1 && parsedRating <= 5 ? Math.round(parsedRating) : 3;

		const data: SongInsert = {
			title,
			artist,
			youtube_id: youtubeId,
			language,
			genre,
			version,
			vibe,
			energy,
			rating,
			needs_attention: false
		};

		return { rowNumber, status: 'valid', data };
	});
}

export function exportSongsToExcel(songs: Song[], format: 'xlsx' | 'csv' = 'xlsx'): void {
	const rows = songs.map((s) => ({
		title: s.title,
		artist: s.artist ?? '',
		youtube_id: s.youtube_id,
		youtube_url: getYoutubeWatchUrl(s.youtube_id),
		language: s.language.join(', '),
		genre: s.genre.join(', '),
		version: s.version.join(', '),
		vibe: s.vibe.join(', '),
		energy: s.energy,
		rating: s.rating,
		play_count: s.play_count,
		is_active: s.is_active,
		last_played: s.last_played ?? '',
		created_at: s.created_at
	}));

	const ws = XLSX.utils.json_to_sheet(rows);
	ws['!cols'] = [
		{ wch: 28 },
		{ wch: 24 },
		{ wch: 14 },
		{ wch: 44 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 24 },
		{ wch: 8 },
		{ wch: 8 },
		{ wch: 11 },
		{ wch: 10 },
		{ wch: 24 },
		{ wch: 24 }
	];

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Music Catalog');
	const dateStr = new Date().toISOString().slice(0, 10);
	XLSX.writeFile(wb, `music-${dateStr}.${format}`, { bookType: format });
}
