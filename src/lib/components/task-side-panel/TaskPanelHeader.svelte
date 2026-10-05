<script lang="ts">
	import type { Task } from '$lib/types/tasks';

	let {
		task,
		mode,
		editedParentId,
		parentTask,
		availableParentTasks,
		availableChildCandidates,
		onClose,
		onOpenNewParentTask,
		onOpenNewSubtask,
		onSelectExistingParent,
		onRemoveParent,
		onSelectExistingChild
	} = $props<{
		task: Task | null;
		mode: 'edit' | 'create';
		editedParentId: number | string | null;
		parentTask: Task | null;
		availableParentTasks: Task[];
		availableChildCandidates: Task[];
		onClose: () => void;
		onOpenNewParentTask?: (taskId: number | string) => void;
		onOpenNewSubtask?: (taskId: number | string) => void;
		onSelectExistingParent: (parentTask: Task) => void;
		onRemoveParent: () => void;
		onSelectExistingChild: (childTask: Task) => void;
	}>();

	let isParentDropdownOpen = $state(false);
	let isChildDropdownOpen = $state(false);
	let isSearchingParent = $state(false);
	let isSearchingChild = $state(false);
	let parentSearchQuery = $state('');
	let childSearchQuery = $state('');

	function toggleParentDropdown(e: MouseEvent) {
		e.stopPropagation();
		isParentDropdownOpen = !isParentDropdownOpen;
		isChildDropdownOpen = false;
		isSearchingParent = false;
		parentSearchQuery = '';
	}

	function toggleChildDropdown(e: MouseEvent) {
		e.stopPropagation();
		isChildDropdownOpen = !isChildDropdownOpen;
		isParentDropdownOpen = false;
		isSearchingChild = false;
		childSearchQuery = '';
	}

	export function closeDropdowns() {
		isParentDropdownOpen = false;
		isChildDropdownOpen = false;
		isSearchingParent = false;
		isSearchingChild = false;
		parentSearchQuery = '';
		childSearchQuery = '';
	}

	const filteredParentCandidates = $derived(
		availableParentTasks.filter((t: Task) =>
			!parentSearchQuery.trim() ||
			t.title.toLowerCase().includes(parentSearchQuery.toLowerCase())
		)
	);

	const filteredChildCandidates = $derived(
		availableChildCandidates.filter((t: Task) =>
			!childSearchQuery.trim() ||
			t.title.toLowerCase().includes(childSearchQuery.toLowerCase())
		)
	);
</script>

