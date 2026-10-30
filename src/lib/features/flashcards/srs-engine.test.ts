import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processReview, formatCalendarDate } from '$lib/features/flashcards/srs-engine';
import { FlashcardsStore } from '$lib/state/flashcards.svelte';
import type { CardRecord, StudyQueueItem, DeckRecord } from '$lib/types/flashcards';
import * as flashcardsService from '$lib/services/flashcards-service';

function createMockCard(overrides: Partial<CardRecord> = {}): CardRecord {
  return {
    id: 1,
    user_id: 'user-1',
    note_id: 10,
    deck_id: 1,
    card_type: 0,
    queue_state: 0, // New
    due_date: '2026-10-24',
    step_index: 0,
    interval_days: 0,
    ease_factor: 2.5,
    reps: 0,
    lapses: 0,
    created_at: '2026-10-24T00:00:00Z',
    updated_at: '2026-10-24T00:00:00Z',
    ...overrides,
  };
}

describe('Phase 2: SM-2 Engine Mathematical Parity & State Transitions', () => {
  const refDate = new Date('2026-10-24T12:00:00Z');

  describe('Intraday / Learning Queue transitions', () => {
    it('Again (1): resets step_index to 0, stays in learning, due today', () => {
      const card = createMockCard({ queue_state: 1, step_index: 1 });
      const result = processReview(card, 'again', [1, 10], 8, refDate);

      expect(result.updatedCard.queue_state).toBe(1);
      expect(result.updatedCard.step_index).toBe(0);
      expect(result.updatedCard.interval_days).toBe(0);
      expect(result.updatedCard.due_date).toBe('2026-10-24');
      expect(result.updatedCard.reps).toBe(1);
      expect(result.log.rating).toBe(1);
    });

    it('Hard (2): repeats current step index, due today', () => {
      const card = createMockCard({ queue_state: 1, step_index: 1 });
      const result = processReview(card, 'hard', [1, 10], 8, refDate);

      expect(result.updatedCard.queue_state).toBe(1);
      expect(result.updatedCard.step_index).toBe(1);
      expect(result.updatedCard.due_date).toBe('2026-10-24');
      expect(result.updatedCard.reps).toBe(1);
    });

    it('Normal (3): advances step if not at last step', () => {
      const card = createMockCard({ queue_state: 0, step_index: 0 });
      const result = processReview(card, 'normal', [1, 10], 8, refDate);

      expect(result.updatedCard.queue_state).toBe(1);
      expect(result.updatedCard.step_index).toBe(1);
      expect(result.updatedCard.due_date).toBe('2026-10-24');
    });

    it('Normal (3): graduates to Review (state 2) with 1 day interval if at last step', () => {
      const card = createMockCard({ queue_state: 1, step_index: 1 });
      const result = processReview(card, 3, [1, 10], 8, refDate);

      expect(result.updatedCard.queue_state).toBe(2);
      expect(result.updatedCard.step_index).toBe(0);
      expect(result.updatedCard.interval_days).toBe(1);
      expect(result.updatedCard.due_date).toBe('2026-10-25');
    });

    it('Easy (4): immediately graduates with 4 day interval', () => {
      const card = createMockCard({ queue_state: 0, step_index: 0 });
      const result = processReview(card, 'easy', [1, 10], 8, refDate);

      expect(result.updatedCard.queue_state).toBe(2);
      expect(result.updatedCard.step_index).toBe(0);
      expect(result.updatedCard.interval_days).toBe(4);
      expect(result.updatedCard.due_date).toBe('2026-10-28');
    });
  });

  describe('Review Queue (Graduated) transitions', () => {
    it('Again (1): drops to relearning (3), increments lapses, deducts 0.20 ease, interval 1', () => {
      const card = createMockCard({
        queue_state: 2,
        interval_days: 10,
        ease_factor: 2.50,
        lapses: 1,
      });
      const result = processReview(card, 'again', [1, 10], 8, refDate);

      expect(result.updatedCard.queue_state).toBe(3);
      expect(result.updatedCard.lapses).toBe(2);
      expect(result.updatedCard.ease_factor).toBe(2.30);
      expect(result.updatedCard.interval_days).toBe(1);
      expect(result.updatedCard.due_date).toBe('2026-10-25');
    });

    it('Again (1): automatically suspends card (queue_state = -1) when reaching leech threshold', () => {
      const card = createMockCard({
        queue_state: 2,
        interval_days: 10,
        ease_factor: 2.50,
        lapses: 7,
      });
      const result = processReview(card, 'again', [1, 10], 8, refDate);

      expect(result.updatedCard.lapses).toBe(8);
      expect(result.updatedCard.queue_state).toBe(-1); // Suspended
    });

    it('Ease factor enforces absolute minimum floor of 1.30', () => {
      const card = createMockCard({
        queue_state: 2,
        interval_days: 5,
        ease_factor: 1.35,
      });
      const result = processReview(card, 'again', [1, 10], 8, refDate);

      expect(result.updatedCard.ease_factor).toBe(1.30);
    });

    it('Hard (2): reduces ease by 0.15, interval multiplied by 1.20', () => {
      const card = createMockCard({
        queue_state: 2,
        interval_days: 10,
        ease_factor: 2.50,
      });
      const result = processReview(card, 'hard', [1, 10], 8, refDate);

      expect(result.updatedCard.ease_factor).toBe(2.35);
      expect(result.updatedCard.interval_days).toBe(12); // round(10 * 1.2) = 12
      expect(result.updatedCard.due_date).toBe('2026-11-05');
    });

    it('Normal (3): preserves ease factor, interval multiplied by ease factor', () => {
      const card = createMockCard({
        queue_state: 2,
        interval_days: 10,
        ease_factor: 2.50,
      });
      const result = processReview(card, 'normal', [1, 10], 8, refDate);

      expect(result.updatedCard.ease_factor).toBe(2.50);
      expect(result.updatedCard.interval_days).toBe(25); // round(10 * 2.5) = 25
      expect(result.updatedCard.due_date).toBe('2026-11-18');
    });

    it('Easy (4): boosts ease by +0.15, interval multiplied by ease * 1.30', () => {
      const card = createMockCard({
        queue_state: 2,
        interval_days: 10,
        ease_factor: 2.50,
      });
      const result = processReview(card, 'easy', [1, 10], 8, refDate);

      expect(result.updatedCard.ease_factor).toBe(2.65);
      // round(10 * 2.5 * 1.30) = round(32.5) = 33 (or round(32.5)=33)
      expect(result.updatedCard.interval_days).toBe(33);
    });
  });
});

