<script lang="ts">
	import { onMount } from 'svelte';
	import TagManagementSidePanel from '$lib/components/TagManagementSidePanel.svelte';
	import type { TagCategory } from '$lib/types/tags';
	import type { Task, TaskStatus, TaskPriority } from '$lib/types/tasks';
	import {
		DEFAULT_SUGGESTIONS,
		MIN_PANEL_WIDTH,
		MAX_PANEL_WIDTH,
		DEFAULT_PANEL_WIDTH
	} from './task-side-panel/constants';
	import TaskPanelHeader from './task-side-panel/TaskPanelHeader.svelte';
	import TaskMetaStrip from './task-side-panel/TaskMetaStrip.svelte';
	import TaskTagSection from './task-side-panel/TaskTagSection.svelte';
	import TaskSubtasksSection from './task-side-panel/TaskSubtasksSection.svelte';
	import TaskPanelFooter from './task-side-panel/TaskPanelFooter.svelte';

	export { type Task, type TaskStatus, type TaskPriority };

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
	let panelWidth = $state(DEFAULT_PANEL_WIDTH);
	let isResizing = $state(false);

	// Tag Management side panel trigger inside TaskSidePanel
	let isTagManagementOpen = $state(false);
	let taskCategories = $state<TagCategory[]>([]);

	let headerComponent: TaskPanelHeader | undefined = $state();

	// Derived suggestions list combined from fetched tag categories and defaults
	const availableSuggestions = $derived.by(() => {
		const fetchedTagNames = taskCategories.flatMap((c) => (c.tags || []).map((t) => t.name));
		const combined = Array.from(new Set([...fetchedTagNames, ...DEFAULT_SUGGESTIONS]));
		return combined.filter((s) => !tags.includes(s));
	});

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

	// Tasks available to be linked as child (excluding self, current parent, and tasks already child of self)
	const availableChildCandidates = $derived(
		allTasks.filter((t: Task) =>
			(!task || t.id !== task.id) &&
			t.parent_id !== task?.id &&
			t.id !== editedParentId
		)
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

	async function handleSelectExistingParent(pTask: Task) {
		if (!task) return;
		editedParentId = pTask.id;
		isDirty = true;
		if (onSave) {
			await onSave({
				...task,
				parent_id: pTask.id
			});
		}
	}

	async function handleRemoveParent() {
		if (!task) return;
		editedParentId = null;
		isDirty = true;
		if (onSave) {
			await onSave({
				...task,
				parent_id: null
			});
		}
	}

	async function handleSelectExistingChild(cTask: Task) {
		if (!task) return;
		if (onSave) {
			await onSave({
				...cTask,
				parent_id: task.id
			});
		}
	}

	async function handleToggleChildStatus(child: Task) {
		if (onSave) {
			const nextStatus: TaskStatus = child.status === 'completed' ? 'todo' : 'completed';
			await onSave({
				...child,
				status: nextStatus,
				completed_at: nextStatus === 'completed' ? new Date().toISOString() : null
			});
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
			const clampedWidth = Math.min(
				Math.max(newWidth, MIN_PANEL_WIDTH),
				Math.min(MAX_PANEL_WIDTH, window.innerWidth - 40)
			);
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
				if (!isNaN(parsed) && parsed >= MIN_PANEL_WIDTH && parsed <= MAX_PANEL_WIDTH) {
					panelWidth = parsed;
				}
			}
		} catch (err) {
			// Ignore storage errors
		}

		function handleWindowClick() {
			if (headerComponent?.closeDropdowns) {
				headerComponent.closeDropdowns();
			}
		}

		window.addEventListener('click', handleWindowClick);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('click', handleWindowClick);
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
		<TaskPanelHeader
			bind:this={headerComponent}
			{task}
			{mode}
			{editedParentId}
			{parentTask}
			{availableParentTasks}
			{availableChildCandidates}
			{onClose}
			{onOpenNewParentTask}
			{onOpenNewSubtask}
			onSelectExistingParent={handleSelectExistingParent}
			onRemoveParent={handleRemoveParent}
			onSelectExistingChild={handleSelectExistingChild}
		/>

		<!-- Panel Scrollable Body (Flat Paper-like Writing Canvas) -->
		<div class="panel-body paper-canvas">
			<!-- Document Title: Flat, clean, borderless headline -->
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

			<!-- Flat Meta & Properties Strip -->
			<TaskMetaStrip
				bind:status={editedStatus}
				bind:priority={editedPriority}
				bind:scheduledDate={editedScheduledDate}
				bind:dueDate={editedDueDate}
				bind:parentId={editedParentId}
				{availableParentTasks}
				onFieldChange={handleFieldChange}
			/>

			<!-- Tags Strip: Flat natural chip flow -->
			<TaskTagSection
				bind:tags
				bind:tagInput
				{availableSuggestions}
				onAddTag={addTag}
				onRemoveTag={removeTag}
				onOpenTagManagement={() => (isTagManagementOpen = true)}
			/>

			<!-- Subtasks / Child Tasks Section -->
			{#if mode === 'edit' && task}
				<TaskSubtasksSection
					{childTasks}
					bind:isAddingChild
					bind:newChildTitle
					onToggleChildStatus={handleToggleChildStatus}
					{onSelectTask}
					onAddChildSubmit={handleAddChildSubmit}
				/>
			{/if}

			<div class="paper-divider"></div>

			<!-- Flat Paper Writing Canvas -->
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
		<TaskPanelFooter
			{task}
			{mode}
			{isDirty}
			{isSaving}
			{editedTitle}
			{onClose}
			{onDelete}
			onSave={handleSave}
		/>
	</aside>

	<!-- Tag Management Side Panel from inside Task panel -->
	<TagManagementSidePanel
		feature="tasks"
		isOpen={isTagManagementOpen}
		onClose={() => (isTagManagementOpen = false)}
		onTagsChange={(cats) => (taskCategories = cats)}
	/>
{/if}

<style>
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

	.paper-canvas {
		flex: 1;
		overflow-y: auto;
		padding: 1.75rem 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		background-color: var(--bg-secondary);
	}

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

	.paper-divider {
		height: 1px;
		background-color: var(--border-subtle);
		width: 100%;
		margin: 0.25rem 0;
	}

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

	.paper-footer-meta {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
		padding-top: 1rem;
		border-top: 1px dashed var(--border-subtle);
	}

	@media (max-width: 480px) {
		.task-side-panel {
			width: 100vw;
		}

		.paper-canvas {
			padding: 1.25rem 1.25rem 2rem;
		}
	}
</style>
