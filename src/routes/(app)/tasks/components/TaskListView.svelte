<script lang="ts">
	import type { Task, TreeTaskItem } from './types';

	let {
		treeTasks,
		selectedTaskId,
		isPanelOpen,
		onToggleComplete,
		onSelectTask,
		onDeleteTask
	}: {
		treeTasks: TreeTaskItem[];
		selectedTaskId: number | string | null;
		isPanelOpen: boolean;
		onToggleComplete: (task: Task) => void;
		onSelectTask: (task: Task) => void;
		onDeleteTask: (taskId: number | string) => void;
	} = $props();
</script>

<div class="list-wrapper">
	{#each treeTasks as { task, depth } (task.id)}
		<div
			class="task-row"
			class:is-subtask={depth > 0}
			class:completed={task.status === 'completed'}
			class:selected={isPanelOpen && selectedTaskId === task.id}
			style:padding-left={`${Math.max(0.75, depth * 1.5 + 0.75)}rem`}
		>
			<!-- Subtask Tree Branch Connector Icon -->
			{#if depth > 0}
				<div class="tree-branch-indicator" aria-hidden="true">
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4 0v9a3 3 0 0 0 3 3h6" />
					</svg>
				</div>
			{/if}

			<!-- Checkbox prefix -->
			<button
				type="button"
				class="checkbox-btn"
				class:checked={task.status === 'completed'}
				onclick={(e) => {
					e.stopPropagation();
					onToggleComplete(task);
				}}
				aria-label={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
			>
				{#if task.status === 'completed'}
					<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				{/if}
			</button>

			<!-- Task Content (Click to view details in side panel) -->
			<button
				type="button"
				class="task-content-btn"
				onclick={() => onSelectTask(task)}
				aria-label={`View details for ${task.title}`}
			>
				<div class="task-header-line">
					<span class="task-title" class:line-through={task.status === 'completed'}>
						{task.title}
					</span>
					<div class="task-badges">
						<!-- Priority Tag -->
						<span class="badge priority-{task.priority}">
							{task.priority}
						</span>
						<!-- Status Tag -->
						{#if task.status === 'in_progress'}
							<span class="badge badge-in-progress">In Progress</span>
						{/if}
						<!-- Task Tags -->
						{#if task.tags && task.tags.length > 0}
							{#each task.tags as tag}
								<span class="badge badge-tag">#{tag}</span>
							{/each}
						{/if}
					</div>
				</div>
			</button>

			<!-- Task Suffix Actions -->
			<div class="task-suffix">
				<button
					type="button"
					class="delete-btn"
					onclick={(e) => {
						e.stopPropagation();
						onDeleteTask(task.id);
					}}
					aria-label="Delete task"
					title="Delete task"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
						<polyline points="3 6 5 6 21 6" />
						<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
					</svg>
				</button>
			</div>
		</div>
	{/each}
</div>

<style>
	.list-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.task-row {
		display: flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		transition: border-color 0.15s ease, background-color 0.15s ease;
		gap: 0.75rem;
	}

	.task-row:hover {
		border-color: var(--border-focus);
	}

	.task-row.selected {
		border-color: var(--primary);
		background-color: var(--bg-tertiary);
	}

	.task-row.completed {
		opacity: 0.65;
		background-color: var(--bg-tertiary);
	}

	.task-row.is-subtask {
		position: relative;
		border-left: 2px solid var(--border-subtle);
		background-color: color-mix(in srgb, var(--bg-secondary) 95%, var(--bg-primary) 5%);
	}

	.task-row.is-subtask:hover {
		border-left-color: var(--primary);
	}

	.tree-branch-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		flex-shrink: 0;
		opacity: 0.7;
	}

	.tree-branch-indicator svg {
		width: 14px;
		height: 14px;
	}

	.checkbox-btn {
		width: 18px;
		height: 18px;
		border-radius: var(--radius-sm);
		border: 1.5px solid var(--border-subtle);
		background-color: var(--bg-primary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		padding: 0;
		transition: all 0.15s ease;
	}

	.checkbox-btn:hover {
		border-color: var(--primary);
	}

	.checkbox-btn.checked {
		background-color: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.check-icon {
		width: 12px;
		height: 12px;
	}

	.task-content-btn {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		background: transparent;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		color: inherit;
	}

	.task-header-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.task-title {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--text-primary);
		line-height: 1.3;
	}

	.task-title.line-through {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.task-badges {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.badge {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius-sm);
	}

	.priority-urgent {
		background-color: #fee2e2;
		color: var(--danger);
	}

	.priority-high {
		background-color: #fef3c7;
		color: #b45309;
	}

	.priority-normal {
		background-color: var(--bg-surface);
		color: var(--text-secondary);
	}

	.priority-low {
		background-color: var(--bg-tertiary);
		color: var(--text-muted);
	}

	.badge-in-progress {
		background-color: #e0f2fe;
		color: #0369a1;
	}

	.badge-tag {
		background-color: var(--bg-tertiary);
		color: var(--primary);
		border: 1px solid var(--border-subtle);
		text-transform: none;
		font-weight: 500;
	}

	.task-suffix {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.task-row:hover .task-suffix {
		opacity: 1;
	}

	.delete-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		width: 24px;
		height: 24px;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.delete-btn:hover {
		color: var(--danger);
		background-color: #fee2e2;
	}

	.delete-btn svg {
		width: 14px;
		height: 14px;
	}
</style>
