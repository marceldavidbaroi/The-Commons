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
			summary = await runMovieImport(parsedRows, (done, total) => {
				progressDone = done;
				progressTotal = total;
			});
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
			<button type="button" class="btn-secondary" onclick={downloadSampleTemplate}>
				Download Template (.xlsx)
			</button>
		</div>
		<ul class="guide-list">
			<li><code>Title</code> (required) &amp; <code>Year</code> (recommended for accurate TMDB match)</li>
			<li><code>Status</code>: <code>watched</code>, <code>watchlist</code>, or <code>dropped</code></li>
			<li><code>Rating</code>: <code>0.5</code>–<code>10.0</code> (Letterboxd 0.5–5 auto-scaled)</li>
			<li><code>Watched Date</code>: <code>YYYY-MM-DD</code></li>
			<li><code>Tags</code> &amp; <code>Recommend To</code>: comma-separated</li>
			<li><code>Notes</code>, <code>TMDB ID</code> (optional)</li>
		</ul>
	</div>

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
		gap: 8px;
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

	.error-text {
		color: var(--danger);
		font-size: 12px;
		margin: 0;
	}
</style>
