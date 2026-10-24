import type {
  DeckRecord,
  DeckWithStats,
  DueTodayItem,
  DeckConfig,
  CardTypeRecord,
  StudyQueueItem,
  CardRecord,
  Rating
} from '$lib/types/flashcards';
import * as flashcardsService from '$lib/services/flashcards-service';
import { processReview } from '$lib/features/flashcards/srs-engine';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';

export class FlashcardsStore {
  // Core collections
  decks = $state<DeckRecord[]>([]);
  decksWithStats = $state<DeckWithStats[]>([]);
  cardTypes = $state<CardTypeRecord[]>([]);
  dueCards = $state<DueTodayItem[]>([]);

  // Active study context
  activeDeckId = $state<string | null>(null);
  studyQueue = $state<StudyQueueItem[]>([]);
  activeCardIndex = $state<number>(0);

  // UI state
  isLoading = $state<boolean>(false);
  isSubmittingReview = $state<boolean>(false);
  isFlipped = $state<boolean>(false);

  // Client override for testing
  private customClient: SupabaseClient<Database> | undefined;

  constructor(customClient?: SupabaseClient<Database>) {
    this.customClient = customClient;
  }

  // --- Derived State Helpers ---

  /** Active deck entity */
  activeDeck = $derived<DeckRecord | null>(
    this.decks.find((d) => d.id === this.activeDeckId) || null
  );

  /** Currently visible flashcard under review */
  currentCard = $derived<StudyQueueItem | null>(
    this.studyQueue.length > 0 && this.activeCardIndex < this.studyQueue.length
      ? this.studyQueue[this.activeCardIndex]
      : null
  );

  /** Whether more cards remain in the current queue */
  hasMoreCards = $derived<boolean>(
    this.studyQueue.length > 0 && this.activeCardIndex < this.studyQueue.length
  );

  /** Total cards remaining in the queue */
  remainingCount = $derived<number>(
    Math.max(0, this.studyQueue.length - this.activeCardIndex)
  );

  /** Number of new cards (queue_state = 0) in the current study queue */
  newCardsCount = $derived<number>(
    this.studyQueue.filter((c) => c.queue_state === 0).length
  );

  /** Number of learning/due cards (queue_state in 1, 2, 3) in the current study queue */
  dueTodayCount = $derived<number>(
    this.studyQueue.filter((c) => c.queue_state !== 0 && c.queue_state !== -1).length
  );

  // --- Store Actions ---

  /**
   * Set custom Supabase client (useful for testing or switching sessions)
   */
  setClient(client?: SupabaseClient<Database>) {
    this.customClient = client;
  }

