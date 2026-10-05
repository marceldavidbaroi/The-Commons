<script lang="ts">
	import type { Task, TreeTaskItem } from './types';

	let {
		treeViewNodes,
		selectedTaskId,
		isPanelOpen,
		onToggleCollapse,
		onToggleComplete,
		onSelectTask,
		onAddSubtask,
		onDeleteTask
	}: {
		treeViewNodes: TreeTaskItem[];
		selectedTaskId: number | string | null;
		isPanelOpen: boolean;
		onToggleCollapse: (taskId: number | string, e?: MouseEvent) => void;
		onToggleComplete: (task: Task) => void;
		onSelectTask: (task: Task) => void;
		onAddSubtask: (parentTaskId: number | string) => void;
		onDeleteTask: (taskId: number | string) => void;
	} = $props();
</script>

<div class="tree-wrapper">
	{#each treeViewNodes as { task, depth, hasChildren, childCount, isCollapsed } (task.id)}
		<div
			class="tree-node-row"
			class:is-subnode={depth > 0}
			class:has-children={hasChildren}
			class:is-collapsed={isCollapsed}
			class:completed={task.status === 'completed'}
			class:selected={isPanelOpen && selectedTaskId === task.id}
			style:padding-left={`${Math.max(0.75, depth * 1.75 + 0.75)}rem`}
		>
			<!-- Branch Connection Line & Guide -->
			{#if depth > 0}
				<div class="tree-branch-line" aria-hidden="true" style:left={`${(depth - 1) * 1.75 + 1.25}rem`}></div>
				<div class="tree-branch-indicator" aria-hidden="true">
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4 0v8a3 3 0 0 0 3 3h6" />
					</svg>
				</div>
			{/if}

			<!-- Collapse / Expand Toggle Caret for Parent Nodes -->
			{#if hasChildren}
				<button
					type="button"
					class="tree-toggle-caret-btn"
					class:collapsed={isCollapsed}
					onclick={(e) => onToggleCollapse(task.id, e)}
					aria-label={isCollapsed ? `Expand ${task.title}` : `Collapse ${task.title}`}
					title={isCollapsed ? 'Expand subtasks' : 'Collapse subtasks'}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</button>
			{:else}
				<span class="tree-leaf-spacer" aria-hidden="true"></span>
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

			<!-- Task Content -->
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

					{#if hasChildren}
						<span class="subtask-tally-pill" title={`${childCount} subtasks`}>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M6 3v18" />
								<path d="M6 8h8a2 2 0 0 1 2 2v2" />
							</svg>
							{childCount} {childCount === 1 ? 'subtask' : 'subtasks'}
						</span>
					{/if}

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

			<!-- Task Suffix Actions (Add child & Delete) -->
			<div class="task-suffix">
				<button
					type="button"
					class="tree-node-action-btn"
					onclick={(e) => {
						e.stopPropagation();
						onAddSubtask(task.id);
					}}
					aria-label="Add subtask"
					title="Add subtask to this node"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					<span>Add Subtask</span>
				</button>

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
	.tree-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		position: relative;
	}

	.tree-node-row {
		position: relative;
		display: flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		transition: border-color 0.15s ease, background-color 0.15s ease;
		gap: 0.625rem;
	}

	.tree-node-row:hover {
		border-color: var(--border-focus);
	}

	.tree-node-row.selected {
		border-color: var(--primary);
		background-color: var(--bg-tertiary);
	}

	.tree-node-row.completed {
		opacity: 0.65;
		background-color: var(--bg-tertiary);
	}

	.tree-node-row.is-subnode {
		background-color: color-mix(in srgb, var(--bg-secondary) 96%, var(--bg-primary) 4%);
	}

	.tree-branch-line {
		position: absolute;
		top: -0.375rem;
		bottom: 50%;
		width: 1px;
		background-color: var(--border-subtle);
		pointer-events: none;
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

	.tree-toggle-caret-btn {
		width: 20px;
		height: 20px;
		border-radius: var(--radius-sm);
		background: transparent;
		border: none;
		color: var(--text-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition: transform 0.2s ease, background-color 0.15s ease, color 0.15s ease;
	}

	.tree-toggle-caret-btn:hover {
		background-color: var(--bg-surface);
		color: var(--text-primary);
	}

	.tree-toggle-caret-btn.collapsed {
		transform: rotate(-90deg);
	}

	.tree-toggle-caret-btn svg {
		width: 14px;
		height: 14px;
	}

	.tree-leaf-spacer {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
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

	.subtask-tally-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--primary);
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		padding: 0.0625rem 0.4375rem;
		border-radius: var(--radius-full);
	}

	.subtask-tally-pill svg {
		width: 11px;
		height: 11px;
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

	.tree-node-row:hover .task-suffix {
		opacity: 1;
	}

	.tree-node-action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		height: 24px;
		padding: 0 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.tree-node-action-btn:hover {
		background-color: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.tree-node-action-btn svg {
		width: 12px;
		height: 12px;
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
