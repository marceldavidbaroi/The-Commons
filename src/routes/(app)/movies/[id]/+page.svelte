<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as moviesService from '$lib/services/movies-service';
	import { moviesStore } from '$lib/stores/movies.svelte';
	import type { Movie, MovieStatus, RecommendAudience, SeriesProgress } from '$lib/types/movies';

	const AUDIENCES: Array<{ value: RecommendAudience; label: string }> = [
		{ value: 'anyone', label: 'Anyone' },
		{ value: 'partner', label: 'Partner' },
		{ value: 'friends', label: 'Friends' },
		{ value: 'family', label: 'Family' },
		{ value: 'cinephiles', label: 'Cinephiles' },
		{ value: 'solo_rewatch', label: 'Solo' }
	];

	let movie = $state<Movie | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let status = $state<MovieStatus>('watchlist');
	let rating = $state('');
	let watchedAt = $state('');
	let rewatchCount = $state(0);
	let recommendTo = $state<RecommendAudience[]>([]);
	let tags = $state<string[]>([]);
	let tagInput = $state('');
	let notes = $state('');
	let seriesProgress = $state<SeriesProgress | null>(null);
	let showTrailer = $state(false);
	let saving = $state(false);
	let refreshing = $state(false);
	let confirmDelete = $state(false);

	function hydrateForm(m: Movie) {
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
	}

	onMount(async () => {
		const id = page.params.id;
		const cached = moviesStore.items.find((m) => m.id === id);
		if (cached) {
			movie = cached;
			hydrateForm(cached);
			loading = false;
			return;
		}
		try {
			const fetched = await moviesService.fetchMovieById(id);
			if (!fetched) {
				error = 'Movie not found.';
			} else {
				movie = fetched;
				hydrateForm(fetched);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load movie';
		} finally {
			loading = false;
		}
	});

	function toggleAudience(aud: RecommendAudience) {
		recommendTo = recommendTo.includes(aud)
			? recommendTo.filter((a) => a !== aud)
			: [...recommendTo, aud];
	}

	function addTag() {
		const clean = tagInput.trim().toLowerCase();
		if (clean && !tags.includes(clean)) tags = [...tags, clean];
		tagInput = '';
	}

	async function handleSave() {
		if (!movie) return;
		saving = true;
		error = null;
		try {
			const parsedRating = rating.trim() ? Number.parseFloat(rating) : null;
			const updated = await moviesStore.updateMovie(movie.id, {
				status,
				rating: parsedRating,
				watched_at: watchedAt.trim() || null,
				rewatch_count: rewatchCount,
				recommend_to: recommendTo,
				tags,
				notes: notes.trim() || null,
				series_progress: seriesProgress
			});
			movie = updated;
			moviesStore.refreshFacets();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save changes';
		} finally {
			saving = false;
		}
	}

	async function handleRefreshTmdb() {
		if (!movie || !movie.tmdb_id) return;
		refreshing = true;
		error = null;
		try {
			const hydrated = await moviesService.hydrateTmdb(movie.tmdb_id, movie.media_type);
			const updated = await moviesStore.updateMovie(movie.id, { ...hydrated });
			movie = updated;
			hydrateForm(updated);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to refresh TMDB metadata';
		} finally {
			refreshing = false;
		}
	}

	async function handleDelete() {
		if (!movie) return;
		if (!confirmDelete) {
			confirmDelete = true;
			return;
		}
		await moviesStore.deleteMovie(movie.id);
		moviesStore.refreshFacets();
		goto('/movies');
	}
</script>

<div class="details-page">
	<header class="top-bar">
		<button type="button" class="btn-secondary" onclick={() => goto('/movies')}>
			← Back to Movies
		</button>

		{#if movie}
			<div class="top-actions">
				<button type="button" class="btn-danger" onclick={handleDelete}>
					{confirmDelete ? 'Confirm Delete' : 'Delete'}
				</button>
				{#if movie.status !== 'dropped'}
					{#if movie.tmdb_id}
						<button
							type="button"
							class="btn-secondary"
							disabled={refreshing}
							onclick={handleRefreshTmdb}
						>
							{refreshing ? 'Refreshing...' : 'Refresh TMDB'}
						</button>
					{/if}
					<button type="button" class="btn-primary" disabled={saving} onclick={handleSave}>
						{saving ? 'Saving...' : 'Save'}
					</button>
				{/if}
			</div>
		{/if}
	</header>

	<div class="page-scroll">
		{#if loading}
			<div class="state-box">Loading...</div>
		{:else if error && !movie}
			<div class="state-box error">{error}</div>
		{:else if movie}
			<div class="details-layout">
				<div class="left-col">
					{#if movie.poster_path}
						<img
							src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
							alt={movie.title}
							class="hero-poster"
						/>
					{:else}
						<div class="hero-poster placeholder">No Poster</div>
					{/if}

					<div class="ext-links">
						{#if movie.imdb_url}
							<a href={movie.imdb_url} target="_blank" rel="noopener noreferrer" class="btn-secondary">
								IMDb
							</a>
						{/if}
						{#if movie.letterboxd_url}
							<a
								href={movie.letterboxd_url}
								target="_blank"
								rel="noopener noreferrer"
								class="btn-secondary"
							>
								Letterboxd
							</a>
						{/if}
						{#if movie.trailer_youtube_key}
							<button
								type="button"
								class="btn-secondary"
								onclick={() => (showTrailer = !showTrailer)}
							>
								{showTrailer ? 'Hide Trailer' : 'Watch Trailer'}
							</button>
						{/if}
					</div>
				</div>

				<div class="right-col">
					<div class="title-block">
						<h1>
							{movie.title}
							{#if movie.release_year}
								<span class="year">({movie.release_year})</span>
							{/if}
						</h1>
						{#if movie.genres.length > 0}
							<p class="genres">{movie.genres.join(' · ')}</p>
						{/if}
					</div>

					{#if error}
						<p class="error-text">{error}</p>
					{/if}

					{#if showTrailer && movie.trailer_youtube_key}
						<div class="trailer-wrap">
							<iframe
								title={`${movie.title} Trailer`}
								src={`https://www.youtube-nocookie.com/embed/${movie.trailer_youtube_key}`}
								frameborder="0"
								allowfullscreen
							></iframe>
						</div>
					{/if}

					<div class="card-section">
						<div class="field">
							<span>Status</span>
							<div class="status-actions">
								<button
									type="button"
									class="status-btn"
									class:active={status === 'watched'}
									onclick={() => (status = 'watched')}
								>
									Watch
								</button>
								<button
									type="button"
									class="status-btn"
									class:active={status === 'watchlist'}
									onclick={() => (status = 'watchlist')}
								>
									Unwatch
								</button>
								<button
									type="button"
									class="status-btn"
									class:active={status === 'dropped'}
									onclick={() => (status = 'dropped')}
								>
									Drop
								</button>
							</div>
						</div>

						<div class="form-grid">
							<label class="field">
								<span>Rating (0.5 – 10.0)</span>
								<input type="number" class="input" min="0.5" max="10" step="0.5" bind:value={rating} />
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
									<button type="button" class="btn-secondary" onclick={() => (rewatchCount += 1)}>
										+
									</button>
								</div>
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
									<button
										type="button"
										class="pill active"
										onclick={() => (tags = tags.filter((x) => x !== t))}
									>
										#{t} ✕
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<label class="field">
						<span>Notes</span>
						<textarea class="textarea" rows="4" bind:value={notes}></textarea>
					</label>

					{#if movie.media_type === 'series' && seriesProgress}
						<div class="field">
							<span>Seasons &amp; Episodes</span>
							<div class="seasons-list">
								{#each seriesProgress.seasons as s, sIdx}
									<div class="season-block">
										<div class="season-head">
											Season {s.season} ({s.watched.length}/{s.episode_count})
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
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.details-page {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary);
		overflow: hidden;
	}

	.top-bar {
		height: 52px;
		padding: 0 20px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-subtle);
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.top-actions {
		display: flex;
		gap: 8px;
	}

	.page-scroll {
		flex: 1;
		overflow-y: auto;
		padding: 24px 20px;
	}

	.details-layout {
		max-width: 960px;
		margin: 0 auto;
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		gap: 28px;
	}

	.left-col {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.hero-poster {
		width: 100%;
		aspect-ratio: 2 / 3;
		object-fit: cover;
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: var(--bg-tertiary);
	}

	.hero-poster.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		font-size: 13px;
	}

	.ext-links {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.ext-links a {
		text-decoration: none;
	}

	.right-col {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.title-block h1 {
		margin: 0;
		font-size: 24px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.title-block .year {
		font-weight: 400;
		color: var(--text-secondary);
	}

	.genres {
		margin: 4px 0 0;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.card-section {
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.status-actions {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.status-btn {
		height: 32px;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 12.5px;
		font-weight: 500;
		cursor: pointer;
	}

	.status-btn.active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
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
		letter-spacing: 0.04em;
	}

	.input,
	.textarea {
		width: 100%;
		padding: 7px 10px;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 13px;
	}

	.stepper {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.pill-group {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.pill {
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-primary);
		font-size: 12px;
		padding: 4px 10px;
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
		gap: 8px;
	}

	.trailer-wrap {
		position: relative;
		padding-bottom: 56.25%;
		height: 0;
		border-radius: 8px;
		overflow: hidden;
		border: 1px solid var(--border-subtle);
	}

	.trailer-wrap iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.seasons-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.season-block {
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		padding: 10px;
		background: var(--bg-secondary);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.season-head {
		font-size: 12px;
		font-weight: 600;
	}

	.ep-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.ep-pill {
		min-width: 28px;
		height: 26px;
		padding: 0 6px;
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 11.5px;
		cursor: pointer;
	}

	.ep-pill.active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary {
		height: 32px;
		padding: 0 14px;
		background: var(--primary);
		border: 1px solid var(--primary);
		border-radius: 6px;
		color: var(--primary-foreground);
		font-size: 12.5px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 32px;
		padding: 0 12px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 12.5px;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-danger {
		height: 32px;
		padding: 0 12px;
		background: var(--bg-secondary);
		border: 1px solid var(--danger);
		border-radius: 6px;
		color: var(--danger);
		font-size: 12.5px;
		font-weight: 500;
		cursor: pointer;
	}

	.state-box {
		padding: 48px;
		text-align: center;
		color: var(--text-secondary);
	}

	.state-box.error,
	.error-text {
		color: var(--danger);
	}

	@media (max-width: 767px) {
		.details-layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
