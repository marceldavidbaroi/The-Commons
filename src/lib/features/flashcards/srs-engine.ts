import type { CardRecord, Rating } from '$lib/types/flashcards';

export interface ReviewResult {
  updatedCard: CardRecord;
  log: {
    rating: number;
    previous_state: number;
    previous_interval_days: number;
    previous_ease_factor: number;
    new_interval_days: number;
    new_ease_factor: number;
  };
}

export const RATING_MAP: Record<Rating, number> = {
  again: 1,
  hard: 2,
  normal: 3,
  easy: 4,
};

export const NUMBER_TO_RATING: Record<number, Rating> = {
  1: 'again',
  2: 'hard',
  3: 'normal',
  4: 'easy',
};

/**
 * Format a Date to YYYY-MM-DD in UTC / local calendar terms matching Postgres CURRENT_DATE
 */
export function formatCalendarDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate pure SM-2 scheduling transitions with exact mathematical parity
 * to the PostgreSQL RPC `submit_card_review`.
 */
export function processReview(
  card: CardRecord,
  rating: Rating | number,
  learnStepsMinutes: number[] = [1, 10],
  leechThreshold: number = 8,
  referenceDate: Date = new Date()
): ReviewResult {
  const ratingCode = typeof rating === 'number' ? rating : RATING_MAP[rating];
  if (![1, 2, 3, 4].includes(ratingCode)) {
    throw new Error(`Invalid rating: ${rating}, must be 1, 2, 3, or 4`);
  }

  const prev = {
    state: card.queue_state,
    interval: card.interval_days,
    ease: Number(card.ease_factor),
  };

  const next: CardRecord = {
    ...card,
    reps: card.reps + 1,
  };

  const addDays = (days: number): string => {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() + days);
    return formatCalendarDate(d);
  };

  // INTRADAY / LEARNING / RELEARNING (queue_state != 2, i.e., 0, 1, 3)
  if (next.queue_state !== 2) {
    switch (ratingCode) {
      case 1: // Again
        next.step_index = 0;
        next.queue_state = 1;
        next.interval_days = 0;
        next.due_date = addDays(0);
        break;

      case 2: // Hard
        next.queue_state = 1;
        next.due_date = addDays(0);
        break;

      case 3: // Normal
        if (next.step_index < learnStepsMinutes.length - 1) {
          next.step_index += 1;
          next.queue_state = 1;
          next.due_date = addDays(0);
        } else {
          next.queue_state = 2; // Graduate to Review
          next.step_index = 0;
          next.interval_days = 1;
          next.due_date = addDays(1);
        }
        break;

      case 4: // Easy
        next.queue_state = 2; // Immediate graduation
        next.step_index = 0;
        next.interval_days = 4;
        next.due_date = addDays(4);
        break;
    }
  }
  // GRADUATED REVIEW PROCESSING (queue_state == 2)
  else {
    switch (ratingCode) {
      case 1: // Again
        next.lapses += 1;
        next.ease_factor = Math.max(1.30, Number((card.ease_factor - 0.20).toFixed(2)));
        next.interval_days = 1;
        next.due_date = addDays(1);

        if (next.lapses >= leechThreshold) {
          next.queue_state = -1; // Auto-suspend leech
        } else {
          next.queue_state = 3; // Drop to Relearning
          next.step_index = 0;
        }
        break;

      case 2: // Hard
        next.ease_factor = Math.max(1.30, Number((card.ease_factor - 0.15).toFixed(2)));
        next.interval_days = Math.max(card.interval_days + 1, Math.round(card.interval_days * 1.20));
        next.due_date = addDays(next.interval_days);
        break;

      case 3: // Normal
        next.interval_days = Math.max(card.interval_days + 1, Math.round(card.interval_days * card.ease_factor));
        next.due_date = addDays(next.interval_days);
        break;

      case 4: // Easy
        next.ease_factor = Number((card.ease_factor + 0.15).toFixed(2));
        next.interval_days = Math.max(
          card.interval_days + 1,
          Math.round(card.interval_days * card.ease_factor * 1.30)
        );
        next.due_date = addDays(next.interval_days);
        break;
    }
  }

  return {
    updatedCard: next,
    log: {
      rating: ratingCode,
      previous_state: prev.state,
      previous_interval_days: prev.interval,
      previous_ease_factor: prev.ease,
      new_interval_days: next.interval_days,
      new_ease_factor: next.ease_factor,
    },
  };
}
