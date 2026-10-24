import type { Database } from './database.types';

export type DeckConfig = {
  new_cards_per_day: number;
  max_reviews_per_day: number;
  learn_steps_minutes: number[];
  leech_threshold: number;
};

export interface DeckRecord {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  name: string;
  description: string | null;
  config: DeckConfig;
  created_at: string;
  updated_at: string;
}

export interface DeckWithStats extends DeckRecord {
  totalCards: number;
  dueCards: number;
  newCards: number;
  depth?: number;
}

export interface FieldSchemaItem {
  name: string;
  label: string;
}

export interface CardTypeRecord {
  id: string;
  user_id: string | null;
  name: string;
  fields_schema: FieldSchemaItem[];
  has_reverse: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashcardNoteRecord {
  id: string;
  user_id: string | null;
  card_type_id: string;
  fields: Record<string, string>;
  tags: string[];
  checksum: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardRecord {
  id: string;
  user_id: string | null;
  note_id: string;
  deck_id: string;
  card_type: number; // 0 = Forward, 1 = Reverse
  queue_state: number; // -1 = Suspended, 0 = New, 1 = Learning, 2 = Review, 3 = Relearning
  due_date: string;
  step_index: number;
  interval_days: number;
  ease_factor: number;
  reps: number;
  lapses: number;
  created_at: string;
  updated_at: string;
}

export interface CardReviewLogRecord {
  id: string;
  user_id: string | null;
  card_id: string;
  rating: number; // 1 = Again, 2 = Hard, 3 = Normal, 4 = Easy
  previous_state: number;
  previous_interval_days: number;
  previous_ease_factor: number;
  new_interval_days: number;
  new_ease_factor: number;
  time_taken_ms: number | null;
  reviewed_at: string;
}

export interface StudyQueueItem extends CardRecord {
  note?: FlashcardNoteRecord;
  card_type_def?: CardTypeRecord;
}

export interface DueTodayItem extends CardRecord {
  deck_name?: string;
  note_front?: string;
  note_back?: string;
  note_fields?: Record<string, string>;
  card_type_name?: string;
}

export type Rating = 'again' | 'hard' | 'normal' | 'easy';
