<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { flashcardsStore } from "$lib/state/flashcards.svelte";
	import type { DeckWithStats, DueTodayItem } from "$lib/types/flashcards";
	import DeckListView from "$lib/components/flashcards/DeckListView.svelte";
	import DeckModal from "$lib/components/flashcards/DeckModal.svelte";
	import DeckCsvUploadModal from "$lib/components/flashcards/DeckCsvUploadModal.svelte";
	import QuickAddCardModal from "$lib/components/flashcards/QuickAddCardModal.svelte";
	import CardPreviewDrawer from "$lib/components/flashcards/CardPreviewDrawer.svelte";

	import DueTodayListView from "$lib/components/flashcards/DueTodayListView.svelte";
	import { fetchCardsForDeck } from "$lib/services/flashcards-service";

	import { page } from "$app/stores";

	// Deck Modal State
	let isDeckModalOpen = $state(false);
	let editingDeck = $state<DeckWithStats | null>(null);
	let creatingParentDeckId = $state<number | string | null>(null);
	let currentDeckFolderId = $state<number | string | null>(null);

	// CSV Upload Modal State
	let isCsvModalOpen = $state(false);
	let csvTargetDeck = $state<DeckWithStats | null>(null);

	// Quick Add Card Modal State
	let isQuickAddOpen = $state(false);
	let quickAddTargetDeck = $state<DeckWithStats | null>(null);

	// Cards inside the current deck folder
	let folderCards = $state<DueTodayItem[]>([]);
	let isLoadingFolderCards = $state(false);
	let selectedFolderCardIds = $state<(number | string)[]>([]);
	let isDeletingBulkCards = $state(false);

	// Card Preview Drawer State
	let isPreviewDrawerOpen = $state(false);
	let inspectedCard = $state<DueTodayItem | null>(null);

	$effect(() => {
		if (currentDeckFolderId) {
			loadFolderCards(currentDeckFolderId);
		} else {
			folderCards = [];
		}
	});

	async function loadFolderCards(deckId: number | string) {
		isLoadingFolderCards = true;
		selectedFolderCardIds = [];
		try {
			folderCards = await fetchCardsForDeck(deckId);
		} catch (err) {
			console.error("Failed to load cards for deck:", err);
		} finally {
			isLoadingFolderCards = false;
		}
	}

	function handleToggleSelectCard(cardId: number | string) {
		const strId = String(cardId);
		if (selectedFolderCardIds.some((id) => String(id) === strId)) {
			selectedFolderCardIds = selectedFolderCardIds.filter(
				(id) => String(id) !== strId,
			);
		} else {
			selectedFolderCardIds = [...selectedFolderCardIds, cardId];
		}
	}

	function handleSelectAllCards(selectAll: boolean) {
		if (selectAll) {
			selectedFolderCardIds = folderCards.map((c) => c.id);
		} else {
			selectedFolderCardIds = [];
		}
	}

	async function handleBulkDeleteCards() {
		if (selectedFolderCardIds.length === 0 || isDeletingBulkCards) return;
		const count = selectedFolderCardIds.length;
		if (
			!confirm(
				`Are you sure you want to delete ${count} selected card${count > 1 ? "s" : ""}?`,
			)
		) {
			return;
		}

		isDeletingBulkCards = true;
		try {
			await flashcardsStore.deleteCards(selectedFolderCardIds);
			const deletedSet = new Set(
				selectedFolderCardIds.map((id) => String(id)),
			);
			folderCards = folderCards.filter(
				(c) => !deletedSet.has(String(c.id)),
			);
			selectedFolderCardIds = [];
		} catch (err) {
			console.error("Failed to bulk delete cards:", err);
		} finally {
			isDeletingBulkCards = false;
		}
	}

	onMount(() => {
		const queryDeck = $page.url.searchParams.get("deck");
		if (queryDeck) {
			currentDeckFolderId = isNaN(Number(queryDeck))
				? queryDeck
				: Number(queryDeck);
		}
		flashcardsStore.loadHubData();
	});

	function setDeckFolder(deckId: number | string | null) {
		currentDeckFolderId = deckId;
		const url = new URL(window.location.href);
		if (deckId !== null && deckId !== undefined) {
			url.searchParams.set("deck", String(deckId));
		} else {
			url.searchParams.delete("deck");
		}
		goto(url.pathname + url.search, {
			replaceState: true,
			noScroll: true,
			keepFocus: true,
		});
	}

	// Current folder deck object
	const currentFolderDeck = $derived(
		currentDeckFolderId
			? flashcardsStore.decksWithStats.find(
					(d) => String(d.id) === String(currentDeckFolderId),
				)
			: null,
	);

	// Hierarchical decks resolution: when in folder, show its direct children; when at root, show root decks
	const displayedDecks = $derived.by(() => {
		const rawDecks = flashcardsStore.decksWithStats;
		if (currentDeckFolderId) {
			return rawDecks.filter(
				(d) => String(d.parent_id) === String(currentDeckFolderId),
			);
		} else {
			return rawDecks.filter((d) => !d.parent_id);
		}
	});

	// Filtered Card Types
	const counts = $derived({
		decks: flashcardsStore.decks.length,
	});

	function handleStudyDeck(deck: DeckWithStats) {
		goto(`/flashcards/${deck.id}/study`);
	}

	function handleOpenDeckFolder(deck: DeckWithStats) {
		setDeckFolder(deck.id);
	}

	function handleNewDeck() {
		editingDeck = null;
		creatingParentDeckId = currentDeckFolderId;
		isDeckModalOpen = true;
	}

	function handleAddSubdeck(parentDeck: DeckWithStats) {
		editingDeck = null;
		creatingParentDeckId = parentDeck.id;
		isDeckModalOpen = true;
	}

	function handleEditDeck(deck: DeckWithStats) {
		editingDeck = deck;
		creatingParentDeckId = deck.parent_id;
		isDeckModalOpen = true;
	}

	async function handleSaveDeck(deckData: {
		name: string;
		description: string | null;
		parent_id: number | string | null;
		config: {
			new_cards_per_day: number;
			max_reviews_per_day: number;
			learn_steps_minutes: number[];
			leech_threshold: number;
			card_type_id?: number | string | null;
		};
	}) {
		if (editingDeck) {
			await flashcardsStore.updateDeck(editingDeck.id, deckData);
		} else {
			await flashcardsStore.createDeck(deckData);
		}
	}

	async function handleDeleteDeck(id: number | string) {
		await flashcardsStore.deleteDeck(id);
		if (String(currentDeckFolderId) === String(id)) {
			setDeckFolder(null);
		}
	}

	function handleOpenCsvUpload(deck: DeckWithStats) {
		csvTargetDeck = deck;
		isCsvModalOpen = true;
	}

	async function handleCsvUpload(
		deckId: number | string,
		cardTypeId: number | string,
		items: Record<string, string>[],
	) {
		for (const fields of items) {
			await flashcardsStore.createFlashcardNote(
				deckId,
				cardTypeId,
				fields,
				["csv-import"],
			);
		}
		if (
			currentDeckFolderId &&
			String(currentDeckFolderId) === String(deckId)
		) {
			await loadFolderCards(deckId);
		}
	}

	function handleAddCard(deck?: DeckWithStats | null) {
		quickAddTargetDeck = deck || currentFolderDeck || null;
		isQuickAddOpen = true;
	}

	async function handleQuickAddCard(payload: {
		deckId: number | string;
		cardTypeId: number | string;
		fields: Record<string, string>;
		tags: string[];
	}) {
		await flashcardsStore.createFlashcardNote(
			payload.deckId,
			payload.cardTypeId,
			payload.fields,
			payload.tags
		);

		// If viewing this deck, refresh cards in place without leaving the page
		if (
			currentDeckFolderId &&
			String(currentDeckFolderId) === String(payload.deckId)
		) {
			await loadFolderCards(payload.deckId);
		}
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
			<span class="count-badge" title="Total active decks"
				>{counts.decks}</span
			>
		</div>
		<div class="header-actions">
			<button
				type="button"
				class="btn btn-secondary"
				onclick={() => goto("/flashcards/card-types")}
			>
				<svg
					class="btn-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
					/>
					<polyline points="14 2 14 8 20 8" />
				</svg>
				<span>Type</span>
			</button>
		</div>
	</header>

	<!-- Main Working Canvas -->
	<main class="content-container">
		{#if flashcardsStore.isLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<span>Loading flashcards...</span>
			</div>
		{:else}
			<section class="page-section">
				<div class="section-header">
					<div class="section-title-group">
						{#if currentDeckFolderId}
							<button
								type="button"
								class="btn-folder-back"
								title="Back to Decks"
								onclick={() => setDeckFolder(null)}
							>
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<line x1="19" y1="12" x2="5" y2="12" />
									<polyline points="12 19 5 12 12 5" />
								</svg>
							</button>
							<h2 class="section-heading">
								{currentFolderDeck?.name || "Deck"}
							</h2>
						{:else}
							<h2 class="section-heading">Decks</h2>
						{/if}
						<span class="section-tally"
							>{displayedDecks.length}</span
						>
					</div>
					<div class="section-actions-right">
						{#if currentDeckFolderId && currentFolderDeck}
							<button
								type="button"
								class="btn btn-secondary compact"
								title={`Edit or delete ${currentFolderDeck.name}`}
								onclick={() =>
									handleEditDeck(currentFolderDeck)}
							>
								<svg
									class="btn-icon"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<circle cx="12" cy="12" r="1" />
									<circle cx="19" cy="12" r="1" />
									<circle cx="5" cy="12" r="1" />
								</svg>
								<span>Edit</span>
							</button>
							<button
								type="button"
								class="btn btn-secondary compact"
								title={`Upload CSV into ${currentFolderDeck.name}`}
								onclick={() =>
									handleOpenCsvUpload(currentFolderDeck)}
							>
								<svg
									class="btn-icon"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
									/>
									<polyline points="17 8 12 3 7 8" />
									<line x1="12" y1="3" x2="12" y2="15" />
								</svg>
								<span>Upload CSV</span>
							</button>
							<button
								type="button"
								class="btn btn-secondary compact"
								title={`Add cards into ${currentFolderDeck.name}`}
								onclick={() => handleAddCard(currentFolderDeck)}
							>
								<svg
									class="btn-icon"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<rect
										x="3"
										y="5"
										width="18"
										height="14"
										rx="2"
									/>
									<line x1="12" y1="9" x2="12" y2="15" />
									<line x1="9" y1="12" x2="15" y2="12" />
								</svg>
								<span>Add Card</span>
							</button>
							<button
								type="button"
								class="btn btn-primary compact"
								onclick={() =>
									handleStudyDeck(currentFolderDeck)}
							>
								<svg
									class="btn-icon"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
								>
									<polygon points="5 3 19 12 5 21 5 3" />
								</svg>
								<span>Study Deck</span>
							</button>
						{/if}
						<button
							type="button"
							class="btn btn-secondary compact"
							onclick={handleNewDeck}
						>
							<svg
								class="btn-icon"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							<span
								>{currentDeckFolderId
									? "Add Subdeck"
									: "Add Deck"}</span
							>
						</button>
					</div>
				</div>

				{#if displayedDecks.length > 0}
					<DeckListView
						decks={displayedDecks}
						variant="grid"
						onStudy={handleStudyDeck}
						onSelectDeck={handleOpenDeckFolder}
						onEditDeck={handleEditDeck}
						onDeleteDeck={(deck) => handleDeleteDeck(deck.id)}
						onPreviewDeck={(deck) => handleOpenDeckFolder(deck)}
						onAddSubdeck={handleAddSubdeck}
						onAddCard={(deck) => handleAddCard(deck)}
						onUploadCsv={handleOpenCsvUpload}
					/>
				{:else if !currentDeckFolderId}
					<div class="empty-state compact-empty">
						<p class="empty-desc">
							No decks yet. Add your first deck to get started.
						</p>
					</div>
				{/if}

				{#if currentDeckFolderId}
					<div class="deck-cards-subdivision">
						<div class="subdivision-header">
							<div class="subdivision-title-group">
								<h3 class="subdivision-heading">
									Cards in this Deck
								</h3>
								<span class="subdivision-tally"
									>{folderCards.length}</span
								>
								{#if selectedFolderCardIds.length > 0}
									<span class="selected-tally"
										>({selectedFolderCardIds.length} selected)</span
									>
								{/if}
							</div>
							<div class="subdivision-actions">
								{#if selectedFolderCardIds.length > 0}
									<button
										type="button"
										class="btn btn-danger compact"
										disabled={isDeletingBulkCards}
										onclick={handleBulkDeleteCards}
									>
										<svg
											class="btn-icon"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<polyline points="3 6 5 6 21 6" />
											<path
												d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
											/>
										</svg>
										<span
											>{isDeletingBulkCards
												? "Deleting..."
												: `Delete (${selectedFolderCardIds.length})`}</span
										>
									</button>
								{/if}
								<button
									type="button"
									class="btn btn-secondary compact"
									onclick={() => handleAddCard(currentFolderDeck)}
								>
									<svg
										class="btn-icon"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<line x1="12" y1="5" x2="12" y2="19" />
										<line x1="5" y1="12" x2="19" y2="12" />
									</svg>
									<span>Add Card</span>
								</button>
							</div>
						</div>

						{#if isLoadingFolderCards}
							<div class="cards-loading">
								<div class="spinner small"></div>
								<span>Loading cards...</span>
							</div>
						{:else if folderCards.length === 0}
							<div class="empty-state compact-empty">
								<p class="empty-desc">
									No cards in this deck yet.
								</p>
								{#if currentFolderDeck}
									<button
										type="button"
										class="btn btn-primary compact"
										onclick={() => handleAddCard(currentFolderDeck)}
									>
										+ Add Card to this Deck
									</button>
								{/if}
							</div>
						{:else}
							<DueTodayListView
								cards={folderCards}
								selectable={true}
								selectedCardIds={selectedFolderCardIds}
								onToggleSelect={handleToggleSelectCard}
								onSelectAll={handleSelectAllCards}
								onCardClick={(card) => {
									inspectedCard = card;
									isPreviewDrawerOpen = true;
								}}
							/>
						{/if}
					</div>
				{/if}
			</section>
		{/if}
	</main>

	<!-- In-Place Deck Modal for Creation & Configuration -->
	<DeckModal
		isOpen={isDeckModalOpen}
		decks={flashcardsStore.decks}
		initialDeck={editingDeck}
		parentId={creatingParentDeckId}
		cardTypes={flashcardsStore.cardTypes}
		onClose={() => {
			isDeckModalOpen = false;
			editingDeck = null;
			creatingParentDeckId = null;
		}}
		onSave={handleSaveDeck}
		onDelete={handleDeleteDeck}
	/>

	<!-- CSV Upload Modal -->
	<DeckCsvUploadModal
		isOpen={isCsvModalOpen}
		deck={csvTargetDeck}
		cardTypes={flashcardsStore.cardTypes}
		onClose={() => {
			isCsvModalOpen = false;
			csvTargetDeck = null;
		}}
		onUpload={handleCsvUpload}
	/>

	<!-- Fast Inline Quick Add Card Modal -->
	<QuickAddCardModal
		isOpen={isQuickAddOpen}
		deck={quickAddTargetDeck}
		decks={flashcardsStore.decks}
		cardTypes={flashcardsStore.cardTypes}
		onClose={() => {
			isQuickAddOpen = false;
			quickAddTargetDeck = null;
		}}
		onSave={handleQuickAddCard}
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
					...updated,
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
		gap: 1.5rem;
		width: 100%;
	}

	.page-section {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.375rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.section-title-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-folder-back {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-xs, 3px);
		border: 1px solid var(--border-subtle);
		background-color: var(--bg-primary);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-folder-back:hover {
		color: var(--text-primary);
		border-color: var(--border-focus);
	}

	.btn-folder-back svg {
		width: 14px;
		height: 14px;
	}

	.section-actions-right {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.section-heading {
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		margin: 0;
	}

	.section-tally {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--text-muted);
		background-color: var(--bg-tertiary);
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius-full);
	}

	.compact-empty {
		padding: 1.5rem 1rem !important;
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

	/* Deck Cards Subdivision */
	.deck-cards-subdivision {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px dashed var(--border-subtle);
	}

	.subdivision-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.subdivision-title-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.subdivision-heading {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.subdivision-tally {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		font-weight: 600;
		background-color: var(--bg-tertiary);
		color: var(--text-secondary);
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius-full);
		border: 1px solid var(--border-subtle);
	}

	.selected-tally {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--accent-primary, #60a5fa);
	}

	.subdivision-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-danger {
		background-color: rgba(239, 68, 68, 0.15);
		border-color: rgba(239, 68, 68, 0.3);
		color: #f87171;
	}

	.btn-danger:hover:not(:disabled) {
		background-color: #ef4444;
		color: #ffffff;
	}

	.cards-loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-muted);
		padding: 1rem 0;
	}

	.spinner.small {
		width: 14px;
		height: 14px;
		border-width: 2px;
	}
</style>
