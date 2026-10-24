import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FlashcardsStore } from '$lib/state/flashcards.svelte';
import * as flashcardsService from '$lib/services/flashcards-service';
import type { CardRecord, StudyQueueItem, DeckRecord } from '$lib/types/flashcards';

describe('Flashcards Study Flow & Local Queue Mechanics', () => {
	let store: FlashcardsStore;

	const mockDeck: DeckRecord = {
		id: 'deck-123',
		user_id: 'user-1',
		parent_id: null,
		name: 'Computer Science',
		description: 'Core Algorithms',
		config: {
			new_cards_per_day: 20,
			max_reviews_per_day: 200,
			learn_steps_minutes: [1, 10],
			leech_threshold: 8,
		},
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};

	const createMockCard = (id: string, queueState: number = 0, interval: number = 0): StudyQueueItem => ({
		id,
		user_id: 'user-1',
		note_id: `note-${id}`,
		deck_id: 'deck-123',
		card_type: 0,
		queue_state: queueState,
		due_date: '2026-10-25',
		step_index: 0,
		interval_days: interval,
		ease_factor: 2.50,
		reps: 0,
		lapses: 0,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		note: {
			id: `note-${id}`,
			user_id: 'user-1',
			card_type_id: 'ct-1',
			fields: { prompt: `Prompt ${id}`, answer: `Answer ${id}` },
			tags: ['test'],
			checksum: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		},
		card_type_def: {
			id: 'ct-1',
			user_id: 'user-1',
			name: 'Basic',
			fields_schema: [
				{ name: 'prompt', label: 'Prompt' },
				{ name: 'answer', label: 'Answer' }
			],
			has_reverse: false,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		}
	});

	beforeEach(() => {
		store = new FlashcardsStore();
		store.decks = [mockDeck];
		store.activeDeckId = 'deck-123';
	});

	it('initializes study queue correctly and exposes derived properties', () => {
		const card1 = createMockCard('c1', 0);
		const card2 = createMockCard('c2', 2, 5);

		store.studyQueue = [card1, card2];
		store.activeCardIndex = 0;

		expect(store.currentCard?.id).toBe('c1');
		expect(store.hasMoreCards).toBe(true);
		expect(store.remainingCount).toBe(2);
		expect(store.newCardsCount).toBe(1);
		expect(store.dueTodayCount).toBe(1);
	});

	it('toggles flip and reveals answer', () => {
		expect(store.isFlipped).toBe(false);
		store.toggleFlip();
		expect(store.isFlipped).toBe(true);
		store.toggleFlip();
		expect(store.isFlipped).toBe(false);
		store.revealAnswer();
		expect(store.isFlipped).toBe(true);
	});

	it('optimistically advances index on normal rating and resets flip state', async () => {
		const card1 = createMockCard('c1', 0);
		const card2 = createMockCard('c2', 0);
		store.studyQueue = [card1, card2];
		store.activeCardIndex = 0;
		store.isFlipped = true;

		vi.spyOn(flashcardsService, 'submitReview').mockResolvedValue({} as any);

		await store.submitCardReview(3); // Normal rating

		expect(store.activeCardIndex).toBe(1);
		expect(store.isFlipped).toBe(false);
		expect(store.currentCard?.id).toBe('c2');
	});

	it('re-inserts lapsed card 3 positions back into the local queue on "Again" rating', async () => {
		const card1 = createMockCard('c1', 2, 10);
		const card2 = createMockCard('c2', 2, 10);
		const card3 = createMockCard('c3', 2, 10);
		const card4 = createMockCard('c4', 2, 10);
		const card5 = createMockCard('c5', 2, 10);

		store.studyQueue = [card1, card2, card3, card4, card5];
		store.activeCardIndex = 0;

		vi.spyOn(flashcardsService, 'submitReview').mockResolvedValue({} as any);

		await store.submitCardReview(1); // 'Again' rating

		// Card 1 should have been re-inserted 3 positions ahead:
		// original queue was [c1, c2, c3, c4, c5]
		// after splice at min(0 + 4 = 4, length): [c1, c2, c3, c4, c1_lapsed, c5]
		// and activeCardIndex advances to 1
		expect(store.activeCardIndex).toBe(1);
		expect(store.studyQueue.length).toBe(6);
		expect(store.studyQueue[4].id).toBe('c1');
	});

	it('suspends card and filters it from dueCards while updating in studyQueue', async () => {
		const card1 = createMockCard('c1', 2, 5);
		store.dueCards = [card1 as any];
		store.studyQueue = [card1];

		vi.spyOn(flashcardsService, 'suspendCard').mockResolvedValue({
			...card1,
			queue_state: -1
		} as CardRecord);

		const updated = await store.suspendCard('c1');

		expect(updated.queue_state).toBe(-1);
		expect(store.dueCards.find((c) => c.id === 'c1')).toBeUndefined();
		expect(store.studyQueue[0].queue_state).toBe(-1);
	});

	it('resets card to new state and updates local state collections', async () => {
		const card1 = createMockCard('c1', 2, 10);
		store.dueCards = [card1 as any];
		store.studyQueue = [card1];

		vi.spyOn(flashcardsService, 'resetCardToNew').mockResolvedValue({
			...card1,
			queue_state: 0,
			step_index: 0,
			interval_days: 0,
			reps: 0
		} as CardRecord);

		const updated = await store.resetCardToNew('c1');

		expect(updated.queue_state).toBe(0);
		expect(updated.interval_days).toBe(0);
		expect(store.studyQueue[0].queue_state).toBe(0);
		expect(store.dueCards[0].queue_state).toBe(0);
	});

	it('fetches card review logs using flashcardsService', async () => {
		const mockLogs = [
			{
				id: 'log-1',
				user_id: 'user-1',
				card_id: 'c1',
				rating: 3,
				previous_state: 1,
				previous_interval_days: 0,
				previous_ease_factor: 2.5,
				new_interval_days: 1,
				new_ease_factor: 2.5,
				time_taken_ms: 1200,
				reviewed_at: new Date().toISOString()
			}
		];

		vi.spyOn(flashcardsService, 'fetchCardReviewLogs').mockResolvedValue(mockLogs as any);

		const logs = await store.fetchCardLogs('c1');
		expect(logs.length).toBe(1);
		expect(logs[0].id).toBe('log-1');
		expect(logs[0].rating).toBe(3);
	});
});
