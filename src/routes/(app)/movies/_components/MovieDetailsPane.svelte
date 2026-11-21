<script lang="ts">
	import * as moviesService from '$lib/services/movies-service';
	import { moviesStore } from '$lib/stores/movies.svelte';
	import type {
		MediaType,
		MovieStatus,
		RecommendAudience,
		SeriesProgress,
		TmdbSearchResult
	} from '$lib/types/movies';
	import MovieImportPane from './MovieImportPane.svelte';

	const AUDIENCES: Array<{ value: RecommendAudience; label: string }> = [
		{ value: 'anyone', label: 'Anyone' },
		{ value: 'partner', label: 'Partner' },
		{ value: 'friends', label: 'Friends' },
		{ value: 'family', label: 'Family' },
		{ value: 'cinephiles', label: 'Cinephiles' },
		{ value: 'solo_rewatch', label: 'Solo' }
	];

	// Add mode state
	let tmdbQuery = $state('');
	let tmdbYear = $state('');
	let tmdbResults = $state<TmdbSearchResult[]>([]);
	let searchingTmdb = $state(false);
	let hydratingId = $state<number | null>(null);
	let addError = $state<string | null>(null);

	// Manual add state
	let manualMediaType = $state<MediaType>('movie');
	let manualTitle = $state('');
	let manualYear = $state('');
	let manualImdbUrl = $state('');
	let manualLetterboxdUrl = $state('');
	let manualLanguage = $state('');
	let addingManual = $state(false);

	// Edit mode state (synced when selectedMovie changes)
	let status = $state<MovieStatus>('watchlist');
	let rating = $state<string>('');
	let watchedAt = $state<string>('');
	let rewatchCount = $state<number>(0);
	let recommendTo = $state<RecommendAudience[]>([]);
	let tags = $state<string[]>([]);
	let tagInput = $state('');
	let notes = $state('');
	let seriesProgress = $state<SeriesProgress | null>(null);
	let showTrailer = $state(false);
	let saving = $state(false);
	let refreshing = $state(false);
	let confirmDelete = $state(false);
	let detailsError = $state<string | null>(null);

	$effect(() => {
		const m = moviesStore.selectedMovie;
		if (m) {
			status = m.status;
			rating = m.rating !== null ? String(m.rating) : '';
			watchedAt = m.watched_at ?? '';
			rewatchCount = m.rewatch_count ?? 0;
			recommendTo = [...m.recommend_to];
			tags = [...m.tags];
			notes = m.notes ?? '';
			seriesProgress = m.series_progress
				? {
						seasons: m.series_progress.seasons.map((s) => ({
							...s,
							watched: [...s.watched]
						}))
					}
				: null;
			showTrailer = false;
			confirmDelete = false;
			detailsError = null;
		}
	});

	async function handleTmdbSearch(e: Event) {
		e.preventDefault();
		if (!tmdbQuery.trim()) return;
		searchingTmdb = true;
		addError = null;
		try {
			const yearNum = tmdbYear.trim() ? Number.parseInt(tmdbYear.trim(), 10) : null;
			tmdbResults = await moviesService.searchTmdb(tmdbQuery.trim(), yearNum);
		} catch (err) {
			addError = err instanceof Error ? err.message : 'TMDB search failed';
		} finally {
			searchingTmdb = false;
		}
	}

	async function handleSelectTmdbMatch(tmdbId: number, mediaType: MediaType) {
		hydratingId = tmdbId;
		addError = null;
		try {
			const hydrated = await moviesService.hydrateTmdb(tmdbId, mediaType);
			const defaultStatus: MovieStatus =
				moviesStore.activeTab === 'watchlist' ? 'watchlist' : 'watched';
			await moviesStore.upsertMovie({
				...hydrated,
				status: defaultStatus
			});
			moviesStore.refreshFacets();
			moviesStore.syncToUrl();
		} catch (err) {
			addError = err instanceof Error ? err.message : 'Failed to add movie';
		} finally {
			hydratingId = null;
		}
	}

	function toggleAudience(aud: RecommendAudience) {
		recommendTo = recommendTo.includes(aud)
			? recommendTo.filter((a) => a !== aud)
			: [...recommendTo, aud];
	}

	function addTag() {
		const clean = tagInput.trim().toLowerCase();
		if (clean && !tags.includes(clean)) {
			tags = [...tags, clean];
		}
		tagInput = '';
	}

	function removeTag(t: string) {
		tags = tags.filter((x) => x !== t);
	}

	async function handleSave() {
		const m = moviesStore.selectedMovie;
		if (!m) return;
		saving = true;
		detailsError = null;
		try {
			const parsedRating = rating.trim() ? Number.parseFloat(rating) : null;
			await moviesStore.updateMovie(m.id, {
				status,
				rating: parsedRating,
				watched_at: watchedAt.trim() || null,
				rewatch_count: rewatchCount,
				recommend_to: recommendTo,
				tags,
				notes: notes.trim() || null,
				series_progress: seriesProgress
			});
			moviesStore.refreshFacets();
		} catch (err) {
			detailsError = err instanceof Error ? err.message : 'Failed to save changes';
		} finally {
			saving = false;
		}
	}

	async function handleManualAdd(e: Event) {
		e.preventDefault();
		const title = manualTitle.trim();
		if (!title) return;
		addingManual = true;
		addError = null;
		try {
			const defaultStatus: MovieStatus =
				moviesStore.activeTab === 'watchlist' ? 'watchlist' : 'watched';
			const yearNum = manualYear.trim() ? Number.parseInt(manualYear.trim(), 10) : null;
			await moviesStore.upsertMovie({
				tmdb_id: null,
				media_type: manualMediaType,
				imdb_id: null,
				imdb_url: manualImdbUrl.trim() || null,
				letterboxd_url: manualLetterboxdUrl.trim() || null,
				title,
				release_year: Number.isFinite(yearNum) ? yearNum : null,
				original_language: manualLanguage.trim().toLowerCase() || null,
				origin_countries: [],
				genres: [],
				poster_path: null,
				trailer_youtube_key: null,
				series_progress:
					manualMediaType === 'series'
						? { seasons: [{ season: 1, episode_count: 10, watched: [] }] }
						: null,
				status: defaultStatus
			});
			manualTitle = '';
			manualYear = '';
			manualImdbUrl = '';
			manualLetterboxdUrl = '';
			manualLanguage = '';
			moviesStore.refreshFacets();
			moviesStore.syncToUrl();
		} catch (err) {
			addError = err instanceof Error ? err.message : 'Failed to add manual movie';
		} finally {
			addingManual = false;
		}
	}

	async function handleRefreshTmdb() {
		const m = moviesStore.selectedMovie;
		if (!m || !m.tmdb_id) return;
		refreshing = true;
		detailsError = null;
		try {
			const hydrated = await moviesService.hydrateTmdb(m.tmdb_id, m.media_type);
			await moviesStore.updateMovie(m.id, {
				...hydrated
			});
		} catch (err) {
			detailsError = err instanceof Error ? err.message : 'Failed to refresh TMDB metadata';
		} finally {
			refreshing = false;
		}
	}

	async function handleDelete() {
		const m = moviesStore.selectedMovie;
		if (!m) return;
		if (!confirmDelete) {
			confirmDelete = true;
			return;
		}
		await moviesStore.deleteMovie(m.id);
		moviesStore.refreshFacets();
		moviesStore.syncToUrl();
	}
