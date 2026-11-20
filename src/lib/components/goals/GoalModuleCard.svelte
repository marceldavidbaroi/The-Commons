<script lang="ts">
	import type { GoalModuleStatus, GoalModuleWithTasks, GoalTaskStatus } from '$lib/types/goals';

	interface Props {
		module: GoalModuleWithTasks;
		onDeleteModule: (moduleId: number) => void;
		onAddTask: (moduleId: number, title: string, estimatedMinutes: number) => Promise<void>;
		onLoadMoreTasks: (moduleId: number) => Promise<void>;
	}

	let { module, onDeleteModule, onAddTask, onLoadMoreTasks }: Props = $props();

	let newTaskTitle = $state('');
	let newTaskMinutes = $state(60);
	let addingTask = $state(false);
	let loadingMore = $state(false);
	let expandedNotes = $state<Record<number, boolean>>({});

	const MODULE_STATUSES: GoalModuleStatus[] = ['pending', 'in_progress', 'completed', 'deferred'];
	const TASK_STATUSES: GoalTaskStatus[] = ['todo', 'in_progress', 'done', 'cut'];

	async function handleAddTask(e: SubmitEvent) {
		e.preventDefault();
		const trimmed = newTaskTitle.trim();
		if (!trimmed || addingTask) return;
		addingTask = true;
		try {
			const mins = Math.min(240, Math.max(15, Number(newTaskMinutes) || 60));
			await onAddTask(module.id, trimmed, mins);
			newTaskTitle = '';
			newTaskMinutes = 60;
		} finally {
			addingTask = false;
		}
	}

	async function handleLoadMore() {
		if (loadingMore) return;
		loadingMore = true;
		try {
			await onLoadMoreTasks(module.id);
		} finally {
			loadingMore = false;
		}
	}

	function removeTask(taskId: number) {
		module.tasks = module.tasks.filter((t) => t.id !== taskId);
	}

	function toggleNote(taskId: number) {
		expandedNotes = { ...expandedNotes, [taskId]: !expandedNotes[taskId] };
	}
</script>

<div class="goals-module-card">
	<div class="goals-module-header">
		<div class="goals-module-header-top">
			<input
				type="text"
				bind:value={module.title}
				placeholder="Module title"
				class="goals-module-title"
			/>
			<select
				bind:value={module.status}
				aria-label="Module status"
				class="goals-select-auto"
			>
				{#each MODULE_STATUSES as st}
					<option value={st}>{st.replace('_', ' ')}</option>
				{/each}
			</select>
			<button
				type="button"
				onclick={() => onDeleteModule(module.id)}
				aria-label="Delete module"
				class="goals-btn-icon"
			>
				Delete
			</button>
		</div>
		<input
			type="text"
			value={module.description ?? ''}
			oninput={(e) => (module.description = e.currentTarget.value || null)}
			placeholder="Optional scope notes..."
			class="goals-module-desc"
		/>
	</div>

	<div>
		{#if module.tasks.length === 0}
			<p class="goals-muted" style="padding: 12px 16px;">No tasks in this module yet.</p>
		{:else}
			{#each module.tasks as task (task.id)}
				<div class="goals-task-row">
					<div class="goals-task-main">
						<select
							bind:value={task.status}
							aria-label="Task status"
							class="goals-select-auto"
							style="padding: 3px 6px; font-size: 0.75rem;"
						>
							{#each TASK_STATUSES as st}
								<option value={st}>{st.replace('_', ' ')}</option>
							{/each}
						</select>

						<input
							type="text"
							bind:value={task.title}
							class="goals-inline-input {task.status === 'cut' ? 'goals-task-cut' : ''}"
						/>

						<div class="goals-task-meta">
							<label style="display: flex; align-items: center; gap: 4px;" title="Estimated minutes (15-240)">
								<span>Est:</span>
								<input
									type="number"
									min="15"
									max="240"
									step="15"
									bind:value={task.estimated_minutes}
									class="goals-num-input {task.estimated_minutes > 180 ? 'is-warning' : ''}"
								/>
								<span>m</span>
							</label>

							<label style="display: flex; align-items: center; gap: 4px;" title="Actual minutes">
								<span>Act:</span>
								<input
									type="number"
									min="0"
									step="15"
									value={task.actual_minutes ?? 0}
									oninput={(e) => (task.actual_minutes = Number(e.currentTarget.value) || 0)}
									class="goals-num-input"
								/>
								<span>m</span>
							</label>

							<input
								type="date"
								value={task.due_date ?? ''}
								oninput={(e) => (task.due_date = e.currentTarget.value || null)}
								aria-label="Task due date"
								class="goals-date-sm"
							/>

							<button
								type="button"
								onclick={() => toggleNote(task.id)}
								class="goals-btn-secondary goals-btn-sm"
							>
								{expandedNotes[task.id] ? 'Hide note' : 'Note'}
							</button>

							<button
								type="button"
								onclick={() => removeTask(task.id)}
								aria-label="Delete task"
								class="goals-btn-icon"
							>
								✕
							</button>
						</div>
					</div>

					{#if expandedNotes[task.id]}
						<div style="margin-top: 8px; padding-left: 8px;">
							<textarea
								rows="2"
								value={task.acceptance_note ?? ''}
								oninput={(e) => (task.acceptance_note = e.currentTarget.value || null)}
								placeholder="Acceptance note / verification details..."
								class="goals-textarea"
								style="font-size: 0.75rem;"
							></textarea>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	{#if module.hasMoreTasks}
		<div class="goals-load-more">
			<button
				type="button"
				onclick={handleLoadMore}
				disabled={loadingMore}
				class="goals-btn-secondary goals-btn-sm"
			>
				{loadingMore ? 'Loading tasks...' : 'Load more tasks'}
			</button>
		</div>
	{/if}

	<form onsubmit={handleAddTask} class="goals-module-footer">
		<input
			type="text"
			bind:value={newTaskTitle}
			placeholder="+ Add Task..."
			class="goals-input"
			style="flex: 1;"
		/>
		<input
			type="number"
			min="15"
			max="240"
			step="15"
			bind:value={newTaskMinutes}
			aria-label="Estimated minutes"
			class="goals-num-input"
		/>
		<span class="goals-muted" style="font-size: 0.75rem;">m</span>
		<button
			type="submit"
			disabled={!newTaskTitle.trim() || addingTask}
			class="goals-btn-primary goals-btn-sm"
		>
			{addingTask ? 'Adding...' : 'Add'}
		</button>
	</form>
</div>
