export type SongLanguage = 'bangla' | 'hindi' | 'punjabi' | 'english' | 'instrumental';
export type SongGenre = 'pop' | 'electronic' | 'folk' | 'rock' | 'bollywood' | 'lofi' | 'classic';
export type SongVersion = 'original' | 'lofi' | 'remix' | 'mashup' | 'cover' | 'live';
export type PlayMode = 'serial' | 'shuffle';

export interface Song {
	id: number;
	user_id: string;
	title: string;
	artist: string | null;
	youtube_id: string;
	is_active: boolean;
	needs_attention: boolean;
	language: string;
	version: string;
	genre: string;
	vibe: string[];
	energy: number;
	rating: number;
	play_count: number;
	last_played: string | null;
	created_at: string;
}

export interface SongInsert {
	title: string;
	artist?: string | null;
	youtube_id: string;
	is_active?: boolean;
	needs_attention?: boolean;
	language?: string;
	version?: string;
	genre?: string;
	vibe?: string[];
	energy?: number;
	rating?: number;
}

export interface SongUpdate {
	title?: string;
	artist?: string | null;
	youtube_id?: string;
	is_active?: boolean;
	needs_attention?: boolean;
	language?: string;
	version?: string;
	genre?: string;
	vibe?: string[];
	energy?: number;
	rating?: number;
}

export interface SongFilters {
	search: string;
	language: string | null;
	genre: string | null;
	version: string | null;
	vibe: string[];
	energy: number | null;
	minRating: number | null;
	needsAttention: boolean;
}

export interface SongCursor {
	created_at: string;
	id: number;
}

export interface ParsedSongRow {
	rowNumber: number;
	status: 'valid' | 'duplicate' | 'invalid';
	reason?: string;
	data?: SongInsert;
}
