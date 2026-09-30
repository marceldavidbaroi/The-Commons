<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';

	type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
	type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

	interface Task {
		id: string;
		user_id: string;
		title: string;
		description: string | null;
		status: TaskStatus;
		priority: TaskPriority;
		scheduled_date: string | null;
		due_date: string | null;
		completed_at: string | null;
		created_at: string;
	}

	const supabase = getSupabaseClient();

	let tasks = $state<Task[]>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	let statusFilter = $state<string>('all');
	let priorityFilter = $state<string>('all');
	let currentUserId = $state<string | null>(null);

	// Quick add form state
	let isAdding = $state(false);
	let newTitle = $state('');
	let newPriority = $state<TaskPriority>('normal');
	let isSubmitting = $state(false);

	// Load user & tasks
	async function loadTasks() {
		isLoading = true;
		try {
			const { data: userData } = await supabase.auth.getUser();
			if (userData?.user) {
				currentUserId = userData.user.id;
				const { data, error } = await supabase
					.from('tasks')
					.select('*')
					.eq('user_id', userData.user.id)
					.order('created_at', { ascending: false });

				if (error) throw error;
				tasks = (data as Task[]) || [];
			} else {
				// Fallback mock tasks for preview/development when not authenticated
				tasks = [
					{
						id: '1',
						user_id: 'mock-user',
						title: 'Review quarterly architecture roadmap',
						description: 'Ensure all service boundaries adhere to single source of truth.',
						status: 'in_progress',
						priority: 'high',
						scheduled_date: '2026-09-30',
						due_date: null,
						completed_at: null,
						created_at: new Date().toISOString()
					},
					{
						id: '2',
						user_id: 'mock-user',
						title: 'Refactor diary entries table query joins',
						description: 'Replace RPC dual-track queries with direct Supabase builders.',
						status: 'todo',
						priority: 'normal',
						scheduled_date: null,
						due_date: null,
						completed_at: null,
						created_at: new Date().toISOString()
					},
					{
						id: '3',
						user_id: 'mock-user',
						title: 'Audit performance metrics & bundle sizes',
						description: 'Verify 60fps rendering and zero blur backdrop overhead.',
						status: 'completed',
						priority: 'normal',
						scheduled_date: null,
						due_date: null,
						completed_at: new Date().toISOString(),
						created_at: new Date().toISOString()
					},
					{
						id: '4',
						user_id: 'mock-user',
						title: 'Update design system tokens for high-contrast dark mode',
						description: 'Harmonize quiet denim color palette with accessible contrast.',
						status: 'todo',
						priority: 'low',
						scheduled_date: null,
						due_date: null,
						completed_at: null,
						created_at: new Date().toISOString()
					}
				];
			}
		} catch (err) {
			console.error('Failed to load tasks:', err);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadTasks();
	});

	// Actions
	async function handleToggleComplete(task: Task) {
		const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
		const nextCompletedAt = nextStatus === 'completed' ? new Date().toISOString() : null;

		// Optimistic update
		tasks = tasks.map((t) =>
			t.id === task.id ? { ...t, status: nextStatus, completed_at: nextCompletedAt } : t
		);

		if (currentUserId && task.id.length > 5) {
			try {
				const { error } = await supabase
					.from('tasks')
					.update({
						status: nextStatus,
						completed_at: nextCompletedAt
					})
					.eq('id', task.id);

				if (error) {
					console.error('Failed to update task:', error);
					loadTasks();
				}
			} catch (err) {
				console.error('Error toggling task:', err);
				loadTasks();
			}
		}
	}

	async function handleCreateTask(e: Event) {
		e.preventDefault();
		if (!newTitle.trim() || isSubmitting) return;

		isSubmitting = true;
		const taskPayload = {
			title: newTitle.trim(),
			priority: newPriority,
			status: 'todo' as TaskStatus,
			scheduled_date: new Date().toISOString().split('T')[0]
		};

		if (currentUserId) {
			try {
				const { data, error } = await supabase
					.from('tasks')
					.insert({
						...taskPayload,
						user_id: currentUserId
					})
					.select()
					.single();

				if (error) throw error;
				if (data) {
					tasks = [data as Task, ...tasks];
				}
			} catch (err) {
				console.error('Failed to add task:', err);
			}
		} else {
			// Mock insert
			const mockTask: Task = {
				id: Math.random().toString(36).substring(2, 9),
				user_id: 'mock-user',
				title: taskPayload.title,
				description: null,
				status: 'todo',
				priority: taskPayload.priority,
				scheduled_date: taskPayload.scheduled_date,
				due_date: null,
				completed_at: null,
				created_at: new Date().toISOString()
			};
			tasks = [mockTask, ...tasks];
		}

		newTitle = '';
		isAdding = false;
		isSubmitting = false;
	}

	async function handleDeleteTask(taskId: string) {
		tasks = tasks.filter((t) => t.id !== taskId);
		if (currentUserId && taskId.length > 5) {
			try {
				await supabase.from('tasks').delete().eq('id', taskId);
			} catch (err) {
				console.error('Error deleting task:', err);
			}
		}
	}

	// Filter tabs
	const statusCounts = $derived({
		all: tasks.length,
		todo: tasks.filter((t) => t.status === 'todo').length,
		in_progress: tasks.filter((t) => t.status === 'in_progress').length,
		completed: tasks.filter((t) => t.status === 'completed').length
	});

	// Filtered tasks computation
	const filteredTasks = $derived(
		tasks.filter((task) => {
			// Search match
			const matchesSearch =
				!searchQuery.trim() ||
				task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));

			// Status filter
			const matchesStatus =
				statusFilter === 'all' ||
				(statusFilter === 'todo' && task.status === 'todo') ||
				(statusFilter === 'in_progress' && task.status === 'in_progress') ||
				(statusFilter === 'completed' && task.status === 'completed');

			// Priority filter
			const matchesPriority =
				priorityFilter === 'all' || task.priority === priorityFilter;

			return matchesSearch && matchesStatus && matchesPriority;
		})
	);
