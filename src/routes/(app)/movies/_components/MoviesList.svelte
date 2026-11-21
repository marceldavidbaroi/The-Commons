<script lang="ts">
	import { goto } from '$app/navigation';
	import { moviesStore } from '$lib/stores/movies.svelte';
	import type { MovieSort } from '$lib/types/movies';

	const langNames = new Intl.DisplayNames(['en'], { type: 'language' });

	function formatLang(code: string | null): string {
		if (!code) return '';
		try {
			return langNames.of(code) ?? code.toUpperCase();
		} catch {
			return code.toUpperCase();
		}
	}

	function onSortChange(e: Event) {
		moviesStore.sort = (e.target as HTMLSelectElement).value as MovieSort;
		moviesStore.syncToUrl();
		moviesStore.reloadList();
	}
</script>

<section class="list-pane">
	<div class="list-subheader">
		<div class="subheader-left">
			<span class="result-count">
				{moviesStore.items.length}{moviesStore.hasMore ? '+' : ''} items
			</span>
			{#if moviesStore.activeFilterCount > 0}
				<span class="filter-badge">{moviesStore.activeFilterCount} active</span>
				<button
					type="button"
					class="clear-filters-btn"
					onclick={() => {
						moviesStore.resetFilters();
						moviesStore.syncToUrl();
						moviesStore.reloadList();
					}}
				>
					Clear filters
				</button>
			{/if}
		</div>

		<div class="subheader-right">
			<label class="sort-label" for="movie-sort-select">Sort</label>
			<select
				id="movie-sort-select"
				class="sort-select"
				value={moviesStore.sort}
				onchange={onSortChange}
			>
				<option value="watched_at">Watched Date</option>
				<option value="rating">Rating</option>
				<option value="release_year">Release Year</option>
				<option value="title">Title (A–Z)</option>
			</select>
		</div>
	</div>

	<div class="list-scroll">
		{#if moviesStore.activeTab === 'recommendations'}
			{#if moviesStore.loading}
				<div class="empty-state">Loading TMDB recommendations...</div>
			{:else if moviesStore.error}
				<div class="empty-state error">{moviesStore.error}</div>
			{:else if moviesStore.recommendations.length === 0}
				<div class="empty-state">No TMDB recommendations found.</div>
			{:else}
				<div class="movie-grid">
					{#each moviesStore.recommendations as rec (rec.tmdb_id)}
						<article class="movie-card">
							<div class="poster-wrap">
								{#if rec.poster_path}
									<img
										src={`https://image.tmdb.org/t/p/w342${rec.poster_path}`}
										alt={rec.title}
										loading="lazy"
									/>
								{:else}
									<div class="poster-placeholder"><span>{rec.title}</span></div>
								{/if}
								{#if rec.media_type === 'series'}
									<span class="badge-series">Series</span>
								{/if}
							</div>
							<div class="card-body">
								<h3 class="card-title" title={rec.title}>{rec.title}</h3>
								<div class="card-meta">
									<span>{rec.release_year ?? '—'}</span>
									{#if rec.vote_average}
										<span>· ★ {rec.vote_average.toFixed(1)}</span>
									{/if}
								</div>
								<div class="card-footer">
									<button
										type="button"
										class="btn-secondary"
										style="width: 100%; height: 26px; font-size: 11px;"
										onclick={async () => {
											const hydrated = await import('$lib/services/movies-service').then((s) =>
												s.hydrateTmdb(rec.tmdb_id, rec.media_type)
											);
											await moviesStore.upsertMovie({ ...hydrated, status: 'watchlist' });
											moviesStore.refreshFacets();
										}}
									>
										+ Wish List
									</button>
								</div>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		{:else if moviesStore.loading && moviesStore.items.length === 0}
			<div class="empty-state">Loading movies...</div>
		{:else if moviesStore.error}
			<div class="empty-state error">{moviesStore.error}</div>
		{:else if moviesStore.items.length === 0}
			<div class="empty-state">
				<p>No movies match your current filters.</p>
				<button type="button" class="btn-secondary" onclick={() => moviesStore.openAdd()}>
					+ Add Movie
				</button>
			</div>
		{:else}
			<div class="movie-grid">
				{#each moviesStore.items as movie (movie.id)}
					{@const isSelected =
						moviesStore.selectedMovieId === movie.id && moviesStore.rightPaneMode === 'details'}
					{@const seasons = movie.series_progress?.seasons ?? []}
					{@const totalEp = seasons.reduce((acc, s) => acc + s.episode_count, 0)}
					{@const watchedEp = seasons.reduce((acc, s) => acc + s.watched.length, 0)}

					<article
						class="movie-card"
						class:selected={isSelected}
						onclick={() => goto(`/movies/${movie.id}`)}
					>
						<div class="poster-wrap">
							{#if movie.poster_path}
								<img
									src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
									alt={movie.title}
									loading="lazy"
								/>
							{:else}
								<div class="poster-placeholder">
									<span>{movie.title}</span>
								</div>
							{/if}

							{#if movie.media_type === 'series'}
								<span class="badge-series">
									Series{totalEp > 0 ? ` · ${watchedEp}/${totalEp}` : ''}
								</span>
							{/if}
						</div>

						<div class="card-body">
							<h3 class="card-title" title={movie.title}>{movie.title}</h3>
							<div class="card-meta">
								<span>{movie.release_year ?? '—'}</span>
								{#if movie.original_language}
									<span>· {formatLang(movie.original_language)}</span>
								{/if}
							</div>

							{#if movie.genres.length > 0}
								<div class="card-genres">
									{#each movie.genres.slice(0, 3) as genre}
										<span class="genre-pill">{genre}</span>
									{/each}
								</div>
							{/if}

							{#if moviesStore.activeTab === 'watchlist'}
								<div class="card-quick-actions">
									<button
										type="button"
										class="quick-btn quick-btn-watched"
										onclick={async (e) => {
											e.stopPropagation();
											await moviesStore.updateMovie(movie.id, { status: 'watched' });
											moviesStore.items = moviesStore.items.filter((m) => m.id !== movie.id);
											moviesStore.refreshFacets();
										}}
									>
										Watched
									</button>
									<button
										type="button"
										class="quick-btn quick-btn-drop"
										onclick={async (e) => {
											e.stopPropagation();
											await moviesStore.updateMovie(movie.id, { status: 'dropped' });
											moviesStore.items = moviesStore.items.filter((m) => m.id !== movie.id);
											moviesStore.refreshFacets();
										}}
									>
										Drop
									</button>
								</div>
							{:else if moviesStore.activeTab === 'dropped'}
								<div class="card-quick-actions">
									<button
										type="button"
										class="quick-btn quick-btn-watched"
										onclick={async (e) => {
											e.stopPropagation();
											await moviesStore.updateMovie(movie.id, { status: 'watched' });
											moviesStore.items = moviesStore.items.filter((m) => m.id !== movie.id);
											moviesStore.refreshFacets();
										}}
									>
										Watched
									</button>
									<button
										type="button"
										class="quick-btn quick-btn-watchlist"
										onclick={async (e) => {
											e.stopPropagation();
											await moviesStore.updateMovie(movie.id, { status: 'watchlist' });
											moviesStore.items = moviesStore.items.filter((m) => m.id !== movie.id);
											moviesStore.refreshFacets();
										}}
									>
										Wish List
									</button>
								</div>
							{/if}

							{#if movie.rating !== null || movie.imdb_url || movie.letterboxd_url}
								<div class="card-footer">
									<div class="card-links">
										{#if movie.imdb_url}
											<a
												href={movie.imdb_url}
												target="_blank"
												rel="noopener noreferrer"
												onclick={(e) => e.stopPropagation()}
											>
												IMDb
											</a>
										{/if}
										{#if movie.letterboxd_url}
											<a
												href={movie.letterboxd_url}
												target="_blank"
												rel="noopener noreferrer"
												onclick={(e) => e.stopPropagation()}
											>
												LB
											</a>
										{/if}
									</div>
									{#if movie.rating !== null}
										<span class="badge-rating">{movie.rating.toFixed(1)}</span>
									{/if}
								</div>
							{/if}
						</div>
					</article>
				{/each}
			</div>

			{#if moviesStore.hasMore}
				<div class="load-more-wrap">
					<button
						type="button"
						class="btn-secondary"
						disabled={moviesStore.loadingMore}
						onclick={() => moviesStore.loadMore()}
					>
						{moviesStore.loadingMore ? 'Loading...' : 'Load More (50)'}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</section>

<style>
	.list-pane {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-width: 0;
		background: var(--bg-primary);
	}

	.list-subheader {
		height: 36px;
		padding: 0 14px;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-shrink: 0;
	}

	.subheader-left {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.filter-badge {
		background: var(--bg-tertiary);
		color: var(--text-primary);
		padding: 2px 7px;
		border-radius: 999px;
		font-size: 11px;
	}

	.clear-filters-btn {
		border: 1px solid var(--border-subtle);
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 999px;
		cursor: pointer;
	}

	.clear-filters-btn:hover {
		background: var(--bg-tertiary);
	}

	.subheader-right {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.sort-label {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.sort-select {
		height: 26px;
		padding: 0 6px;
		border: 1px solid var(--border-subtle);
		border-radius: 5px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 12px;
	}

	.list-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 14px;
	}

	.movie-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(164px, 1fr));
		gap: 14px;
	}

	.movie-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		cursor: pointer;
		transition: border-color 0.15s ease, transform 0.15s ease;
	}

	.movie-card:hover {
		border-color: var(--text-secondary);
	}

	.movie-card.selected {
		border: 2px solid var(--primary);
	}

	.poster-wrap {
		position: relative;
		aspect-ratio: 2 / 3;
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
		overflow: hidden;
	}

	.poster-wrap img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.poster-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 12px;
		text-align: center;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.badge-series {
		position: absolute;
		top: 8px;
		left: 8px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 999px;
	}

	.badge-rating {
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 11px;
		font-weight: 600;
		padding: 1px 6px;
		border-radius: 4px;
	}

	.card-body {
		padding: 10px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
	}

	.card-title {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		font-size: 11.5px;
		color: var(--text-secondary);
		display: flex;
		gap: 4px;
	}

	.card-genres {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 2px;
	}

	.genre-pill {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 999px;
		background: var(--bg-tertiary);
		color: var(--text-secondary);
	}

	.card-footer {
		margin-top: auto;
		padding-top: 6px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
	}

	.card-quick-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 5px;
		margin-top: 6px;
	}

	.quick-btn {
		height: 24px;
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 10.5px;
		font-weight: 500;
		cursor: pointer;
	}

	.quick-btn:hover {
		opacity: 0.9;
	}

	.quick-btn-watched {
		background: var(--success);
		border-color: var(--success);
		color: #ffffff;
	}

	.quick-btn-drop {
		background: var(--danger);
		border-color: var(--danger);
		color: #ffffff;
	}

	.quick-btn-watchlist {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.card-links {
		display: flex;
		gap: 6px;
	}

	.card-links a {
		font-size: 10.5px;
		color: var(--text-secondary);
		text-decoration: none;
		border: 1px solid var(--border-subtle);
		padding: 1px 6px;
		border-radius: 4px;
		background: var(--bg-primary);
	}

	.card-links a:hover {
		color: var(--text-primary);
		border-color: var(--primary);
	}

	.load-more-wrap {
		padding: 18px 0 6px;
		display: flex;
		justify-content: center;
	}

	.btn-secondary {
		height: 32px;
		padding: 0 14px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--bg-tertiary);
	}

	.empty-state {
		padding: 48px 16px;
		text-align: center;
		color: var(--text-secondary);
		font-size: 13px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.empty-state.error {
		color: var(--danger);
	}
</style>
