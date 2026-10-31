import type {
  DeckRecord,
  DeckWithStats,
  DueTodayItem,
  DeckConfig,
  CardTypeRecord,
  FieldSchemaItem,
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
  activeDeckId = $state<number | string | null>(null);
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
    this.decks.find((d) => String(d.id) === String(this.activeDeckId)) || null
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
   * Load all decks, card types, deck stats, and due cards into local state.
   * If cacheAlreadyValid is true and decksWithStats is already populated, skips refetching.
   */
  async loadHubData(force = false): Promise<void> {
    if (!force && this.decksWithStats.length > 0) {
      return;
    }
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
    parent_id?: number | string | null;
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
    id: number | string,
    payload: {
      name?: string;
      description?: string | null;
      parent_id?: number | string | null;
      config?: Partial<DeckConfig>;
    }
  ): Promise<DeckRecord> {
    const updated = await flashcardsService.updateDeck(id, payload, this.customClient);
    this.decks = this.decks.map((d) => (String(d.id) === String(id) ? updated : d));
    this.decksWithStats = this.decksWithStats.map((d) => (String(d.id) === String(id) ? { ...d, ...updated } : d));
    return updated;
  }

  /**
   * Delete a deck and filter it from local store state
   */
  async deleteDeck(id: number | string): Promise<void> {
    await flashcardsService.deleteDeck(id, this.customClient);
    this.decks = this.decks.filter((d) => String(d.id) !== String(id));
    this.decksWithStats = this.decksWithStats.filter((d) => String(d.id) !== String(id));
    if (String(this.activeDeckId) === String(id)) {
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
    fields_schema: FieldSchemaItem[];
    has_reverse?: boolean;
  }): Promise<CardTypeRecord> {
    const created = await flashcardsService.createCardType(payload, this.customClient);
    this.cardTypes = [...this.cardTypes, created].sort((a, b) => a.name.localeCompare(b.name));
    return created;
  }

  /**
   * Update an existing card type and update local store state in-place
   */
  async updateCardType(
    id: number | string,
    payload: {
      name?: string;
      fields_schema?: FieldSchemaItem[];
      has_reverse?: boolean;
    }
  ): Promise<CardTypeRecord> {
    const updated = await flashcardsService.updateCardType(id, payload, this.customClient);
    this.cardTypes = this.cardTypes.map((ct) => (String(ct.id) === String(id) ? updated : ct)).sort((a, b) => a.name.localeCompare(b.name));
    return updated;
  }

  /**
   * Delete a card type and filter from local store state
   */
  async deleteCardType(id: number | string): Promise<void> {
    await flashcardsService.deleteCardType(id, this.customClient);
    this.cardTypes = this.cardTypes.filter((ct) => String(ct.id) !== String(id));
  }

  /**
   * Ingest a note with transactional card provisioning
   */
  async createFlashcardNote(
    deckId: number | string,
    cardTypeId: number | string,
    fields: Record<string, string>,
    tags: string[] = []
  ): Promise<number> {
    const noteId = await flashcardsService.createFlashcardNote(
      deckId,
      cardTypeId,
      fields,
      tags,
      this.customClient
    );

    // In-memory counter updates: calculate added cards (1 or 2 if reverse enabled)
    const cardType = this.cardTypes.find((ct) => String(ct.id) === String(cardTypeId));
    const addedCardsCount = cardType?.has_reverse ? 2 : 1;

    this.decksWithStats = this.decksWithStats.map((d) => {
      if (String(d.id) === String(deckId)) {
        return {
          ...d,
          totalCards: d.totalCards + addedCardsCount,
          newCards: d.newCards + addedCardsCount
        };
      }
      return d;
    });
    this.decks = this.decksWithStats;

    return noteId;
  }

  /**
   * Bulk create flashcard notes and update local deck statistics
   */
  async bulkCreateFlashcardNotes(
    deckId: number | string,
    cardTypeId: number | string,
    items: Record<string, string>[],
    tags: string[] = ['csv-import']
  ): Promise<number> {
    const createdCount = await flashcardsService.bulkCreateFlashcardNotes(
      deckId,
      cardTypeId,
      items,
      tags,
      this.customClient
    );

    // In-memory counter updates: calculate added cards (1 or 2 per note if reverse enabled)
    const cardType = this.cardTypes.find((ct) => String(ct.id) === String(cardTypeId));
    const cardsPerNote = cardType?.has_reverse ? 2 : 1;
    const totalAddedCards = createdCount * cardsPerNote;

    this.decksWithStats = this.decksWithStats.map((d) => {
      if (String(d.id) === String(deckId)) {
        return {
          ...d,
          totalCards: d.totalCards + totalAddedCards,
          newCards: d.newCards + totalAddedCards
        };
      }
      return d;
    });
    this.decks = this.decksWithStats;

    return createdCount;
  }

  /**
   * Start or load a study session for the given deck ID
   */
  async startStudySession(deckId: number | string): Promise<void> {
    this.isLoading = true;
    this.activeDeckId = deckId;
    this.activeCardIndex = 0;
    this.isFlipped = false;
    try {
      if (this.decksWithStats.length === 0) {
        await this.loadHubData();
      }
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
   * Suspend a card and update it in local collections (dueCards, studyQueue) in-place
   */
  async suspendCard(cardId: number | string): Promise<CardRecord> {
    const updated = await flashcardsService.suspendCard(cardId, this.customClient);
    this.dueCards = this.dueCards.filter((c) => String(c.id) !== String(cardId));
    this.studyQueue = this.studyQueue.map((c) => (String(c.id) === String(cardId) ? { ...c, ...updated } : c));
    return updated;
  }

  /**
   * Reset a card to new state and update in local collections in-place
   */
  async resetCardToNew(cardId: number | string): Promise<CardRecord> {
    const updated = await flashcardsService.resetCardToNew(cardId, this.customClient);
    this.dueCards = this.dueCards.map((c) => (String(c.id) === String(cardId) ? { ...c, ...updated } : c));
    this.studyQueue = this.studyQueue.map((c) => (String(c.id) === String(cardId) ? { ...c, ...updated } : c));
    return updated;
  }

  /**
   * Delete cards in bulk and update store collections without refetching
   */
  async deleteCards(cardIds: (number | string)[]): Promise<void> {
    const idSet = new Set(cardIds.map((id) => String(id)));
    const deletedCards = this.dueCards.filter((c) => idSet.has(String(c.id)));
    const deletedStudyCards = this.studyQueue.filter((c) => idSet.has(String(c.id)));

    await flashcardsService.deleteCards(cardIds, this.customClient);

    this.dueCards = this.dueCards.filter((c) => !idSet.has(String(c.id)));
    this.studyQueue = this.studyQueue.filter((c) => !idSet.has(String(c.id)));

    // Track deleted cards per deck to update stats in memory
    const deckCountDelta = new Map<string, { total: number; newCards: number; due: number }>();
    const allDeleted = [...deletedCards, ...deletedStudyCards];
    const seenCardIds = new Set<string>();

    for (const card of allDeleted) {
      const cId = String(card.id);
      if (seenCardIds.has(cId)) continue;
      seenCardIds.add(cId);

      const dId = String(card.deck_id);
      const current = deckCountDelta.get(dId) || { total: 0, newCards: 0, due: 0 };
      current.total += 1;
      if (card.queue_state === 0) {
        current.newCards += 1;
      } else if (card.queue_state !== -1) {
        current.due += 1;
      }
      deckCountDelta.set(dId, current);
    }

    // In-memory counter updates
    this.decksWithStats = this.decksWithStats.map((d) => {
      const delta = deckCountDelta.get(String(d.id));
      if (delta) {
        return {
          ...d,
          totalCards: Math.max(0, d.totalCards - delta.total),
          newCards: Math.max(0, d.newCards - delta.newCards),
          dueCards: Math.max(0, d.dueCards - delta.due)
        };
      }
      return d;
    });
    this.decks = this.decksWithStats;
  }
}

/** Global singleton store instance */
export const flashcardsStore = new FlashcardsStore();
