<script lang="ts">
	import { onMount } from 'svelte';
	import { getSupabaseClient } from '$lib/supabase';
	import { fetchUserProfile } from '$lib/services/member-service';
	import TaskSidePanel, { type Task as TaskType } from '$lib/components/TaskSidePanel.svelte';
	import TagManagementSidePanel from '$lib/components/TagManagementSidePanel.svelte';
	import type { TagCategory } from '$lib/types/tags';

	type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
	type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

	interface Task {
		id: number | string;
		user_id: number | string;
		parent_id?: number | string | null;
		title: string;
		description: string | null;
		status: TaskStatus;
		priority: TaskPriority;
		tags?: string[];
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

	// Tag Management Panel state
	let isTagPanelOpen = $state(false);

	function openNewTaskPanel(parentId?: number | string | null | Event) {
		selectedTaskId = null;
		initialParentId = typeof parentId === 'number' || typeof parentId === 'string' ? parentId : null;
		panelMode = 'create';
		isPanelOpen = true;
	}

	function handleOpenNewSubtask(parentTaskId: number | string) {
		openNewTaskPanel(parentTaskId);
	}

	function handleOpenNewParentTask(childTaskId: number | string) {
		// Open new task panel, and when created, link childTaskId's parent to new task
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

	function setViewMode(mode: 'list' | 'card' | 'tree') {
		viewMode = mode;
		try {
			localStorage.setItem('commons_tasks_view_mode', mode);
		} catch (err) {
			// Ignore storage errors
		}
	}

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
					.eq('id', task.id);

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
			parent_id: newTaskData.parent_id || null,
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
				user_id: 'mock-user',
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
				const { error } = await supabase.from('tasks').delete().eq('id', taskId);
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
						parent_id: updatedTask.parent_id || null,
						description: updatedTask.description,
						status: updatedTask.status,
						priority: updatedTask.priority,
						scheduled_date: updatedTask.scheduled_date,
						due_date: updatedTask.due_date,
						completed_at: updatedTask.completed_at
					})
					.eq('id', updatedTask.id);

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

	interface TreeTaskItem {
		task: Task;
		depth: number;
		hasChildren: boolean;
		childCount: number;
		isCollapsed: boolean;
	}

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

		// For Tree View, we map all children so branch relationships remain intact
		tasks.forEach((t) => {
			if (t.parent_id && taskMap.has(t.parent_id)) {
				const current = childrenMap.get(t.parent_id) || [];
				current.push(t);
				childrenMap.set(t.parent_id, current);
			}
		});

		// Determine which tasks match the active filters or have descendants matching the active filters
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
			// When filters are active, only show relevant child branches
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

		// Top-level roots
		tasks.forEach((t) => {
			const isRoot = !t.parent_id || !taskMap.has(t.parent_id);
			if (isRoot && visibleInTree.has(t.id)) {
				traverseTree(t, 0);
			}
		});

		// Fallback for any unvisited nodes matching filter
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

		<!-- View Switcher (List vs Tree vs Card) -->
		<div class="view-mode-toggle" role="group" aria-label="View mode">
			<button
				type="button"
				class="view-toggle-btn"
				class:active={viewMode === 'list'}
				onclick={() => setViewMode('list')}
				aria-label="List view"
				title="List view"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="8" y1="6" x2="21" y2="6" />
					<line x1="8" y1="12" x2="21" y2="12" />
					<line x1="8" y1="18" x2="21" y2="18" />
					<line x1="3" y1="6" x2="3.01" y2="6" />
					<line x1="3" y1="12" x2="3.01" y2="12" />
					<line x1="3" y1="18" x2="3.01" y2="18" />
				</svg>
			</button>
			<button
				type="button"
				class="view-toggle-btn"
				class:active={viewMode === 'tree'}
				onclick={() => setViewMode('tree')}
				aria-label="Tree view"
				title="Hierarchical Tree view"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M6 3v18" />
					<path d="M6 8h8a2 2 0 0 1 2 2v2" />
					<path d="M6 16h6" />
					<circle cx="18" cy="14" r="2" />
					<circle cx="14" cy="16" r="2" />
					<circle cx="6" cy="4" r="2" />
				</svg>
			</button>
			<button
				type="button"
				class="view-toggle-btn"
				class:active={viewMode === 'card'}
				onclick={() => setViewMode('card')}
				aria-label="Card view"
				title="Card grid view"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="7" height="7" rx="1" />
					<rect x="14" y="3" width="7" height="7" rx="1" />
					<rect x="14" y="14" width="7" height="7" rx="1" />
					<rect x="3" y="14" width="7" height="7" rx="1" />
				</svg>
			</button>
		</div>

		{#if viewMode === 'tree'}
			<div class="tree-controls">
				<button
					type="button"
					class="btn-tree-action"
					onclick={expandAll}
					title="Expand all tree branches"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="7 13 12 18 17 13" />
						<polyline points="7 6 12 11 17 6" />
					</svg>
					<span>Expand All</span>
				</button>
				<button
					type="button"
					class="btn-tree-action"
					onclick={collapseAll}
					title="Collapse all subtasks"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="17 11 12 6 7 11" />
						<polyline points="17 18 12 13 7 18" />
					</svg>
					<span>Collapse All</span>
				</button>
			</div>
		{/if}

		<div class="tally-count">
			{filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
		</div>
	</div>

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
			<!-- 1. COMPACT LIST VIEW WITH TREE INDENTATION -->
			<div class="list-wrapper">
				{#each treeTasks as { task, depth, hasChildren } (task.id)}
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
								handleToggleComplete(task);
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
							onclick={() => openTaskDetails(task)}
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
									handleDeleteTask(task.id);
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
		{:else if viewMode === 'tree'}
			<!-- 2. HIERARCHICAL TREE VIEW -->
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
								onclick={(e) => toggleCollapse(task.id, e)}
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
								handleToggleComplete(task);
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
							onclick={() => openTaskDetails(task)}
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
									openNewTaskPanel(task.id);
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
									handleDeleteTask(task.id);
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
		{:else}
			<!-- 3. CARD GRID VIEW -->
			<div class="card-grid">
				{#each filteredTasks as task (task.id)}
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
									handleToggleComplete(task);
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
									handleDeleteTask(task.id);
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
							onclick={() => openTaskDetails(task)}
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
		{/if}
	</div>

	<!-- Task Side Panel (Used for both Create New Task and Task Details/Editing) -->
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

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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

	/* View Mode Switcher (List vs Card) */
	.view-mode-toggle {
		display: inline-flex;
		align-items: center;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 2px;
		gap: 2px;
		height: 32px;
		box-sizing: border-box;
	}

	.view-toggle-btn {
		width: 26px;
		height: 26px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		border-radius: calc(var(--radius-sm) - 2px);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		transition: all 0.15s ease;
	}

	.view-toggle-btn:hover {
		color: var(--text-primary);
		background-color: var(--bg-tertiary);
	}

	.view-toggle-btn.active {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	.view-toggle-btn svg {
		width: 14px;
		height: 14px;
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

	/* Task Content interactive button */
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

	.task-description {
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.3;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Tree Controls */
	.tree-controls {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.btn-tree-action {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		height: 32px;
		padding: 0 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-tree-action:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.btn-tree-action svg {
		width: 13px;
		height: 13px;
	}

	/* Task Suffix Actions */
	.task-suffix {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.task-row:hover .task-suffix,
	.tree-node-row:hover .task-suffix {
		opacity: 1;
	}

	/* =========================================================================
	   TREE VIEW STRUCTURE & STYLES
	   ========================================================================= */
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

	/* =========================================================================
	   CARD GRID VIEW
	   ========================================================================= */
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
