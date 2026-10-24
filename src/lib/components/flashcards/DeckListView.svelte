<script lang="ts">
	import type { DeckWithStats } from '$lib/types/flashcards';

	let {
		decks,
		onStudy,
		onSelectDeck,
		onEditDeck
	}: {
		decks: DeckWithStats[];
		onStudy: (deck: DeckWithStats) => void;
		onSelectDeck?: (deck: DeckWithStats) => void;
		onEditDeck?: (deck: DeckWithStats) => void;
	} = $props();
</script>

<div class="deck-list-container" role="list">
	{#each decks as deck (deck.id)}
		<div
			class="deck-row"
			style:padding-left={`${Math.max(0.75, (deck.depth || 0) * 1.5 + 0.75)}rem`}
			role="listitem"
		>
			{#if (deck.depth || 0) > 0}
				<div class="tree-branch-indicator" aria-hidden="true">
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M4 0v9a3 3 0 0 0 3 3h6" />
					</svg>
				</div>
			{/if}

			<div class="deck-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
					<rect x="3" y="4" width="18" height="16" rx="2" />
					<line x1="7" y1="8" x2="17" y2="8" />
					<line x1="7" y1="12" x2="13" y2="12" />
				</svg>
			</div>

			<div class="deck-info">
				<div class="deck-title-row">
					<span class="deck-name">{deck.name}</span>
					{#if deck.description}
						<span class="deck-desc">{deck.description}</span>
					{/if}
				</div>
				<div class="deck-meta">
					<span class="meta-item">
						<span class="meta-label">Total:</span> {deck.totalCards}
					</span>
					<span class="meta-separator">•</span>
					<span class="meta-item">
						<span class="meta-label">New:</span> <span class="badge-new">{deck.newCards}</span>
					</span>
					<span class="meta-separator">•</span>
					<span class="meta-item">
						<span class="meta-label">Due:</span> <span class="badge-due" class:has-due={deck.dueCards > 0}>{deck.dueCards}</span>
					</span>
					{#if deck.config?.new_cards_per_day}
						<span class="meta-separator">•</span>
						<span class="meta-limit">
							Limit: {deck.config.new_cards_per_day} new / {deck.config.max_reviews_per_day || 200} rev
						</span>
					{/if}
				</div>
			</div>

			<div class="deck-actions">
				{#if onEditDeck}
					<button
						type="button"
						class="btn-edit"
						title="Edit Deck Configuration"
						onclick={() => onEditDeck?.(deck)}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
					</button>
				{/if}
				<a
					href={`/flashcards/${deck.id}/study`}
					class="btn-study"
					class:highlight={deck.dueCards > 0 || deck.newCards > 0}
					onclick={(e) => {
						onStudy(deck);
					}}
				>
					<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
					<span>Study Now</span>
				</a>
			</div>
		</div>
	{/each}
</div>

<style>
	.deck-list-container {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 100%;
	}

	.deck-row {
		display: flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		gap: 0.75rem;
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.deck-row:hover {
		border-color: var(--border-focus);
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

	.deck-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		flex-shrink: 0;
	}

	.deck-icon svg {
		width: 16px;
		height: 16px;
	}

	.deck-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.deck-title-row {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}

	.deck-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.deck-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 300px;
	}

	.deck-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		color: var(--text-secondary);
	}

	.meta-item {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.meta-label {
		color: var(--text-muted);
	}

	.meta-separator {
		color: var(--border-subtle);
		font-size: 0.5rem;
	}

	.meta-limit {
		color: var(--text-muted);
		font-size: 0.6875rem;
	}

	.badge-new {
		font-weight: 600;
		color: var(--primary);
	}

	.badge-due {
		font-weight: 600;
		color: var(--text-secondary);
	}

	.badge-due.has-due {
		color: #d97706;
	}

	.deck-actions {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
	}

	.btn-edit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-primary);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-edit:hover {
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.btn-edit svg {
		width: 13px;
		height: 13px;
	}

	.btn-study {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.3125rem 0.625rem;
		font-size: 0.6875rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-primary);
		color: var(--text-secondary);
		text-decoration: none;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
	}

	.btn-study:hover {
		border-color: var(--primary);
		color: var(--text-primary);
	}

	.btn-study.highlight {
		background-color: var(--primary);
		border-color: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-study.highlight:hover {
		background-color: var(--primary-hover);
	}

	.btn-icon {
		width: 11px;
		height: 11px;
	}
</style>
