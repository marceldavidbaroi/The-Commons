<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { CardRecord, CardReviewLogRecord, DueTodayItem, StudyQueueItem } from '$lib/types/flashcards';
	import { flashcardsStore } from '$lib/state/flashcards.svelte';

	let {
		isOpen = false,
		card = null,
		onClose,
		onCardUpdated
	}: {
		isOpen: boolean;
		card: CardRecord | DueTodayItem | StudyQueueItem | null;
		onClose: () => void;
		onCardUpdated?: (updated: CardRecord) => void;
	} = $props();

	let reviewLogs = $state<CardReviewLogRecord[]>([]);
	let isLoadingLogs = $state(false);
	let isActionInProgress = $state(false);
	let actionFeedback = $state<string | null>(null);

	// Load review logs when card changes or drawer opens
	$effect(() => {
		if (isOpen && card?.id) {
			loadLogs(card.id);
		} else {
			reviewLogs = [];
			actionFeedback = null;
		}
	});

	async function loadLogs(cardId: string) {
		isLoadingLogs = true;
		try {
			reviewLogs = await flashcardsStore.fetchCardLogs(cardId);
		} catch (err) {
			console.error('Failed to load card review logs:', err);
		} finally {
			isLoadingLogs = false;
		}
	}

	async function handleSuspend() {
		if (!card?.id || isActionInProgress) return;
		isActionInProgress = true;
		try {
			const updated = await flashcardsStore.suspendCard(card.id);
			actionFeedback = 'Card suspended';
			if (onCardUpdated) onCardUpdated(updated);
		} catch (err) {
			console.error('Failed to suspend card:', err);
			actionFeedback = 'Failed to suspend card';
		} finally {
			isActionInProgress = false;
			setTimeout(() => {
				actionFeedback = null;
			}, 3000);
		}
	}

	async function handleResetToNew() {
		if (!card?.id || isActionInProgress) return;
		isActionInProgress = true;
		try {
			const updated = await flashcardsStore.resetCardToNew(card.id);
			actionFeedback = 'Card reset to New';
			if (onCardUpdated) onCardUpdated(updated);
		} catch (err) {
			console.error('Failed to reset card to new:', err);
			actionFeedback = 'Failed to reset card';
		} finally {
			isActionInProgress = false;
			setTimeout(() => {
				actionFeedback = null;
			}, 3000);
		}
	}

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

	function getRatingLabel(rating: number): { label: string; cls: string } {
		switch (rating) {
			case 1:
				return { label: 'Again', cls: 'rating-again' };
			case 2:
				return { label: 'Hard', cls: 'rating-hard' };
			case 3:
				return { label: 'Normal', cls: 'rating-normal' };
			case 4:
				return { label: 'Easy', cls: 'rating-easy' };
			default:
				return { label: `Rating ${rating}`, cls: '' };
		}
	}

	function formatDate(iso: string | null | undefined): string {
		if (!iso) return '—';
		const date = new Date(iso);
		return date.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Front and back content extraction
	const frontContent = $derived.by(() => {
		if (!card) return '—';
		const anyCard = card as any;
		if (anyCard.note_front) return anyCard.note_front;
		if (anyCard.note?.fields) {
			const fields = anyCard.note.fields as Record<string, string>;
			const vals = Object.values(fields);
			const f = fields.front || fields.Front || fields.question || fields.Question || vals[0] || 'Front Content';
			const b = fields.back || fields.Back || fields.answer || fields.Answer || vals[1] || 'Back Content';
			return card.card_type === 1 ? b : f;
		}
		return 'Front';
	});

	const backContent = $derived.by(() => {
		if (!card) return '—';
		const anyCard = card as any;
		if (anyCard.note_back) return anyCard.note_back;
		if (anyCard.note?.fields) {
			const fields = anyCard.note.fields as Record<string, string>;
			const vals = Object.values(fields);
			const f = fields.front || fields.Front || fields.question || fields.Question || vals[0] || 'Front Content';
			const b = fields.back || fields.Back || fields.answer || fields.Answer || vals[1] || 'Back Content';
			return card.card_type === 1 ? f : b;
		}
		return 'Back';
	});

	const cardStateInfo = $derived.by(() => {
		if (!card) return { label: 'New', cls: 'state-new' };
		return getQueueStateLabel(card.queue_state);
	});
</script>

{#if isOpen && card}
	<!-- Backdrop -->
	<div
		class="drawer-backdrop"
		onclick={onClose}
		role="presentation"
		transition:fade={{ duration: 200, easing: cubicOut }}
	></div>

	<!-- Drawer Panel -->
	<aside
		class="card-drawer"
		aria-label="Card Preview & SRS Ledger"
		transition:fly={{ x: 440, duration: 250, easing: cubicOut }}
	>
		<!-- Drawer Header -->
		<div class="drawer-header">
			<div class="header-titles">
				<div class="header-top-row">
					<span class="panel-tag">CARD DETAILS</span>
					{#if card.card_type === 1}
						<span class="reverse-badge">Reverse</span>
					{/if}
				</div>
				<h2 class="panel-title">Flashcard Inspector</h2>
			</div>
			<button
				type="button"
				class="btn-close"
				onclick={onClose}
				aria-label="Close drawer"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>

		{#if actionFeedback}
			<div class="action-alert" role="status">
				<span>{actionFeedback}</span>
			</div>
		{/if}

		<div class="drawer-scroll-body">
			<!-- Section 1: Card Front & Back Content Preview -->
			<section class="drawer-section">
				<div class="section-header">
					<h3 class="section-title">Content</h3>
				</div>
				<div class="content-preview-box">
					<div class="preview-block">
						<span class="preview-label">Front</span>
						<div class="preview-text front-text">{frontContent}</div>
					</div>
					<div class="preview-divider"></div>
					<div class="preview-block">
						<span class="preview-label">Back</span>
						<div class="preview-text back-text">{backContent}</div>
					</div>
				</div>
			</section>

			<!-- Section 2: SRS State Metrics (6-card grid) -->
			<section class="drawer-section">
				<div class="section-header">
					<h3 class="section-title">SRS Metrics</h3>
				</div>
				<div class="metrics-grid">
					<div class="metric-card">
						<span class="metric-label">Queue State</span>
						<span class="metric-badge {cardStateInfo.cls}">{cardStateInfo.label}</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Interval</span>
						<span class="metric-value">{card.interval_days}d</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Ease Factor</span>
						<span class="metric-value">{Number(card.ease_factor || 2.5).toFixed(2)}</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Step Index</span>
						<span class="metric-value">{card.step_index}</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Repetitions</span>
						<span class="metric-value">{card.reps}</span>
					</div>
					<div class="metric-card">
						<span class="metric-label">Lapses</span>
						<span class="metric-value lapses-value">{card.lapses}</span>
					</div>
				</div>
			</section>

			<!-- Section 3: Historical Audit Ledger -->
			<section class="drawer-section">
				<div class="section-header">
					<h3 class="section-title">Review History</h3>
					<span class="ledger-count">{reviewLogs.length} logs</span>
				</div>

				{#if isLoadingLogs}
					<div class="ledger-loading">
						<div class="spinner-small"></div>
						<span>Loading audit history...</span>
					</div>
				{:else if reviewLogs.length === 0}
					<div class="ledger-empty">
						<span>No review logs recorded yet for this card.</span>
					</div>
				{:else}
					<div class="ledger-list" role="list">
						{#each reviewLogs as log (log.id)}
							{@const rating = getRatingLabel(log.rating)}
							<div class="ledger-row" role="listitem">
								<div class="ledger-col-main">
									<div class="ledger-rating-row">
										<span class="rating-badge {rating.cls}">{rating.label}</span>
										<span class="ledger-timestamp">{formatDate(log.reviewed_at)}</span>
									</div>
									<div class="ledger-transitions">
										<span class="transition-pill">
											Int: {log.previous_interval_days}d → {log.new_interval_days}d
										</span>
										<span class="transition-pill">
											Ease: {Number(log.previous_ease_factor).toFixed(2)} → {Number(log.new_ease_factor).toFixed(2)}
										</span>
									</div>
								</div>
								{#if log.time_taken_ms != null}
									<div class="ledger-col-latency" title="Response Latency">
										<span>{(log.time_taken_ms / 1000).toFixed(1)}s</span>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<!-- Drawer Footer Quick Actions -->
		<div class="drawer-footer">
			<button
				type="button"
				class="btn-action btn-suspend"
				onclick={handleSuspend}
				disabled={isActionInProgress || card.queue_state === -1}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10" />
					<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
				</svg>
				<span>{card.queue_state === -1 ? 'Suspended' : 'Suspend Card'}</span>
			</button>

			<button
				type="button"
				class="btn-action btn-reset"
				onclick={handleResetToNew}
				disabled={isActionInProgress}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="1 4 1 10 7 10" />
					<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
				</svg>
				<span>Reset to New</span>
			</button>
		</div>
	</aside>
{/if}

<style>
	.drawer-backdrop {
		position: fixed;
		inset: 0;
		background-color: rgba(0, 0, 0, 0.45);
		z-index: 100;
	}

	.card-drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		max-width: 440px;
		background-color: var(--bg-primary);
		border-left: 1px solid var(--border-subtle);
		box-shadow: -8px 0 24px rgba(0, 0, 0, 0.25);
		z-index: 101;
		display: flex;
		flex-direction: column;
	}

	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
	}

	.header-top-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.panel-tag {
		font-size: 0.625rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.reverse-badge {
		font-size: 0.625rem;
		font-weight: 600;
		color: #8b5cf6;
		background-color: rgba(139, 92, 246, 0.12);
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-xs, 3px);
	}

	.panel-title {
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		line-height: 1.2;
	}

	.btn-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-close:hover {
		background-color: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.btn-close svg {
		width: 16px;
		height: 16px;
	}

	.action-alert {
		padding: 0.5rem 1.25rem;
		background-color: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.75rem;
		font-weight: 600;
		text-align: center;
	}

	.drawer-scroll-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.drawer-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-title {
		font-size: 0.8125rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		margin: 0;
	}

	.ledger-count {
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}

	/* Content Preview Box */
	.content-preview-box {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		padding: 0.875rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.preview-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.preview-label {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		color: var(--text-muted);
		letter-spacing: 0.04em;
	}

	.preview-text {
		font-size: 0.875rem;
		color: var(--text-primary);
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.front-text {
		font-weight: 600;
	}

	.preview-divider {
		height: 1px;
		background-color: var(--border-subtle);
	}

	/* SRS Metrics Grid */
	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.metric-card {
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 0.5rem 0.625rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.metric-label {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--text-muted);
	}

	.metric-value {
		font-size: 0.875rem;
		font-weight: 700;
		font-family: var(--font-mono);
		color: var(--text-primary);
	}

	.metric-badge {
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-xs, 3px);
		display: inline-block;
		width: fit-content;
	}

	.state-new {
		background-color: #dbeafe;
		color: #1d4ed8;
	}

	.state-learning {
		background-color: #fef3c7;
		color: #b45309;
	}

	.state-review {
		background-color: #d1fae5;
		color: #047857;
	}

	.state-relearning {
		background-color: #fee2e2;
		color: #b91c1c;
	}

	.state-suspended {
		background-color: var(--bg-tertiary);
		color: var(--text-muted);
	}

	.lapses-value {
		color: #ef4444;
	}

	/* Audit Ledger */
	.ledger-loading,
	.ledger-empty {
		padding: 1.5rem 1rem;
		background-color: var(--bg-secondary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-md);
		text-align: center;
		font-size: 0.75rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.spinner-small {
		width: 14px;
		height: 14px;
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

	.ledger-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.ledger-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.75rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		gap: 0.75rem;
	}

	.ledger-col-main {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.ledger-rating-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.rating-badge {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.0625rem 0.3125rem;
		border-radius: var(--radius-xs, 3px);
	}

	.rating-again {
		background-color: #fee2e2;
		color: #dc2626;
	}

	.rating-hard {
		background-color: #ffedd5;
		color: #ea580c;
	}

	.rating-normal {
		background-color: #dbeafe;
		color: #2563eb;
	}

	.rating-easy {
		background-color: #d1fae5;
		color: #059669;
	}

	.ledger-timestamp {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.ledger-transitions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.transition-pill {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		color: var(--text-secondary);
	}

	.ledger-col-latency {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
		background-color: var(--bg-tertiary);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-xs, 3px);
		border: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	/* Drawer Footer Quick Actions */
	.drawer-footer {
		padding: 0.875rem 1.25rem;
		border-top: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-action {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		cursor: pointer;
		transition: all 0.15s ease;
		background-color: var(--bg-primary);
		color: var(--text-primary);
	}

	.btn-action svg {
		width: 14px;
		height: 14px;
	}

	.btn-action:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-suspend:hover:not(:disabled) {
		border-color: #f59e0b;
		background-color: #fef3c7;
		color: #b45309;
	}

	.btn-reset:hover:not(:disabled) {
		border-color: var(--primary);
		background-color: var(--primary);
		color: var(--primary-foreground);
	}
</style>