describe('Phase 2: FlashcardsStore Reactive Runes State Container', () => {
  let store: FlashcardsStore;

  beforeEach(() => {
    store = new FlashcardsStore();
  });

  it('calculates derived queue counts correctly', () => {
    const cardNew: StudyQueueItem = { ...createMockCard({ id: 1, queue_state: 0 }) };
    const cardLearning: StudyQueueItem = { ...createMockCard({ id: 2, queue_state: 1 }) };
    const cardReview: StudyQueueItem = { ...createMockCard({ id: 3, queue_state: 2 }) };

    store.studyQueue = [cardNew, cardLearning, cardReview];
    store.activeCardIndex = 0;

    expect(store.hasMoreCards).toBe(true);
    expect(store.currentCard?.id).toBe(1);
    expect(store.remainingCount).toBe(3);
    expect(store.newCardsCount).toBe(1);
    expect(store.dueTodayCount).toBe(2);
  });

  it('advances currentCard and toggles flip state', () => {
    const card1: StudyQueueItem = { ...createMockCard({ id: 1 }) };
    const card2: StudyQueueItem = { ...createMockCard({ id: 2 }) };

    store.studyQueue = [card1, card2];
    store.activeCardIndex = 0;
    store.revealAnswer();
    expect(store.isFlipped).toBe(true);

    store.toggleFlip();
    expect(store.isFlipped).toBe(false);
  });

  it('optimistically advances on review and re-queues lapsed card', async () => {
    const card1: StudyQueueItem = { ...createMockCard({ id: 1, queue_state: 2, lapses: 0 }) };
    const card2: StudyQueueItem = { ...createMockCard({ id: 2, queue_state: 2 }) };
    const card3: StudyQueueItem = { ...createMockCard({ id: 3, queue_state: 2 }) };
    const card4: StudyQueueItem = { ...createMockCard({ id: 4, queue_state: 2 }) };
    const card5: StudyQueueItem = { ...createMockCard({ id: 5, queue_state: 2 }) };

    store.studyQueue = [card1, card2, card3, card4, card5];
    store.activeDeckId = 1;
    store.decks = [
      {
        id: 1,
        name: 'Default',
        description: null,
        parent_id: null,
        user_id: 'user-1',
        config: {
          new_cards_per_day: 20,
          max_reviews_per_day: 200,
          learn_steps_minutes: [1, 10],
          leech_threshold: 8,
        },
        created_at: '2026-10-24T00:00:00Z',
        updated_at: '2026-10-24T00:00:00Z',
      },
    ];

    vi.spyOn(flashcardsService, 'submitReview').mockResolvedValue(undefined);

    await store.submitCardReview('again', 1200);

    // Queue index advanced immediately
    expect(store.activeCardIndex).toBe(1);
    expect(store.currentCard?.id).toBe(2);
    expect(store.isFlipped).toBe(false);

    // c1 was re-queued 3 positions later:
    // Original: [c1, c2, c3, c4, c5]
    // After re-insert at activeIndex + 4 (index 0 + 4 = 4):
    // [c1, c2, c3, c4, c1(updated), c5]
    expect(store.studyQueue.length).toBe(6);
    expect(store.studyQueue[4].id).toBe(1);
    expect(store.studyQueue[4].queue_state).toBe(3); // Relearning
  });
});
