import type { Database } from './database.types';

export type DeckConfig = {
  new_cards_per_day: number;
  max_reviews_per_day: number;
  learn_steps_minutes: number[];
  leech_threshold: number;
  card_type_id?: number | string | null;
};

export interface DeckRecord {
  id: number;
  user_id: string | null;
  parent_id: number | null;
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

export type FieldType = 'title' | 'description' | 'date';

export interface FieldSchemaItem {
  label: string;
  type?: FieldType;
  name?: string; // Optional for backward compatibility with existing data
}

export interface CardTypeRecord {
  id: number;
  user_id: string | null;
  name: string;
  fields_schema: FieldSchemaItem[];
  has_reverse: boolean;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashcardNoteRecord {
  id: number;
  user_id: string | null;
  card_type_id: number;
  fields: Record<string, string>;
  tags: string[];
  checksum: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardRecord {
  id: number;
  user_id: string | null;
  note_id: number;
  deck_id: number;
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
