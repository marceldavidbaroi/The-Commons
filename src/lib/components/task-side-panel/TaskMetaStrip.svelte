<script lang="ts">
	import DatePicker from '$lib/components/DatePicker.svelte';
	import type { Task, TaskStatus, TaskPriority } from '$lib/types/tasks';

	let {
		status = $bindable('todo'),
		priority = $bindable('normal'),
		scheduledDate = $bindable(''),
		dueDate = $bindable(''),
		parentId = $bindable(null),
		availableParentTasks = [],
		onFieldChange
	} = $props<{
		status: TaskStatus;
		priority: TaskPriority;
		scheduledDate: string;
		dueDate: string;
		parentId: number | string | null;
		availableParentTasks: Task[];
		onFieldChange: () => void;
	}>();
</script>

<div class="paper-meta-strip">
	<!-- Status Picker Pill with Distinct Colors -->
	<div class="meta-inline-field">
		<span class="meta-label">Status</span>
		<div class="status-badge-wrapper status-{status}">
			<span class="status-dot"></span>
			<select
				id="task-status-select"
				class="paper-select status-color-select"
				bind:value={status}
				onchange={onFieldChange}
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
		<div class="priority-badge-wrapper priority-{priority}">
			<select
				id="task-priority-select"
				class="paper-select priority-color-select"
				bind:value={priority}
				onchange={onFieldChange}
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
			bind:value={scheduledDate}
			label="Scheduled Date"
			placeholder="Add date"
			onchange={onFieldChange}
		/>
	</div>

	<!-- Due Date -->
	<div class="meta-inline-field">
		<span class="meta-label">Due</span>
		<DatePicker
			bind:value={dueDate}
			label="Due Date"
			placeholder="Add due date"
			onchange={onFieldChange}
		/>
	</div>

	<!-- Parent Task Link -->
	<div class="meta-inline-field">
		<span class="meta-label">Parent</span>
		<select
			id="task-parent-select"
			class="paper-select"
			bind:value={parentId}
			onchange={onFieldChange}
		>
			<option value={null}>None (Root Task)</option>
			{#each availableParentTasks as candidate}
				<option value={candidate.id}>{candidate.title}</option>
			{/each}
		</select>
	</div>
</div>

<style>
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

	@media (max-width: 480px) {
		.paper-meta-strip {
			gap: 0.75rem;
		}
	}
</style>
