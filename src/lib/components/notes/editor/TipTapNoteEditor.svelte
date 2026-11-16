<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import TaskList from '@tiptap/extension-task-list';
	import TaskItem from '@tiptap/extension-task-item';
	import { Table } from '@tiptap/extension-table';
	import { TableRow } from '@tiptap/extension-table-row';
	import { TableCell } from '@tiptap/extension-table-cell';
	import { TableHeader } from '@tiptap/extension-table-header';
	import { marked } from 'marked';
	import TurndownService from 'turndown';
	import type { Note } from '$lib/types/notes';
	import { notesStore } from '$lib/state/notes.svelte';
	import { WikiLink } from './wikiLinkExtension';

	interface Props {
		note: Note;
		onSplitRight?: (noteId: string) => void;
	}

	let { note, onSplitRight }: Props = $props();

	let editorEl: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined = $state();
	let titleInput = $state(untrack(() => note.title));
	let currentNoteId = $state(untrack(() => note.id));
	let inTable = $state(false);

	const turndown = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
		bulletListMarker: '-'
	});

	// Preserve TipTap task list checkboxes in Markdown
	turndown.addRule('taskListItem', {
		filter: (node) =>
			node.nodeName === 'LI' && node.getAttribute('data-type') === 'taskItem',
		replacement: (content, node) => {
			const el = node as HTMLElement;
			const checked = el.getAttribute('data-checked') === 'true';
			const clean = content.replace(/^\s+|\s+$/g, '').replace(/\n+/g, '\n  ');
			return `- [${checked ? 'x' : ' '}] ${clean}\n`;
		}
	});

	// Preserve GFM tables in Markdown
	turndown.addRule('gfmTable', {
		filter: 'table',
		replacement: (_content, node) => {
			const table = node as HTMLTableElement;
			const rows = Array.from(table.querySelectorAll('tr'));
			if (rows.length === 0) return '';

			const mdRows = rows.map((tr) => {
				const cells = Array.from(tr.querySelectorAll('th, td')).map((cell) =>
					(cell.textContent ?? '').trim().replace(/\|/g, '\\|').replace(/\n+/g, ' ')
				);
				return `| ${cells.join(' | ')} |`;
			});

			const colCount = rows[0].querySelectorAll('th, td').length;
			const separator = `| ${Array(colCount).fill('---').join(' | ')} |`;
			return `\n${mdRows[0]}\n${separator}\n${mdRows.slice(1).join('\n')}\n\n`;
		}
	});

	// Preserve [[WikiLink]] syntax in Markdown
	turndown.addRule('wikiLink', {
		filter: (node) =>
			node.nodeName === 'SPAN' && node.hasAttribute('data-wiki-target'),
		replacement: (_content, node) => {
			const target = (node as HTMLElement).getAttribute('data-wiki-target') ?? '';
			return `[[${target}]]`;
		}
	});

	function mdToHtml(md: string): string {
		if (!md) return '';
		const withWikiLinks = md.replace(
			/\[\[([^\]]+)\]\]/g,
			(_m, target) => `<span data-wiki-target="${target.replace(/"/g, '&quot;')}">[[${target}]]</span>`
		);
		return marked.parse(withWikiLinks, { async: false, gfm: true, breaks: true }) as string;
	}

	function htmlToMd(html: string): string {
		return turndown.turndown(html);
	}

	const isUnsaved = $derived(notesStore.unsavedNotes.has(note.id));

	async function handleSave() {
		if (!editor) return;
		const md = htmlToMd(editor.getHTML());
		await notesStore.saveNoteContent(note.id, md);
	}

	function handleTitleBlur() {
		const trimmed = titleInput.trim();
		if (trimmed && trimmed !== note.title) {
			notesStore.renameNote(note.id, trimmed);
		} else {
			titleInput = note.title;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			handleSave();
		}
	}

	onMount(() => {
		if (!editorEl) return;

		editor = new Editor({
			element: editorEl,
			extensions: [
				StarterKit,
				TaskList,
				TaskItem.configure({ nested: true }),
				Table.configure({ resizable: true }),
				TableRow,
				TableHeader,
				TableCell,
				WikiLink.configure({
					getItems: (query) => {
						const q = query.trim().toLowerCase();
						const items: { id: string; title: string }[] = [];
						for (const [, stub] of notesStore.activeTitleMap) {
							if (!q || stub.title.toLowerCase().includes(q)) {
								items.push({ id: stub.id, title: stub.title });
							}
							if (items.length >= 10) break;
						}
						return items;
					},
					onNavigate: () => {}
				})
			],
			content: mdToHtml(note.content ?? ''),
			editorProps: {
				attributes: {
					class: 'tiptap-prose'
				},
				handleClick: (_view, _pos, event) => {
					const target = (event.target as HTMLElement)?.closest?.('[data-wiki-target]');
					if (!target) return false;
					const title = target.getAttribute('data-wiki-target');
					if (!title) return false;
					const split = event.metaKey || event.ctrlKey;
					const resolved = notesStore.activeTitleMap.get(title.toLowerCase());
					if (resolved) {
						if (split) {
							notesStore.splitPaneRight(resolved.id);
						} else {
							notesStore.openNoteInActivePane(resolved.id);
						}
					} else {
						notesStore.createNewNote(title).then((created) => {
							if (!created) return;
							if (split) {
								notesStore.splitPaneRight(created.id);
							} else {
								notesStore.openNoteInActivePane(created.id);
							}
						});
					}
					return true;
				}
			},
			onSelectionUpdate: ({ editor: ed }) => {
				inTable = ed.isActive('table');
			},
			onUpdate: ({ editor: ed }) => {
				inTable = ed.isActive('table');
				const md = htmlToMd(ed.getHTML());
				notesStore.updateNoteContentLocal(note.id, md);
			}
		});
	});

	// Sync when switching to a different note in the same pane
	$effect(() => {
		const nextId = note.id;
		const nextTitle = note.title;
		const nextContent = note.content ?? '';

		if (nextId !== currentNoteId) {
			currentNoteId = nextId;
			titleInput = nextTitle;
			if (editor) {
				editor.commands.setContent(mdToHtml(nextContent), { emitUpdate: false });
			}
		} else if (nextTitle !== titleInput && document.activeElement?.tagName !== 'INPUT') {
			titleInput = nextTitle;
		}
	});

	onDestroy(() => {
		editor?.destroy();
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="tiptap-note-editor" onkeydown={handleKeydown}>
	<div class="editor-header">
		<input
			type="text"
			class="note-title-input"
			bind:value={titleInput}
			onblur={handleTitleBlur}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					(e.currentTarget as HTMLInputElement).blur();
					editor?.commands.focus('start');
				}
			}}
			placeholder="Untitled Note"
		/>

		<div class="editor-actions">
			<button
				type="button"
				class="action-btn"
				title="Insert table"
				onclick={() =>
					editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
			>
				Table
			</button>

			<button
				type="button"
				class="action-btn"
				title="Move note to folder"
				onclick={() => {
					notesStore.pendingNoteToMove = {
						id: note.id,
						title: note.title,
						folderId: note.folder_id ?? null
					};
					notesStore.moveNoteModalOpen = true;
				}}
			>
				Move
			</button>

			{#if onSplitRight}
				<button
					type="button"
					class="action-btn"
					title="Split pane right"
					onclick={() => onSplitRight(note.id)}
				>
					Split
				</button>
			{/if}

			<button
				type="button"
				class="action-btn save-btn"
				class:saving={notesStore.isSaving}
				disabled={notesStore.isSaving || !isUnsaved}
				onclick={handleSave}
			>
				{#if notesStore.isSaving}
					Saving...
				{:else if isUnsaved}
					Save
				{:else}
					Saved
				{/if}
			</button>
		</div>
	</div>

	{#if inTable}
		<div class="table-toolbar">
			<button type="button" onclick={() => editor?.chain().focus().addRowAfter().run()}>
				+ Row
			</button>
			<button type="button" onclick={() => editor?.chain().focus().deleteRow().run()}>
				- Row
			</button>
			<button type="button" onclick={() => editor?.chain().focus().addColumnAfter().run()}>
				+ Col
			</button>
			<button type="button" onclick={() => editor?.chain().focus().deleteColumn().run()}>
				- Col
			</button>
			<button type="button" class="danger" onclick={() => editor?.chain().focus().deleteTable().run()}>
				Del Table
			</button>
		</div>
	{/if}

	<div class="editor-scroll-area">
		<div bind:this={editorEl} class="editor-mount"></div>
	</div>
</div>

<style>
	.tiptap-note-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.625rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.note-title-input {
		flex: 1;
		min-width: 0;
		background: transparent;
		border: none;
		outline: none;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.editor-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.action-btn {
		padding: 0.25rem 0.625rem;
		font-size: 0.8125rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border-subtle);
		background: var(--bg-primary);
		color: var(--text-secondary);
		cursor: pointer;
	}

	.action-btn:hover:not(:disabled) {
		color: var(--text-primary);
		border-color: var(--border-default, var(--border-subtle));
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.save-btn:not(:disabled) {
		background: var(--accent-primary, #3b82f6);
		color: #fff;
		border-color: transparent;
	}

	.editor-scroll-area {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem 1.5rem 4rem;
	}

	.editor-mount {
		max-width: 760px;
		margin: 0 auto;
	}

	:global(.tiptap-prose) {
		outline: none;
		min-height: 60vh;
		line-height: 1.65;
		font-size: 0.95rem;
	}

	:global(.tiptap-prose h1) {
		font-size: 1.65rem;
		font-weight: 700;
		margin: 1.25rem 0 0.5rem;
	}

	:global(.tiptap-prose h2) {
		font-size: 1.35rem;
		font-weight: 600;
		margin: 1.1rem 0 0.4rem;
	}

	:global(.tiptap-prose h3) {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0.9rem 0 0.35rem;
	}

	:global(.tiptap-prose p) {
		margin: 0.4rem 0;
	}

	:global(.tiptap-prose ul),
	:global(.tiptap-prose ol) {
		padding-left: 1.5rem;
		margin: 0.4rem 0;
	}

	:global(.tiptap-prose ul[data-type='taskList']) {
		list-style: none;
		padding-left: 0.25rem;
	}

	:global(.tiptap-prose ul[data-type='taskList'] li) {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	:global(.tiptap-prose ul[data-type='taskList'] li > label) {
		margin-top: 0.2rem;
		user-select: none;
	}

	:global(.tiptap-prose blockquote) {
		border-left: 3px solid var(--border-subtle);
		padding-left: 0.9rem;
		margin: 0.6rem 0;
		color: var(--text-secondary);
	}

	:global(.tiptap-prose pre) {
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		border-radius: 0.375rem;
		padding: 0.75rem 1rem;
		overflow-x: auto;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.875rem;
	}

	:global(.tiptap-prose code) {
		background: var(--bg-primary);
		padding: 0.1rem 0.3rem;
		border-radius: 0.25rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.875em;
	}

	:global(.tiptap-prose pre code) {
		background: transparent;
		padding: 0;
	}

	.table-toolbar {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background: var(--bg-primary);
		flex-shrink: 0;
	}

	.table-toolbar button {
		padding: 0.2rem 0.5rem;
		font-size: 0.75rem;
		border-radius: 0.25rem;
		border: 1px solid var(--border-subtle);
		background: var(--bg-secondary);
		color: var(--text-secondary);
		cursor: pointer;
	}

	.table-toolbar button:hover {
		color: var(--text-primary);
	}

	.table-toolbar button.danger:hover {
		color: #ef4444;
		border-color: #ef4444;
	}

	:global(.tiptap-prose table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.75rem 0;
		table-layout: fixed;
	}

	:global(.tiptap-prose th),
	:global(.tiptap-prose td) {
		border: 1px solid var(--border-subtle);
		padding: 0.4rem 0.6rem;
		vertical-align: top;
		min-width: 60px;
	}

	:global(.tiptap-prose th) {
		background: var(--bg-primary);
		font-weight: 600;
		text-align: left;
	}

	:global(.tiptap-prose .selectedCell) {
		background: rgba(59, 130, 246, 0.12);
	}

	:global(.tiptap-prose .wiki-link) {
		color: var(--accent-primary, #3b82f6);
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
	}

	:global(.wiki-suggestion-popup) {
		position: fixed;
		z-index: 1000;
		min-width: 200px;
		max-width: 300px;
		max-height: 220px;
		overflow-y: auto;
		background: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: 0.375rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		padding: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	:global(.wiki-suggestion-item) {
		text-align: left;
		padding: 0.35rem 0.6rem;
		font-size: 0.8125rem;
		border: none;
		border-radius: 0.25rem;
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;
	}

	:global(.wiki-suggestion-item.selected),
	:global(.wiki-suggestion-item:hover) {
		background: var(--bg-primary);
	}

	:global(.wiki-suggestion-empty) {
		padding: 0.35rem 0.6rem;
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}
</style>
