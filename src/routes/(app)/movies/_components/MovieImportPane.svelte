<script lang="ts">
	import { moviesStore } from '$lib/stores/movies.svelte';
	import { downloadSampleTemplate } from '$lib/utils/movies-export';
	import {
		downloadUnmatchedRows,
		parseImportFile,
		runMovieImport,
		type ImportSummary,
		type ParsedImportRow
	} from '$lib/utils/movies-import';

	let parsedRows = $state<ParsedImportRow[]>([]);
	let fileName = $state('');
	let importing = $state(false);
	let progressDone = $state(0);
	let progressTotal = $state(0);
	let summary = $state<ImportSummary | null>(null);
	let error = $state<string | null>(null);
	let copiedPrompt = $state(false);
	let preserveWatched = $state(true);

	const AI_IMPORT_PROMPT = `Format my movie/series list as a CSV/Excel table with these exact columns:
Title, Type (movie or series), Year, Status (watched, watchlist, or dropped), Rating (0.5 to 10.0), Watched Date (YYYY-MM-DD), Seasons (e.g. "1:6, 2:8" for series), Watched Episodes (e.g. "S1:1,2,3"), Language (ISO 639-1 e.g. en, bn, ko), Countries (ISO 3166-1 comma-separated e.g. "US, KR"), Genres (comma-separated), Trailer Key (YouTube video ID), Tags (comma-separated), Recommend To (anyone, partner, friends, family, cinephiles, solo_rewatch), Notes.`;

	async function copyAiPrompt() {
		try {
			await navigator.clipboard.writeText(AI_IMPORT_PROMPT);
			copiedPrompt = true;
			setTimeout(() => (copiedPrompt = false), 1500);
		} catch {
			// Ignore clipboard errors
		}
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		error = null;
		summary = null;
		fileName = file.name;
		try {
			parsedRows = await parseImportFile(file);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to parse file';
			parsedRows = [];
		}
	}

	async function handleStartImport() {
		if (parsedRows.length === 0) return;
		importing = true;
		error = null;
		progressDone = 0;
		progressTotal = parsedRows.length;

		try {
			summary = await runMovieImport(
				parsedRows,
				(done, total) => {
					progressDone = done;
					progressTotal = total;
				},
				{ preserveWatched }
			);
			await Promise.all([moviesStore.reloadList(), moviesStore.refreshFacets()]);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Import failed';
		} finally {
			importing = false;
		}
	}
</script>

<div class="import-pane">
	<p class="desc">
		Upload a Letterboxd CSV or `/movies` Excel/CSV export (`.xlsx`, `.xls`, `.csv`).
	</p>

	<div class="guide-box">
		<div class="guide-header">
			<strong>Supported Columns</strong>
			<div class="guide-actions">
				<button type="button" class="btn-secondary" onclick={copyAiPrompt}>
					{copiedPrompt ? 'Copied!' : 'Copy AI Prompt'}
				</button>
				<button type="button" class="btn-secondary" onclick={downloadSampleTemplate}>
					Template (.xlsx)
				</button>
			</div>
		</div>
		<ul class="guide-list">
			<li><code>Title</code> (required) &amp; <code>Year</code> (recommended for accurate TMDB match)</li>
			<li><code>Type</code>: <code>movie</code> (default) or <code>series</code></li>
			<li><code>Status</code>: <code>watched</code>, <code>watchlist</code>, or <code>dropped</code></li>
			<li><code>Rating</code>: <code>0.5</code>–<code>10.0</code> (Letterboxd 0.5–5 auto-scaled)</li>
			<li><code>Watched Date</code>: <code>YYYY-MM-DD</code></li>
			<li><code>Language</code> (ISO 639-1), <code>Countries</code> (ISO 3166-1), <code>Genres</code>, <code>Trailer Key</code></li>
			<li><code>Tags</code> &amp; <code>Recommend To</code>: comma-separated</li>
			<li><code>Seasons</code> (e.g. <code>1:6, 2:8</code>) &amp; <code>Watched Episodes</code> (e.g. <code>S1:1,2,3</code>)</li>
			<li><code>Notes</code>, <code>TMDB ID</code> (optional)</li>
		</ul>
	</div>

	<label class="toggle-row">
		<input type="checkbox" bind:checked={preserveWatched} />
		<span>Keep existing "Watched" status (don't overwrite to Wish List)</span>
	</label>

	<label class="dropzone">
		<input type="file" accept=".xlsx,.xls,.csv" onchange={handleFileSelect} />
		<span>{fileName || 'Choose .xlsx, .xls, or .csv file'}</span>
	</label>

	{#if error}
		<p class="error-text">{error}</p>
	{/if}

	{#if parsedRows.length > 0 && !summary}
		<div class="preview-box">
			<span>{parsedRows.length} unique movies ready to hydrate & import.</span>
			<button
				type="button"
				class="btn-primary"
				disabled={importing}
				onclick={handleStartImport}
			>
				{importing ? `Importing (${progressDone}/${progressTotal})...` : 'Start Import'}
			</button>
		</div>
	{/if}

	{#if summary}
		<div class="summary-box">
			<p><strong>Imported:</strong> {summary.imported} / {summary.totalParsed}</p>
			{#if summary.unmatched.length > 0}
				<p><strong>Unmatched:</strong> {summary.unmatched.length}</p>
				<button
					type="button"
					class="btn-secondary"
					onclick={() => downloadUnmatchedRows(summary!.unmatched)}
				>
					Download Unmatched (.xlsx)
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.import-pane {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.desc {
		font-size: 12px;
		color: var(--text-secondary);
		margin: 0;
	}

	.guide-box {
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		padding: 10px 12px;
		background: var(--bg-primary);
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 12px;
	}

	.guide-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px;
	}

	.guide-actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}

	.guide-list {
		margin: 0;
		padding-left: 16px;
		display: flex;
		flex-direction: column;
		gap: 3px;
		color: var(--text-secondary);
	}

	.guide-list code {
		color: var(--text-primary);
		font-size: 11px;
	}

	.dropzone {
		border: 1px dashed var(--border-subtle);
		border-radius: 6px;
		padding: 20px 12px;
		text-align: center;
		font-size: 12.5px;
		color: var(--text-primary);
		background: var(--bg-primary);
		cursor: pointer;
	}

	.dropzone input {
		display: none;
	}

	.preview-box,
	.summary-box {
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		padding: 12px;
		background: var(--bg-primary);
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 12.5px;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--text-primary);
		cursor: pointer;
	}

	.summary-box p {
		margin: 0;
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
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 28px;
		padding: 4px 10px;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		color: var(--text-primary);
		font-size: 11.5px;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
	}

	.btn-secondary:hover {
		background: var(--bg-tertiary);
	}

	.error-text {
		color: var(--danger);
		font-size: 12px;
		margin: 0;
	}
</style>
