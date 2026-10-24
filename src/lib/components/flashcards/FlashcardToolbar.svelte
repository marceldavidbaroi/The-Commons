<script lang="ts">
	let {
		searchQuery = $bindable(''),
		activeTab = $bindable<'decks' | 'card_types' | 'due_today'>('decks'),
		counts
	}: {
		searchQuery: string;
		activeTab: 'decks' | 'card_types' | 'due_today';
		counts: {
			decks: number;
			cardTypes: number;
			dueToday: number;
		};
	} = $props();
</script>

<div class="tier-toolbar">
	<!-- Inline Search Input -->
	<div class="search-box">
		<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search decks, cards, or types..."
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

	<!-- Tab Filter Pills -->
	<div class="filter-group" role="tablist">
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'decks'}
			class="filter-chip"
			class:active={activeTab === 'decks'}
			onclick={() => (activeTab = 'decks')}
		>
			<span>Decks</span>
			<span class="chip-count">{counts.decks}</span>
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'card_types'}
			class="filter-chip"
			class:active={activeTab === 'card_types'}
			onclick={() => (activeTab = 'card_types')}
		>
			<span>Card Types</span>
			<span class="chip-count">{counts.cardTypes}</span>
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'due_today'}
			class="filter-chip"
			class:active={activeTab === 'due_today'}
			onclick={() => (activeTab = 'due_today')}
		>
			<span>Due Today</span>
			<span class="chip-count due" class:has-due={counts.dueToday > 0}>{counts.dueToday}</span>
		</button>
	</div>
</div>

<style>
	.tier-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		height: 38px;
		width: 100%;
	}

	.search-box {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1;
		max-width: 320px;
		height: 34px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0 0.5rem;
		transition: border-color 0.15s ease;
	}

	.search-box:focus-within {
		border-color: var(--primary);
	}

	.search-icon {
		width: 14px;
		height: 14px;
		color: var(--text-muted);
		flex-shrink: 0;
		margin-right: 0.375rem;
	}

	.search-input {
		width: 100%;
		height: 100%;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-size: 0.75rem;
		outline: none;
	}

	.search-input::placeholder {
		color: var(--text-muted);
	}

	.clear-search-btn {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		width: 14px;
		height: 14px;
		margin-left: 0.25rem;
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
		background-color: var(--bg-secondary);
		padding: 0.1875rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		border-radius: calc(var(--radius-sm) - 2px);
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.filter-chip:hover {
		color: var(--text-primary);
		background-color: var(--bg-tertiary);
	}

	.filter-chip.active {
		color: var(--text-primary);
		background-color: var(--bg-primary);
		font-weight: 600;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	.chip-count {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		font-weight: 600;
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-full);
		background-color: var(--bg-tertiary);
		color: var(--text-muted);
	}

	.filter-chip.active .chip-count {
		background-color: var(--border-subtle);
		color: var(--text-secondary);
	}

	.chip-count.due.has-due {
		background-color: #fef3c7;
		color: #b45309;
	}

	@media (max-width: 640px) {
		.tier-toolbar {
			flex-direction: column;
			align-items: stretch;
			height: auto;
			gap: 0.5rem;
		}

		.search-box {
			max-width: 100%;
		}

		.filter-group {
			justify-content: space-between;
		}
	}
</style>
