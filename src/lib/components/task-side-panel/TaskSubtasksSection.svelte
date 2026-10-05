<script lang="ts">
	import { slide, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Task } from '$lib/types/tasks';

	let {
		childTasks = [],
		isAddingChild = $bindable(false),
		newChildTitle = $bindable(''),
		onToggleChildStatus,
		onSelectTask,
		onAddChildSubmit
	} = $props<{
		childTasks: Task[];
		isAddingChild: boolean;
		newChildTitle: string;
		onToggleChildStatus: (child: Task) => void;
		onSelectTask?: (task: Task) => void;
		onAddChildSubmit: (e: Event) => void;
	}>();
</script>

<div class="subtasks-paper-section">
	<div class="subtasks-header">
		<span class="subtasks-title">Subtasks ({childTasks.length})</span>
		{#if !isAddingChild}
			<button
				type="button"
				class="add-subtask-btn"
				onclick={() => (isAddingChild = true)}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>Add Subtask</span>
			</button>
		{/if}
	</div>

	<!-- Existing Subtasks List -->
	{#if childTasks.length > 0}
		<div class="subtasks-list">
			{#each childTasks as child (child.id)}
				<div class="subtask-row">
					<button
						type="button"
						class="subtask-checkbox"
						class:checked={child.status === 'completed'}
						onclick={() => onToggleChildStatus(child)}
						aria-label={child.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
					>
						{#if child.status === 'completed'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
								<polyline points="20 6 9 17 4 12" />
							</svg>
						{/if}
					</button>

					<button
						type="button"
						class="subtask-title-btn"
						class:line-through={child.status === 'completed'}
						onclick={() => {
							if (onSelectTask) onSelectTask(child);
						}}
					>
						{child.title}
					</button>

					<span class="badge priority-{child.priority} compact">{child.priority}</span>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Inline Add Subtask Input Form -->
	{#if isAddingChild}
		<form class="add-subtask-form" onsubmit={onAddChildSubmit} transition:slide={{ duration: 180, easing: cubicOut }}>
			<input
				type="text"
				class="add-subtask-input"
				bind:value={newChildTitle}
				placeholder="What is the subtask?"
				autofocus
			/>
			<div class="subtask-form-actions">
				<button
					type="button"
					class="btn btn-secondary compact"
					onclick={() => {
						isAddingChild = false;
						newChildTitle = '';
					}}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-primary compact"
					disabled={!newChildTitle.trim()}
				>
					Add
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	.subtasks-paper-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem 0;
	}

	.subtasks-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.subtasks-title {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.add-subtask-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: transparent;
		border: none;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--primary);
		cursor: pointer;
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		transition: background-color 0.15s ease;
	}

	.add-subtask-btn:hover {
		background-color: var(--bg-tertiary);
	}

	.add-subtask-btn svg {
		width: 12px;
		height: 12px;
	}

	.subtasks-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.subtask-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.375rem;
		border-radius: var(--radius-sm);
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		transition: border-color 0.15s ease;
	}

	.subtask-row:hover {
		border-color: var(--border-focus);
	}

	.subtask-checkbox {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
	}

	.subtask-checkbox.checked {
		background-color: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.subtask-checkbox svg {
		width: 9px;
		height: 9px;
	}

	.subtask-title-btn {
		flex: 1;
		min-width: 0;
		text-align: left;
		background: transparent;
		border: none;
		font-size: 0.75rem;
		color: var(--text-primary);
		cursor: pointer;
		padding: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.subtask-title-btn.line-through {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.badge {
		font-size: 0.625rem;
		text-transform: capitalize;
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-sm);
	}

	.priority-urgent {
		background-color: #fee2e2;
		color: #b91c1c;
	}

	.priority-high {
		background-color: #fef3c7;
		color: #b45309;
	}

	.priority-normal {
		background-color: var(--bg-tertiary);
		color: var(--primary);
	}

	.priority-low {
		background-color: #f8fafc;
		color: var(--text-muted);
	}

	.add-subtask-form {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.add-subtask-input {
		flex: 1;
		height: 28px;
		font-size: 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0 0.5rem;
		background-color: var(--bg-primary);
		color: var(--text-primary);
		outline: none;
	}

	.add-subtask-input:focus {
		border-color: var(--border-focus);
		background-color: var(--bg-secondary);
	}

	.subtask-form-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
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

	.btn.compact {
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
	}

	.btn-primary {
		background-color: var(--primary);
		color: var(--primary-foreground);
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
</style>
