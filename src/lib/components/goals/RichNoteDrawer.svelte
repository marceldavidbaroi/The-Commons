<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { Table } from '@tiptap/extension-table';
	import { TableRow } from '@tiptap/extension-table-row';
	import { TableHeader } from '@tiptap/extension-table-header';
	import { TableCell } from '@tiptap/extension-table-cell';
	import { TaskList } from '@tiptap/extension-task-list';
	import { TaskItem } from '@tiptap/extension-task-item';

	interface Props {
		open: boolean;
		noteKey: string | number | null;
		kicker: string;
		title: string;
		content: string | null;
		placeholder?: string;
		ariaLabel?: string;
		onClose: () => void;
		onChange: (html: string | null) => void;
	}

	let {
		open,
		noteKey,
		kicker,
		title,
		content,
		placeholder = 'Start writing... (try # Heading, - Bullet, 1. List, [] Checklist)',
		ariaLabel = 'Note Editor',
		onClose,
		onChange
	}: Props = $props();

	let editorEl: HTMLElement | null = $state(null);
	let editor = $state.raw<Editor | null>(null);
	let mountedKey: string | number | null = null;
	let activeTick = $state(0);
	let isEmpty = $state(true);

	function normalizeInitialContent(raw: string | null): string {
		if (!raw || !raw.trim()) return '';
		if (/^\s*</.test(raw)) return raw;
		return raw
			.split(/\r?\n/)
			.map((line) => {
				const escaped = line
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
				return `<p>${escaped || '<br>'}</p>`;
			})
			.join('');
	}

	function destroyEditor() {
		if (editor) {
			editor.destroy();
			editor = null;
		}
		mountedKey = null;
	}

	function initEditor(el: HTMLElement, key: string | number, initialContent: string | null) {
		destroyEditor();
		mountedKey = key;

		const ed = new Editor({
			element: el,
			extensions: [
				StarterKit,
				Table.configure({ resizable: true }),
				TableRow,
				TableHeader,
				TableCell,
				TaskList,
				TaskItem.configure({ nested: true })
			],
			content: normalizeInitialContent(initialContent),
			editorProps: {
				attributes: {
					class: 'goals-tiptap-content'
				}
			},
			onSelectionUpdate: () => {
				activeTick++;
			},
			onTransaction: ({ editor: current }) => {
				activeTick++;
				isEmpty = current.isEmpty;
			},
			onUpdate: ({ editor: current }) => {
				activeTick++;
				isEmpty = current.isEmpty;
				onChange(current.isEmpty ? null : current.getHTML());
			}
		});

		editor = ed;
		isEmpty = ed.isEmpty;
		activeTick++;
		requestAnimationFrame(() => {
			if (editor === ed && !ed.isDestroyed) {
				ed.commands.focus('end');
			}
		});
	}

	$effect(() => {
		if (!open || noteKey === null) {
			destroyEditor();
			return;
		}
		if (editorEl && mountedKey !== noteKey) {
			const initial = untrack(() => content);
			initEditor(editorEl, noteKey, initial);
		}
	});

	onMount(() => {
		if (open && noteKey !== null && editorEl && mountedKey !== noteKey) {
			initEditor(editorEl, noteKey, content);
		}
	});

	onDestroy(() => {
		destroyEditor();
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			onClose();
		}
	}

	function keepSelection(e: MouseEvent) {
		e.preventDefault();
	}

	function toggleChecklist() {
		if (!editor) return;
		const { state } = editor;
		const sel = state.selection;
		const parent = sel.$from.parent;
		const inAnyList =
			editor.isActive('bulletList') ||
			editor.isActive('orderedList') ||
			editor.isActive('taskList');

		if (!inAnyList && sel.empty && parent.type.name === 'paragraph' && parent.content.size > 0) {
			let hasHardBreak = false;
			parent.forEach((child) => {
				if (child.type.name === 'hardBreak') hasHardBreak = true;
			});
			if (hasHardBreak || sel.$from.parentOffset === parent.content.size) {
				editor.chain().focus().splitBlock().toggleTaskList().run();
				return;
			}
		}

		editor.chain().focus().toggleTaskList().run();
	}

	function isActive(tick: number, name: string, attrs?: Record<string, unknown>): boolean {
		void tick;
		return editor?.isActive(name, attrs) ?? false;
	}

	const placeholderText = placeholder;
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="goals-drawer-backdrop"
		onclick={onClose}
		role="presentation"
		transition:fade={{ duration: 180, easing: cubicOut }}
	></div>

	<aside
		class="goals-drawer"
		aria-label={ariaLabel}
		transition:fly={{ x: 520, duration: 220, easing: cubicOut }}
	>
		<div class="goals-drawer-header">
			<div class="goals-drawer-titles">
				<span class="goals-drawer-kicker">{kicker}</span>
				<h2 class="goals-drawer-title">{title}</h2>
			</div>
			<button
				type="button"
				onclick={onClose}
				aria-label="Close note"
				class="goals-btn-secondary goals-btn-sm"
			>
				Done
			</button>
		</div>

		<div class="goals-rte-toolbar">
			<button
				type="button"
				onmousedown={keepSelection}
				onclick={() => editor?.chain().focus().toggleBold().run()}
				class="goals-rte-btn {isActive(activeTick, 'bold') ? 'is-active' : ''}"
				title="Bold (Ctrl/Cmd+B)"
			>
				<strong>B</strong>
			</button>
			<button
				type="button"
				onmousedown={keepSelection}
				onclick={() => editor?.chain().focus().toggleItalic().run()}
				class="goals-rte-btn {isActive(activeTick, 'italic') ? 'is-active' : ''}"
				title="Italic (Ctrl/Cmd+I)"
			>
				<em>I</em>
			</button>
			<button
				type="button"
				onmousedown={keepSelection}
				onclick={toggleChecklist}
				class="goals-rte-btn {isActive(activeTick, 'taskList') ? 'is-active' : ''}"
				title="Checklist"
			>
				☑ Check
			</button>
			<button
				type="button"
				onmousedown={keepSelection}
				onclick={() => {
					if (!isActive(activeTick, 'table')) {
						editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
					}
				}}
				class="goals-rte-btn {isActive(activeTick, 'table') ? 'is-active' : ''}"
				title="Insert 3x3 table"
			>
				Table
			</button>
		</div>

		{#if isActive(activeTick, 'table')}
			<div class="goals-rte-subtoolbar">
				<button type="button" onmousedown={keepSelection} onclick={() => editor?.chain().focus().addColumnAfter().run()} class="goals-rte-subbtn">+ Col</button>
				<button type="button" onmousedown={keepSelection} onclick={() => editor?.chain().focus().deleteColumn().run()} class="goals-rte-subbtn is-danger">- Col</button>
				<button type="button" onmousedown={keepSelection} onclick={() => editor?.chain().focus().addRowAfter().run()} class="goals-rte-subbtn">+ Row</button>
				<button type="button" onmousedown={keepSelection} onclick={() => editor?.chain().focus().deleteRow().run()} class="goals-rte-subbtn is-danger">- Row</button>
				<button type="button" onmousedown={keepSelection} onclick={() => editor?.chain().focus().deleteTable().run()} class="goals-rte-subbtn is-danger" style="margin-left: auto;">Delete Table</button>
			</div>
		{/if}

		<div
			class="goals-drawer-body"
			onclick={(e) => {
				if (e.target === e.currentTarget) {
					editor?.chain().focus('end').run();
				}
			}}
			role="presentation"
		>
			{#if isEmpty}
				<div class="goals-rte-placeholder" aria-hidden="true">{placeholderText}</div>
			{/if}
			<div bind:this={editorEl} class="goals-rte-surface"></div>
		</div>

		<div class="goals-drawer-footer">
			<span class="goals-muted" style="font-size: 0.75rem;">
				Changes sync to your milestone draft. Click Save in the top bar to persist.
			</span>
		</div>
	</aside>
{/if}
