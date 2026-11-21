<script lang="ts">
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
				{moviesStore.items.length}{moviesStore.hasMore ? '+' : ''} movies
			</span>
			{#if moviesStore.activeFilterCount > 0}
				<span class="filter-badge">{moviesStore.activeFilterCount} active filters</span>
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
		{#if moviesStore.loading && moviesStore.items.length === 0}
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
			<ul class="movie-rows">
				{#each moviesStore.items as movie (movie.id)}
					<li
						class="movie-row"
						class:selected={moviesStore.selectedMovieId === movie.id && moviesStore.rightPaneMode === 'details'}
						onclick={() => {
							moviesStore.openDetails(movie.id);
							moviesStore.syncToUrl();
						}}
					>
						<div class="poster-box">
							{#if movie.poster_path}
								<img
									src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
									alt={movie.title}
									loading="lazy"
								/>
							{:else}
								<div class="poster-placeholder">No Img</div>
							{/if}
						</div>

						<div class="row-main">
							<div class="row-title-line">
								<span class="row-title">{movie.title}</span>
								{#if movie.release_year}
									<span class="row-year">({movie.release_year})</span>
								{/if}
								{#if movie.media_type === 'series'}
									{@const seasons = movie.series_progress?.seasons ?? []}
									{@const totalEp = seasons.reduce((acc, s) => acc + s.episode_count, 0)}
									{@const watchedEp = seasons.reduce((acc, s) => acc + s.watched.length, 0)}
									<span class="series-badge">
										Series{totalEp > 0 ? ` · ${watchedEp}/${totalEp}` : ''}
									</span>
								{/if}
							</div>
							<div class="row-meta-line">
								{#if movie.original_language}
									<span>{formatLang(movie.original_language)}</span>
								{/if}
								{#if movie.genres.length > 0}
									<span>· {movie.genres.slice(0, 2).join(', ')}</span>
								{/if}
								{#if movie.watched_at}
									<span>· {movie.watched_at}</span>
								{/if}
								{#if movie.tags.length > 0}
									<span class="row-tags">· {movie.tags.slice(0, 2).map((t) => `#${t}`).join(' ')}</span>
								{/if}
							</div>
						</div>

						<div class="row-right">
							{#if movie.rating !== null}
								<span class="rating-badge">{movie.rating.toFixed(1)}</span>
							{/if}
							<div class="ext-links">
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
						</div>
					</li>
				{/each}
			</ul>

			{#if moviesStore.hasMore}
				<div class="load-more-wrap">
					<button
						type="button"
						class="btn-secondary"
						disabled={moviesStore.loadingMore}
						onclick={() => moviesStore.loadMore()}
					>
						{moviesStore.loadingMore ? 'Loading...' : 'Load More (20)'}
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
	}

	.movie-rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.movie-row {
		height: 76px;
		padding: 8px 14px;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		gap: 12px;
		cursor: pointer;
		background: var(--bg-secondary);
	}

	.movie-row:hover {
		background: var(--bg-tertiary);
	}

	.movie-row.selected {
		background: var(--bg-tertiary);
		border-left: 3px solid var(--primary);
		padding-left: 11px;
	}

	.poster-box {
		width: 40px;
		height: 60px;
		flex-shrink: 0;
		border-radius: 4px;
		overflow: hidden;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
	}

	.poster-box img {
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
		font-size: 9px;
		color: var(--text-secondary);
	}

	.row-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.row-title-line {
		display: flex;
		align-items: baseline;
		gap: 6px;
		min-width: 0;
	}

	.row-title {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.row-year {
		font-size: 12px;
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.series-badge {
		font-size: 10.5px;
		padding: 1px 6px;
		border-radius: 999px;
		background: var(--bg-tertiary);
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.row-meta-line {
		font-size: 12px;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: flex;
		gap: 5px;
	}

	.row-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 5px;
		flex-shrink: 0;
	}

	.rating-badge {
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 11px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 4px;
	}

	.ext-links {
		display: flex;
		gap: 6px;
	}

	.ext-links a {
		font-size: 11px;
		color: var(--text-secondary);
		text-decoration: none;
		border: 1px solid var(--border-subtle);
		padding: 1px 5px;
		border-radius: 4px;
		background: var(--bg-secondary);
	}

	.ext-links a:hover {
		color: var(--text-primary);
		border-color: var(--primary);
	}

	.load-more-wrap {
		padding: 16px;
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
