<script lang="ts">
	import { notesStore } from '$lib/state/notes.svelte';
	import type { NoteDetail } from '$lib/types/notes';
	import EditorLine from './EditorLine.svelte';
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
		if (!textareaEl) return;

		const textBefore = content.substring(0, wikiTriggerIndex);
		const textAfter = content.substring(textareaEl.selectionStart);

		// Insert [[Selected Title]]
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

	// Track which line is currently being edited in Live Preview (Obsidian-style)
	let activeLineIndex = $state<number | null>(null);

	function handleLineUpdate(index: number, newText: string) {
		const currentLines = [...lines];
		currentLines[index] = newText;
		content = currentLines.join('\n');
		notesStore.updateNoteContentLocal(note.id, content);
	}

	function handleLineKeyDown(e: KeyboardEvent, index: number) {
		// Cmd+S / Ctrl+S
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			handleSave();
			return;
		}

		if (e.key === 'Enter') {
			e.preventDefault();
			const currentLines = [...lines];
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
				if (e.key === 'Enter') {
					(e.target as HTMLInputElement).blur();
				}
			}}
		/>

		<div class="editor-actions">
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
						{#each lines as line, index}
							<EditorLine
								text={line}
								lineIndex={index}
								isFocused={activeLineIndex === index}
								onFocus={() => enterLineEdit(index)}
								onUpdateText={handleLineUpdate}
								onKeyDown={handleLineKeyDown}
								onToggleTask={handleToggleTask}
								onWikiClick={handleWikiLinkClick}
							/>
						{/each}
					</div>
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
