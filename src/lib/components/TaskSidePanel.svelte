<script lang="ts">
	import { onMount } from 'svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';

	type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
	type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

	export interface Task {
		id: number | string;
		user_id: string;
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

	let {
		task,
		allTasks = [],
		isOpen,
		mode = 'edit',
		initialParentId = null,
		onClose,
		onSave,
		onCreate,
		onAddChildTask,
		onOpenNewSubtask,
		onOpenNewParentTask,
		onSelectTask,
		onDelete
	} = $props<{
		task: Task | null;
		allTasks?: Task[];
		isOpen: boolean;
		mode?: 'edit' | 'create';
		initialParentId?: number | string | null;
		onClose: () => void;
		onSave?: (updatedTask: Task) => Promise<void> | void;
		onCreate?: (newTask: {
			title: string;
			parent_id?: number | string | null;
			description: string | null;
			status: TaskStatus;
			priority: TaskPriority;
			tags: string[];
			scheduled_date: string | null;
			due_date: string | null;
		}) => Promise<void> | void;
		onAddChildTask?: (parentTaskId: number | string, childTitle: string) => Promise<void> | void;
		onOpenNewSubtask?: (parentTaskId: number | string) => void;
		onOpenNewParentTask?: (childTaskId: number | string) => void;
		onSelectTask?: (task: Task) => void;
		onDelete?: (taskId: number | string) => Promise<void> | void;
	}>();

	let editedTitle = $state('');
	let editedDescription = $state('');
	let editedStatus = $state<TaskStatus>('todo');
	let editedPriority = $state<TaskPriority>('normal');
	let editedParentId = $state<number | string | null>(null);
	let editedScheduledDate = $state<string>('');
	let editedDueDate = $state<string>('');
	let tags = $state<string[]>([]);
	let tagInput = $state('');
	let isSaving = $state(false);
	let isDirty = $state(false);

	// Child task creation state
	let newChildTitle = $state('');
	let isAddingChild = $state(false);

	// Resizing state
	const MIN_WIDTH = 380;
	const MAX_WIDTH = 860;
	const DEFAULT_WIDTH = 480;

	let panelWidth = $state(DEFAULT_WIDTH);
	let isResizing = $state(false);

	const defaultSuggestions = ['Design', 'Engineering', 'Personal', 'Urgent', 'Review', 'Refactor'];

	// Sync local state when task or mode changes
	$effect(() => {
		if (isOpen) {
			if (mode === 'edit' && task) {
				editedTitle = task.title;
				editedDescription = task.description || '';
				editedStatus = task.status;
				editedPriority = task.priority;
				editedParentId = task.parent_id || null;
				tags = [...(task.tags || [])];
				editedScheduledDate = task.scheduled_date || '';
				editedDueDate = task.due_date || '';
				tagInput = '';
				newChildTitle = '';
				isAddingChild = false;
				isDirty = false;
			} else if (mode === 'create') {
				editedTitle = '';
				editedDescription = '';
				editedStatus = 'todo';
				editedPriority = 'normal';
				editedParentId = initialParentId ?? task?.parent_id ?? null;
				tags = [];
				editedScheduledDate = new Date().toISOString().split('T')[0];
				editedDueDate = '';
				tagInput = '';
				newChildTitle = '';
				isAddingChild = false;
				isDirty = false;
			}
		}
	});

	// Trigger creating a new child task for current task
	function handleHeaderAddChild() {
		if (!task) return;
		if (onOpenNewSubtask) {
			onOpenNewSubtask(task.id);
		} else {
			// Fallback local mode switch
			editedParentId = task.id;
			editedTitle = '';
			editedDescription = '';
			editedStatus = 'todo';
			editedPriority = task.priority || 'normal';
			tags = task.tags ? [...task.tags] : [];
			editedScheduledDate = task.scheduled_date || new Date().toISOString().split('T')[0];
			editedDueDate = '';
			tagInput = '';
			isAddingChild = false;
			isDirty = false;
		}
	}

	// Trigger creating a new parent task for current task
	function handleHeaderAddParent() {
		if (!task) return;
		if (onOpenNewParentTask) {
			onOpenNewParentTask(task.id);
		} else {
			// Focus the parent picker
			const selectEl = document.getElementById('task-parent-select') as HTMLSelectElement | null;
			if (selectEl) {
				selectEl.focus();
			}
		}
	}

	// Derived child subtasks and parent task
	const childTasks = $derived(
		task ? allTasks.filter((t: Task) => t.parent_id === task.id) : []
	);

	const parentTask = $derived(
		editedParentId ? allTasks.find((t: Task) => t.id === editedParentId) || null : null
	);

	// Tasks available to be selected as parent (excluding self and own descendants)
	const availableParentTasks = $derived(
		allTasks.filter((t: Task) => (!task || t.id !== task.id) && t.parent_id !== task?.id)
	);

	function handleFieldChange() {
		isDirty = true;
	}

	async function handleAddChildSubmit(e: Event) {
		e.preventDefault();
		if (!newChildTitle.trim() || !task) return;
		if (onAddChildTask) {
			await onAddChildTask(task.id, newChildTitle.trim());
			newChildTitle = '';
			isAddingChild = false;
		}
	}

	function addTag(tagToAdd: string) {
		const trimmed = tagToAdd.trim().replace(/^#/, '');
		if (!trimmed) return;
		if (!tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
			tags = [...tags, trimmed];
			isDirty = true;
		}
		tagInput = '';
	}

	function removeTag(tagToRemove: string) {
		tags = tags.filter((t) => t !== tagToRemove);
		isDirty = true;
	}

	function handleTagKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addTag(tagInput);
		} else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
			removeTag(tags[tags.length - 1]);
		}
	}

	// Resize Drag Handlers
	function startResize(e: MouseEvent) {
		e.preventDefault();
		isResizing = true;
		document.body.style.cursor = 'ew-resize';
		document.body.style.userSelect = 'none';

		function onMouseMove(moveEvent: MouseEvent) {
			const newWidth = window.innerWidth - moveEvent.clientX;
			const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), Math.min(MAX_WIDTH, window.innerWidth - 40));
			panelWidth = clampedWidth;
		}

		function onMouseUp() {
			isResizing = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);

			try {
				localStorage.setItem('commons_task_panel_width', String(panelWidth));
			} catch (err) {
				// Ignore storage errors
			}
		}

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	async function handleSave() {
		if (!editedTitle.trim() || isSaving) return;
		isSaving = true;

		try {
			if (mode === 'create') {
				if (onCreate) {
					await onCreate({
						title: editedTitle.trim(),
						parent_id: editedParentId || null,
						description: editedDescription.trim() ? editedDescription.trim() : null,
						status: editedStatus,
						priority: editedPriority,
						tags: [...tags],
						scheduled_date: editedScheduledDate || null,
						due_date: editedDueDate || null
					});
				}
			} else if (task && onSave) {
				const completedAt =
					editedStatus === 'completed'
						? task.completed_at || new Date().toISOString()
						: null;

				const updatedTask: Task = {
					...task,
					title: editedTitle.trim(),
					parent_id: editedParentId || null,
					description: editedDescription.trim() ? editedDescription.trim() : null,
					status: editedStatus,
					priority: editedPriority,
					tags: [...tags],
					scheduled_date: editedScheduledDate || null,
					due_date: editedDueDate || null,
					completed_at: completedAt
				};

				await onSave(updatedTask);
			}
			isDirty = false;
			onClose();
		} finally {
			isSaving = false;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) {
			onClose();
		}
	}

	onMount(() => {
		try {
			const savedWidth = localStorage.getItem('commons_task_panel_width');
			if (savedWidth) {
				const parsed = parseInt(savedWidth, 10);
				if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
					panelWidth = parsed;
				}
			}
		} catch (err) {
			// Ignore storage errors
		}

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

{#if isOpen && (task || mode === 'create')}
	<!-- Backdrop overlay -->
	<div 
		class="panel-backdrop" 
		onclick={onClose} 
		role="presentation"
		aria-hidden="true"
	></div>

	<!-- Side Panel drawer -->
	<aside 
		class="task-side-panel"
		class:resizing={isResizing}
		style="width: {panelWidth}px;"
		aria-label={mode === 'create' ? 'Create New Task' : 'Task Details'}
	>
		<!-- Left Border Resize Handle -->
		<div
			class="resize-handle"
			onmousedown={startResize}
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize panel width"
			title="Drag left/right to resize panel"
		>
			<div class="resize-indicator"></div>
		</div>

		<!-- Panel Header (Sticky Top) -->
		<div class="panel-header">
			<div class="panel-header-title">
				<span class="panel-tag">{mode === 'create' ? (editedParentId ? 'New Subtask' : 'New Task') : 'Task Detail'}</span>
				{#if mode === 'edit' && task}
					<span class="panel-id" title={String(task.id)}>#{task.id}</span>
				{/if}
			</div>
			<div class="header-actions">
				{#if mode === 'edit' && task}
					<!-- Header Quick Action: Add Child / Subtask -->
					<button
						type="button"
						class="panel-action-btn"
						onclick={handleHeaderAddChild}
						title="Add subtask to this task"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						<span>+ Subtask</span>
					</button>

					<!-- Header Quick Action: Set / Change Parent -->
					<button
						type="button"
						class="panel-action-btn"
						onclick={handleHeaderAddParent}
						title={parentTask ? `Parent: ${parentTask.title}` : 'Attach a parent task'}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
							<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
						</svg>
						<span>{parentTask ? 'Has Parent' : '+ Parent'}</span>
					</button>
				{/if}

				<button
					type="button"
					class="panel-icon-btn close-btn"
					onclick={onClose}
					aria-label="Close task panel"
					title="Close (Esc)"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Panel Scrollable Body (Flat Paper-like Writing Canvas) -->
		<div class="panel-body paper-canvas">
			<!-- 1. Document Title: Flat, clean, borderless headline -->
			<div class="paper-title-container">
				<input
					id="task-title-input"
					type="text"
					class="paper-title-input"
					bind:value={editedTitle}
					oninput={handleFieldChange}
					placeholder="Task Title..."
					autocomplete="off"
				/>
			</div>

			<!-- 2. Flat Meta & Properties Strip -->
			<div class="paper-meta-strip">
				<!-- Status Picker Pill with Distinct Colors -->
				<div class="meta-inline-field">
					<span class="meta-label">Status</span>
					<div class="status-badge-wrapper status-{editedStatus}">
						<span class="status-dot"></span>
						<select
							id="task-status-select"
							class="paper-select status-color-select"
							bind:value={editedStatus}
							onchange={handleFieldChange}
						>
							<option value="todo">To Do</option>
							<option value="in_progress">In Progress</option>
							<option value="completed">Completed</option>
							<option value="deferred">Deferred</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</div>
				</div>

				<!-- Priority Picker Pill with Distinct Colors -->
				<div class="meta-inline-field">
					<span class="meta-label">Priority</span>
					<div class="priority-badge-wrapper priority-{editedPriority}">
						<select
							id="task-priority-select"
							class="paper-select priority-color-select"
							bind:value={editedPriority}
							onchange={handleFieldChange}
						>
							<option value="low">Low</option>
							<option value="normal">Normal</option>
							<option value="high">High</option>
							<option value="urgent">Urgent</option>
						</select>
					</div>
				</div>

				<!-- Scheduled Date -->
				<div class="meta-inline-field">
					<span class="meta-label">Date</span>
					<DatePicker
						bind:value={editedScheduledDate}
						label="Scheduled Date"
						placeholder="Add date"
						onchange={handleFieldChange}
					/>
				</div>

				<!-- Due Date -->
				<div class="meta-inline-field">
					<span class="meta-label">Due</span>
					<DatePicker
						bind:value={editedDueDate}
						label="Due Date"
						placeholder="Add due date"
						onchange={handleFieldChange}
					/>
				</div>

				<!-- Parent Task Link -->
				<div class="meta-inline-field">
					<span class="meta-label">Parent</span>
					<select
						id="task-parent-select"
						class="paper-select"
						bind:value={editedParentId}
						onchange={handleFieldChange}
					>
						<option value={null}>None (Root Task)</option>
						{#each availableParentTasks as candidate}
							<option value={candidate.id}>{candidate.title}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- 3. Tags Strip: Flat natural chip flow -->
			<div class="paper-tags-section">
				<div class="paper-tags-wrapper">
					<span class="tags-prefix-icon">#</span>
					{#each tags as tag}
						<span class="paper-tag-chip">
							{tag}
							<button
								type="button"
								class="tag-remove-btn"
								onclick={() => removeTag(tag)}
								aria-label={`Remove tag ${tag}`}
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</span>
					{/each}
					<input
						id="task-tag-input"
						type="text"
						class="paper-tag-input"
						bind:value={tagInput}
						onkeydown={handleTagKeyDown}
						placeholder={tags.length === 0 ? "Add tags (press Enter)..." : "Add tag..."}
					/>
				</div>

				<!-- Quick Suggestions (subtle quiet pills) -->
				{#if defaultSuggestions.some(s => !tags.includes(s))}
					<div class="tag-suggestions">
						{#each defaultSuggestions.filter(s => !tags.includes(s)) as suggestion}
							<button
								type="button"
								class="suggestion-pill"
								onclick={() => addTag(suggestion)}
							>
								+{suggestion}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- 4. Subtasks / Child Tasks Section -->
			{#if mode === 'edit' && task}
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
										onclick={async () => {
											if (onSave) {
												const nextStatus = child.status === 'completed' ? 'todo' : 'completed';
												await onSave({
													...child,
													status: nextStatus,
													completed_at: nextStatus === 'completed' ? new Date().toISOString() : null
												});
											}
										}}
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
						<form class="add-subtask-form" onsubmit={handleAddChildSubmit}>
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
			{/if}

			<div class="paper-divider"></div>

			<!-- 5. Flat Paper Writing Canvas (Borderless, expansive textarea) -->
			<div class="paper-writing-area">
				<textarea
					id="task-desc-input"
					class="paper-notes-textarea"
					bind:value={editedDescription}
					oninput={handleFieldChange}
					placeholder="Start writing notes, steps, checklist items, or thoughts..."
				></textarea>
			</div>

			<!-- Metadata Summary Footer -->
			{#if mode === 'edit' && task}
				<div class="paper-footer-meta">
					<span class="meta-item">Created: {new Date(task.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
					{#if task.completed_at}
						<span class="meta-item">Completed: {new Date(task.completed_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Panel Footer (Sticky Actions) -->
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
					onclick={handleSave}
				>
					{#if isSaving}
						{mode === 'create' ? 'Creating...' : 'Saving...'}
					{:else}
						{mode === 'create' ? 'Create Task' : 'Save Changes'}
					{/if}
				</button>
			</div>
		</div>
	</aside>
{/if}

<style>
	/* Solid backdrop without blur */
	.panel-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(31, 38, 51, 0.35);
		z-index: 90;
		animation: backdropFadeIn 0.15s ease-out;
	}

	@keyframes backdropFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Task Side Panel Drawer */
	.task-side-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		max-width: 100vw;
		background-color: var(--bg-secondary);
		border-left: 1px solid var(--border-subtle);
		box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
		z-index: 100;
		display: flex;
		flex-direction: column;
		animation: slideInRight 0.18s cubic-bezier(0.16, 1, 0.3, 1);
		transition: width 0.05s ease-out;
	}

	.task-side-panel.resizing {
		transition: none;
		user-select: none;
	}

	@keyframes slideInRight {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	/* Left Resize Handle */
	.resize-handle {
		position: absolute;
		top: 0;
		left: -4px;
		bottom: 0;
		width: 9px;
		cursor: ew-resize;
		z-index: 110;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		transition: background-color 0.15s ease;
	}

	.resize-handle:hover,
	.task-side-panel.resizing .resize-handle {
		background-color: rgba(65, 94, 120, 0.12);
	}

	.resize-indicator {
		width: 3px;
		height: 36px;
		border-radius: var(--radius-full);
		background-color: transparent;
		transition: background-color 0.15s ease;
	}

	.resize-handle:hover .resize-indicator,
	.task-side-panel.resizing .resize-indicator {
		background-color: var(--primary);
	}

	/* Panel Header */
	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 48px;
		padding: 0 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		flex-shrink: 0;
	}

	.panel-header-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.panel-tag {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
	}

	.panel-id {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--text-muted);
		background-color: var(--bg-tertiary);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.panel-action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		height: 28px;
		padding: 0 0.5rem;
		font-size: 0.6875rem;
		font-weight: 500;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.panel-action-btn:hover {
		background-color: var(--bg-surface);
		color: var(--primary);
		border-color: var(--border-focus);
	}

	.panel-action-btn svg {
		width: 13px;
		height: 13px;
	}

	.panel-icon-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
		padding: 0;
	}

	.panel-icon-btn:hover {
		background-color: var(--bg-surface);
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.panel-icon-btn svg {
		width: 14px;
		height: 14px;
	}

	/* =========================================================================
	   FLAT PAPER-LIKE WRITING CANVAS STYLES
	   ========================================================================= */
	.paper-canvas {
		flex: 1;
		overflow-y: auto;
		padding: 1.75rem 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		background-color: var(--bg-secondary);
	}

	/* 1. Flat Document Headline */
	.paper-title-container {
		width: 100%;
	}

	.paper-title-input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		line-height: 1.3;
		padding: 0;
	}

	.paper-title-input::placeholder {
		color: var(--text-muted);
		font-weight: 500;
	}

	/* 2. Flat Meta & Properties Strip */
	.paper-meta-strip {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1.125rem;
		padding-bottom: 0.25rem;
	}

	.meta-inline-field {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}

	.meta-label {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.paper-select {
		border: none;
		outline: none;
		background: transparent;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.125rem 0.25rem;
		border-radius: var(--radius-sm);
		transition: color 0.15s ease, background-color 0.15s ease;
	}

	.paper-select:hover,
	.paper-select:focus {
		color: var(--text-primary);
		background-color: var(--bg-tertiary);
	}

	/* Status Badge Colored Pill */
	.status-badge-wrapper {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		transition: all 0.15s ease;
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	.status-todo {
		background-color: #f1f5f9;
		border-color: #cbd5e1;
		color: #475569;
	}
	.status-todo .status-dot {
		background-color: #64748b;
	}

	.status-in_progress {
		background-color: #e0f2fe;
		border-color: #bae6fd;
		color: #0284c7;
	}
	.status-in_progress .status-dot {
		background-color: #0284c7;
	}

	.status-completed {
		background-color: #dcfce7;
		border-color: #bbf7d0;
		color: #16a34a;
	}
	.status-completed .status-dot {
		background-color: #16a34a;
	}

	.status-deferred {
		background-color: #fef3c7;
		border-color: #fde68a;
		color: #d97706;
	}
	.status-deferred .status-dot {
		background-color: #d97706;
	}

	.status-cancelled {
		background-color: #fee2e2;
		border-color: #fecaca;
		color: #dc2626;
	}
	.status-cancelled .status-dot {
		background-color: #dc2626;
	}

	.status-color-select {
		color: inherit !important;
		font-weight: 600;
		padding: 0;
	}

	/* Priority Badge Colored Pill */
	.priority-badge-wrapper {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		transition: all 0.15s ease;
	}

	.priority-urgent {
		background-color: #fee2e2;
		border-color: #fca5a5;
		color: #b91c1c;
	}

	.priority-high {
		background-color: #fef3c7;
		border-color: #fde68a;
		color: #b45309;
	}

	.priority-normal {
		background-color: var(--bg-tertiary);
		border-color: var(--border-subtle);
		color: var(--primary);
	}

	.priority-low {
		background-color: #f8fafc;
		border-color: #e2e8f0;
		color: var(--text-muted);
	}

	.priority-color-select {
		color: inherit !important;
		font-weight: 600;
		padding: 0;
		text-transform: capitalize;
	}

	/* 3. Tags Section */
	.paper-tags-section {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.paper-tags-wrapper {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.tags-prefix-icon {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-muted);
		margin-right: 0.125rem;
	}

	.paper-tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background-color: var(--bg-tertiary);
		color: var(--primary);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.125rem 0.4375rem;
		border-radius: var(--radius-sm);
	}

	.tag-remove-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		width: 10px;
		height: 10px;
		transition: color 0.12s ease;
	}

	.tag-remove-btn:hover {
		color: var(--danger);
	}

	.tag-remove-btn svg {
		width: 10px;
		height: 10px;
	}

	.paper-tag-input {
		border: none;
		outline: none;
		background: transparent;
		font-size: 0.75rem;
		color: var(--text-primary);
		min-width: 140px;
		padding: 0.125rem 0.25rem;
	}

	.paper-tag-input::placeholder {
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	.tag-suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.125rem;
	}

	.suggestion-pill {
		background-color: transparent;
		border: 1px dashed var(--border-subtle);
		color: var(--text-muted);
		font-size: 0.6875rem;
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.12s ease;
	}

	.suggestion-pill:hover {
		border-color: var(--primary);
		color: var(--primary);
		background-color: var(--bg-tertiary);
	}

	/* Subtasks / Child Tasks Section */
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

	.paper-divider {
		height: 1px;
		background-color: var(--border-subtle);
		width: 100%;
		margin: 0.25rem 0;
	}

	/* 4. Flat Paper Writing Area */
	.paper-writing-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 240px;
	}

	.paper-notes-textarea {
		width: 100%;
		flex: 1;
		border: none;
		outline: none;
		background: transparent;
		font-family: inherit;
		font-size: 0.875rem;
		line-height: 1.7;
		color: var(--text-primary);
		resize: none;
		padding: 0;
		box-sizing: border-box;
	}

	.paper-notes-textarea::placeholder {
		color: var(--text-muted);
		line-height: 1.7;
	}

	/* Paper Footer Metadata */
	.paper-footer-meta {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
		padding-top: 1rem;
		border-top: 1px dashed var(--border-subtle);
	}

	/* Panel Footer (Sticky Actions) */
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

	@media (max-width: 480px) {
		.task-side-panel {
			width: 100vw;
		}

		.paper-canvas {
			padding: 1.25rem 1.25rem 2rem;
		}

		.paper-meta-strip {
			gap: 0.75rem;
		}
	}
</style>
