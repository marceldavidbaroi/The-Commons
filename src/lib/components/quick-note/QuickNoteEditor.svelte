<script lang="ts">
	import { untrack } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import TaskList from '@tiptap/extension-task-list';
	import TaskItem from '@tiptap/extension-task-item';
	import type { QuickNote, UpdateQuickNotePayload } from '$lib/types/quick-note';

	interface Props {
		note: QuickNote | null;
		isUnlocked: boolean;
		saving: boolean;
		onBack: () => void;
		onSave: (id: number, payload: UpdateQuickNotePayload) => Promise<QuickNote | null | void> | void;
		onTogglePin: (note: QuickNote) => void;
		onToggleLock: (note: QuickNote) => void;
		onLockNow: (note: QuickNote) => void;
		onRequestUnlock: (note: QuickNote) => void;
		onDuplicate: (note: QuickNote) => void;
		onDelete: (note: QuickNote) => void;
		onRestore: (note: QuickNote) => void;
		onHardDelete: (note: QuickNote) => void;
	}

	let {
		note,
		isUnlocked,
		saving,
		onBack,
		onSave,
		onTogglePin,
		onToggleLock,
		onLockNow,
		onRequestUnlock,
		onDuplicate,
		onDelete,
		onRestore,
		onHardDelete
	}: Props = $props();

	let editorEl = $state<HTMLDivElement | null>(null);
	let editor = $state.raw<Editor | null>(null);
	let loadedNoteId: number | null = null;
	let menuOpen = $state(false);
	let isDirty = $state(false);

	let canViewContent = $derived(Boolean(note && (!note.is_locked || isUnlocked)));

	function extractTitleAndPreview(ed: Editor): { title: string; preview: string } {
		const text = ed.getText({ blockSeparator: '\n' });
		const lines = text.split('\n');
		const title = (lines[0] ?? '').trim().slice(0, 120);
		const bodyLine = lines
			.slice(1)
			.map((l) => l.trim())
			.find((l) => l.length > 0);
		const preview = (bodyLine ?? '').slice(0, 140);
		return { title, preview };
	}

	$effect(() => {
		const el = editorEl;
		if (!el) return;

		const initialNote = untrack(() => note);
		const initialCanView = untrack(() => canViewContent);
		const initialEditable = Boolean(initialNote && !initialNote.deleted_at && initialCanView);

		const ed = new Editor({
			element: el,
			extensions: [
				StarterKit,
				TaskList,
				TaskItem.configure({
					nested: true
				})
			],
			content: initialNote && initialCanView ? initialNote.content || '<p></p>' : '<p></p>',
			editable: initialEditable,
			onUpdate: () => {
				if (!note || note.deleted_at || !canViewContent) return;
				if (loadedNoteId !== note.id) return;
				isDirty = true;
			}
		});

		if (initialNote && initialCanView) {
			loadedNoteId = initialNote.id;
			if (!initialNote.content && !initialNote.deleted_at) {
				ed.commands.focus('start');
			}
		}

		editor = ed;

		return () => {
			ed.destroy();
			if (editor === ed) {
				editor = null;
			}
			loadedNoteId = null;
		};
	});

	$effect(() => {
		const ed = editor;
		if (!ed) return;
		if (!note || !canViewContent) {
			loadedNoteId = null;
			isDirty = false;
			ed.setEditable(false);
			return;
		}

		ed.setEditable(!note.deleted_at);
		if (loadedNoteId !== note.id) {
			loadedNoteId = note.id;
			isDirty = false;
			ed.commands.setContent(note.content || '<p></p>', { emitUpdate: false });
			if (!note.content && !note.deleted_at) {
				ed.commands.focus('start');
			}
		}
	});

	async function handleSave() {
		if (!note || note.deleted_at || !canViewContent || !editor || saving || !isDirty) return;
		const { title, preview } = extractTitleAndPreview(editor);
		const result = await onSave(note.id, {
			title,
			preview,
			content: editor.getHTML()
		});
		if (result !== null) {
			isDirty = false;
		}
	}

	function handleCancel() {
		if (!note || !editor || saving) return;
		editor.commands.setContent(note.content || '<p></p>', { emitUpdate: false });
		isDirty = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
			e.preventDefault();
			handleSave();
		}
	}

	function closeMenu() {
		menuOpen = false;
	}

	function runMenuAction(fn: () => void) {
		menuOpen = false;
		fn();
	}
