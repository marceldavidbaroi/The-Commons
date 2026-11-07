<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import type { NoteDetail } from '$lib/types/notes';
	import EditorLine from './EditorLine.svelte';
	import EditorTable from './EditorTable.svelte';
	import EditorCodeBlock from './EditorCodeBlock.svelte';
	import WikiLinkSuggestion from './WikiLinkSuggestion.svelte';
	import { tick } from 'svelte';

	let {
		note,
		onSplitRight
	} = $props<{
		note: NoteDetail;
		onSplitRight?: (noteId: string) => void;
	}>();

	// Local editable state
	let title = $state<string>(note.title);
	let content = $state<string>(note.content);

	// History stack for Undo/Redo
	let history = $state<string[]>([note.content]);
	let historyIndex = $state<number>(0);
	let isHistoryNavigating = false;

	function pushHistory(newContent: string) {
		if (isHistoryNavigating) return;
		if (history[historyIndex] === newContent) return;
		// Truncate redo future
		const newHist = history.slice(0, historyIndex + 1);
		newHist.push(newContent);
		if (newHist.length > 50) newHist.shift();
		history = newHist;
		historyIndex = history.length - 1;
	}

	function handleUndo() {
		if (historyIndex > 0) {
			isHistoryNavigating = true;
			historyIndex--;
			content = history[historyIndex];
			notesStore.updateNoteContentLocal(note.id, content);
			isHistoryNavigating = false;
		}
	}

	function handleRedo() {
		if (historyIndex < history.length - 1) {
			isHistoryNavigating = true;
			historyIndex++;
			content = history[historyIndex];
			notesStore.updateNoteContentLocal(note.id, content);
			isHistoryNavigating = false;
		}
	}

	// Editor view mode: 'preview' (hybrid line-based) or 'raw' (full textarea)
	let viewMode = $state<'hybrid' | 'raw'>('hybrid');
	let isEditorFocused = $state<boolean>(false);

	// Wiki-link autocomplete popup state
	let isWikiSuggestOpen = $state<boolean>(false);
	let wikiQuery = $state<string>('');
	let wikiTriggerPos = $state<{ top: number; left: number }>({ top: 0, left: 0 });
	let wikiTriggerIndex = $state<number>(-1); // Character index where [[ started

	let textareaEl = $state<HTMLTextAreaElement | null>(null);
	let wikiSuggestComp = $state<{ handleKeyDown: (e: KeyboardEvent) => boolean } | null>(null);

	// Sync local values when active note changes
	$effect(() => {
		if (note.id) {
			title = note.title;
			content = note.content;
		}
	});

	// Split content into lines for line-based hybrid preview
	const lines = $derived(content.split('\n'));

	interface TableBlock {
		type: 'table';
		startIndex: number;
		endIndex: number; // inclusive
		headers: string[];
		alignments: ('left' | 'center' | 'right' | 'none')[];
		rows: string[][];
	}

	interface CodeFenceBlock {
		type: 'code';
		startIndex: number;
		endIndex: number;
		language: string;
		code: string;
	}

	interface LineBlock {
		type: 'line';
		index: number;
		text: string;
	}

	type ParsedBlock = LineBlock | TableBlock | CodeFenceBlock;

	function isTableRow(raw: string): boolean {
		const trimmed = raw.trim();
		return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1;
	}

	function isDelimiterRow(raw: string): boolean {
		const trimmed = raw.trim();
		return /^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed);
	}

	function parseRowCells(raw: string): string[] {
		let trimmed = raw.trim();
		if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
		if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
		const cells: string[] = [];
		let current = '';
		let inWiki = false;
		let inCode = false;

		for (let i = 0; i < trimmed.length; i++) {
			const ch = trimmed[i];
			const next = trimmed[i + 1];

			if (!inCode && ch === '[' && next === '[') {
				inWiki = true;
				current += '[[';
				i++;
				continue;
			}
			if (inWiki && ch === ']' && next === ']') {
				inWiki = false;
				current += ']]';
				i++;
				continue;
			}
			if (!inWiki && ch === '`') {
				inCode = !inCode;
				current += ch;
				continue;
			}
			if (ch === '|' && !inWiki && !inCode) {
				cells.push(current.trim());
				current = '';
				continue;
			}
			current += ch;
		}
		cells.push(current.trim());
		return cells;
	}

	const contentBlocks = $derived.by<ParsedBlock[]>(() => {
		const blocks: ParsedBlock[] = [];
		let i = 0;

		while (i < lines.length) {
			const current = lines[i];

			// Check if this starts a code fence: ```lang
			if (current.trim().startsWith('```')) {
				const match = current.trim().match(/^```([a-zA-Z0-9_-]*)/);
				const language = match ? match[1] : '';
				let end = i + 1;
				while (end < lines.length && !lines[end].trim().startsWith('```')) {
					end++;
				}
				const codeLines = lines.slice(i + 1, end);
				blocks.push({
					type: 'code',
					startIndex: i,
					endIndex: Math.min(end, lines.length - 1),
					language,
					code: codeLines.join('\n')
				});
				i = end + 1;
				continue;
			}

			// Check if this starts a table
			if (
				i + 1 < lines.length &&
				isTableRow(current) &&
				isDelimiterRow(lines[i + 1])
			) {
				// Find end of table
				let end = i + 2;
				while (end < lines.length && isTableRow(lines[end])) {
					end++;
				}
				const tableEnd = end - 1; // inclusive

				const headers = parseRowCells(current);
				const delimiterCells = parseRowCells(lines[i + 1]);
				const alignments: ('left' | 'center' | 'right' | 'none')[] = delimiterCells.map((cell) => {
					const hasLeft = cell.startsWith(':');
					const hasRight = cell.endsWith(':');
					if (hasLeft && hasRight) return 'center';
					if (hasRight) return 'right';
					if (hasLeft) return 'left';
					return 'none';
				});

				const rows: string[][] = [];
				for (let r = i + 2; r <= tableEnd; r++) {
					rows.push(parseRowCells(lines[r]));
				}

				blocks.push({
					type: 'table',
					startIndex: i,
					endIndex: tableEnd,
					headers,
					alignments,
					rows
				});

				i = tableEnd + 1;
				continue;
			}

			blocks.push({
				type: 'line',
				index: i,
				text: current
			});
			i++;
		}

		return blocks;
	});

	function handleTitleBlur(e: FocusEvent) {
		const newTitle = (e.target as HTMLInputElement).value.trim();
		if (newTitle && newTitle !== note.title) {
			notesStore.renameNote(note.id, newTitle);
		}
	}

	const isUnsaved = $derived(notesStore.unsavedNotes.has(note.id));

	async function handleSave() {
		await notesStore.saveNoteContent(note.id, content);
	}

	function handleContentInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		content = target.value;
		pushHistory(content);
		notesStore.updateNoteContentLocal(note.id, content);
		checkForWikiTrigger(target);
	}

	function checkForWikiTrigger(target: HTMLTextAreaElement) {
		const cursorPos = target.selectionStart;
		const textBefore = target.value.substring(0, cursorPos);
		const lastOpen = textBefore.lastIndexOf('[[');
		const lastClose = textBefore.lastIndexOf(']]');

		// Check if cursor is after an unclosed [[ on the current line
		if (lastOpen !== -1 && lastOpen > lastClose) {
			const query = textBefore.substring(lastOpen + 2);
			// Do not trigger if query contains newline
			if (!query.includes('\n')) {
				wikiQuery = query;
				wikiTriggerIndex = lastOpen;
				isWikiSuggestOpen = true;

				// Position near cursor
				calculatePopupPosition(target);
				return;
			}
		}

		isWikiSuggestOpen = false;
	}

	function calculatePopupPosition(target: HTMLTextAreaElement) {
		const textBefore = target.value.substring(0, target.selectionStart);
		const lineCount = textBefore.split('\n').length;
		const lineHeight = 24;

		const top = Math.min(lineCount * lineHeight + 40, target.scrollHeight + 10);
		const left = Math.min(80 + (wikiQuery.length * 8), 350);

		wikiTriggerPos = { top, left };
	}

	function handleSelectWikiNote(selectedTitle: string) {
		if (viewMode === 'raw' && textareaEl) {
			const textBefore = content.substring(0, wikiTriggerIndex);
			const textAfter = content.substring(textareaEl.selectionStart);
			const replacement = `[[${selectedTitle}]]`;
			content = textBefore + replacement + textAfter;
			notesStore.updateNoteContentLocal(note.id, content);
			isWikiSuggestOpen = false;

			tick().then(() => {
				if (textareaEl) {
					const nextCursor = textBefore.length + replacement.length;
					textareaEl.focus();
					textareaEl.setSelectionRange(nextCursor, nextCursor);
				}
			});
			return;
		}

		if (activeLineIndex !== null && activeLineIndex >= 0 && activeLineIndex < lines.length) {
			const currentLines = [...lines];
			const lineText = currentLines[activeLineIndex];
			const textBefore = lineText.substring(0, wikiTriggerIndex);
			// Find close bracket or end of trigger
			const restOfLine = lineText.substring(wikiTriggerIndex);
			const closeIdx = restOfLine.indexOf(']]');
			const textAfter = closeIdx !== -1 ? restOfLine.substring(closeIdx + 2) : restOfLine.replace(/^\[\[[^\s]*/, '');
			
			const replacement = `[[${selectedTitle}]]`;
			currentLines[activeLineIndex] = textBefore + replacement + textAfter;
			content = currentLines.join('\n');
			notesStore.updateNoteContentLocal(note.id, content);
			isWikiSuggestOpen = false;
		}
	}

	function handleTextareaKeyDown(e: KeyboardEvent) {
		// Cmd+S / Ctrl+S shortcut to manually save
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			handleSave();
			return;
		}

		if (isWikiSuggestOpen && wikiSuggestComp) {
			const handled = wikiSuggestComp.handleKeyDown(e);
			if (handled) return;
		}

		// Support Escape to switch back to preview mode if in raw
		if (e.key === 'Escape' && viewMode === 'raw') {
			viewMode = 'hybrid';
		}
	}

	function handleToggleTask(lineIndex: number, newChecked: boolean) {
		const currentLines = [...lines];
		if (lineIndex < 0 || lineIndex >= currentLines.length) return;

		const targetLine = currentLines[lineIndex];
		const updatedLine = targetLine.replace(
			/^(\s*[-*+]\s+\[)([ xX])(\])/,
			`$1${newChecked ? 'x' : ' '}$3`
		);

		currentLines[lineIndex] = updatedLine;
		content = currentLines.join('\n');
		notesStore.updateNoteContentLocal(note.id, content);
	}

	async function handleWikiLinkClick(targetTitle: string, e: MouseEvent) {
		const lower = targetTitle.toLowerCase();
		const resolvedStub = notesStore.activeTitleMap.get(lower);

		if (resolvedStub) {
			// Resolved link
			if (e.altKey || e.metaKey || e.ctrlKey) {
				// Open in split pane
				notesStore.splitPaneRight(resolvedStub.id);
			} else {
				// Open in active pane
				notesStore.openNoteInActivePane(resolvedStub.id);
			}
		} else {
			// Unresolved ghost link: create new note with this title and open it
			const confirmed = window.confirm(`Create note "${targetTitle}"?`);
			if (confirmed) {
				const created = await notesStore.createNewNote(targetTitle);
				if (e.altKey || e.metaKey || e.ctrlKey) {
					notesStore.splitPaneRight(created.id);
				} else {
					notesStore.openNoteInActivePane(created.id);
				}
			}
		}
	}

	let activeLineIndex = $state<number | null>(null);

	function handleWikiTrigger(query: string, triggerPos: { top: number; left: number }, triggerCharIndex: number) {
		if (triggerCharIndex === -1) {
			isWikiSuggestOpen = false;
			return;
		}
		wikiQuery = query;
		wikiTriggerPos = triggerPos;
		wikiTriggerIndex = triggerCharIndex;
		isWikiSuggestOpen = true;
	}

	function handleLineUpdate(index: number, newText: string) {
		const currentLines = [...lines];
		currentLines[index] = newText;
		content = currentLines.join('\n');
		pushHistory(content);
		notesStore.updateNoteContentLocal(note.id, content);
	}

	function handleLineKeyDown(e: KeyboardEvent, index: number) {
		// Undo: Cmd+Z / Ctrl+Z
		if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			handleUndo();
			return;
		}

		// Redo: Cmd+Shift+Z / Ctrl+Shift+Z / Ctrl+Y
		if (
			((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
			(e.ctrlKey && e.key.toLowerCase() === 'y')
		) {
			e.preventDefault();
			handleRedo();
			return;
		}

		// Cmd+S / Ctrl+S
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			handleSave();
			return;
		}

		if (isWikiSuggestOpen && wikiSuggestComp) {
			const handled = wikiSuggestComp.handleKeyDown(e);
			if (handled) return;
		}

		if (e.key === 'Enter') {
			e.preventDefault();
			const currentLines = [...lines];
			const currentLine = currentLines[index] || '';

			// Task list: - [ ] or - [x]
			const taskMatch = currentLine.match(/^(\s*)([-*+]\s+\[[ xX]\])\s*(.*)$/);
			// Ordered list: 1. or 1)
			const orderedMatch = currentLine.match(/^(\s*)(\d+)([.)]\s+)(.*)$/);
			// Unordered bullet list: - or * or +
			const bulletMatch = currentLine.match(/^(\s*)([-*+]\s+)(.*)$/);

			if (taskMatch) {
				const indent = taskMatch[1];
				const contentAfter = taskMatch[3].trim();
				// Smart backspace/exit: pressing enter on empty list item removes prefix
				if (contentAfter === '') {
					currentLines[index] = indent; // clear checkbox formatting
					content = currentLines.join('\n');
					notesStore.updateNoteContentLocal(note.id, content);
					activeLineIndex = index;
					return;
				}
				const nextPrefix = `${indent}- [ ] `;
				currentLines.splice(index + 1, 0, nextPrefix);
				content = currentLines.join('\n');
				notesStore.updateNoteContentLocal(note.id, content);
				activeLineIndex = index + 1;
				return;
			}

			if (orderedMatch) {
				const indent = orderedMatch[1];
				const num = parseInt(orderedMatch[2], 10);
				const delimiter = orderedMatch[3];
				const contentAfter = orderedMatch[4].trim();
				if (contentAfter === '') {
					currentLines[index] = indent; // clear numbering formatting
					content = currentLines.join('\n');
					notesStore.updateNoteContentLocal(note.id, content);
					activeLineIndex = index;
					return;
				}
				const nextPrefix = `${indent}${num + 1}${delimiter}`;
				currentLines.splice(index + 1, 0, nextPrefix);
				content = currentLines.join('\n');
				notesStore.updateNoteContentLocal(note.id, content);
				activeLineIndex = index + 1;
				return;
			}

			if (bulletMatch) {
				const indent = bulletMatch[1];
				const marker = bulletMatch[2];
				const contentAfter = bulletMatch[3].trim();
				if (contentAfter === '') {
					currentLines[index] = indent; // clear bullet formatting
					content = currentLines.join('\n');
					notesStore.updateNoteContentLocal(note.id, content);
					activeLineIndex = index;
					return;
				}
				const nextPrefix = `${indent}${marker}`;
				currentLines.splice(index + 1, 0, nextPrefix);
				content = currentLines.join('\n');
				notesStore.updateNoteContentLocal(note.id, content);
				activeLineIndex = index + 1;
				return;
			}

			// Standard line break
			currentLines.splice(index + 1, 0, '');
			content = currentLines.join('\n');
			notesStore.updateNoteContentLocal(note.id, content);
			activeLineIndex = index + 1;
		} else if (e.key === 'Backspace' && lines[index] === '' && lines.length > 1) {
			e.preventDefault();
			const currentLines = [...lines];
			currentLines.splice(index, 1);
			content = currentLines.join('\n');
			notesStore.updateNoteContentLocal(note.id, content);
			activeLineIndex = Math.max(0, index - 1);
		} else if (e.key === 'ArrowUp' && index > 0) {
			e.preventDefault();
			activeLineIndex = index - 1;
		} else if (e.key === 'ArrowDown' && index < lines.length - 1) {
			e.preventDefault();
			activeLineIndex = index + 1;
		} else if (e.key === 'Escape') {
			activeLineIndex = null;
		}
	}

	function enterLineEdit(index: number) {
		activeLineIndex = index;
	}

	function handleUpdateCodeBlock(startIndex: number, endIndex: number, language: string, newCode: string) {
		const currentLines = [...lines];
		const newLines = newCode.split('\n');
		const replacement = [`\`\`\`${language}`, ...newLines, '```'];
		currentLines.splice(startIndex, endIndex - startIndex + 1, ...replacement);
		content = currentLines.join('\n');
		notesStore.updateNoteContentLocal(note.id, content);
	}

	function handleUpdateTableCell(
		tableStartIndex: number,
		rowIndex: number,
		colIndex: number,
		newValue: string
	) {
		const currentLines = [...lines];
		// rowIndex -1 is header (line tableStartIndex)
		// data row 0 starts at tableStartIndex + 2
		const targetLineIdx = rowIndex === -1 ? tableStartIndex : tableStartIndex + 2 + rowIndex;
		if (targetLineIdx >= currentLines.length) return;

		const cells = parseRowCells(currentLines[targetLineIdx]);
		while (cells.length <= colIndex) {
			cells.push('');
		}
		cells[colIndex] = newValue;
		currentLines[targetLineIdx] = `| ${cells.join(' | ')} |`;
		content = currentLines.join('\n');
		notesStore.updateNoteContentLocal(note.id, content);
	}

	function handleAddTableRow(tableStartIndex: number, insertAfterRowIdx: number) {
		const currentLines = [...lines];
		const headerCells = parseRowCells(currentLines[tableStartIndex]);
		const emptyRow = `| ${headerCells.map(() => ' ').join(' | ')} |`;

		// Header is tableStartIndex, delimiter is +1, rows start at +2
		// If insertAfterRowIdx is -1 (after header), insert at tableStartIndex + 2
		const targetInsertIdx = tableStartIndex + 2 + insertAfterRowIdx + 1;
		currentLines.splice(targetInsertIdx, 0, emptyRow);
		content = currentLines.join('\n');
		notesStore.updateNoteContentLocal(note.id, content);
	}

	function handleDeleteTableRow(tableStartIndex: number, rowIdx: number) {
		const currentLines = [...lines];
		const targetLineIdx = tableStartIndex + 2 + rowIdx;
		if (targetLineIdx < currentLines.length) {
			currentLines.splice(targetLineIdx, 1);
			content = currentLines.join('\n');
			notesStore.updateNoteContentLocal(note.id, content);
		}
	}

	function handleAddTableColumn(tableStartIndex: number, insertAfterColIdx: number) {
		const currentLines = [...lines];
		let idx = tableStartIndex;

		// Header row
		const headerCells = parseRowCells(currentLines[idx]);
		headerCells.splice(insertAfterColIdx + 1, 0, 'Header');
		currentLines[idx] = `| ${headerCells.join(' | ')} |`;
		idx++;

		// Delimiter row
		const delimCells = parseRowCells(currentLines[idx]);
		delimCells.splice(insertAfterColIdx + 1, 0, '---');
		currentLines[idx] = `| ${delimCells.join(' | ')} |`;
		idx++;

		// Data rows
		while (idx < currentLines.length && isTableRow(currentLines[idx])) {
			const rowCells = parseRowCells(currentLines[idx]);
			rowCells.splice(insertAfterColIdx + 1, 0, ' ');
			currentLines[idx] = `| ${rowCells.join(' | ')} |`;
			idx++;
		}

		content = currentLines.join('\n');
		notesStore.updateNoteContentLocal(note.id, content);
	}

	function handleDeleteTableColumn(tableStartIndex: number, colIdx: number) {
		const currentLines = [...lines];
		let idx = tableStartIndex;

		// Header row
		const headerCells = parseRowCells(currentLines[idx]);
		if (headerCells.length <= 1) return; // Prevent deleting the only column
		headerCells.splice(colIdx, 1);
		currentLines[idx] = `| ${headerCells.join(' | ')} |`;
		idx++;

		// Delimiter row
		const delimCells = parseRowCells(currentLines[idx]);
		delimCells.splice(colIdx, 1);
		currentLines[idx] = `| ${delimCells.join(' | ')} |`;
		idx++;

		// Data rows
		while (idx < currentLines.length && isTableRow(currentLines[idx])) {
			const rowCells = parseRowCells(currentLines[idx]);
			rowCells.splice(colIdx, 1);
			currentLines[idx] = `| ${rowCells.join(' | ')} |`;
			idx++;
		}

		content = currentLines.join('\n');
		notesStore.updateNoteContentLocal(note.id, content);
	}

	function enterRawEditor(lineIndex?: number) {
		viewMode = 'raw';
		tick().then(() => {
			if (textareaEl) {
				textareaEl.focus();
				if (lineIndex !== undefined) {
					const allLines = content.split('\n');
					let charPos = 0;
					for (let i = 0; i < Math.min(lineIndex, allLines.length); i++) {
						charPos += allLines[i].length + 1;
					}
					textareaEl.setSelectionRange(charPos, charPos);
				}
			}
		});
	}