</script>

<aside class="right-pane">
	<div class="pane-header">
		<span class="pane-title">
			{#if moviesStore.rightPaneMode === 'add'}
				Add Movie
			{:else if moviesStore.rightPaneMode === 'import'}
				Import Movies
			{:else}
				{moviesStore.selectedMovie?.title ?? 'Movie Details'}
			{/if}
		</span>
		<button
			type="button"
			class="close-btn"
			onclick={() => {
				moviesStore.closeRightPane();
				moviesStore.syncToUrl();
			}}
		>
			✕
		</button>
	</div>

	<div class="pane-body">
		{#if moviesStore.rightPaneMode === 'add'}
			<form class="tmdb-search-form" onsubmit={handleTmdbSearch}>
				<input
					type="text"
					class="input"
					placeholder="Movie title..."
					bind:value={tmdbQuery}
				/>
				<input
					type="text"
					class="input year-input"
					placeholder="Year"
					bind:value={tmdbYear}
				/>
				<button type="submit" class="btn-primary" disabled={searchingTmdb}>
					{searchingTmdb ? '...' : 'Search'}
				</button>
			</form>

			{#if addError}
				<p class="error-text">{addError}</p>
			{/if}

			<ul class="tmdb-results">
				{#each tmdbResults as res (res.tmdb_id)}
					<li class="tmdb-item">
						<button
							type="button"
							class="tmdb-btn"
							disabled={hydratingId === res.tmdb_id}
							onclick={() => handleSelectTmdbMatch(res.tmdb_id, res.media_type)}
						>
							{#if res.poster_path}
								<img
									src={`https://image.tmdb.org/t/p/w92${res.poster_path}`}
									alt={res.title}
									class="tmdb-thumb"
								/>
							{:else}
								<div class="tmdb-thumb placeholder">No Img</div>
							{/if}
							<div class="tmdb-info">
								<span class="tmdb-title">{res.title}</span>
								<span class="tmdb-year">
									{res.media_type === 'series' ? 'Series' : 'Movie'} · {res.release_year ?? 'Unknown year'}
								</span>
							</div>
							<span class="tmdb-add-label">
								{hydratingId === res.tmdb_id ? 'Adding...' : '+ Add'}
							</span>
						</button>
					</li>
				{/each}
			</ul>

			<div class="manual-divider">
				<span>Or add manually without TMDB</span>
			</div>

			<form class="manual-form" onsubmit={handleManualAdd}>
				<select class="input" bind:value={manualMediaType}>
					<option value="movie">Movie</option>
					<option value="series">Series</option>
				</select>
				<input
					type="text"
					class="input"
					placeholder="Title (required)"
					bind:value={manualTitle}
					required
				/>
				<div class="form-grid">
					<input
						type="number"
						class="input"
						placeholder="Year (e.g. 2024)"
						bind:value={manualYear}
					/>
					<input
						type="text"
						class="input"
						placeholder="Lang (e.g. en, bn)"
						bind:value={manualLanguage}
					/>
				</div>
				<input
					type="url"
					class="input"
					placeholder="IMDb URL (optional)"
					bind:value={manualImdbUrl}
				/>
				<input
					type="url"
					class="input"
					placeholder="Letterboxd URL (optional)"
					bind:value={manualLetterboxdUrl}
				/>
				<button type="submit" class="btn-secondary" disabled={addingManual}>
					{addingManual ? 'Adding...' : '+ Add Manually'}
				</button>
			</form>
		{:else if moviesStore.rightPaneMode === 'import'}
			<MovieImportPane />
		{:else if moviesStore.selectedMovie}
			{@const m = moviesStore.selectedMovie}
			<div class="details-top">
				{#if m.poster_path}
					<img
						src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
						alt={m.title}
						class="detail-poster"
					/>
				{/if}
				<div class="detail-meta">
					<h2>{m.title} {m.release_year ? `(${m.release_year})` : ''}</h2>
					<p class="muted-text">{m.genres.join(', ')}</p>
					<div class="detail-links">
						{#if m.imdb_url}
							<a href={m.imdb_url} target="_blank" rel="noopener noreferrer">IMDb</a>
						{/if}
						{#if m.letterboxd_url}
							<a href={m.letterboxd_url} target="_blank" rel="noopener noreferrer">Letterboxd</a>
						{/if}
						{#if m.trailer_youtube_key}
							<button
								type="button"
								class="link-btn"
								onclick={() => (showTrailer = !showTrailer)}
							>
								{showTrailer ? 'Hide Trailer' : 'Watch Trailer'}
							</button>
						{/if}
					</div>
				</div>
			</div>

			{#if showTrailer && m.trailer_youtube_key}
				<div class="trailer-wrap">
					<iframe
						title={`${m.title} Trailer`}
						src={`https://www.youtube-nocookie.com/embed/${m.trailer_youtube_key}`}
						frameborder="0"
						allowfullscreen
					></iframe>
				</div>
			{/if}

			{#if detailsError}
				<p class="error-text">{detailsError}</p>
			{/if}

			<div class="form-grid">
				<label class="field">
					<span>Status</span>
					<select class="input" bind:value={status}>
						<option value="watched">Watched</option>
						<option value="watchlist">Wish List</option>
						<option value="dropped">Dropped</option>
					</select>
				</label>

				<label class="field">
					<span>Rating (0.5 – 10.0)</span>
					<input
						type="number"
						class="input"
						min="0.5"
						max="10"
						step="0.5"
						bind:value={rating}
					/>
				</label>

				<label class="field">
					<span>Watched Date</span>
					<input type="date" class="input" bind:value={watchedAt} />
				</label>

				<div class="field">
					<span>Rewatches</span>
					<div class="stepper">
						<button
							type="button"
							class="btn-secondary"
							onclick={() => (rewatchCount = Math.max(0, rewatchCount - 1))}
						>
							-
						</button>
						<span>{rewatchCount}</span>
						<button
							type="button"
							class="btn-secondary"
							onclick={() => (rewatchCount += 1)}
						>
							+
						</button>
					</div>
				</div>
			</div>

			<div class="field">
				<span>Recommend To</span>
				<div class="pill-group">
					{#each AUDIENCES as aud}
						<button
							type="button"
							class="pill"
							class:active={recommendTo.includes(aud.value)}
							onclick={() => toggleAudience(aud.value)}
						>
							{aud.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="field">
				<span>Tags</span>
				<div class="tag-input-row">
					<input
						type="text"
						class="input"
						placeholder="Add tag..."
						bind:value={tagInput}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								addTag();
							}
						}}
					/>
					<button type="button" class="btn-secondary" onclick={addTag}>Add</button>
				</div>
				{#if tags.length > 0}
					<div class="pill-group">
						{#each tags as t}
							<button type="button" class="pill active" onclick={() => removeTag(t)}>
								#{t} ✕
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<label class="field">
				<span>Notes</span>
				<textarea class="textarea" rows="3" bind:value={notes}></textarea>
			</label>

			{#if m.media_type === 'series' && seriesProgress}
				<div class="field">
					<span>Seasons &amp; Episodes</span>
					<div class="seasons-list">
						{#each seriesProgress.seasons as s, sIdx}
							<div class="season-block">
								<div class="season-head">
									<span>Season {s.season} ({s.watched.length}/{s.episode_count})</span>
								</div>
								<div class="ep-grid">
									{#each Array.from({ length: s.episode_count }, (_, i) => i + 1) as ep}
										{@const isWatched = s.watched.includes(ep)}
										<button
											type="button"
											class="ep-pill"
											class:active={isWatched}
											onclick={() => {
												if (!seriesProgress) return;
												const nextWatched = isWatched
													? s.watched.filter((x) => x !== ep)
													: [...s.watched, ep].sort((a, b) => a - b);
												seriesProgress.seasons[sIdx] = { ...s, watched: nextWatched };
											}}
										>
											{ep}
										</button>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="pane-actions">
				<button
					type="button"
					class="btn-danger"
					onclick={handleDelete}
				>
					{confirmDelete ? 'Confirm Delete' : 'Delete'}
				</button>
				<div class="actions-right">
					<button
						type="button"
						class="btn-secondary"
						disabled={refreshing}
						onclick={handleRefreshTmdb}
					>
						{refreshing ? 'Refreshing...' : 'Refresh TMDB'}
					</button>
					<button
						type="button"
						class="btn-primary"
						disabled={saving}
						onclick={handleSave}
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</aside>

<style>
	.right-pane {
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.pane-header {
		height: 44px;
		padding: 0 14px;
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.pane-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.close-btn {
		border: none;
		background: transparent;
		font-size: 14px;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 4px;
	}

	.pane-body {
		flex: 1;
		overflow-y: auto;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.tmdb-search-form {
		display: flex;
		gap: 6px;
	}

	.year-input {
		width: 68px;
		flex-shrink: 0;
	}

	.input,
	.textarea {
		width: 100%;
		padding: 6px 9px;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 12.5px;
	}

	.tmdb-results {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tmdb-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 8px;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-secondary);
		cursor: pointer;
		text-align: left;
	}

	.tmdb-btn:hover {
		background: var(--bg-tertiary);
	}

	.tmdb-thumb {
		width: 32px;
		height: 48px;
		object-fit: cover;
		border-radius: 4px;
		flex-shrink: 0;
		background: var(--bg-tertiary);
	}

	.tmdb-thumb.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 9px;
		color: var(--text-secondary);
	}

	.tmdb-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.tmdb-title {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.tmdb-year {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.tmdb-add-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--primary);
	}

	.manual-divider {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-top: 4px;
	}

	.manual-divider::before,
	.manual-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border-subtle);
	}

	.manual-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.details-top {
		display: flex;
		gap: 12px;
	}

	.detail-poster {
		width: 72px;
		height: 108px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.detail-meta h2 {
		font-size: 15px;
		font-weight: 600;
		margin: 0 0 4px;
		color: var(--text-primary);
	}

	.muted-text {
		font-size: 12px;
		color: var(--text-secondary);
		margin: 0;
	}

	.detail-links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}

	.detail-links a,
	.link-btn {
		font-size: 11px;
		color: var(--text-primary);
		text-decoration: none;
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		padding: 2px 8px;
		border-radius: 4px;
		cursor: pointer;
	}

	.trailer-wrap {
		position: relative;
		padding-bottom: 56.25%;
		height: 0;
		border-radius: 6px;
		overflow: hidden;
		border: 1px solid var(--border-subtle);
	}

	.trailer-wrap iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.field > span {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.stepper {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
	}

	.pill-group {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.pill {
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 11px;
		padding: 3px 8px;
		border-radius: 999px;
		cursor: pointer;
	}

	.pill.active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.tag-input-row {
		display: flex;
		gap: 6px;
	}

	.pane-actions {
		margin-top: auto;
		padding-top: 10px;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.actions-right {
		display: flex;
		gap: 6px;
	}

	.btn-primary {
		height: 30px;
		padding: 0 12px;
		background: var(--primary);
		border: 1px solid var(--primary);
		border-radius: 6px;
		color: var(--primary-foreground);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary {
		height: 30px;
		padding: 0 10px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-danger {
		height: 30px;
		padding: 0 10px;
		background: var(--bg-secondary);
		border: 1px solid var(--danger);
		border-radius: 6px;
		color: var(--danger);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
	}

	.error-text {
		color: var(--danger);
		font-size: 12px;
		margin: 0;
	}

	.seasons-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.season-block {
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		padding: 8px;
		background: var(--bg-primary);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.season-head {
		font-size: 11.5px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.ep-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.ep-pill {
		min-width: 26px;
		height: 24px;
		padding: 0 6px;
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 11px;
		cursor: pointer;
	}

	.ep-pill.active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}
</style>
