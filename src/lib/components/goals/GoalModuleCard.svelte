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

<div class="rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
	<!-- Module Header -->
	<div class="border-b border-stone-200 p-4 dark:border-stone-800">
		<div class="flex flex-wrap items-center gap-2.5">
			<input
				type="text"
				bind:value={module.title}
				placeholder="Module title"
				class="min-w-0 flex-1 border-b border-transparent bg-transparent text-base font-semibold text-stone-900 focus:border-stone-400 focus:outline-none dark:text-stone-100"
			/>
			<select
				bind:value={module.status}
				aria-label="Module status"
				class="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
			>
				{#each MODULE_STATUSES as st}
					<option value={st}>{st.replace('_', ' ')}</option>
				{/each}
			</select>
			<button
				type="button"
				onclick={() => onDeleteModule(module.id)}
				aria-label="Delete module"
				class="rounded px-2 py-1 text-xs text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
			>
				Delete
			</button>
		</div>
		<input
			type="text"
			value={module.description ?? ''}
			oninput={(e) => (module.description = e.currentTarget.value || null)}
			placeholder="Optional scope notes..."
			class="mt-2 w-full bg-transparent text-xs text-stone-600 placeholder:text-stone-400 focus:outline-none dark:text-stone-400"
		/>
	</div>

	<!-- Tasks List -->
	<div class="divide-y divide-stone-100 dark:divide-stone-800">
		{#if module.tasks.length === 0}
			<p class="px-4 py-3 text-xs text-stone-500 dark:text-stone-400">No tasks in this module yet.</p>
		{:else}
			{#each module.tasks as task (task.id)}
				<div class="px-4 py-2">
					<div class="flex flex-wrap items-center gap-2">
						<select
							bind:value={task.status}
							aria-label="Task status"
							class="rounded border border-stone-200 bg-stone-50 px-1.5 py-1 text-xs font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300"
						>
							{#each TASK_STATUSES as st}
								<option value={st}>{st.replace('_', ' ')}</option>
							{/each}
						</select>

						<input
							type="text"
							bind:value={task.title}
							class="min-w-0 flex-1 bg-transparent text-sm text-stone-900 focus:outline-none dark:text-stone-100 {task.status === 'cut' ? 'line-through opacity-50' : ''}"
						/>

						<div class="flex items-center gap-1.5 text-xs">
							<label class="flex items-center gap-1" title="Estimated minutes (15-240)">
								<span class="text-stone-400">Est:</span>
								<input
									type="number"
									min="15"
									max="240"
									step="15"
									bind:value={task.estimated_minutes}
									class="w-14 rounded border px-1.5 py-0.5 text-right text-xs {task.estimated_minutes > 180
										? 'border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
										: 'border-stone-200 bg-white text-stone-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200'}"
								/>
								<span class="text-stone-400">m</span>
							</label>

							<label class="flex items-center gap-1" title="Actual minutes">
								<span class="text-stone-400">Act:</span>
								<input
									type="number"
									min="0"
									step="15"
									value={task.actual_minutes ?? 0}
									oninput={(e) => (task.actual_minutes = Number(e.currentTarget.value) || 0)}
									class="w-14 rounded border border-stone-200 bg-white px-1.5 py-0.5 text-right text-xs text-stone-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
								/>
								<span class="text-stone-400">m</span>
							</label>

							<input
								type="date"
								value={task.due_date ?? ''}
								oninput={(e) => (task.due_date = e.currentTarget.value || null)}
								aria-label="Task due date"
								class="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-xs text-stone-700 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300"
							/>

							<button
								type="button"
								onclick={() => toggleNote(task.id)}
								class="rounded px-1.5 py-0.5 text-xs text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
							>
								{expandedNotes[task.id] ? 'Hide note' : 'Note'}
							</button>

							<button
								type="button"
								onclick={() => removeTask(task.id)}
								aria-label="Delete task"
								class="rounded px-1.5 py-0.5 text-xs text-stone-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
							>
								✕
							</button>
						</div>
					</div>

					{#if expandedNotes[task.id]}
						<div class="mt-2 pl-2">
							<textarea
								rows="2"
								value={task.acceptance_note ?? ''}
								oninput={(e) => (task.acceptance_note = e.currentTarget.value || null)}
								placeholder="Acceptance note / verification details..."
								class="w-full rounded border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-800 focus:border-stone-400 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
							></textarea>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	{#if module.hasMoreTasks}
		<div class="border-t border-stone-100 px-4 py-2 text-center dark:border-stone-800">
			<button
				type="button"
				onclick={handleLoadMore}
				disabled={loadingMore}
				class="text-xs font-medium text-stone-600 hover:text-stone-900 disabled:opacity-50 dark:text-stone-400 dark:hover:text-stone-200"
			>
				{loadingMore ? 'Loading tasks...' : 'Load more tasks'}
			</button>
		</div>
	{/if}

	<!-- Quick-add Footer -->
	<form
		onsubmit={handleAddTask}
		class="flex items-center gap-2 border-t border-stone-200 bg-stone-50 px-4 py-2.5 dark:border-stone-800 dark:bg-stone-950/50"
	>
		<input
			type="text"
			bind:value={newTaskTitle}
			placeholder="+ Add Task..."
			class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-2.5 py-1 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
		/>
		<input
			type="number"
			min="15"
			max="240"
			step="15"
			bind:value={newTaskMinutes}
			aria-label="Estimated minutes"
			class="w-16 rounded border border-stone-300 bg-white px-2 py-1 text-right text-sm text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
		/>
		<span class="text-xs text-stone-500">m</span>
		<button
			type="submit"
			disabled={!newTaskTitle.trim() || addingTask}
			class="rounded bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
		>
			{addingTask ? 'Adding...' : 'Add'}
		</button>
	</form>
</div>
