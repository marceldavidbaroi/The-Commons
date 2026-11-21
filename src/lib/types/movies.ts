export type MediaType = 'movie' | 'series';

export type MovieStatus = 'watchlist' | 'watched' | 'dropped';

export type RecommendAudience =
	| 'anyone'
	| 'partner'
	| 'friends'
	| 'family'
	| 'cinephiles'
	| 'solo_rewatch';

export type MovieTab = 'watched' | 'watchlist' | 'recommendations' | 'dropped';

export type MovieSort = 'watched_at' | 'rating' | 'release_year' | 'title';

export type ReleaseEra = '2020s' | '2010s' | '2000s' | '1990s' | 'pre_1990';

export type RatingFilter = 'all' | '9+' | '8+' | '7+' | 'unrated';

export type RightPaneMode = 'closed' | 'details' | 'add' | 'import';

export interface SeasonProgress {
	season: number;
	episode_count: number;
	watched: number[];
}

export interface SeriesProgress {
	seasons: SeasonProgress[];
}

export interface Movie {
	id: string;
	tmdb_id: number | null;
	media_type: MediaType;
	imdb_id: string | null;
	imdb_url: string | null;
	letterboxd_url: string | null;
	title: string;
	release_year: number | null;
	original_language: string | null;
	origin_countries: string[];
	genres: string[];
	poster_path: string | null;
	trailer_youtube_key: string | null;
	series_progress: SeriesProgress | null;
	status: MovieStatus;
	rating: number | null;
	tags: string[];
	recommend_to: RecommendAudience[];
	notes: string | null;
	watched_at: string | null;
	rewatch_count: number;
}

export interface MovieFilters {
	search: string;
	mediaType: 'all' | MediaType;
	languages: string[];
	originCountries: string[];
	genres: string[];
	era: ReleaseEra | null;
	audience: RecommendAudience[];
	rating: RatingFilter;
	tags: string[];
}

export interface MovieCursor {
	id: string;
	watched_at: string | null;
	rating: number | null;
	release_year: number | null;
	title: string;
}

export interface MovieFacets {
	counts_by_status: Partial<Record<MovieStatus, number>>;
	recommendation_count: number;
	languages: string[];
	origin_countries: string[];
	genres: string[];
	tags: Array<{ tag: string; count: number }>;
}

export interface TmdbSearchResult {
	tmdb_id: number;
	media_type: MediaType;
	title: string;
	release_year: number | null;
	poster_path: string | null;
	vote_average?: number | null;
}

export interface TmdbHydratedMovie {
	tmdb_id: number;
	media_type: MediaType;
	imdb_id: string | null;
	title: string;
	release_year: number | null;
	original_language: string | null;
	origin_countries: string[];
	genres: string[];
	poster_path: string | null;
	trailer_youtube_key: string | null;
	series_progress: SeriesProgress | null;
}

export interface MovieUpsertPayload extends Omit<TmdbHydratedMovie, 'tmdb_id'> {
	tmdb_id?: number | null;
	imdb_url?: string | null;
	letterboxd_url?: string | null;
	status?: MovieStatus;
	rating?: number | null;
	tags?: string[];
	recommend_to?: RecommendAudience[];
	notes?: string | null;
	watched_at?: string | null;
	rewatch_count?: number;
}

export type MovieUpdatePayload = Partial<Omit<Movie, 'id' | 'tmdb_id'>>;
