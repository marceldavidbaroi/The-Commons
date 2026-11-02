<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';

	let {
		headers,
		alignments,
		rows,
		startIndex,
		onUpdateCell,
		onAddRow,
		onDeleteRow,
		onAddColumn,
		onDeleteColumn,
		onWikiClick
	} = $props<{
		headers: string[];
		alignments: ('left' | 'center' | 'right' | 'none')[];
		rows: string[][];
		startIndex: number;
		onUpdateCell?: (rowIndex: number, colIndex: number, newValue: string) => void;
		onAddRow?: (insertAfterRowIndex: number) => void;
		onDeleteRow?: (rowIndex: number) => void;
		onAddColumn?: (insertAfterColIndex: number) => void;
		onDeleteColumn?: (colIndex: number) => void;
		onWikiClick?: (title: string, event: MouseEvent) => void;
	}>();

	// Currently editing cell: rowIndex: -1 for header, 0..N for data rows
	let editingCell = $state<{ row: number; col: number } | null>(null);
	let cellDraftValue = $state<string>('');
	let cellInputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		if (editingCell && cellInputEl) {
			cellInputEl.focus();
			cellInputEl.select();
		}
	});

	interface ParsedToken {
		type: 'text' | 'bold' | 'italic' | 'code' | 'wiki';
		content: string;
		raw: string;
		isResolved?: boolean;
		title?: string;
	}

	function parseInline(raw: string): ParsedToken[] {
		if (!raw) return [];
		const regex = /(`[^`]+`)|(\[\[[^\]]+\]\])|(\*\*[^*]+\*\*)|(\*[^*]+\*)/g;
		const tokens: ParsedToken[] = [];
		let lastIndex = 0;
		let match;

		while ((match = regex.exec(raw)) !== null) {
			const index = match.index;
			if (index > lastIndex) {
				tokens.push({
					type: 'text',
					content: raw.substring(lastIndex, index),
					raw: raw.substring(lastIndex, index)
				});
			}

			const fullMatch = match[0];
			if (match[1]) {
				tokens.push({
					type: 'code',
					content: fullMatch.slice(1, -1),
					raw: fullMatch
				});
			} else if (match[2]) {
				const inner = fullMatch.slice(2, -2).trim();
				const parts = inner.split('|');
				const targetTitle = parts[0].trim();
				const displayAlias = parts[1] ? parts[1].trim() : targetTitle;
				const isResolved = notesStore.activeTitles.has(targetTitle.toLowerCase());
				tokens.push({
					type: 'wiki',
					content: displayAlias,
					title: targetTitle,
					raw: fullMatch,
					isResolved
				});
			} else if (match[3]) {
				tokens.push({
					type: 'bold',
					content: fullMatch.slice(2, -2),
					raw: fullMatch
				});
			} else if (match[4]) {
				tokens.push({
					type: 'italic',
					content: fullMatch.slice(1, -1),
					raw: fullMatch
				});
			}
			lastIndex = regex.lastIndex;
		}

		if (lastIndex < raw.length) {
			tokens.push({
				type: 'text',
				content: raw.substring(lastIndex),
				raw: raw.substring(lastIndex)
			});
		}
		return tokens;
	}

	function handleWikiClick(title: string, e: MouseEvent) {
		e.stopPropagation();
		if (onWikiClick) {
			onWikiClick(title, e);
		}
	}

	function startEditCell(row: number, col: number) {
		commitCurrentCell();
		editingCell = { row, col };
		if (row === -1) {
			cellDraftValue = headers[col] ?? '';
		} else {
			cellDraftValue = rows[row]?.[col] ?? '';
		}
	}

	function commitCurrentCell() {
		if (!editingCell) return;
		const { row, col } = editingCell;
		const currentOriginal = row === -1 ? headers[col] : rows[row]?.[col];
		if (cellDraftValue !== currentOriginal) {
			onUpdateCell?.(row, col, cellDraftValue);
		}
	}

	function handleBlur() {
		commitCurrentCell();
		editingCell = null;
	}

	function handleKeyDown(e: KeyboardEvent, row: number, col: number) {
		if (e.key === 'Tab') {
			e.preventDefault();
			commitCurrentCell();
			const totalRows = rows.length;
			const totalCols = headers.length;

			if (!e.shiftKey) {
				// Navigate to next cell
				if (col + 1 < totalCols) {
					startEditCell(row, col + 1);
				} else if (row + 1 < totalRows) {
					startEditCell(row + 1, 0);
				} else {
					// At last cell of last row: add new row Obsidian-style!
					onAddRow?.(row);
					startEditCell(row + 1, 0);
				}
			} else {
				// Shift+Tab: Navigate previous
				if (col > 0) {
					startEditCell(row, col - 1);
				} else if (row > -1) {
					startEditCell(row - 1, totalCols - 1);
				}
			}
		} else if (e.key === 'Enter') {
			e.preventDefault();
			commitCurrentCell();
			const totalRows = rows.length;
			if (row + 1 < totalRows) {
				startEditCell(row + 1, col);
			} else {
				// Add row below
				onAddRow?.(row);
				startEditCell(row + 1, col);
			}
		} else if (e.key === 'Escape') {
			editingCell = null;
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="note-table-wrapper" role="region" aria-label="Markdown Table">
	<table class="note-table">
		<thead>
			<tr>
				{#each headers as header, colIdx}
					<th
						style:text-align={alignments[colIdx] !== 'none' ? alignments[colIdx] : undefined}
						onclick={(e) => {
							e.stopPropagation();
							startEditCell(-1, colIdx);
						}}
					>
						{#if editingCell && editingCell.row === -1 && editingCell.col === colIdx}
							<input
								bind:this={cellInputEl}
								type="text"
								class="table-cell-input header-cell"
								bind:value={cellDraftValue}
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => handleKeyDown(e, -1, colIdx)}
								onblur={handleBlur}
							/>
						{:else}
							<div class="cell-display">
								{#if header.trim() === ''}
									<span class="cell-placeholder">&nbsp;</span>
								{:else}
									{#each parseInline(header) as token}
										{#if token.type === 'wiki'}
											<button
												type="button"
												class="wiki-link-chip"
												class:resolved={token.isResolved}
												class:unresolved={!token.isResolved}
												onclick={(e) => handleWikiClick(token.title || token.content, e)}
											>{token.content}</button>
										{:else if token.type === 'bold'}
											<strong>{token.content}</strong>
										{:else if token.type === 'italic'}
											<em>{token.content}</em>
										{:else if token.type === 'code'}
											<code>{token.content}</code>
										{:else}
											<span>{token.content}</span>
										{/if}
									{/each}
								{/if}
							</div>
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, rowIdx}
				<tr>
					{#each headers as _, colIdx}
						{@const cellText = row[colIdx] ?? ''}
						<td
							style:text-align={alignments[colIdx] !== 'none' ? alignments[colIdx] : undefined}
							onclick={(e) => {
								e.stopPropagation();
								startEditCell(rowIdx, colIdx);
							}}
						>
							{#if editingCell && editingCell.row === rowIdx && editingCell.col === colIdx}
								<input
									bind:this={cellInputEl}
									type="text"
									class="table-cell-input"
									bind:value={cellDraftValue}
									onclick={(e) => e.stopPropagation()}
									onkeydown={(e) => handleKeyDown(e, rowIdx, colIdx)}
									onblur={handleBlur}
								/>
							{:else}
								<div class="cell-display">
									{#if cellText.trim() === ''}
										<span class="cell-placeholder">&nbsp;</span>
									{:else}
										{#each parseInline(cellText) as token}
											{#if token.type === 'wiki'}
												<button
													type="button"
													class="wiki-link-chip"
													class:resolved={token.isResolved}
													class:unresolved={!token.isResolved}
													onclick={(e) => handleWikiClick(token.title || token.content, e)}
												>{token.content}</button>
											{:else if token.type === 'bold'}
												<strong>{token.content}</strong>
											{:else if token.type === 'italic'}
												<em>{token.content}</em>
											{:else if token.type === 'code'}
												<code>{token.content}</code>
											{:else}
												<span>{token.content}</span>
											{/if}
										{/each}
									{/if}
								</div>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Minimal Table Actions Floating Bar -->
	<div class="table-quick-actions">
		<button
			type="button"
			class="btn-table-action"
			title="Add row below"
			onclick={() => onAddRow?.(rows.length - 1)}
		>
			+ Row
		</button>
		<button
			type="button"
			class="btn-table-action"
			title="Add column right"
			onclick={() => onAddColumn?.(headers.length - 1)}
		>
			+ Column
		</button>
	</div>
</div>

<style>
	.note-table-wrapper {
		width: 100%;
		position: relative;
		margin: 12px 0;
	}

	.note-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13.5px;
		line-height: 1.5;
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.note-table th,
	.note-table td {
		padding: 0;
		border: 1px solid var(--border-subtle);
		position: relative;
		min-width: 60px;
		height: 34px;
	}

	.note-table thead tr {
		background: var(--bg-tertiary);
	}

	.note-table th {
		font-weight: 600;
		color: var(--text-primary);
	}

	.cell-display {
		padding: 6px 10px;
		min-height: 32px;
		display: flex;
		align-items: center;
		cursor: text;
		word-break: break-word;
	}

	.note-table tbody tr {
		transition: background 0.1s ease;
	}

	.note-table tbody tr:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.table-cell-input {
		width: 100%;
		height: 100%;
		min-height: 32px;
		border: none;
		outline: 2px solid var(--primary);
		outline-offset: -2px;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-family: inherit;
		font-size: inherit;
		padding: 6px 10px;
		box-sizing: border-box;
		border-radius: 2px;
	}

	.table-cell-input.header-cell {
		font-weight: 600;
	}

	.cell-placeholder {
		display: inline-block;
		width: 100%;
	}

	.table-quick-actions {
		display: flex;
		gap: 6px;
		margin-top: 6px;
		opacity: 0.4;
		transition: opacity 0.15s ease;
	}

	.note-table-wrapper:hover .table-quick-actions {
		opacity: 1;
	}

	.btn-table-action {
		font-size: 11px;
		font-family: var(--font-sans);
		padding: 2px 8px;
		background: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.btn-table-action:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
		border-color: var(--border-medium);
	}

	code {
		font-family: var(--font-mono, monospace);
		font-size: 0.88em;
		background: var(--bg-tertiary);
		padding: 2px 5px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
	}

	.wiki-link-chip {
		display: inline-flex;
		align-items: center;
		padding: 0 4px;
		margin: 0 1px;
		font-weight: 500;
		border-radius: var(--radius-sm);
		border: none;
		cursor: pointer;
		text-decoration: none;
		vertical-align: baseline;
		background: transparent;
	}

	.wiki-link-chip.resolved {
		color: var(--primary);
		background: rgba(var(--primary-rgb, 120, 100, 220), 0.1);
	}

	.wiki-link-chip.resolved:hover {
		background: rgba(var(--primary-rgb, 120, 100, 220), 0.2);
		text-decoration: underline;
	}

	.wiki-link-chip.unresolved {
		color: var(--text-muted);
		border-bottom: 1px dashed var(--text-muted);
		background: rgba(255, 255, 255, 0.03);
	}
</style>
