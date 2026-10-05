<script lang="ts">
	import type { Task } from '$lib/types/tasks';

	let {
		task,
		mode,
		isDirty,
		isSaving,
		editedTitle,
		onClose,
		onDelete,
		onSave
	} = $props<{
		task: Task | null;
		mode: 'edit' | 'create';
		isDirty: boolean;
		isSaving: boolean;
		editedTitle: string;
		onClose: () => void;
		onDelete?: (taskId: number | string) => Promise<void> | void;
		onSave: () => void;
	}>();
</script>

<div class="panel-footer">
	{#if mode === 'edit' && task && onDelete}
		<button
			type="button"
			class="btn btn-danger-ghost"
			onclick={() => {
				if (confirm('Are you sure you want to delete this task?')) {
					onDelete(task.id);
					onClose();
				}
			}}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="3 6 5 6 21 6" />
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			</svg>
			<span>Delete</span>
		</button>
	{:else}
		<button
			type="button"
			class="btn btn-secondary"
			onclick={onClose}
		>
			Cancel
		</button>
	{/if}

	<div class="footer-save-actions">
		{#if mode === 'edit' && isDirty}
			<span class="unsaved-badge">Unsaved changes</span>
		{/if}
		<button
			type="button"
			class="btn btn-primary"
			disabled={(mode === 'edit' && !isDirty) || isSaving || !editedTitle.trim()}
			onclick={onSave}
		>
			{#if isSaving}
				{mode === 'create' ? 'Creating...' : 'Saving...'}
			{:else}
				{mode === 'create' ? 'Create Task' : 'Save Changes'}
			{/if}
		</button>
	</div>
</div>

<style>
	.panel-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		flex-shrink: 0;
		gap: 0.75rem;
	}

	.footer-save-actions {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.unsaved-badge {
		font-size: 0.6875rem;
		color: var(--warning);
		font-weight: 500;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.btn svg {
		width: 14px;
		height: 14px;
	}

	.btn-primary {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--primary-hover);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background-color: var(--bg-tertiary);
		border-color: var(--border-subtle);
		color: var(--text-primary);
	}

	.btn-secondary:hover {
		background-color: var(--bg-surface);
	}

	.btn-danger-ghost {
		background: transparent;
		color: var(--danger);
		border: 1px solid transparent;
		padding: 0.375rem 0.5rem;
	}

	.btn-danger-ghost:hover {
		background-color: #fee2e2;
		border-color: #fca5a5;
	}
</style>
