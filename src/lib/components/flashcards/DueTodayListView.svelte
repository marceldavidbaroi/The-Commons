<script lang="ts">
	import type { DueTodayItem } from '$lib/types/flashcards';

	let {
		cards,
		selectable = false,
		selectedCardIds = [],
		onToggleSelect,
		onSelectAll,
		onCardClick
	}: {
		cards: DueTodayItem[];
		selectable?: boolean;
		selectedCardIds?: (number | string)[];
		onToggleSelect?: (cardId: number | string) => void;
		onSelectAll?: (selectAll: boolean) => void;
		onCardClick?: (card: DueTodayItem) => void;
	} = $props();

	const isAllSelected = $derived(
		cards.length > 0 && cards.every((c) => selectedCardIds.some((id) => String(id) === String(c.id)))
	);

	function getQueueStateLabel(state: number): { label: string; cls: string } {
		switch (state) {
			case 0:
				return { label: 'New', cls: 'state-new' };
			case 1:
				return { label: 'Learning', cls: 'state-learning' };
			case 2:
				return { label: 'Review', cls: 'state-review' };
			case 3:
				return { label: 'Relearning', cls: 'state-relearning' };
			case -1:
				return { label: 'Suspended', cls: 'state-suspended' };
			default:
				return { label: 'Active', cls: 'state-review' };
		}
	}
</script>

<div class="due-list-container" role="list">
	{#if selectable && cards.length > 0}
		<div class="select-all-row">
			<label class="checkbox-container">
				<input
					type="checkbox"
					class="card-checkbox"
					checked={isAllSelected}
					onchange={(e) => onSelectAll?.((e.target as HTMLInputElement).checked)}
				/>
				<span class="select-all-label">
					{isAllSelected ? 'Deselect all' : 'Select all'} ({cards.length} cards)
				</span>
			</label>
		</div>
	{/if}

	{#each cards as card (card.id)}
		{@const stateInfo = getQueueStateLabel(card.queue_state)}
		{@const isSelected = selectedCardIds.some((id) => String(id) === String(card.id))}
		<div
			class="card-row"
			class:selected={isSelected}
			role="listitem"
			tabindex="0"
			onclick={() => onCardClick?.(card)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onCardClick?.(card);
				}
			}}
		>
			{#if selectable}
				<div class="checkbox-col" onclick={(e) => e.stopPropagation()} role="presentation">
					<input
						type="checkbox"
						class="card-checkbox"
						checked={isSelected}
						aria-label={`Select ${card.note_front || 'card'}`}
						onchange={() => onToggleSelect?.(card.id)}
					/>
				</div>
			{/if}

			<div class="queue-indicator {stateInfo.cls}" title={stateInfo.label}></div>

			<div class="card-content-area">
				<div class="card-front-back">
					<span class="card-front">{card.note_front || 'Untitled Card'}</span>
					<span class="arrow-separator">→</span>
					<span class="card-back">{card.note_back || '—'}</span>
				</div>

				<div class="card-meta">
					{#if card.deck_name}
						<span class="meta-deck">{card.deck_name}</span>
						<span class="meta-separator">•</span>
					{/if}
					<span class="state-badge {stateInfo.cls}">{stateInfo.label}</span>
					<span class="meta-separator">•</span>
					<span class="meta-interval">Int: {card.interval_days}d</span>
					<span class="meta-separator">•</span>
					<span class="meta-ease">Ease: {Number(card.ease_factor || 2.5).toFixed(2)}</span>
					{#if card.card_type === 1}
						<span class="meta-separator">•</span>
						<span class="meta-reverse">Reverse</span>
					{/if}
				</div>
			</div>

			<div class="card-actions">
				<a
					href={`/flashcards/${card.deck_id}/study`}
					class="btn-review"
					onclick={(e) => e.stopPropagation()}
				>
					Review
				</a>
			</div>
		</div>
	{/each}
</div>

<style>
	.due-list-container {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 100%;
	}

	.select-all-row {
		display: flex;
		align-items: center;
		padding: 0.35rem 0.5rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.checkbox-container {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		user-select: none;
	}

	.checkbox-col {
		display: flex;
		align-items: center;
		justify-content: center;
		padding-right: 0.25rem;
	}

	.card-checkbox {
		cursor: pointer;
		accent-color: var(--accent-primary, #3b82f6);
		width: 15px;
		height: 15px;
	}

	.card-row.selected {
		border-color: var(--accent-primary, #3b82f6);
		background-color: rgba(59, 130, 246, 0.08);
	}

	.card-row {
		display: flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		gap: 0.75rem;
		cursor: pointer;
		transition: border-color 0.15s ease, background-color 0.15s ease;
	}

	.card-row:hover {
		border-color: var(--border-focus);
		background-color: var(--bg-tertiary);
	}

	.queue-indicator {
		width: 4px;
		height: 24px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.queue-indicator.state-new {
		background-color: #3b82f6;
	}

	.queue-indicator.state-learning {
		background-color: #f59e0b;
	}

	.queue-indicator.state-review {
		background-color: #10b981;
	}

	.queue-indicator.state-relearning {
		background-color: #ef4444;
	}

	.queue-indicator.state-suspended {
		background-color: #6b7280;
	}

	.card-content-area {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.card-front-back {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}

	.card-front {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 320px;
	}

	.arrow-separator {
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	.card-back {
		font-size: 0.75rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 320px;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.meta-deck {
		font-weight: 500;
		color: var(--text-secondary);
	}

	.meta-separator {
		font-size: 0.5rem;
		color: var(--border-subtle);
	}

	.state-badge {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-xs, 3px);
	}

	.state-badge.state-new {
		background-color: #dbeafe;
		color: #1d4ed8;
	}

	.state-badge.state-learning {
		background-color: #fef3c7;
		color: #b45309;
	}

	.state-badge.state-review {
		background-color: #d1fae5;
		color: #047857;
	}

	.state-badge.state-relearning {
		background-color: #fee2e2;
		color: #b91c1c;
	}

	.state-badge.state-suspended {
		background-color: var(--bg-tertiary);
		color: var(--text-muted);
	}

	.meta-reverse {
		color: #8b5cf6;
		font-weight: 500;
	}

	.card-actions {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.btn-review {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		font-size: 0.6875rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-primary);
		color: var(--text-primary);
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.btn-review:hover {
		border-color: var(--primary);
		background-color: var(--primary);
		color: var(--primary-foreground);
	}
</style>
