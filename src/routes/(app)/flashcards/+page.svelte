<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { flashcardsStore } from '$lib/state/flashcards.svelte';
	import type { DeckWithStats, CardTypeRecord, DueTodayItem } from '$lib/types/flashcards';
	import FlashcardToolbar from '$lib/components/flashcards/FlashcardToolbar.svelte';
	import DeckListView from '$lib/components/flashcards/DeckListView.svelte';
	import CardTypeListView from '$lib/components/flashcards/CardTypeListView.svelte';
	import DueTodayListView from '$lib/components/flashcards/DueTodayListView.svelte';
	import DeckModal from '$lib/components/flashcards/DeckModal.svelte';
	import CardPreviewDrawer from '$lib/components/flashcards/CardPreviewDrawer.svelte';

	let searchQuery = $state('');
	let activeTab = $state<'decks' | 'card_types' | 'due_today'>('decks');

	// Deck Modal State
	let isDeckModalOpen = $state(false);
	let editingDeck = $state<DeckWithStats | null>(null);

	// Card Preview Drawer State
	let isPreviewDrawerOpen = $state(false);
	let inspectedCard = $state<DueTodayItem | null>(null);

	onMount(() => {
		flashcardsStore.loadHubData();
	});

	// Hierarchical decks resolution with depth computation
	const hierarchicalDecks = $derived.by(() => {
		const rawDecks = flashcardsStore.decksWithStats;
		const query = searchQuery.trim().toLowerCase();

		const filtered = query
			? rawDecks.filter(
					(d) =>
						d.name.toLowerCase().includes(query) ||
						(d.description && d.description.toLowerCase().includes(query))
				)
			: rawDecks;

		// Build map of children
		const deckMap = new Map<string, DeckWithStats>();
		const childrenMap = new Map<string, DeckWithStats[]>();

		rawDecks.forEach((d) => deckMap.set(d.id, d));
		filtered.forEach((d) => {
			if (d.parent_id && deckMap.has(d.parent_id)) {
				const current = childrenMap.get(d.parent_id) || [];
				current.push(d);
				childrenMap.set(d.parent_id, current);
			}
		});

		const result: DeckWithStats[] = [];
		const visited = new Set<string>();

		function traverse(deck: DeckWithStats, depth: number) {
			if (visited.has(deck.id)) return;
			visited.add(deck.id);
			result.push({ ...deck, depth });
			const children = childrenMap.get(deck.id) || [];
			children.forEach((child) => traverse(child, depth + 1));
		}

		// Root decks first
		filtered.forEach((d) => {
			if (!d.parent_id || !deckMap.has(d.parent_id)) {
				traverse(d, 0);
			}
		});

		// Remaining orphaned / searched decks
		filtered.forEach((d) => {
			if (!visited.has(d.id)) {
				traverse(d, 0);
			}
		});

		return result;
	});

	// Filtered Card Types
	const filteredCardTypes = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return flashcardsStore.cardTypes;
		return flashcardsStore.cardTypes.filter(
			(ct) =>
				ct.name.toLowerCase().includes(query) ||
				ct.fields_schema?.some((f) => f.name.toLowerCase().includes(query) || f.label.toLowerCase().includes(query))
		);
	});

	// Filtered Due Today Cards
	const filteredDueCards = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return flashcardsStore.dueCards;
		return flashcardsStore.dueCards.filter(
			(c) =>
				(c.note_front && c.note_front.toLowerCase().includes(query)) ||
				(c.note_back && c.note_back.toLowerCase().includes(query)) ||
				(c.deck_name && c.deck_name.toLowerCase().includes(query))
		);
	});

	const counts = $derived({
		decks: flashcardsStore.decks.length,
		cardTypes: flashcardsStore.cardTypes.length,
		dueToday: flashcardsStore.dueCards.length
	});

	function handleStudyDeck(deck: DeckWithStats) {
		goto(`/flashcards/${deck.id}/study`);
	}

	function handleNewDeck() {
		editingDeck = null;
		isDeckModalOpen = true;
	}

	function handleEditDeck(deck: DeckWithStats) {
		editingDeck = deck;
		isDeckModalOpen = true;
	}

	async function handleSaveDeck(deckData: {
		name: string;
		description: string | null;
		parent_id: string | null;
		config: {
			new_cards_per_day: number;
			max_reviews_per_day: number;
			learn_steps_minutes: number[];
			leech_threshold: number;
		};
	}) {
		if (editingDeck) {
			await flashcardsStore.updateDeck(editingDeck.id, deckData);
		} else {
			await flashcardsStore.createDeck(deckData);
		}
	}

	function handleAddCard() {
		goto('/flashcards/notes/new');
	}
</script>

<svelte:head>
	<title>Flashcards — The Commons</title>
</svelte:head>

