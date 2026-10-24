<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { flashcardsStore } from '$lib/state/flashcards.svelte';
	import type { Rating } from '$lib/types/flashcards';
	import CardViewer from '$lib/components/flashcards/CardViewer.svelte';
	import ReviewRatingBar from '$lib/components/flashcards/ReviewRatingBar.svelte';
	import CardPreviewDrawer from '$lib/components/flashcards/CardPreviewDrawer.svelte';

	const deckId = $derived(page.params.deckId);

	// Card review timer to capture response latency
	let cardStartTime = $state<number>(Date.now());
	let isDrawerOpen = $state<boolean>(false);

	onMount(async () => {
		if (deckId) {
			// Preload hub data if decks are empty so deck name / config is available
			if (flashcardsStore.decks.length === 0) {
				await flashcardsStore.loadHubData();
			}
			await flashcardsStore.startStudySession(deckId);
			cardStartTime = Date.now();
		}
	});

	// Reset timer when card changes
	$effect(() => {
		if (flashcardsStore.currentCard) {
			cardStartTime = Date.now();
		}
	});

	const activeDeck = $derived(
		flashcardsStore.decks.find((d) => d.id === deckId) || flashcardsStore.activeDeck
	);

	const totalInSession = $derived(flashcardsStore.studyQueue.length);
	const currentIndex = $derived(flashcardsStore.activeCardIndex);
	const currentCard = $derived(flashcardsStore.currentCard);

	// Progress percentage
	const progressPercent = $derived(
		totalInSession > 0
			? Math.min(100, Math.round((currentIndex / totalInSession) * 100))
			: 100
	);

	function handleFlip() {
		flashcardsStore.toggleFlip();
	}

	async function handleRate(rating: Rating, ratingCode: number) {
		if (!currentCard) return;
		const timeTakenMs = Math.max(1, Date.now() - cardStartTime);
		await flashcardsStore.submitCardReview(ratingCode, timeTakenMs);
	}

	// Global distraction-free keyboard shortcuts
	function handleKeyDown(event: KeyboardEvent) {
		// Ignore if focus is in an input or textarea
		const target = event.target as HTMLElement;
		if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
			return;
		}

		if (!currentCard) {
			if (event.key === 'Escape' || event.key === 'Enter') {
				goto('/flashcards');
			}
			return;
		}

		// Space or Enter: Flip card
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			if (!flashcardsStore.isFlipped) {
				flashcardsStore.revealAnswer();
			}
			return;
		}

		// When card is flipped, keys 1-4 rate the card
		if (flashcardsStore.isFlipped) {
			if (event.key === '1') {
				event.preventDefault();
				handleRate('again', 1);
			} else if (event.key === '2') {
				event.preventDefault();
				handleRate('hard', 2);
			} else if (event.key === '3') {
				event.preventDefault();
				handleRate('normal', 3);
			} else if (event.key === '4') {
				event.preventDefault();
				handleRate('easy', 4);
			}
		}

		// Escape: Close drawer if open, otherwise exit study player
		if (event.key === 'Escape') {
			event.preventDefault();
			if (isDrawerOpen) {
				isDrawerOpen = false;
			} else {
				goto('/flashcards');
			}
			return;
		}

		// 'i': Toggle card inspector drawer
		if (event.key === 'i' || event.key === 'I') {
			if (currentCard) {
				event.preventDefault();
				isDrawerOpen = !isDrawerOpen;
			}
			return;
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<svelte:head>
	<title>
		Study {activeDeck ? `— ${activeDeck.name}` : ''} — The Commons
	</title>
</svelte:head>

<div class="study-container">
	<!-- Top Bar / Session Header (~40px) -->
	<header class="study-header">
		<div class="header-left">
			<a href="/flashcards" class="btn-back" title="Return to Flashcards Hub (Esc)">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M19 12H5M12 19l-7-7 7-7" />
				</svg>
				<span>Exit</span>
			</a>
			<div class="deck-title-group">
				<h1 class="deck-title">{activeDeck?.name || 'Deck Study'}</h1>
			</div>
		</div>

		<div class="header-right">
			<div class="queue-tallies">
				<span class="tally new-tally" title="New cards in queue">
					{flashcardsStore.newCardsCount} new
				</span>
				<span class="tally-separator">•</span>
				<span class="tally due-tally" title="Learning / Review cards due">
					{flashcardsStore.dueTodayCount} due
				</span>
			</div>
			<div class="card-counter">
				{totalInSession > 0 ? currentIndex + 1 : 0} / {totalInSession}
			</div>
			{#if currentCard}
				<button
					type="button"
					class="btn-inspect"
					onclick={() => (isDrawerOpen = true)}
					title="Inspect card metrics and review history (i)"
					aria-label="Inspect card"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="16" x2="12" y2="12" />
						<line x1="12" y1="8" x2="12.01" y2="8" />
					</svg>
				</button>
			{/if}
		</div>
	</header>

	<!-- Linear Progress Bar -->
	<div class="progress-bar-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100">
		<div class="progress-bar-fill" style:width={`${progressPercent}%`}></div>
	</div>

	<!-- Main Study Canvas -->
	<main class="study-main">
		{#if flashcardsStore.isLoading}
			<div class="status-panel">
				<div class="spinner"></div>
				<p>Preparing study queue...</p>
			</div>
		{:else if !currentCard}
			<!-- Session Complete / Zero-State Recovery -->
			<div class="completion-panel">
				<div class="completion-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
				</div>
				<h2 class="completion-title">Session Complete!</h2>
				<p class="completion-desc">
					You have completed all scheduled cards for <strong>{activeDeck?.name || 'this deck'}</strong> today.
				</p>
				<div class="completion-actions">
					<a href="/flashcards" class="btn btn-primary">
						Return to Flashcards
					</a>
				</div>
			</div>
		{:else}
			<!-- Flashcard Viewport -->
			<div class="card-stage">
				<CardViewer
					card={currentCard}
					isFlipped={flashcardsStore.isFlipped}
					onFlip={handleFlip}
				/>
			</div>

			<!-- Interactive Action Footer (Flipped vs Unflipped) -->
			<footer class="study-footer">
				{#if !flashcardsStore.isFlipped}
					<div class="reveal-control">
						<button
							type="button"
							class="btn-reveal"
							onclick={handleFlip}
						>
							<span>Show Answer</span>
							<kbd class="shortcut-kbd">Space</kbd>
						</button>
					</div>
				{:else}
					<ReviewRatingBar
						card={currentCard}
						deckConfig={activeDeck?.config}
						disabled={flashcardsStore.isSubmittingReview}
						onRate={handleRate}
					/>
				{/if}
			</footer>
		{/if}
	</main>

	<!-- Slide-Over Card Preview Drawer & Audit Ledger -->
	<CardPreviewDrawer
		isOpen={isDrawerOpen}
		card={currentCard}
		onClose={() => (isDrawerOpen = false)}
		onCardUpdated={(updated) => {
			if (currentCard && currentCard.id === updated.id) {
				flashcardsStore.studyQueue = flashcardsStore.studyQueue.map((c) =>
					c.id === updated.id ? { ...c, ...updated } : c
				);
			}
		}}
	/>
</div>

<style>
	.study-container {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 860px;
		margin: 0 auto;
		min-height: calc(100vh - 5rem);
		gap: 0.75rem;
	}

	/* Top Bar Header */
	.study-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 40px;
		padding: 0 0.25rem;
	}

	.btn-inspect {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-inspect:hover {
		border-color: var(--primary);
		color: var(--primary);
		background-color: var(--bg-primary);
	}

	.btn-inspect svg {
		width: 15px;
		height: 15px;
	}

	.header-left,
	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn-back {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		padding: 0.3125rem 0.5rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		transition: all 0.15s ease;
		cursor: pointer;
	}

	.btn-back:hover {
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.btn-back svg {
		width: 13px;
		height: 13px;
	}

	.deck-title-group {
		display: flex;
		align-items: center;
	}

	.deck-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
		letter-spacing: -0.01em;
	}

	.queue-tallies {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		font-family: var(--font-mono);
	}

	.new-tally {
		color: #3b82f6;
		font-weight: 600;
	}

	.due-tally {
		color: #f59e0b;
		font-weight: 600;
	}

	.tally-separator {
		color: var(--border-subtle);
		font-size: 0.5rem;
	}

	.card-counter {
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--font-mono);
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
		color: var(--text-secondary);
	}

	/* Progress Bar */
	.progress-bar-track {
		width: 100%;
		height: 3px;
		background-color: var(--border-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background-color: var(--primary);
		transition: width 0.2s ease-out;
	}

	/* Main Stage Area */
	.study-main {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 1.25rem;
		justify-content: center;
		align-items: center;
		width: 100%;
	}

	.card-stage {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	/* Footer Action Bar */
	.study-footer {
		width: 100%;
		display: flex;
		justify-content: center;
		min-height: 56px;
	}

	.reveal-control {
		width: 100%;
		max-width: 420px;
		display: flex;
		justify-content: center;
	}

	.btn-reveal {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		padding: 0.75rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		border-radius: var(--radius-md);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-secondary);
		color: var(--text-primary);
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
		transition: all 0.15s ease;
	}

	.btn-reveal:hover {
		border-color: var(--primary);
		background-color: var(--bg-tertiary);
		transform: translateY(-1px);
	}

	.shortcut-kbd {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		background-color: var(--bg-tertiary);
		border: 1px solid var(--border-subtle);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
	}

	/* Status & Completion Panel */
	.status-panel,
	.completion-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3.5rem 1.5rem;
		text-align: center;
		gap: 0.75rem;
		background-color: var(--bg-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 540px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
	}

	.spinner {
		width: 28px;
		height: 28px;
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

	.completion-icon {
		width: 48px;
		height: 48px;
		color: #10b981;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.completion-icon svg {
		width: 100%;
		height: 100%;
	}

	.completion-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
		margin: 0;
	}

	.completion-desc {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		max-width: 360px;
		margin: 0;
		line-height: 1.5;
	}

	.completion-actions {
		margin-top: 0.5rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.875rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		cursor: pointer;
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary:hover {
		background-color: var(--primary-hover);
	}
</style>
