export const MUSIC_FILTERS = {
	language: ['bangla', 'english', 'hindi', 'spanish', 'urdu'],
	genre: [
		'alt_pop', 'alt_rock', 'ballad', 'bangla_pop', 'bollywood', 'britpop',
		'country_pop', 'dance', 'dance_pop', 'deep_house', 'edm', 'electronic',
		'electropop', 'funk_pop', 'fusion', 'hip_hop', 'house', 'indian_pop',
		'indie_pop', 'latin_pop', 'lofi', 'new_jack_swing', 'nu_disco', 'ost',
		'pakistani_pop', 'pop', 'pop_rock', 'progressive_house', 'r&b',
		'reggaeton', 'romantic', 'sufi_rock', 'synth_pop', 'tropical_house'
	],
	version: [
		'animated', 'anniversary', 'jukebox', 'lofi',
		'lyric_video', 'mashup', 'original', 'remix'
	],
	vibe: [
		'anthemic', 'atmospheric', 'bass_heavy', 'bittersweet', 'bold', 'bright',
		'bubbly', 'calm', 'carefree', 'catchy', 'chill', 'cinematic', 'club',
		'coding', 'confident', 'dance', 'dark', 'dramatic', 'dreamy', 'driving',
		'edgy', 'emotional', 'energetic', 'euphoric', 'exotic', 'festive',
		'funky', 'groovy', 'haunting', 'healing', 'heartbreak', 'heartfelt',
		'late_night', 'long_drive', 'melancholic', 'melodic', 'moody',
		'nostalgic', 'party', 'passionate', 'relaxing', 'retro', 'rhythmic',
		'romantic', 'sassy', 'sensual', 'shimmering', 'smooth', 'soulful',
		'sultry', 'trance', 'trippy', 'tropical', 'upbeat', 'uplifting', 'warm'
	],
	energy: [1, 2, 3, 4, 5],
	rating: [1, 2, 3, 4, 5]
} as const;

export type PlayMode = 'serial' | 'shuffle';

export interface Song {
	id: number;
	user_id: string;
	title: string;
	artist: string | null;
	youtube_id: string;
	is_active: boolean;
	needs_attention: boolean;
	language: string[];
	version: string[];
	genre: string[];
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
	language?: string[];
	version?: string[];
	genre?: string[];
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
	language?: string[];
	version?: string[];
	genre?: string[];
	vibe?: string[];
	energy?: number;
	rating?: number;
}

export interface SongFilters {
	search: string;
	language: string[];
	genre: string[];
	version: string[];
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