</script>

<div class="live-preview-editor" role="region" aria-label="Markdown Live Preview Editor">
	<!-- Editor Top Controls Tier -->
	<div class="editor-header-bar">
		<input
			type="text"
			class="note-title-input"
			value={title}
			placeholder="Untitled Note"
			onblur={handleTitleBlur}
			onkeydown={(e) => {
				if (isWikiSuggestOpen && wikiSuggestComp) {
			const handled = wikiSuggestComp.handleKeyDown(e);
			if (handled) return;
		}

		if (e.key === 'Enter') {
					(e.target as HTMLInputElement).blur();
				}
			}}
		/>

		<div class="editor-actions">
			<!-- Move to Folder button -->
			<button
				type="button"
				class="btn-action-outline"
				onclick={() => {
					notesStore.pendingNoteToMove = {
						id: note.id,
						title: note.title,
						currentFolderId: note.folder_id
					};
					notesStore.moveNoteModalOpen = true;
				}}
				title="Move Note to Folder"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="action-icon">
					<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
					<line x1="12" y1="11" x2="12" y2="17" />
					<line x1="9" y1="14" x2="15" y2="14" />
				</svg>
				<span>Move</span>
			</button>

			<!-- Explicit Save Button to eliminate constant API autosave requests -->
			<button
				type="button"
				class="btn-save"
				class:unsaved={isUnsaved}
				class:saving={notesStore.isSaving}
				onclick={handleSave}
				title="Save Note (Cmd+S / Ctrl+S)"
				disabled={notesStore.isSaving || !isUnsaved}
			>
				{#if notesStore.isSaving}
					<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
						<path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
					</svg>
					<span>Saving...</span>
				{:else if isUnsaved}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="save-icon">
						<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
						<polyline points="17 21 17 13 7 13 7 21"></polyline>
						<polyline points="7 3 7 8 15 8"></polyline>
					</svg>
					<span>Save</span>
				{:else}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="save-icon check">
						<polyline points="20 6 9 17 4 12"></polyline>
					</svg>
					<span>Saved</span>
				{/if}
			</button>

			<div class="editor-view-toggle">
				<button
					type="button"
					class="btn-toggle"
					class:active={viewMode === 'hybrid'}
					onclick={() => (viewMode = 'hybrid')}
					title="Live Preview (Obsidian Markdown View)"
				>
					Live
				</button>
				<button
					type="button"
					class="btn-toggle"
					class:active={viewMode === 'raw'}
					onclick={() => enterRawEditor()}
					title="Source Code (Raw Markdown)"
				>
					Source
				</button>
			</div>
		</div>
	</div>

	<!-- Main Canvas Area -->
	<div class="editor-canvas">
		{#if viewMode === 'raw'}
			<div class="raw-editor-container">
				<textarea
					bind:this={textareaEl}
					class="raw-textarea"
					value={content}
					placeholder="Start writing in markdown or type [[ to link notes..."
					oninput={handleContentInput}
					onkeydown={handleTextareaKeyDown}
					onfocus={() => (isEditorFocused = true)}
					onblur={() => (isEditorFocused = false)}
				></textarea>

				{#if isWikiSuggestOpen}
					<WikiLinkSuggestion
						bind:this={wikiSuggestComp}
						query={wikiQuery}
						position={wikiTriggerPos}
						onSelect={handleSelectWikiNote}
						onClose={() => (isWikiSuggestOpen = false)}
					/>
				{/if}
			</div>
		{:else}
			<!-- Hybrid Live Preview Canvas -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="hybrid-canvas"
				onclick={(e) => {
					// Double click or click in blank canvas enters source editing
					if (e.target === e.currentTarget) {
						enterRawEditor();
					}
				}}
				ondblclick={() => enterRawEditor()}
				role="presentation"
			>
				{#if lines.length === 0 || (lines.length === 1 && lines[0] === '')}
					<!-- Empty state prompt -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="canvas-empty-prompt"
						onclick={() => enterLineEdit(0)}
						role="button"
						tabindex="0"
					>
						<p>Click here or start typing to write markdown...</p>
						<span class="hint-shortcut">Tip: Type <code># Header</code> for headers or <code>[[</code> to link notes</span>
					</div>
				{:else}
					<div class="lines-container">
						{#each contentBlocks as block (block.type === 'line' ? `line-${block.index}` : `${block.type}-${block.startIndex}`)}
							{#if block.type === 'code'}
								<EditorCodeBlock
									code={block.code}
									language={block.language}
									onUpdateCode={(newCode) =>
										handleUpdateCodeBlock(block.startIndex, block.endIndex, block.language, newCode)}
								/>
							{:else if block.type === 'table'}
								<EditorTable
									headers={block.headers}
									alignments={block.alignments}
									rows={block.rows}
									startIndex={block.startIndex}
									onUpdateCell={(rowIdx, colIdx, val) =>
										handleUpdateTableCell(block.startIndex, rowIdx, colIdx, val)}
									onAddRow={(insertAfterRowIdx) =>
										handleAddTableRow(block.startIndex, insertAfterRowIdx)}
									onDeleteRow={(rowIdx) =>
										handleDeleteTableRow(block.startIndex, rowIdx)}
									onAddColumn={(insertAfterColIdx) =>
										handleAddTableColumn(block.startIndex, insertAfterColIdx)}
									onDeleteColumn={(colIdx) =>
										handleDeleteTableColumn(block.startIndex, colIdx)}
									onWikiClick={handleWikiLinkClick}
								/>
							{:else}
								<EditorLine
									text={block.text}
									lineIndex={block.index}
									isFocused={activeLineIndex === block.index}
									onFocus={() => enterLineEdit(block.index)}
									onUpdateText={handleLineUpdate}
									onKeyDown={handleLineKeyDown}
									onToggleTask={handleToggleTask}
									onWikiClick={handleWikiLinkClick}
									onWikiTrigger={handleWikiTrigger}
								/>
							{/if}
						{/each}
					</div>
				{/if}

				{#if isWikiSuggestOpen}
					<WikiLinkSuggestion
						bind:this={wikiSuggestComp}
						query={wikiQuery}
						position={wikiTriggerPos}
						onSelect={handleSelectWikiNote}
						onClose={() => (isWikiSuggestOpen = false)}
					/>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.live-preview-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--bg-secondary);
		position: relative;
		overflow: hidden;
	}

	.editor-header-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 28px 12px;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		gap: 16px;
		flex-shrink: 0;
	}

	.note-title-input {
		flex: 1;
		font-family: var(--font-serif);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
		background: transparent;
		border: none;
		outline: none;
		padding: 2px 4px;
		border-radius: var(--radius-sm);
		transition: background 0.15s ease;
	}

	.note-title-input:hover,
	.note-title-input:focus {
		background: var(--bg-tertiary);
	}

	.editor-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}

	.btn-action-outline {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 500;
		padding: 5px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-tertiary);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-action-outline:hover {
		background: var(--bg-primary);
		color: var(--text-primary);
		border-color: var(--border-medium);
	}

	.action-icon {
		width: 13px;
		height: 13px;
	}

	.btn-save {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 500;
		padding: 5px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background: var(--bg-tertiary);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-save:hover:not(:disabled) {
		background: var(--bg-primary);
		color: var(--text-primary);
		border-color: var(--border-medium);
	}

	.btn-save.unsaved {
		background: var(--primary);
		color: white;
		border-color: var(--primary);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
	}

	.btn-save.unsaved:hover:not(:disabled) {
		filter: brightness(1.1);
	}

	.btn-save:disabled {
		opacity: 0.65;
		cursor: default;
	}

	.save-icon {
		width: 13px;
		height: 13px;
	}

	.save-icon.check {
		color: var(--success, #10b981);
	}

	.spinner {
		width: 13px;
		height: 13px;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.editor-view-toggle {
		display: flex;
		background: var(--bg-tertiary);
		border-radius: var(--radius-sm);
		padding: 2px;
		border: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.btn-toggle {
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 500;
		padding: 3px 8px;
		border-radius: 3px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-toggle.active {
		background: var(--bg-secondary);
		color: var(--text-primary);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.btn-toggle:hover:not(.active) {
		color: var(--text-primary);
	}

	.editor-canvas {
		flex: 1;
		overflow-y: auto;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	/* Raw Markdown Mode */
	.raw-editor-container {
		position: relative;
		height: 100%;
		display: flex;
		flex-direction: column;
		padding: 20px 28px;
	}

	.raw-textarea {
		width: 100%;
		height: 100%;
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		color: var(--text-primary);
		font-family: var(--font-mono, monospace);
		font-size: 14px;
		line-height: 1.6;
		resize: none;
		tab-size: 2;
	}

	/* Hybrid Mode */
	.hybrid-canvas {
		height: 100%;
		padding: 20px 28px;
		cursor: text;
		min-height: 300px;
	}

	.lines-container {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-width: 820px;
		margin: 0 auto;
	}

	.canvas-empty-prompt {
		max-width: 820px;
		margin: 40px auto;
		padding: 32px;
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-md);
		text-align: center;
		color: var(--text-muted);
		cursor: pointer;
		background: rgba(255, 255, 255, 0.01);
		transition: border-color 0.15s ease, background 0.15s ease;
	}

	.canvas-empty-prompt:hover {
		border-color: var(--primary);
		background: rgba(255, 255, 255, 0.02);
	}

	.canvas-empty-prompt p {
		margin: 0 0 8px;
		font-size: 14px;
	}

	.hint-shortcut {
		font-size: 12px;
		color: var(--text-muted);
	}

	.hint-shortcut code {
		font-family: var(--font-mono, monospace);
		padding: 2px 5px;
		background: var(--bg-tertiary);
		border-radius: 3px;
		border: 1px solid var(--border-subtle);
		color: var(--primary);
	}
</style>