<div class="panel-header">
	<div class="panel-header-title">
		<span class="panel-tag">{mode === 'create' ? (editedParentId ? 'New Subtask' : 'New Task') : 'Task Detail'}</span>
		{#if mode === 'edit' && task}
			<span class="panel-id" title={String(task.id)}>#{task.id}</span>
		{/if}
	</div>
	<div class="header-actions">
		{#if mode === 'edit' && task}
			<!-- Header Dropdown: Add / Manage Parent -->
			<div class="header-dropdown-container">
				<button
					type="button"
					class="panel-action-btn"
					class:active={isParentDropdownOpen}
					onclick={toggleParentDropdown}
					title={parentTask ? `Parent: ${parentTask.title}` : 'Attach or change parent task'}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
						<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
					</svg>
					<span>{parentTask ? 'Parent' : '+ Parent'}</span>
					<svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</button>

				{#if isParentDropdownOpen}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="header-dropdown-menu" onclick={(e) => e.stopPropagation()}>
						<div class="dropdown-header-title">Parent Task</div>
						
						{#if parentTask}
							<div class="current-linked-item">
								<span class="linked-title">{parentTask.title}</span>
								<button
									type="button"
									class="remove-link-btn"
									onclick={() => {
										closeDropdowns();
										onRemoveParent();
									}}
									title="Detach parent"
								>
									Detach
								</button>
							</div>
						{/if}

						<button
							type="button"
							class="dropdown-item"
							onclick={() => {
								closeDropdowns();
								if (task && onOpenNewParentTask) onOpenNewParentTask(task.id);
							}}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							<span>New Task (as Parent)</span>
						</button>

						<button
							type="button"
							class="dropdown-item"
							onclick={() => {
								isSearchingParent = !isSearchingParent;
								parentSearchQuery = '';
							}}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
							<span>Search Existing Task</span>
						</button>

						{#if isSearchingParent}
							<div class="dropdown-search-section">
								<input
									type="text"
									class="dropdown-search-input"
									bind:value={parentSearchQuery}
									placeholder="Search parent task..."
									autofocus
								/>
								<div class="dropdown-candidates-list">
									{#if filteredParentCandidates.length === 0}
										<div class="dropdown-empty">No tasks found</div>
									{:else}
										{#each filteredParentCandidates as candidate (candidate.id)}
											<button
												type="button"
												class="candidate-row"
												onclick={() => {
													closeDropdowns();
													onSelectExistingParent(candidate);
												}}
											>
												<span class="candidate-title">{candidate.title}</span>
												<span class="candidate-meta">#{candidate.id}</span>
											</button>
										{/each}
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Header Dropdown: Add / Manage Child -->
			<div class="header-dropdown-container">
				<button
					type="button"
					class="panel-action-btn"
					class:active={isChildDropdownOpen}
					onclick={toggleChildDropdown}
					title="Add child subtask to this task"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="5" x2="12" y2="19" />
						<line x1="5" y1="12" x2="19" y2="12" />
					</svg>
					<span>+ Child</span>
					<svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="6 9 12 15 18 9" />
					</svg>
				</button>

				{#if isChildDropdownOpen}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div class="header-dropdown-menu" onclick={(e) => e.stopPropagation()}>
						<div class="dropdown-header-title">Child Subtask</div>

						<button
							type="button"
							class="dropdown-item"
							onclick={() => {
								closeDropdowns();
								if (task && onOpenNewSubtask) onOpenNewSubtask(task.id);
							}}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							<span>New Task (as Child)</span>
						</button>

						<button
							type="button"
							class="dropdown-item"
							onclick={() => {
								isSearchingChild = !isSearchingChild;
								childSearchQuery = '';
							}}
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="11" cy="11" r="8" />
								<line x1="21" y1="21" x2="16.65" y2="16.65" />
							</svg>
							<span>Search Existing Task</span>
						</button>

						{#if isSearchingChild}
							<div class="dropdown-search-section">
								<input
									type="text"
									class="dropdown-search-input"
									bind:value={childSearchQuery}
									placeholder="Search task to link..."
									autofocus
								/>
								<div class="dropdown-candidates-list">
									{#if filteredChildCandidates.length === 0}
										<div class="dropdown-empty">No tasks found</div>
									{:else}
										{#each filteredChildCandidates as candidate (candidate.id)}
											<button
												type="button"
												class="candidate-row"
												onclick={() => {
													closeDropdowns();
													onSelectExistingChild(candidate);
												}}
											>
												<span class="candidate-title">{candidate.title}</span>
												<span class="candidate-meta">#{candidate.id}</span>
											</button>
										{/each}
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
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

<style>
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

	.panel-action-btn:hover,
	.panel-action-btn.active {
		background-color: var(--bg-surface);
		color: var(--primary);
		border-color: var(--border-focus);
	}

	.panel-action-btn svg {
		width: 13px;
		height: 13px;
	}

	.panel-action-btn svg.chevron-icon {
		width: 10px;
		height: 10px;
		opacity: 0.65;
		margin-left: -0.1rem;
	}

	.header-dropdown-container {
		position: relative;
	}

	.header-dropdown-menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		width: 260px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.5rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		z-index: 120;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		animation: dropdownFadeIn 0.12s ease-out;
	}

	@keyframes dropdownFadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-header-title {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		padding: 0.25rem 0.5rem 0.125rem;
	}

	.current-linked-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.375rem 0.5rem;
		font-size: 0.75rem;
	}

	.linked-title {
		font-weight: 600;
		color: var(--text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}

	.remove-link-btn {
		background: none;
		border: none;
		font-size: 0.6875rem;
		color: var(--danger);
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	.remove-link-btn:hover {
		color: #b91c1c;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.45rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		transition: background-color 0.12s ease, color 0.12s ease;
	}

	.dropdown-item:hover {
		background-color: var(--bg-tertiary);
		color: var(--primary);
	}

	.dropdown-item svg {
		width: 13px;
		height: 13px;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.dropdown-item:hover svg {
		color: var(--primary);
	}

	.dropdown-search-section {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		padding-top: 0.25rem;
		border-top: 1px solid var(--border-subtle);
	}

	.dropdown-search-input {
		width: 100%;
		height: 28px;
		padding: 0 0.5rem;
		font-size: 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background-color: var(--bg-primary);
		color: var(--text-primary);
		outline: none;
		transition: border-color 0.15s ease;
	}

	.dropdown-search-input:focus {
		border-color: var(--border-focus);
	}

	.dropdown-candidates-list {
		max-height: 160px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.candidate-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.375rem 0.5rem;
		font-size: 0.75rem;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		transition: background-color 0.12s ease;
	}

	.candidate-row:hover {
		background-color: var(--bg-tertiary);
	}

	.candidate-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.candidate-meta {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.dropdown-empty {
		padding: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-muted);
		text-align: center;
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
</style>