<div class="flashcards-page">
	<!-- Tier 1: Page Header & Primary Actions (~40-44px) -->
	<header class="tier-header">
		<div class="header-left">
			<h1 class="page-title">Flashcards</h1>
			<span class="count-badge" title="Total active decks">{counts.decks}</span>
		</div>
		<div class="header-actions">
			<button
				type="button"
				class="btn btn-secondary"
				onclick={handleNewDeck}
			>
				<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>New Deck</span>
			</button>
			<button
				type="button"
				class="btn btn-primary"
				onclick={handleAddCard}
			>
				<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
				<span>Add Card</span>
			</button>
		</div>
	</header>

	<!-- Tier 2: Unified Interactive Toolbar (~36-40px) -->
	<FlashcardToolbar
		bind:searchQuery
		bind:activeTab
		{counts}
	/>

	<!-- Main Working Canvas / Itemized List Container -->
	<main class="content-container">
		{#if flashcardsStore.isLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<span>Loading flashcards...</span>
			</div>
		{:else if activeTab === 'decks'}
			{#if hierarchicalDecks.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<rect x="3" y="4" width="18" height="16" rx="2" />
							<line x1="7" y1="8" x2="17" y2="8" />
							<line x1="7" y1="12" x2="13" y2="12" />
						</svg>
					</div>
					<h3 class="empty-title">
						{searchQuery ? 'No matching decks found' : 'No decks yet'}
					</h3>
					<p class="empty-desc">
						{searchQuery
							? 'Try clearing your search query.'
							: 'Create your first deck to start practicing spaced repetition.'}
					</p>
					{#if searchQuery}
						<button
							type="button"
							class="btn btn-secondary compact"
							onclick={() => (searchQuery = '')}
						>
							Clear Search
						</button>
					{:else}
						<button
							type="button"
							class="btn btn-primary compact"
							onclick={handleNewDeck}
						>
							Create Deck
						</button>
					{/if}
				</div>
			{:else}
				<DeckListView
					decks={hierarchicalDecks}
					onStudy={handleStudyDeck}
					onEditDeck={handleEditDeck}
				/>
			{/if}
		{:else if activeTab === 'card_types'}
			{#if filteredCardTypes.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
					</div>
					<h3 class="empty-title">
						{searchQuery ? 'No matching card types found' : 'No card types yet'}
					</h3>
					<p class="empty-desc">
						Card types define the schema fields and generation modes for your cards.
					</p>
					{#if searchQuery}
						<button
							type="button"
							class="btn btn-secondary compact"
							onclick={() => (searchQuery = '')}
						>
							Clear Search
						</button>
					{:else}
						<a href="/flashcards/card-types/new" class="btn btn-primary compact">
							Create Card Type
						</a>
					{/if}
				</div>
			{:else}
				<CardTypeListView cardTypes={filteredCardTypes} />
			{/if}
		{:else if activeTab === 'due_today'}
			{#if filteredDueCards.length === 0}
				<div class="empty-state">
					<div class="empty-icon success-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
					</div>
					<h3 class="empty-title">All caught up!</h3>
					<p class="empty-desc">
						No cards are currently due for review across your decks. Excellent work!
					</p>
				</div>
			{:else}
				<DueTodayListView
					cards={filteredDueCards}
					onCardClick={(card) => {
						inspectedCard = card;
						isPreviewDrawerOpen = true;
					}}
				/>
			{/if}
		{/if}
	</main>

	<!-- In-Place Deck Modal for Creation & Configuration -->
	<DeckModal
		isOpen={isDeckModalOpen}
		decks={flashcardsStore.decks}
		initialDeck={editingDeck}
		onClose={() => {
			isDeckModalOpen = false;
			editingDeck = null;
		}}
		onSave={handleSaveDeck}
	/>

	<!-- Slide-Over Card Preview Drawer & Audit Ledger -->
	<CardPreviewDrawer
		isOpen={isPreviewDrawerOpen}
		card={inspectedCard}
		onClose={() => {
			isPreviewDrawerOpen = false;
			inspectedCard = null;
		}}
		onCardUpdated={(updated) => {
			if (inspectedCard && inspectedCard.id === updated.id) {
				inspectedCard = {
					...inspectedCard,
					...updated
				};
			}
		}}
	/>
</div>

<style>
	.flashcards-page {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
	}

	/* Tier 1 Header (~40px) */
	.tier-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 40px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.page-title {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--text-primary);
		letter-spacing: -0.02em;
		line-height: 1;
		margin: 0;
	}

	.count-badge {
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--font-mono);
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-full);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Working Canvas */
	.content-container {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 100%;
	}

	/* Empty & Loading States */
	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		background-color: var(--bg-secondary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-md);
		text-align: center;
		gap: 0.625rem;
	}

	.loading-state {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.spinner {
		width: 24px;
		height: 24px;
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

	.empty-icon {
		width: 36px;
		height: 36px;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.empty-icon svg {
		width: 100%;
		height: 100%;
	}

	.empty-icon.success-icon {
		color: #10b981;
	}

	.empty-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.empty-desc {
		font-size: 0.75rem;
		color: var(--text-secondary);
		max-width: 340px;
		margin: 0;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.4375rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
		text-decoration: none;
	}

	.btn.compact {
		padding: 0.3125rem 0.625rem;
	}

	.btn-icon {
		width: 14px;
		height: 14px;
	}

	.btn-primary {
		background-color: var(--primary);
		color: var(--primary-foreground);
	}

	.btn-primary:hover:not(:disabled) {
		background-color: var(--primary-hover);
	}

	.btn-secondary {
		background-color: var(--bg-tertiary);
		border-color: var(--border-subtle);
		color: var(--text-primary);
	}

	.btn-secondary:hover {
		background-color: var(--bg-secondary);
		border-color: var(--border-focus);
	}
</style>
