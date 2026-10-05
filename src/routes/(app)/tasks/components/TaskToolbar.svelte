<script lang="ts">
	let {
		searchQuery = $bindable(''),
		statusFilter = $bindable('all'),
		priorityFilter = $bindable('all'),
		viewMode = $bindable<'list' | 'card' | 'tree'>('list'),
		statusCounts,
		totalFiltered,
		onExpandAll,
		onCollapseAll
	}: {
		searchQuery: string;
		statusFilter: string;
		priorityFilter: string;
		viewMode: 'list' | 'card' | 'tree';
		statusCounts: { all: number; todo: number; in_progress: number; completed: number };
		totalFiltered: number;
		onExpandAll?: () => void;
		onCollapseAll?: () => void;
	} = $props();
</script>

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
			onclick={() => (viewMode = 'list')}
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
			onclick={() => (viewMode = 'tree')}
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
			onclick={() => (viewMode = 'card')}
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
				onclick={onExpandAll}
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
				onclick={onCollapseAll}
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
		{totalFiltered} {totalFiltered === 1 ? 'task' : 'tasks'}
	</div>
</div>

<style>
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

	.tally-count {
		font-size: 0.75rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
		margin-left: auto;
		white-space: nowrap;
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