</script>

<svelte:head>
	<title>Tasks - The Commons</title>
</svelte:head>

<div class="tasks-page">
	<!-- Tier 1: Page Header & Primary Action -->
	<div class="tier-header">
		<div class="header-left">
			<h1 class="page-title">Tasks</h1>
			<span class="count-badge">{tasks.length}</span>
		</div>
		<button
			type="button"
			class="btn btn-primary"
			onclick={() => (isAdding = !isAdding)}
		>
			<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
			<span>{isAdding ? 'Close' : 'New Task'}</span>
		</button>
	</div>

	<!-- Tier 2: Unified Compact Toolbar (Search, Filter Tabs, Priority Selector, Count) -->
	<div class="tier-toolbar">
		<div class="search-box">
			<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search tasks..."
				class="search-input"
			/>
			{#if searchQuery}
				<button
					type="button"
					class="clear-search-btn"
					onclick={() => (searchQuery = '')}
					aria-label="Clear search"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			{/if}
		</div>

		<!-- Status Filter Pills -->
		<div class="filter-group">
			<button
				type="button"
				class="filter-chip"
				class:active={statusFilter === 'all'}
				onclick={() => (statusFilter = 'all')}
			>
				All <span class="chip-count">{statusCounts.all}</span>
			</button>
			<button
				type="button"
				class="filter-chip"
				class:active={statusFilter === 'todo'}
				onclick={() => (statusFilter = 'todo')}
			>
				To Do <span class="chip-count">{statusCounts.todo}</span>
			</button>
			<button
				type="button"
				class="filter-chip"
				class:active={statusFilter === 'in_progress'}
				onclick={() => (statusFilter = 'in_progress')}
			>
				In Progress <span class="chip-count">{statusCounts.in_progress}</span>
			</button>
			<button
				type="button"
				class="filter-chip"
				class:active={statusFilter === 'completed'}
				onclick={() => (statusFilter = 'completed')}
			>
				Completed <span class="chip-count">{statusCounts.completed}</span>
			</button>
		</div>

		<!-- Priority Filter Select -->
		<div class="priority-select-wrapper">
			<select bind:value={priorityFilter} class="priority-select">
				<option value="all">All Priorities</option>
				<option value="urgent">Urgent</option>
				<option value="high">High</option>
				<option value="normal">Normal</option>
				<option value="low">Low</option>
			</select>
		</div>

		<div class="tally-count">
			{filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
		</div>
	</div>

	<!-- Quick Add Inline Card (if active) -->
	{#if isAdding}
		<form class="quick-add-form" onsubmit={handleCreateTask}>
			<input
				type="text"
				bind:value={newTitle}
				placeholder="What needs to be done?"
				class="quick-add-input"
			/>
			<div class="quick-add-controls">
				<select bind:value={newPriority} class="priority-select compact">
					<option value="low">Low</option>
					<option value="normal">Normal</option>
					<option value="high">High</option>
					<option value="urgent">Urgent</option>
				</select>
				<div class="quick-add-actions">
					<button
						type="button"
						class="btn btn-ghost"
						onclick={() => {
							isAdding = false;
							newTitle = '';
						}}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="btn btn-primary compact"
						disabled={!newTitle.trim() || isSubmitting}
					>
						{isSubmitting ? 'Adding...' : 'Add Task'}
					</button>
				</div>
			</div>
		</form>
	{/if}

	<!-- Task Ledger List View -->
	<div class="tasks-container">
		{#if isLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<span>Loading tasks...</span>
			</div>
		{:else if filteredTasks.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<rect x="3" y="4" width="18" height="18" rx="2" />
						<path d="M9 12l2 2 4-4" />
					</svg>
				</div>
				<h3 class="empty-title">
					{searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
						? 'No matching tasks found'
						: 'No tasks yet'}
				</h3>
				<p class="empty-desc">
					{searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
						? 'Try changing or clearing your search and filters.'
						: 'Create your first task to start organizing your day.'}
				</p>
				{#if searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'}
					<button
						type="button"
						class="btn btn-secondary compact"
						onclick={() => {
							searchQuery = '';
							statusFilter = 'all';
							priorityFilter = 'all';
						}}
					>
						Clear Filters
					</button>
				{:else}
					<button
						type="button"
						class="btn btn-primary compact"
						onclick={() => (isAdding = true)}
					>
						+ Create Task
					</button>
				{/if}
			</div>
		{:else}
			<div class="list-wrapper">
				{#each filteredTasks as task (task.id)}
					<div
						class="task-row"
						class:completed={task.status === 'completed'}
					>
						<!-- Checkbox prefix -->
						<button
							type="button"
							class="checkbox-btn"
							class:checked={task.status === 'completed'}
							onclick={() => handleToggleComplete(task)}
							aria-label={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}
						>
							{#if task.status === 'completed'}
								<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
									<polyline points="20 6 9 17 4 12" />
								</svg>
							{/if}
						</button>

						<!-- Task Content -->
						<div class="task-content">
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
								</div>
							</div>
							{#if task.description}
								<p class="task-description">{task.description}</p>
							{/if}
						</div>

						<!-- Task Suffix Actions -->
						<div class="task-suffix">
							<button
								type="button"
								class="delete-btn"
								onclick={() => handleDeleteTask(task.id)}
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
		{/if}
	</div>
</div>

<style>
	.tasks-page {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		width: 100%;
	}

	/* =========================================================================
	   TIER 1: PAGE HEADER (~40-44px)
	   ========================================================================= */
	.tier-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 40px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.page-title {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		line-height: 1;
	}

	.count-badge {
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--font-mono);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
	}

	/* =========================================================================
	   TIER 2: UNIFIED INTERACTIVE TOOLBAR (~36-40px)
	   ========================================================================= */
	.tier-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.625rem;
		padding-bottom: 0.25rem;
	}

	.search-box {
		position: relative;
		flex: 1;
		min-width: 180px;
		max-width: 280px;
	}

	.search-icon {
		position: absolute;
		left: 0.625rem;
		top: 50%;
		transform: translateY(-50%);
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		height: 32px;
		padding-left: 2rem;
		padding-right: 1.75rem;
		font-size: 0.8125rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--border-focus);
	}

	.clear-search-btn {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 16px;
		height: 16px;
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
	}

	.clear-search-btn:hover {
		color: var(--text-primary);
	}

	.clear-search-btn svg {
		width: 12px;
		height: 12px;
	}

	/* Filter Pills */
	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		height: 32px;
		padding: 0 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.filter-chip:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.filter-chip.active {
		background-color: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
		font-weight: 600;
	}

	.chip-count {
		font-size: 0.6875rem;
		opacity: 0.85;
	}

	.priority-select-wrapper {
		position: relative;
	}

	.priority-select {
		height: 32px;
		padding: 0 0.625rem;
		font-size: 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		cursor: pointer;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.priority-select:focus {
		border-color: var(--border-focus);
	}

	.priority-select.compact {
		height: 28px;
		padding: 0 0.5rem;
		font-size: 0.75rem;
	}

	.tally-count {
		font-size: 0.75rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
		margin-left: auto;
		white-space: nowrap;
	}

	/* =========================================================================
	   QUICK ADD FORM
	   ========================================================================= */
	.quick-add-form {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
	}

	.quick-add-input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		font-size: 0.875rem;
		color: var(--text-primary);
	}

	.quick-add-input::placeholder {
		color: var(--text-muted);
	}

	.quick-add-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid var(--border-subtle);
		padding-top: 0.5rem;
	}

	.quick-add-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* =========================================================================
	   TASK LIST ITEMS (COMPACT 42-48px)
	   ========================================================================= */
	.tasks-container {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

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

	.task-row.completed {
		opacity: 0.65;
		background-color: var(--bg-tertiary);
	}

	/* Checkbox button */
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

	/* Task Content */
	.task-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
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

	.task-description {
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Task Suffix Actions */
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

	/* =========================================================================
	   EMPTY & LOADING STATES
	   ========================================================================= */
	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		background-color: var(--bg-secondary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-md);
		text-align: center;
		gap: 0.625rem;
	}

	.loading-state {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border-subtle);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-icon {
		width: 36px;
		height: 36px;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.empty-icon svg {
		width: 100%;
		height: 100%;
	}

	.empty-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.empty-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		max-width: 320px;
	}

	/* =========================================================================
	   BUTTONS
	   ========================================================================= */
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

	.btn-icon {
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

	.btn-ghost {
		background: transparent;
		color: var(--text-secondary);
	}

	.btn-ghost:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.btn.compact {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
	}

	@media (max-width: 640px) {
		.tier-toolbar {
			flex-direction: column;
			align-items: stretch;
		}

		.search-box {
			max-width: 100%;
		}

		.filter-group {
			overflow-x: auto;
			padding-bottom: 0.25rem;
		}

		.tally-count {
			margin-left: 0;
			text-align: right;
		}
	}
</style>
