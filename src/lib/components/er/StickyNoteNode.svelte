<script lang="ts">
	import type { NodeProps } from '@xyflow/svelte';
	import { erStore } from '$lib/stores/er.svelte';
	import type { ErNote } from '$lib/types/er';

	interface StickyNoteData {
		note: ErNote;
	}

	let { data, selected }: NodeProps & { data: StickyNoteData } = $props();

	const note = $derived(data.note);
	let editing = $state(false);
	let draft = $state('');

	function startEdit() {
		draft = note.content;
		editing = true;
	}

	async function saveEdit() {
		const trimmed = draft.trim();
		editing = false;
		if (trimmed && trimmed !== note.content) {
			await erStore.updateNote(note.id, { content: trimmed });
		}
	}

	async function handleDelete() {
		await erStore.deleteNote(note.id);
	}
</script>

<div class="er-sticky-node" class:selected>
	<header class="er-sticky-header">
		<span class="er-sticky-label">Note</span>
		<div class="er-sticky-actions nodrag">
			{#if editing}
				<button type="button" class="er-sticky-btn" onclick={saveEdit}>Done</button>
			{:else}
				<button type="button" class="er-sticky-btn" onclick={startEdit}>Edit</button>
			{/if}
			<button
				type="button"
				class="er-sticky-btn"
				onclick={handleDelete}
				aria-label="Delete sticky note"
			>
				×
			</button>
		</div>
	</header>

	{#if editing}
		<textarea
			class="er-sticky-textarea nodrag"
			rows="5"
			bind:value={draft}
		></textarea>
	{:else}
		<div class="er-sticky-content" ondblclick={startEdit} role="presentation">
			{note.content}
		</div>
	{/if}
</div>

<style>
	.er-sticky-node {
		width: 220px;
		min-height: 110px;
		background: rgba(245, 158, 11, 0.14);
		border: 1px solid rgba(245, 158, 11, 0.45);
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		color: var(--text-primary);
		font-size: 12px;
		overflow: hidden;
	}

	.er-sticky-node.selected {
		border-color: #f59e0b;
		box-shadow: 0 0 0 1px #f59e0b;
	}

	.er-sticky-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 8px;
		background: rgba(245, 158, 11, 0.2);
		border-bottom: 1px solid rgba(245, 158, 11, 0.3);
	}

	.er-sticky-label {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #d97706;
	}

	.er-sticky-actions {
		display: flex;
		gap: 4px;
	}

	.er-sticky-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 11px;
		cursor: pointer;
		padding: 0 4px;
	}

	.er-sticky-content {
		padding: 8px;
		white-space: pre-wrap;
		word-break: break-word;
		line-height: 1.4;
		cursor: text;
	}

	.er-sticky-textarea {
		width: 100%;
		padding: 8px;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-family: inherit;
		font-size: 12px;
		resize: vertical;
		outline: none;
	}
</style>
