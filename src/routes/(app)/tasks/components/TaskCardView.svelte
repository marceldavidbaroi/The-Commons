<script lang="ts">
	import type { Task } from './types';

	let {
		tasks,
		selectedTaskId,
		isPanelOpen,
		onToggleComplete,
		onSelectTask,
		onDeleteTask
	}: {
		tasks: Task[];
		selectedTaskId: number | string | null;
		isPanelOpen: boolean;
		onToggleComplete: (task: Task) => void;
		onSelectTask: (task: Task) => void;
		onDeleteTask: (taskId: number | string) => void;
	} = $props();
</script>

<div class="card-grid">
	{#each tasks as task (task.id)}
		<div
			class="task-card"
			class:completed={task.status === 'completed'}
			class:selected={isPanelOpen && selectedTaskId === task.id}
		>
			<!-- Card Top Line -->
			<div class="card-header-line">
				<!-- Checkbox -->
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

				<div class="card-badges">
					<span class="badge priority-{task.priority}">
						{task.priority}
					</span>
					{#if task.status === 'in_progress'}
						<span class="badge badge-in-progress">In Progress</span>
					{/if}
				</div>

				<!-- Delete button -->
				<button
					type="button"
					class="delete-btn card-delete"
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

			<!-- Card Interactive Main Area -->
			<button
				type="button"
				class="card-body-btn"
				onclick={() => onSelectTask(task)}
				aria-label={`View details for ${task.title}`}
			>
				<h4 class="card-title" class:line-through={task.status === 'completed'}>
					{task.title}
				</h4>

				{#if task.tags && task.tags.length > 0}
					<div class="card-tags">
						{#each task.tags as tag}
							<span class="card-tag-pill">#{tag}</span>
						{/each}
					</div>
				{/if}
			</button>

			<!-- Card Footer (Dates / Meta) -->
			{#if task.scheduled_date || task.due_date}
				<div class="card-footer">
					{#if task.scheduled_date}
						<span class="card-date-meta">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="4" width="18" height="18" rx="2" />
								<line x1="16" y1="2" x2="16" y2="6" />
								<line x1="8" y1="2" x2="8" y2="6" />
								<line x1="3" y1="10" x2="21" y2="10" />
							</svg>
							{task.scheduled_date}
						</span>
					{/if}
					{#if task.due_date}
						<span class="card-date-meta due">
							Due {task.due_date.split('T')[0]}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 0.75rem;
		width: 100%;
	}

	.task-card {
		display: flex;
		flex-direction: column;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.875rem;
		gap: 0.625rem;
		transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
		position: relative;
	}

	.task-card:hover {
		border-color: var(--border-focus);
		transform: translateY(-1px);
	}

	.task-card.selected {
		border-color: var(--primary);
		background-color: var(--bg-tertiary);
	}

	.task-card.completed {
		opacity: 0.65;
		background-color: var(--bg-tertiary);
	}

	.card-header-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.card-badges {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex: 1;
	}

	.card-delete {
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.task-card:hover .card-delete {
		opacity: 1;
	}

	.card-body-btn {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		background: transparent;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		color: inherit;
		width: 100%;
	}

	.card-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.35;
		letter-spacing: -0.01em;
	}

	.card-title.line-through {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.card-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.card-tag-pill {
		font-size: 0.6875rem;
		color: var(--primary);
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius-sm);
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.card-date-meta {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.card-date-meta svg {
		width: 12px;
		height: 12px;
	}

	.card-date-meta.due {
		color: var(--accent);
		font-weight: 500;
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