  /**
   * Load all decks, card types, deck stats, and due cards into local state
   */
  async loadHubData(): Promise<void> {
    this.isLoading = true;
    try {
      const [fetchedDecksWithStats, fetchedCardTypes, fetchedDueCards] = await Promise.all([
        flashcardsService.fetchDecksWithStats(this.customClient),
        flashcardsService.fetchCardTypes(this.customClient),
        flashcardsService.fetchDueCards(this.customClient),
      ]);
      this.decksWithStats = fetchedDecksWithStats;
      this.decks = fetchedDecksWithStats;
      this.cardTypes = fetchedCardTypes;
      this.dueCards = fetchedDueCards;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Create a new deck and update local store state without secondary GET
   */
  async createDeck(payload: {
    name: string;
    description?: string | null;
    parent_id?: string | null;
    config?: Partial<DeckConfig>;
  }): Promise<DeckRecord> {
    const newDeck = await flashcardsService.createDeck(payload, this.customClient);
    const newDeckWithStats: DeckWithStats = {
      ...newDeck,
      totalCards: 0,
      dueCards: 0,
      newCards: 0
    };
    this.decks = [...this.decks, newDeck].sort((a, b) => a.name.localeCompare(b.name));
    this.decksWithStats = [...this.decksWithStats, newDeckWithStats].sort((a, b) => a.name.localeCompare(b.name));
    return newDeck;
  }

  /**
   * Update an existing deck and update local store state in-place
   */
  async updateDeck(
    id: string,
    payload: {
      name?: string;
      description?: string | null;
      parent_id?: string | null;
      config?: Partial<DeckConfig>;
    }
  ): Promise<DeckRecord> {
    const updated = await flashcardsService.updateDeck(id, payload, this.customClient);
    this.decks = this.decks.map((d) => (d.id === id ? updated : d));
    this.decksWithStats = this.decksWithStats.map((d) => (d.id === id ? { ...d, ...updated } : d));
    return updated;
  }

  /**
   * Delete a deck and filter it from local store state
   */
  async deleteDeck(id: string): Promise<void> {
    await flashcardsService.deleteDeck(id, this.customClient);
    this.decks = this.decks.filter((d) => d.id !== id);
    this.decksWithStats = this.decksWithStats.filter((d) => d.id !== id);
    if (this.activeDeckId === id) {
      this.activeDeckId = null;
      this.studyQueue = [];
      this.activeCardIndex = 0;
    }
  }

  /**
   * Create a card type schema and append to local store state
   */
  async createCardType(payload: {
    name: string;
    fields_schema: Array<{ name: string; label: string }>;
    has_reverse?: boolean;
  }): Promise<CardTypeRecord> {
    const created = await flashcardsService.createCardType(payload, this.customClient);
    this.cardTypes = [...this.cardTypes, created].sort((a, b) => a.name.localeCompare(b.name));
    return created;
  }

  /**
   * Ingest a note with transactional card provisioning
   */
  async createFlashcardNote(
    deckId: string,
    cardTypeId: string,
    fields: Record<string, string>,
    tags: string[] = []
  ): Promise<string> {
    const noteId = await flashcardsService.createFlashcardNote(
      deckId,
      cardTypeId,
      fields,
      tags,
      this.customClient
    );
    // Refresh stats and due card list in store
    const [updatedDecksWithStats, updatedDueCards] = await Promise.all([
      flashcardsService.fetchDecksWithStats(this.customClient),
      flashcardsService.fetchDueCards(this.customClient)
    ]);
    this.decksWithStats = updatedDecksWithStats;
    this.decks = updatedDecksWithStats;
    this.dueCards = updatedDueCards;
    return noteId;
  }

  /**
   * Start or load a study session for the given deck ID
   */
  async startStudySession(deckId: string): Promise<void> {
    this.isLoading = true;
    this.activeDeckId = deckId;
    this.activeCardIndex = 0;
    this.isFlipped = false;
    try {
      this.studyQueue = await flashcardsService.fetchStudyQueue(deckId, this.customClient);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Toggle front/back card flip state
   */
  toggleFlip(): void {
    this.isFlipped = !this.isFlipped;
  }

  /**
   * Reveal back of card
   */
  revealAnswer(): void {
    this.isFlipped = true;
  }

  /**
   * Process and submit card review.
   * Optimistically advances local queue with 0ms visual latency,
   * re-queuing lapsed cards if needed, and dispatches server RPC in background.
   */
  async submitCardReview(
    rating: Rating | number,
    timeTakenMs?: number
  ): Promise<void> {
    const card = this.currentCard;
    if (!card) return;

    const deck = this.activeDeck;
    const learnSteps = deck?.config?.learn_steps_minutes || [1, 10];
    const leechThreshold = deck?.config?.leech_threshold || 8;

    // 1. Optimistic pure SM-2 calculation
    const reviewResult = processReview(card, rating, learnSteps, leechThreshold);
    const updatedCard = reviewResult.updatedCard;

    // 2. Local queue modification:
    // If rating is 'again' (1) and card was not suspended, re-insert 3 positions back or at the end
    const isLapse = (typeof rating === 'number' ? rating : (rating === 'again' ? 1 : 3)) === 1;
    const isSuspended = updatedCard.queue_state === -1;

    const currentCardItem: StudyQueueItem = {
      ...card,
      ...updatedCard,
    };

    if (isLapse && !isSuspended) {
      // Clone queue and re-insert 3 cards later
      const nextQueue = [...this.studyQueue];
      // Target position: index + 4 (skip current card + 3 following cards)
      const targetPos = Math.min(this.activeCardIndex + 4, nextQueue.length);
      nextQueue.splice(targetPos, 0, currentCardItem);
      this.studyQueue = nextQueue;
    }

    // Advance to next card immediately
    this.activeCardIndex += 1;
    this.isFlipped = false;

    // 3. Fire-and-forget / async background synchronization with RPC
    this.isSubmittingReview = true;
    try {
      await flashcardsService.submitReview(card.id, rating, timeTakenMs, this.customClient);
    } catch (err) {
      console.error('Failed to submit review in background:', err);
      // Log error; client queue remains unblocked
    } finally {
      this.isSubmittingReview = false;
    }
  }

  /**
   * Fetch review logs for a card
   */
  async fetchCardLogs(cardId: string): Promise<import('$lib/types/flashcards').CardReviewLogRecord[]> {
    return flashcardsService.fetchCardReviewLogs(cardId, this.customClient);
  }

  /**
   * Suspend a card and update it in local collections (dueCards, studyQueue) in-place
   */
  async suspendCard(cardId: string): Promise<CardRecord> {
    const updated = await flashcardsService.suspendCard(cardId, this.customClient);
    this.dueCards = this.dueCards.filter((c) => c.id !== cardId);
    this.studyQueue = this.studyQueue.map((c) => (c.id === cardId ? { ...c, ...updated } : c));
    return updated;
  }

  /**
   * Reset a card to new state and update in local collections in-place
   */
  async resetCardToNew(cardId: string): Promise<CardRecord> {
    const updated = await flashcardsService.resetCardToNew(cardId, this.customClient);
    this.dueCards = this.dueCards.map((c) => (c.id === cardId ? { ...c, ...updated } : c));
    this.studyQueue = this.studyQueue.map((c) => (c.id === cardId ? { ...c, ...updated } : c));
    return updated;
  }
}

/** Global singleton store instance */
export const flashcardsStore = new FlashcardsStore();
