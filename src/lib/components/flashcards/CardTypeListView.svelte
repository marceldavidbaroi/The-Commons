<script lang="ts">
	import type { CardTypeRecord } from '$lib/types/flashcards';

	let {
		cardTypes
	}: {
		cardTypes: CardTypeRecord[];
	} = $props();
</script>

<div class="card-types-list-container" role="list">
	{#each cardTypes as cardType (cardType.id)}
		<div class="type-row" role="listitem">
			<div class="type-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="16" y1="13" x2="8" y2="13" />
					<line x1="16" y1="17" x2="8" y2="17" />
					<polyline points="10 9 9 9 8 9" />
				</svg>
			</div>

			<div class="type-info">
				<div class="type-header-line">
					<span class="type-name">{cardType.name}</span>
					{#if cardType.has_reverse}
						<span class="badge badge-reverse">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<polyline points="17 1 21 5 17 9" />
								<path d="M3 11V9a4 4 0 0 1 4-4h14" />
								<polyline points="7 23 3 19 7 15" />
								<path d="M21 13v2a4 4 0 0 1-4 4H3" />
							</svg>
							Bidirectional (2 cards)
						</span>
					{:else}
						<span class="badge badge-forward">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="5" y1="12" x2="19" y2="12" />
								<polyline points="12 5 19 12 12 19" />
							</svg>
							Forward Only (1 card)
						</span>
					{/if}
				</div>

				<!-- Field schema chips -->
				<div class="schema-chips">
					<span class="schema-label">Fields ({cardType.fields_schema?.length || 0}):</span>
					{#each (cardType.fields_schema || []) as field}
						<span class="field-chip">
							<span class="field-key">{field.name}</span>
							{#if field.label && field.label !== field.name}
								<span class="field-label-text">({field.label})</span>
							{/if}
						</span>
					{/each}
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.card-types-list-container {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 100%;
	}

	.type-row {
		display: flex;
		align-items: center;
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		gap: 0.75rem;
		transition: border-color 0.15s ease;
	}

	.type-row:hover {
		border-color: var(--border-focus);
	}

	.type-icon {
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

	.type-icon svg {
		width: 16px;
		height: 16px;
	}

	.type-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.type-header-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.type-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		padding: 0.0625rem 0.4375rem;
		border-radius: var(--radius-sm);
	}

	.badge svg {
		width: 11px;
		height: 11px;
	}

	.badge-reverse {
		background-color: #ede9fe;
		color: #6d28d9;
	}

	.badge-forward {
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
	}

	.schema-chips {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.schema-label {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.field-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.1875rem;
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		background-color: var(--bg-primary);
		border: 1px solid var(--border-subtle);
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius-xs, 3px);
		color: var(--text-primary);
	}

	.field-key {
		font-weight: 600;
	}

	.field-label-text {
		color: var(--text-muted);
	}
</style>
