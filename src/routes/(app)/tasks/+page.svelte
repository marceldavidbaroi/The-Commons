<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';
	import { fetchUserProfile } from '$lib/services/member-service';
	import TaskSidePanel from '$lib/components/TaskSidePanel.svelte';
	import TagManagementSidePanel from '$lib/components/TagManagementSidePanel.svelte';
	import TagSelectorPanel from '$lib/components/TagSelectorPanel.svelte';
	import TaskToolbar from './components/TaskToolbar.svelte';
	import TaskListView from './components/TaskListView.svelte';
	import TaskTreeView from './components/TaskTreeView.svelte';
	import TaskCardView from './components/TaskCardView.svelte';
	import type { Task, TaskStatus, TaskPriority, TreeTaskItem } from './components/types';

	const supabase = getSupabaseClient();

	let tasks = $state<Task[]>([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	let statusFilter = $state<string>('all');
	let priorityFilter = $state<string>('all');
	let viewMode = $state<'list' | 'card' | 'tree'>('list');
	let currentUserId = $state<number | null>(null);

	// Collapsed task node IDs in Tree View
	let collapsedTaskIds = $state<Set<number | string>>(new Set());

	function toggleCollapse(taskId: number | string, e?: MouseEvent) {
		if (e) e.stopPropagation();
		const updated = new Set(collapsedTaskIds);
		if (updated.has(taskId)) {
			updated.delete(taskId);
		} else {
			updated.add(taskId);
		}
		collapsedTaskIds = updated;
	}

	function expandAll() {
		collapsedTaskIds = new Set();
	}

	function collapseAll() {
		const parentIds = tasks
			.filter((t) => tasks.some((c) => c.parent_id === t.id))
			.map((t) => t.id);
		collapsedTaskIds = new Set(parentIds);
	}

	// Side panel state
	let selectedTaskId = $state<number | string | null>(null);
	let selectedTask = $derived(tasks.find((t) => t.id === selectedTaskId) || null);
	let panelMode = $state<'create' | 'edit'>('edit');
	let initialParentId = $state<number | string | null>(null);
	let isPanelOpen = $state(false);

	// Tag Management & Selector Panel state
	let isTagPanelOpen = $state(false);
	let isTagSelectorOpen = $state(false);

	function openNewTaskPanel(parentId?: number | string | null | Event) {
		selectedTaskId = null;
		initialParentId = typeof parentId === 'number' || typeof parentId === 'string' ? parentId : null;
		panelMode = 'create';
		isPanelOpen = true;
	}

	function handleOpenNewSubtask(parentTaskId: number | string) {
		openNewTaskPanel(parentTaskId);
	}

	function handleOpenNewParentTask() {
		openNewTaskPanel(null);
	}

	function openTaskDetails(task: Task) {
		selectedTaskId = task.id;
		initialParentId = null;
		panelMode = 'edit';
		isPanelOpen = true;
	}

	function closePanel() {
		isPanelOpen = false;
		initialParentId = null;
	}

	// Load user & tasks
	async function loadTasks() {
		isLoading = true;
		try {
			const profile = await fetchUserProfile();
			if (profile) {
				currentUserId = profile.id;
				const { data, error } = await supabase
					.from('tasks')
					.select('*')
					.eq('user_id', profile.id)
					.order('created_at', { ascending: false });

				if (error) throw error;
				tasks = (data as Task[]) || [];
			} else {
				// Fallback mock tasks with clean numeric IDs and parent-child hierarchy
				tasks = [
					{
						id: 1,
						user_id: 'mock-user',
						parent_id: null,
						title: 'Review quarterly architecture roadmap',
						description: 'Ensure all service boundaries adhere to single source of truth.',
						status: 'in_progress',
						priority: 'high',
						tags: ['Architecture', 'Review'],
						scheduled_date: '2026-09-30',
						due_date: null,
						completed_at: null,
						created_at: new Date().toISOString()
					},
					{
						id: 2,
						user_id: 'mock-user',
						parent_id: 1,
						title: 'Refactor diary entries table query joins',
						description: 'Replace RPC dual-track queries with direct Supabase builders.',
						status: 'todo',
						priority: 'normal',
						tags: ['Engineering'],
						scheduled_date: null,
						due_date: null,
						completed_at: null,
						created_at: new Date().toISOString()
					},
					{
						id: 3,
						user_id: 'mock-user',
						parent_id: 1,
						title: 'Audit performance metrics & bundle sizes',
						description: 'Verify 60fps rendering and zero blur backdrop overhead.',
						status: 'completed',
						priority: 'normal',
						tags: ['Performance'],
						scheduled_date: null,
						due_date: null,
						completed_at: new Date().toISOString(),
						created_at: new Date().toISOString()
					},
					{
						id: 4,
						user_id: 'mock-user',
						parent_id: null,
						title: 'Update design system tokens for high-contrast dark mode',
						description: 'Harmonize quiet denim color palette with accessible contrast.',
						status: 'todo',
						priority: 'low',
						tags: ['Design'],
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
		try {
			const savedMode = localStorage.getItem('commons_tasks_view_mode');
			if (savedMode === 'list' || savedMode === 'card' || savedMode === 'tree') {
				viewMode = savedMode;
			}
		} catch (err) {
			// Ignore storage errors
		}
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

		if (currentUserId && task.id !== undefined && task.id !== null) {
			try {
				const { error } = await supabase
					.from('tasks')
					.update({
						status: nextStatus,
						completed_at: nextCompletedAt
					})
					.eq('id', Number(task.id));

				if (error) {
					console.error('Failed to update task status:', error);
					loadTasks();
				}
			} catch (err) {
				console.error('Error toggling task:', err);
				loadTasks();
			}
		}
	}

	// Generate next numeric ID for mock tasks
	function getNextMockNumericId(): number {
		const numericIds = tasks
			.map((t) => (typeof t.id === 'number' ? t.id : parseInt(String(t.id), 10)))
			.filter((n) => !isNaN(n));
		return numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
	}

	async function handleCreateTask(newTaskData: {
		title: string;
		parent_id?: number | string | null;
		description: string | null;
		status: TaskStatus;
		priority: TaskPriority;
		tags: string[];
		scheduled_date: string | null;
		due_date: string | null;
	}) {
		const taskPayload = {
			title: newTaskData.title.trim(),
			parent_id: newTaskData.parent_id ? Number(newTaskData.parent_id) : null,
			description: newTaskData.description,
			priority: newTaskData.priority,
			status: newTaskData.status,
			tags: newTaskData.tags,
			scheduled_date: newTaskData.scheduled_date,
			due_date: newTaskData.due_date
		};

		if (currentUserId) {
			try {
				const { data, error } = await supabase
					.from('tasks')
					.insert({
						title: taskPayload.title,
						parent_id: taskPayload.parent_id,
						description: taskPayload.description,
						priority: taskPayload.priority,
						status: taskPayload.status,
						scheduled_date: taskPayload.scheduled_date,
						due_date: taskPayload.due_date,
						user_id: currentUserId
					})
					.select()
					.single();

				if (error) throw error;
				if (data) {
					const createdTask = { ...(data as Task), tags: taskPayload.tags };
					tasks = [createdTask, ...tasks];
				}
			} catch (err) {
				console.error('Failed to add task:', err);
			}
		} else {
			// Mock insert with numeric ID
			const mockTask: Task = {
				id: getNextMockNumericId(),
				user_id: 0,
				parent_id: taskPayload.parent_id,
				title: taskPayload.title,
				description: taskPayload.description,
				status: taskPayload.status,
				priority: taskPayload.priority,
				tags: taskPayload.tags,
				scheduled_date: taskPayload.scheduled_date,
				due_date: taskPayload.due_date,
				completed_at: null,
				created_at: new Date().toISOString()
			};
			tasks = [mockTask, ...tasks];
		}
	}

	async function handleAddChildTask(parentTaskId: number | string, childTitle: string) {
		const parent = tasks.find((t) => t.id === parentTaskId);
		await handleCreateTask({
			title: childTitle,
			parent_id: parentTaskId,
			description: null,
			status: 'todo',
			priority: parent?.priority || 'normal',
			tags: parent?.tags ? [...parent.tags] : [],
			scheduled_date: parent?.scheduled_date || new Date().toISOString().split('T')[0],
			due_date: parent?.due_date || null
		});
	}

	async function handleDeleteTask(taskId: number | string) {
		tasks = tasks.filter((t) => t.id !== taskId && t.parent_id !== taskId);
		if (selectedTaskId === taskId) {
			isPanelOpen = false;
			selectedTaskId = null;
		}
		if (currentUserId && taskId !== undefined && taskId !== null) {
			try {
				const { error } = await supabase.from('tasks').delete().eq('id', Number(taskId));
				if (error) {
					console.error('Failed to delete task in database:', error);
					loadTasks();
				}
			} catch (err) {
				console.error('Error deleting task:', err);
				loadTasks();
			}
		}
	}

	async function handleUpdateTask(updatedTask: Task) {
		tasks = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));

		if (currentUserId && updatedTask.id !== undefined && updatedTask.id !== null) {
			try {
				const { error } = await supabase
					.from('tasks')
					.update({
						title: updatedTask.title,
						parent_id: updatedTask.parent_id ? Number(updatedTask.parent_id) : null,
						description: updatedTask.description,
						status: updatedTask.status,
						priority: updatedTask.priority,
						scheduled_date: updatedTask.scheduled_date,
						due_date: updatedTask.due_date,
						completed_at: updatedTask.completed_at
					})
					.eq('id', Number(updatedTask.id));

				if (error) {
					console.error('Failed to update task:', error);
					loadTasks();
				}
			} catch (err) {
				console.error('Error updating task:', err);
				loadTasks();
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

	// Hierarchical tree flattened for list view
	const treeTasks = $derived.by(() => {
		const result: TreeTaskItem[] = [];
		const taskMap = new Map<number | string, Task>();
		const childrenMap = new Map<number | string, Task[]>();

		tasks.forEach((t) => {
			taskMap.set(t.id, t);
		});

		filteredTasks.forEach((t) => {
			if (t.parent_id && taskMap.has(t.parent_id)) {
				const current = childrenMap.get(t.parent_id) || [];
				current.push(t);
				childrenMap.set(t.parent_id, current);
			}
		});

		const visited = new Set<number | string>();

		function traverse(task: Task, depth: number) {
			if (visited.has(task.id)) return;
			visited.add(task.id);

			const children = childrenMap.get(task.id) || [];
			result.push({
				task,
				depth,
				hasChildren: children.length > 0,
				childCount: children.length,
				isCollapsed: false
			});

			children.forEach((child) => {
				traverse(child, depth + 1);
			});
		}

		// Top-level tasks
		filteredTasks.forEach((t) => {
			if (!t.parent_id || !taskMap.has(t.parent_id)) {
				traverse(t, 0);
			}
		});

		// Fallback for any remaining unvisited filtered tasks
		filteredTasks.forEach((t) => {
			if (!visited.has(t.id)) {
				traverse(t, 0);
			}
		});

		return result;
	});

	// Collapsible Tree View nodes
	const treeViewNodes = $derived.by(() => {
		const result: TreeTaskItem[] = [];
		const taskMap = new Map<number | string, Task>();
		const childrenMap = new Map<number | string, Task[]>();

		tasks.forEach((t) => {
			taskMap.set(t.id, t);
		});

		tasks.forEach((t) => {
			if (t.parent_id && taskMap.has(t.parent_id)) {
				const current = childrenMap.get(t.parent_id) || [];
				current.push(t);
				childrenMap.set(t.parent_id, current);
			}
		});

		const matchingTaskIds = new Set(filteredTasks.map((t) => t.id));
		const visibleInTree = new Set<number | string>();

		function markVisibleAncestors(id: number | string) {
			visibleInTree.add(id);
			const t = taskMap.get(id);
			if (t?.parent_id && taskMap.has(t.parent_id)) {
				markVisibleAncestors(t.parent_id);
			}
		}

		matchingTaskIds.forEach((id) => markVisibleAncestors(id));

		const visited = new Set<number | string>();

		function traverseTree(task: Task, depth: number) {
			if (visited.has(task.id)) return;
			visited.add(task.id);

			const allChildren = childrenMap.get(task.id) || [];
			const isSearchingOrFiltering =
				!!searchQuery.trim() || statusFilter !== 'all' || priorityFilter !== 'all';
			const visibleChildren = isSearchingOrFiltering
				? allChildren.filter((c) => visibleInTree.has(c.id))
				: allChildren;

			const isCollapsed = collapsedTaskIds.has(task.id);

			result.push({
				task,
				depth,
				hasChildren: visibleChildren.length > 0,
				childCount: visibleChildren.length,
				isCollapsed
			});

			if (!isCollapsed && visibleChildren.length > 0) {
				visibleChildren.forEach((child) => {
					traverseTree(child, depth + 1);
				});
			}
		}

		tasks.forEach((t) => {
			const isRoot = !t.parent_id || !taskMap.has(t.parent_id);
			if (isRoot && visibleInTree.has(t.id)) {
				traverseTree(t, 0);
			}
		});

		tasks.forEach((t) => {
			if (!visited.has(t.id) && visibleInTree.has(t.id)) {
				traverseTree(t, 0);
			}
		});

		return result;
	});
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
		<div class="header-actions">
			<button
				type="button"
				class="btn btn-secondary"
				onclick={() => (isTagPanelOpen = true)}
			>
				<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
					<line x1="7" y1="7" x2="7.01" y2="7" />
				</svg>
				<span>Tag Management</span>
			</button>
			<button
				type="button"
				class="btn btn-primary"
				onclick={openNewTaskPanel}
			>
				<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>New Task</span>
			</button>
		</div>
	</div>

	<!-- Tier 2: Unified Compact Toolbar -->
	<TaskToolbar
		bind:searchQuery
		bind:statusFilter
		bind:priorityFilter
		bind:viewMode
		{statusCounts}
		totalFiltered={filteredTasks.length}
		onExpandAll={expandAll}
		onCollapseAll={collapseAll}
	/>

	<!-- Task Ledger Canvas (List or Card View) -->
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
						onclick={openNewTaskPanel}
					>
						+ Create Task
					</button>
				{/if}
			</div>
		{:else if viewMode === 'list'}
			<TaskListView
				{treeTasks}
				{selectedTaskId}
				{isPanelOpen}
				onToggleComplete={handleToggleComplete}
				onSelectTask={openTaskDetails}
				onDeleteTask={handleDeleteTask}
			/>
		{:else if viewMode === 'tree'}
			<TaskTreeView
				{treeViewNodes}
				{selectedTaskId}
				{isPanelOpen}
				onToggleCollapse={toggleCollapse}
				onToggleComplete={handleToggleComplete}
				onSelectTask={openTaskDetails}
				onAddSubtask={handleOpenNewSubtask}
				onDeleteTask={handleDeleteTask}
			/>
		{:else}
			<TaskCardView
				tasks={filteredTasks}
				{selectedTaskId}
				{isPanelOpen}
				onToggleComplete={handleToggleComplete}
				onSelectTask={openTaskDetails}
				onDeleteTask={handleDeleteTask}
			/>
		{/if}
	</div>

	<!-- Task Side Panel -->
	<TaskSidePanel
		task={selectedTask}
		allTasks={tasks}
		isOpen={isPanelOpen}
		mode={panelMode}
		{initialParentId}
		onClose={closePanel}
		onCreate={handleCreateTask}
		onAddChildTask={handleAddChildTask}
		onOpenNewSubtask={handleOpenNewSubtask}
		onOpenNewParentTask={handleOpenNewParentTask}
		onSelectTask={openTaskDetails}
		onSave={handleUpdateTask}
		onDelete={handleDeleteTask}
	/>

	<!-- Feature-Scoped Tag Selector Side Panel (Generic Reusable) -->
	<TagSelectorPanel
		feature="tasks"
		title="Task Tags"
		description="Select or add tags for this task"
		isOpen={isTagSelectorOpen}
		selectedTags={selectedTask?.tags || []}
		onClose={() => (isTagSelectorOpen = false)}
		onSave={async (newTags) => {
			if (selectedTask) {
				await handleUpdateTask({
					...selectedTask,
					tags: newTags
				});
			}
		}}
	/>

	<!-- Feature-Scoped Tag Management Side Panel -->
	<TagManagementSidePanel
		feature="tasks"
		isOpen={isTagPanelOpen}
		onClose={() => (isTagPanelOpen = false)}
	/>
</div>

<style>
	.tasks-page {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		width: 100%;
	}

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

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.tasks-container {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

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

	.btn.compact {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
	}
</style>
