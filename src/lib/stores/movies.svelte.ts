import { goto } from '$app/navigation';
import * as moviesService from '$lib/services/movies-service';
import type {
	Movie,
	MovieCursor,
	MovieFacets,
	MovieFilters,
	MovieSort,
	MovieTab,
	MovieUpdatePayload,
	MovieUpsertPayload,
	MediaType,
	RatingFilter,
	RecommendAudience,
	ReleaseEra,
	RightPaneMode,
	TmdbSearchResult
} from '$lib/types/movies';

const DEFAULT_FILTERS: MovieFilters = {
	search: '',
	mediaType: 'all',
	languages: [],
	originCountries: [],
	genres: [],
	era: null,
	audience: [],
	rating: 'all',
	tags: []
};

const DEFAULT_FACETS: MovieFacets = {
	counts_by_status: {},
	recommendation_count: 0,
	languages: [],
	origin_countries: [],
	genres: [],
	tags: []
};

class MoviesStore {
	items = $state<Movie[]>([]);
	recommendations = $state<TmdbSearchResult[]>([]);
	facets = $state<MovieFacets>({ ...DEFAULT_FACETS });
	filters = $state<MovieFilters>({ ...DEFAULT_FILTERS });
	sort = $state<MovieSort>('watched_at');
	activeTab = $state<MovieTab>('watched');

	selectedMovieId = $state<string | null>(null);
	rightPaneMode = $state<RightPaneMode>('closed');

	hasMore = $state(false);
	loading = $state(false);
	loadingMore = $state(false);
	error = $state<string | null>(null);

	selectedMovie = $derived(
		this.selectedMovieId ? this.items.find((m) => m.id === this.selectedMovieId) ?? null : null
	);

	activeFilterCount = $derived.by(() => {
		let count = 0;
		if (this.filters.search.trim()) count++;
		if (this.filters.mediaType !== 'all') count++;
		count += this.filters.languages.length;
		count += this.filters.originCountries.length;
		count += this.filters.genres.length;
		if (this.filters.era) count++;
		count += this.filters.audience.length;
		if (this.filters.rating !== 'all') count++;
		count += this.filters.tags.length;
		return count;
	});

	private getLastCursor(): MovieCursor | null {
		const last = this.items[this.items.length - 1];
		if (!last) return null;
		return {
			id: last.id,
			watched_at: last.watched_at,
			rating: last.rating,
			release_year: last.release_year,
			title: last.title
		};
	}