</script>

<svelte:window onclick={closeMenu} onkeydown={handleKeydown} />

<section class="qn-editor-pane">
	{#if !note}
		<div class="qn-empty-state">Select a note or create a new one</div>
	{:else}
		<header class="qn-editor-header">
			<div class="qn-header-left">
				<button type="button" class="qn-back-btn" onclick={onBack}>&lsaquo; Back</button>
				{#if saving}
					<span class="qn-save-status">Saving...</span>
				{:else if isDirty}
					<span class="qn-save-status">Unsaved changes</span>
				{:else if note.deleted_at}
					<span class="qn-save-status">In Trash</span>
				{/if}
			</div>

			<div class="qn-header-actions">
				{#if !note.deleted_at && canViewContent}
					<button
						type="button"
						class="qn-action-btn qn-cancel-btn"
						disabled={!isDirty || saving}
						onclick={handleCancel}
					>
						Cancel
					</button>
					<button
						type="button"
						class="qn-action-btn qn-save-btn"
						disabled={!isDirty || saving}
						onclick={handleSave}
						title="Save (Cmd+S)"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
				{/if}
				<button
					type="button"
					class="qn-dots-btn"
					aria-label="Note actions"
					onclick={(e) => {
						e.stopPropagation();
						menuOpen = !menuOpen;
					}}
				>
					⋮
				</button>

				{#if menuOpen}
					<div
						class="qn-popover-menu"
						role="menu"
						tabindex="-1"
						onclick={(e) => e.stopPropagation()}
						onkeydown={(e) => e.key === 'Escape' && closeMenu()}
					>
						{#if note.deleted_at}
							<button
								type="button"
								class="qn-menu-item"
								onclick={() => runMenuAction(() => onRestore(note))}
							>
								Restore
							</button>
							<button
								type="button"
								class="qn-menu-item danger"
								onclick={() => runMenuAction(() => onHardDelete(note))}
							>
								Delete Permanently
							</button>
						{:else}
							<button
								type="button"
								class="qn-menu-item"
								onclick={() => runMenuAction(() => onTogglePin(note))}
							>
								{note.is_pinned ? 'Unpin' : 'Pin'}
							</button>
							<button
								type="button"
								class="qn-menu-item"
								onclick={() => runMenuAction(() => onToggleLock(note))}
							>
								{note.is_locked ? 'Unlock' : 'Lock'}
							</button>
							{#if note.is_locked && isUnlocked}
								<button
									type="button"
									class="qn-menu-item"
									onclick={() => runMenuAction(() => onLockNow(note))}
								>
									Lock Now
								</button>
							{/if}
							<button
								type="button"
								class="qn-menu-item"
								onclick={() => runMenuAction(() => onDuplicate(note))}
							>
								Duplicate
							</button>
							<div class="qn-menu-divider"></div>
							<button
								type="button"
								class="qn-menu-item danger"
								onclick={() => runMenuAction(() => onDelete(note))}
							>
								Delete
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</header>

		{#if note.is_locked && !isUnlocked}
			<div class="qn-locked-gate">
				<div class="qn-locked-icon">🔒</div>
				<h2>This note is locked</h2>
				<p>Enter your passcode to view and edit this note.</p>
				<button type="button" class="qn-unlock-btn" onclick={() => onRequestUnlock(note)}>
					Unlock Note
				</button>
			</div>
		{/if}

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="qn-editor-scroll"
			class:hidden={!canViewContent}
			onclick={() => {
				if (editor && canViewContent && !note.deleted_at && !editor.isFocused) {
					editor.commands.focus();
				}
			}}
		>
			<div class="tiptap-quick-note" bind:this={editorEl}></div>
		</div>
	{/if}
</section>

<style>
	.qn-editor-pane {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: var(--bg-primary);
		position: relative;
	}

	.qn-empty-state {
		margin: auto;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	.qn-editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--border-color);
		min-height: 44px;
	}

	.qn-header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.qn-back-btn {
		display: none;
		background: transparent;
		border: none;
		color: var(--primary, #9E5A3C);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0.25rem 0;
	}

	@media (max-width: 768px) {
		.qn-back-btn {
			display: inline-flex;
			align-items: center;
		}
	}

	.qn-save-status {
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.qn-header-actions {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.qn-action-btn {
		border-radius: 0.375rem;
		padding: 0.3rem 0.7rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid var(--border-color);
		transition:
			opacity 0.15s ease,
			background-color 0.15s ease;
	}

	.qn-action-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.qn-cancel-btn {
		background-color: transparent;
		color: var(--text-secondary);
	}

	.qn-cancel-btn:hover:not(:disabled) {
		background-color: var(--bg-secondary);
		color: var(--text-primary);
	}

	.qn-save-btn {
		background-color: var(--primary, #9E5A3C);
		border-color: var(--primary, #9E5A3C);
		color: var(--primary-foreground, #fff);
	}

	.qn-save-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.qn-action-btn {
		border-radius: 0.375rem;
		padding: 0.3rem 0.7rem;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid var(--border-color);
		transition:
			opacity 0.15s ease,
			background-color 0.15s ease;
	}

	.qn-action-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.qn-cancel-btn {
		background-color: transparent;
		color: var(--text-secondary);
	}

	.qn-cancel-btn:hover:not(:disabled) {
		background-color: var(--bg-secondary);
		color: var(--text-primary);
	}

	.qn-save-btn {
		background-color: var(--primary, #9E5A3C);
		border-color: var(--primary, #9E5A3C);
		color: var(--primary-foreground, #fff);
	}

	.qn-save-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.qn-dots-btn {
		background: transparent;
		border: 1px solid transparent;
		color: var(--text-secondary);
		font-size: 1.25rem;
		line-height: 1;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		cursor: pointer;
	}

	.qn-dots-btn:hover {
		background-color: var(--bg-secondary);
		color: var(--text-primary);
	}

	.qn-popover-menu {
		position: absolute;
		right: 0;
		top: calc(100% + 0.25rem);
		z-index: 50;
		min-width: 165px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 0.5rem;
		padding: 0.25rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
		display: flex;
		flex-direction: column;
	}

	.qn-menu-item {
		text-align: left;
		background: transparent;
		border: none;
		padding: 0.45rem 0.65rem;
		font-size: 0.825rem;
		color: var(--text-primary);
		border-radius: 0.35rem;
		cursor: pointer;
	}

	.qn-menu-item:hover {
		background-color: var(--bg-tertiary);
	}

	.qn-menu-item.danger {
		color: #ef4444;
	}

	.qn-menu-divider {
		height: 1px;
		background-color: var(--border-color);
		margin: 0.25rem 0;
	}

	.qn-locked-gate {
		margin: auto;
		text-align: center;
		padding: 2rem;
		max-width: 320px;
	}

	.qn-locked-icon {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	.qn-locked-gate h2 {
		font-size: 1.1rem;
		margin: 0 0 0.25rem;
		color: var(--text-primary);
	}

	.qn-locked-gate p {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0 0 1rem;
	}

	.qn-unlock-btn {
		background-color: var(--primary, #9E5A3C);
		color: var(--primary-foreground, #fff);
		border: none;
		border-radius: 0.375rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
	}

	.qn-editor-scroll {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 1.25rem 1.75rem;
		cursor: text;
	}

	.qn-editor-scroll.hidden {
		display: none;
	}

	.tiptap-quick-note {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	:global(.tiptap-quick-note .ProseMirror) {
		outline: none;
		flex: 1;
		color: var(--text-primary);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	:global(
			.tiptap-quick-note
				.ProseMirror
				> p:first-child:last-child:has(> br.ProseMirror-trailingBreak:only-child)::before
		) {
		content: 'Title or note...';
		color: var(--text-secondary);
		opacity: 0.45;
		pointer-events: none;
		float: left;
		height: 0;
	}

	:global(.tiptap-quick-note .ProseMirror > *:first-child) {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.3;
		margin-top: 0;
		margin-bottom: 0.75rem;
	}

	:global(.tiptap-quick-note .ProseMirror ul[data-type='taskList']) {
		list-style: none;
		padding-left: 0;
	}

	:global(.tiptap-quick-note .ProseMirror ul[data-type='taskList'] li) {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
	}

	:global(.tiptap-quick-note .ProseMirror pre) {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 0.375rem;
		padding: 0.75rem;
		overflow-x: auto;
	}
</style>
