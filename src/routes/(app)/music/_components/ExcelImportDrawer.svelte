<script lang="ts">
	import { musicStore } from '$lib/stores/music.svelte';
	import type { ParsedSongRow, SongInsert } from '$lib/types/music';
	import { downloadSampleTemplate, MUSIC_IMPORT_PROMPT, parseSpreadsheetFile } from '$lib/utils/music';

	let parsedRows = $state<ParsedSongRow[]>([]);
	let parsing = $state(false);
	let importing = $state(false);
	let importResult = $state<string | null>(null);
	let error = $state<string | null>(null);
	let copiedPrompt = $state(false);

	async function copyPrompt() {
		await navigator.clipboard.writeText(MUSIC_IMPORT_PROMPT);
		copiedPrompt = true;
		setTimeout(() => (copiedPrompt = false), 2000);
	}

	const validRows = $derived(parsedRows.filter((r) => r.status === 'valid'));
	const duplicateRows = $derived(parsedRows.filter((r) => r.status === 'duplicate'));
	const invalidRows = $derived(parsedRows.filter((r) => r.status === 'invalid'));

	async function handleFile(file: File | undefined) {
		if (!file) return;
		parsing = true;
		error = null;
		importResult = null;
		try {
			const existingIds = new Set(musicStore.songs.map((s) => s.youtube_id));
			parsedRows = await parseSpreadsheetFile(file, existingIds);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to parse spreadsheet';
		} finally {
			parsing = false;
		}
	}

	function handleInputChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		void handleFile(input.files?.[0]);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		void handleFile(e.dataTransfer?.files?.[0]);
	}

	async function handleImport() {
		const toInsert = validRows
			.map((r) => r.data)
			.filter((d): d is SongInsert => Boolean(d));

		if (toInsert.length === 0) return;
		importing = true;
		error = null;
		try {
			const inserted = await musicStore.bulkImport(toInsert);
			importResult = `Imported ${inserted.length} songs. Skipped ${duplicateRows.length} duplicates.`;
			parsedRows = [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Bulk import failed';
		} finally {
			importing = false;
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && musicStore.activeDrawer === 'excel') {
			musicStore.closeDrawer();
		}
	}}
/>

<div class="border border-border rounded-md bg-card p-3 flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
			Bulk Excel / CSV Import
		</span>
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={copyPrompt}
				class="text-xs text-primary hover:underline cursor-pointer"
			>
				{copiedPrompt ? '✓ Copied Prompt' : '📋 Copy Format Prompt'}
			</button>
			<button
				type="button"
				onclick={() => downloadSampleTemplate()}
				class="text-xs text-primary hover:underline cursor-pointer"
			>
				↓ Download Sample .xlsx Template
			</button>
			<button
				type="button"
				onclick={() => musicStore.closeDrawer()}
				class="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
			>
				✕ Close (Esc)
			</button>
		</div>
	</div>

	<!-- Dropzone -->
	<div
		role="region"
		aria-label="Spreadsheet dropzone"
		ondragover={(e) => e.preventDefault()}
		ondrop={handleDrop}
		class="border-dashed text-center flex flex-col items-center gap-2"
	>
		<p class="text-xs text-muted-foreground" style="margin: 0;">
			Drag & drop a <code>.xlsx</code>, <code>.xls</code>, or <code>.csv</code> file here, or
		</p>
		<label
			class="px-3 py-1.5 text-xs font-medium rounded border border-border bg-secondary hover:bg-accent cursor-pointer"
			style="border: 1px solid var(--border-subtle); border-radius: var(--radius-sm, 6px); padding: 0.375rem 0.75rem; background-color: var(--bg-secondary);"
		>
			Choose File
			<input
				type="file"
				accept=".xlsx,.xls,.csv"
				onchange={handleInputChange}
				style="display: none;"
			/>
		</label>
	</div>

	{#if parsing}
		<p class="text-xs text-muted-foreground">Parsing spreadsheet...</p>
	{/if}
	{#if error}
		<p class="text-xs text-destructive">{error}</p>
	{/if}
	{#if importResult}
		<p class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{importResult}</p>
	{/if}

	{#if parsedRows.length > 0}
		<div class="flex flex-wrap items-center justify-between gap-2 text-xs">
			<div class="flex items-center gap-3">
				<span class="text-emerald-600 dark:text-emerald-400 font-medium">Valid: {validRows.length}</span>
				<span class="text-amber-600 dark:text-amber-400">Duplicates (Skipped): {duplicateRows.length}</span>
				<span class="text-destructive">Invalid: {invalidRows.length}</span>
			</div>

			<button
				type="button"
				disabled={importing || validRows.length === 0}
				onclick={handleImport}
				class="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
			>
				{importing ? 'Importing...' : `Import ${validRows.length} Valid Rows`}
			</button>
		</div>

		{#if duplicateRows.length > 0 || invalidRows.length > 0}
			<div class="max-h-36 overflow-y-auto border border-border rounded text-xs divide-y divide-border">
				{#each [...invalidRows, ...duplicateRows] as row}
					<div class="px-2.5 py-1 flex items-center justify-between gap-2">
						<span class="font-mono text-muted-foreground">Row {row.rowNumber}</span>
						<span class={row.status === 'invalid' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}>
							{row.reason}
						</span>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>
