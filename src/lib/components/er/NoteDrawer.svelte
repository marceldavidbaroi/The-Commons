<script lang="ts">
	import { erStore } from '$lib/stores/er.svelte';
	import type { ErNote } from '$lib/types/er';

	export interface NoteTarget {
		type: 'table' | 'group';
		id: string;
		label: string;
	}

	interface Props {
		target: NoteTarget | null;
		onClose: () => void;
	}

	let { target, onClose }: Props = $props();

	let newContent = $state('');
	let saving = $state(false);
	let editingId = $state<string | null>(null);
	let editContent = $state('');

	const targetNotes = $derived.by(() => {
		if (!target) return [];
		return erStore.notes.filter(
			(n) => n.target_type === target.type && n.target_id === target.id
		);
	});

	async function handleAdd(event: Event) {
		event.preventDefault();
		if (!target || !erStore.activeDiagramId || !newContent.trim() || saving) return;

		saving = true;
		try {
			await erStore.createNote({
				diagram_id: erStore.activeDiagramId,
				target_type: target.type,
				target_id: target.id,
				content: newContent.trim()
			});
			newContent = '';
		} finally {
			saving = false;
		}
	}

	function startEdit(note: ErNote) {
		editingId = note.id;
		editContent = note.content;
	}

	async function saveEdit(id: string) {
		if (!editContent.trim() || saving) return;
		saving = true;
		try {
			await erStore.updateNote(id, { content: editContent.trim() });
			editingId = null;
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: string) {
		await erStore.deleteNote(id);
		if (editingId === id) editingId = null;
	}
</script>

{#if target}
	<aside class="er-note-drawer" aria-label="Study Notes">
		<header class="er-drawer-header">
			<div class="er-drawer-title-wrap">
				<span class="er-drawer-kind">{target.type}</span>
				<h2 class="er-drawer-title">{target.label}</h2>
			</div>
			<button type="button" class="er-close-btn" onclick={onClose} aria-label="Close drawer">
				×
			</button>
		</header>

		<div class="er-drawer-body">
			<form class="er-note-form" onsubmit={handleAdd}>
				<textarea
					class="er-note-textarea"
					rows="4"
					placeholder="Add markdown study note (RLS rules, indexes, trade-offs)..."
					bind:value={newContent}
				></textarea>
				<div class="er-note-form-actions">
					<button
						type="submit"
						class="er-btn-primary"
						disabled={!newContent.trim() || saving}
					>
						{saving ? 'Saving...' : 'Add Note'}
					</button>
				</div>
			</form>

			<div class="er-notes-list">
				{#each targetNotes as note (note.id)}
					<article class="er-note-card">
						{#if editingId === note.id}
							<textarea class="er-note-textarea" rows="4" bind:value={editContent}></textarea>
							<div class="er-note-card-actions">
								<button
									type="button"
									class="er-btn-sm"
									onclick={() => (editingId = null)}
								>
									Cancel
								</button>
								<button
									type="button"
									class="er-btn-primary"
									onclick={() => saveEdit(note.id)}
									disabled={saving}
								>
									Save
								</button>
							</div>
						{:else}
							<pre class="er-note-content">{note.content}</pre>
							<div class="er-note-card-actions">
								<button type="button" class="er-btn-sm" onclick={() => startEdit(note)}>
									Edit
								</button>
								<button
									type="button"
									class="er-btn-sm er-btn-danger"
									onclick={() => handleDelete(note.id)}
								>
									Delete
								</button>
							</div>
						{/if}
					</article>
				{:else}
					<p class="er-notes-empty">No study notes for this {target.type} yet.</p>
				{/each}
			</div>
		</div>
	</aside>
{/if}

<style>
	.er-note-drawer {
		width: 340px;
		flex-shrink: 0;
		height: 100%;
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		color: var(--text-primary);
	}

	.er-drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		background: var(--bg-tertiary);
		border-bottom: 1px solid var(--border-subtle);
	}

	.er-drawer-title-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}

	.er-drawer-kind {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		padding: 1px 6px;
		border-radius: 4px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-secondary);
	}

	.er-drawer-title {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.er-close-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-size: 18px;
		cursor: pointer;
	}

	.er-drawer-body {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.er-note-form {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.er-note-textarea {
		width: 100%;
		padding: 8px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		color: var(--text-primary);
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		resize: vertical;
	}

	.er-note-form-actions,
	.er-note-card-actions {
		display: flex;
		justify-content: flex-end;
		gap: 6px;
	}

	.er-notes-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.er-note-card {
		padding: 10px;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.er-note-content {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: inherit;
		font-size: 12px;
		line-height: 1.45;
	}

	.er-notes-empty {
		margin: 8px 0 0;
		font-size: 12px;
		color: var(--text-secondary);
		text-align: center;
	}

	.er-btn-primary,
	.er-btn-sm {
		height: 26px;
		padding: 0 10px;
		border-radius: 5px;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid var(--border-subtle);
	}

	.er-btn-primary {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.er-btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.er-btn-sm {
		background: var(--bg-secondary);
		color: var(--text-secondary);
	}

	.er-btn-danger {
		color: #f87171;
	}
</style>