	async loadInitial(): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			const [page, facets] = await Promise.all([
				moviesService.fetchMoviesPage(this.activeTab, this.filters, this.sort, null),
				moviesService.fetchMovieFacets()
			]);
			this.items = page.movies;
			this.hasMore = page.hasMore;
			this.facets = facets;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load movies';
		} finally {
			this.loading = false;
		}
	}

	async reloadList(): Promise<void> {
		this.loading = true;
		this.error = null;
		try {
			if (this.activeTab === 'recommendations') {
				const seed = this.items.find((m) => m.tmdb_id && (m.rating ?? 0) >= 7) ?? this.items.find((m) => m.tmdb_id);
				this.recommendations = await moviesService.fetchTmdbRecommendations(
					seed?.tmdb_id ?? null,
					seed?.media_type ?? 'movie'
				);
				this.hasMore = false;
			} else {
				const page = await moviesService.fetchMoviesPage(
					this.activeTab,
					this.filters,
					this.sort,
					null
				);
				this.items = page.movies;
				this.hasMore = page.hasMore;
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load movies';
		} finally {
			this.loading = false;
		}
	}

	async loadMore(): Promise<void> {
		if (!this.hasMore || this.loadingMore) return;
		const cursor = this.getLastCursor();
		if (!cursor) return;

		this.loadingMore = true;
		try {
			const page = await moviesService.fetchMoviesPage(
				this.activeTab,
				this.filters,
				this.sort,
				cursor
			);
			this.items = [...this.items, ...page.movies];
			this.hasMore = page.hasMore;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load more movies';
		} finally {
			this.loadingMore = false;
		}
	}

	async refreshFacets(): Promise<void> {
		try {
			this.facets = await moviesService.fetchMovieFacets();
		} catch {
			// Non-fatal facet refresh failure
		}
	}

	async upsertMovie(payload: MovieUpsertPayload): Promise<Movie> {
		const saved = await moviesService.upsertMovie(payload);
		const exists = this.items.some((m) => m.id === saved.id);
		if (exists) {
			this.items = this.items.map((m) => (m.id === saved.id ? saved : m));
		} else {
			this.items = [saved, ...this.items];
		}
		this.selectedMovieId = saved.id;
		this.rightPaneMode = 'details';
		return saved;
	}

	async updateMovie(id: string, payload: MovieUpdatePayload): Promise<Movie> {
		const updated = await moviesService.updateMovie(id, payload);
		this.items = this.items.map((m) => (m.id === id ? updated : m));
		return updated;
	}

	async deleteMovie(id: string): Promise<void> {
		await moviesService.deleteMovie(id);
		this.items = this.items.filter((m) => m.id !== id);
		if (this.selectedMovieId === id) {
			this.selectedMovieId = null;
			this.rightPaneMode = 'closed';
		}
	}

	async deleteAllDropped(): Promise<void> {
		await moviesService.deleteAllDroppedMovies();
		if (this.activeTab === 'dropped') {
			this.items = [];
			this.hasMore = false;
		}
		await this.refreshFacets();
	}

	openDetails(movieId: string): void {
		this.selectedMovieId = movieId;
		this.rightPaneMode = 'details';
	}

	openAdd(): void {
		this.selectedMovieId = null;
		this.rightPaneMode = 'add';
	}

	openImport(): void {
		this.selectedMovieId = null;
		this.rightPaneMode = 'import';
	}

	closeRightPane(): void {
		this.selectedMovieId = null;
		this.rightPaneMode = 'closed';
	}

	resetFilters(): void {
		this.filters = { ...DEFAULT_FILTERS };
	}

	hydrateFromUrl(url: URL): void {
		const tab = url.searchParams.get('tab');
		if (
			tab === 'watched' ||
			tab === 'watchlist' ||
			tab === 'recommendations' ||
			tab === 'dropped'
		) {
			this.activeTab = tab;
		}

		const sort = url.searchParams.get('sort');
		if (sort === 'watched_at' || sort === 'rating' || sort === 'release_year' || sort === 'title') {
			this.sort = sort;
		}

		const q = url.searchParams.get('q') ?? '';
		const rawType = url.searchParams.get('type');
		const mediaType: 'all' | MediaType =
			rawType === 'movie' || rawType === 'series' ? rawType : 'all';
		const lang = url.searchParams.get('lang')?.split(',').filter(Boolean) ?? [];
		const country = url.searchParams.get('country')?.split(',').filter(Boolean) ?? [];
		const genre = url.searchParams.get('genre')?.split(',').filter(Boolean) ?? [];
		const era = (url.searchParams.get('era') as ReleaseEra | null) ?? null;
		const audience = (url.searchParams.get('audience')?.split(',').filter(Boolean) ??
			[]) as RecommendAudience[];
		const rating = (url.searchParams.get('rating') as RatingFilter | null) ?? 'all';
		const tags = url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];

		this.filters = {
			search: q,
			mediaType,
			languages: lang,
			originCountries: country,
			genres: genre,
			era,
			audience,
			rating,
			tags
		};

		const movieId = url.searchParams.get('movie');
		if (movieId) {
			this.selectedMovieId = movieId;
			this.rightPaneMode = 'details';
		}
	}

	syncToUrl(): void {
		const params = new URLSearchParams();
		if (this.activeTab !== 'watched') params.set('tab', this.activeTab);
		if (this.sort !== 'watched_at') params.set('sort', this.sort);
		if (this.filters.search.trim()) params.set('q', this.filters.search.trim());
		if (this.filters.mediaType !== 'all') params.set('type', this.filters.mediaType);
		if (this.filters.languages.length) params.set('lang', this.filters.languages.join(','));
		if (this.filters.originCountries.length)
			params.set('country', this.filters.originCountries.join(','));
		if (this.filters.genres.length) params.set('genre', this.filters.genres.join(','));
		if (this.filters.era) params.set('era', this.filters.era);
		if (this.filters.audience.length) params.set('audience', this.filters.audience.join(','));
		if (this.filters.rating !== 'all') params.set('rating', this.filters.rating);
		if (this.filters.tags.length) params.set('tags', this.filters.tags.join(','));
		if (this.selectedMovieId && this.rightPaneMode === 'details') {
			params.set('movie', this.selectedMovieId);
		}

		const qs = params.toString();
		goto(qs ? `/movies?${qs}` : '/movies', { replaceState: true, keepFocus: true, noScroll: true });
	}
}

export const moviesStore = new MoviesStore();
