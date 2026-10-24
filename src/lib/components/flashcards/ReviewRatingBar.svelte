<script lang="ts">
	import type { CardRecord, Rating, DeckConfig } from '$lib/types/flashcards';
	import { processReview } from '$lib/features/flashcards/srs-engine';

	let {
		card,
		deckConfig,
		disabled = false,
		onRate
	}: {
		card: CardRecord;
		deckConfig?: DeckConfig;
		disabled?: boolean;
		onRate: (rating: Rating, ratingCode: number) => void;
	} = $props();

	const learnSteps = $derived(deckConfig?.learn_steps_minutes || [1, 10]);
	const leechThreshold = $derived(deckConfig?.leech_threshold || 8);

	// Calculate predictive transitions using pure SM-2 logic
	const predictions = $derived.by(() => {
		try {
			const againRes = processReview(card, 1, learnSteps, leechThreshold);
			const hardRes = processReview(card, 2, learnSteps, leechThreshold);
			const normalRes = processReview(card, 3, learnSteps, leechThreshold);
			const easyRes = processReview(card, 4, learnSteps, leechThreshold);

			return {
				again: formatInterval(againRes.updatedCard),
				hard: formatInterval(hardRes.updatedCard),
				normal: formatInterval(normalRes.updatedCard),
				easy: formatInterval(easyRes.updatedCard)
			};
		} catch (e) {
			return {
				again: '<10m',
				hard: '1d',
				normal: '3d',
				easy: '4d'
			};
		}
	});

	function formatInterval(c: CardRecord): string {
		if (c.queue_state === -1) return 'Suspend';
		if (c.queue_state === 1 || c.queue_state === 3) {
			if (c.interval_days === 0) return '<10m';
		}
		if (c.interval_days <= 1) return '1d';
		if (c.interval_days < 30) return `${c.interval_days}d`;
		if (c.interval_days < 365) return `${(c.interval_days / 30).toFixed(1)}mo`;
		return `${(c.interval_days / 365).toFixed(1)}y`;
	}

	const buttons: Array<{
		key: Rating;
		code: number;
		label: string;
		shortcut: string;
		btnClass: string;
	}> = [
		{ key: 'again', code: 1, label: 'Again', shortcut: '1', btnClass: 'btn-again' },
		{ key: 'hard', code: 2, label: 'Hard', shortcut: '2', btnClass: 'btn-hard' },
		{ key: 'normal', code: 3, label: 'Normal', shortcut: '3', btnClass: 'btn-normal' },
		{ key: 'easy', code: 4, label: 'Easy', shortcut: '4', btnClass: 'btn-easy' }
	];
</script>

<div class="rating-bar-container" role="group" aria-label="Card Review Rating">
	{#each buttons as btn}
		<button
			type="button"
			class="rating-btn {btn.btnClass}"
			{disabled}
			onclick={() => onRate(btn.key, btn.code)}
			aria-keyshortcuts={btn.shortcut}
		>
			<span class="btn-top-row">
				<span class="btn-label">{btn.label}</span>
				<kbd class="shortcut-key">[{btn.shortcut}]</kbd>
			</span>
			<span class="interval-preview">
				{predictions[btn.key]}
			</span>
		</button>
	{/each}
</div>

<style>
	.rating-bar-container {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.625rem;
		width: 100%;
		max-width: 680px;
		margin: 0 auto;
	}

	.rating-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.625rem 0.5rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		cursor: pointer;
		outline: none;
		gap: 0.25rem;
		transition: all 0.15s ease;
		min-height: 54px;
	}

	.rating-btn:hover:not(:disabled) {
		border-color: var(--border-focus);
		transform: translateY(-1px);
	}

	.rating-btn:focus-visible {
		box-shadow: 0 0 0 2px var(--primary);
	}

	.rating-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-top-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
	}

	.btn-label {
		font-size: 0.8125rem;
		font-weight: 700;
	}

	.shortcut-key {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		opacity: 0.7;
	}

	.interval-preview {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
		font-weight: 500;
	}

	/* Specific Button Color Nuances (Anti-blur, solid styling) */
	.btn-again {
		border-color: rgba(239, 68, 68, 0.35);
		color: #ef4444;
	}
	.btn-again:hover:not(:disabled) {
		background-color: rgba(239, 68, 68, 0.08);
		border-color: #ef4444;
	}

	.btn-hard {
		border-color: rgba(245, 158, 11, 0.35);
		color: #f59e0b;
	}
	.btn-hard:hover:not(:disabled) {
		background-color: rgba(245, 158, 11, 0.08);
		border-color: #f59e0b;
	}

	.btn-normal {
		border-color: rgba(59, 130, 246, 0.35);
		color: #3b82f6;
	}
	.btn-normal:hover:not(:disabled) {
		background-color: rgba(59, 130, 246, 0.08);
		border-color: #3b82f6;
	}

	.btn-easy {
		border-color: rgba(16, 185, 129, 0.35);
		color: #10b981;
	}
	.btn-easy:hover:not(:disabled) {
		background-color: rgba(16, 185, 129, 0.08);
		border-color: #10b981;
	}
</style>
