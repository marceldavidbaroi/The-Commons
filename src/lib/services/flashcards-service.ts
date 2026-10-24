import { getSupabaseClient } from '$lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import type {
  DeckRecord,
  DeckConfig,
  CardTypeRecord,
  FlashcardNoteRecord,
  CardRecord,
  CardReviewLogRecord,
  StudyQueueItem,
  FieldSchemaItem,
  Rating
} from '$lib/types/flashcards';
import { RATING_MAP } from '$lib/features/flashcards/srs-engine';

function getClient(client?: SupabaseClient<Database>): SupabaseClient<Database> {
  return client || getSupabaseClient();
}

/**
 * Fetch all decks owned by the authenticated user, ordered by name.
 */
export async function fetchDecks(customClient?: SupabaseClient<Database>): Promise<DeckRecord[]> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching decks:', error);
    throw error;
  }
  return (data || []) as unknown as DeckRecord[];
}

/**
 * Fetch all decks with aggregate stats (total cards, due cards, new cards).
 */
export async function fetchDecksWithStats(customClient?: SupabaseClient<Database>): Promise<import('$lib/types/flashcards').DeckWithStats[]> {
  const supabase = getClient(customClient);
  const nowIso = new Date().toISOString();

  // Fetch decks and cards in parallel
  const [decksRes, cardsRes] = await Promise.all([
    supabase.from('decks').select('*').order('name', { ascending: true }),
    supabase.from('cards').select('id, deck_id, queue_state, due_date')
  ]);

  if (decksRes.error) {
    console.error('Error fetching decks with stats:', decksRes.error);
    throw decksRes.error;
  }
  if (cardsRes.error) {
    console.error('Error fetching cards for deck stats:', cardsRes.error);
    throw cardsRes.error;
  }

  const decks = (decksRes.data || []) as unknown as DeckRecord[];
  const cards = cardsRes.data || [];

  return decks.map((deck) => {
    const deckCards = cards.filter((c) => c.deck_id === deck.id);
    const totalCards = deckCards.length;
    const newCards = deckCards.filter((c) => c.queue_state === 0).length;
    const dueCards = deckCards.filter(
      (c) => c.queue_state !== 0 && c.queue_state !== -1 && c.due_date <= nowIso
    ).length;

    return {
      ...deck,
      totalCards,
      dueCards,
      newCards
    };
  });
}

/**
 * Fetch cards that are due for review across all decks, joined with note fields and card type.
 */
export async function fetchDueCards(customClient?: SupabaseClient<Database>): Promise<import('$lib/types/flashcards').DueTodayItem[]> {
  const supabase = getClient(customClient);
  const nowIso = new Date().toISOString();

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select('*, decks(name), flashcard_notes(*, card_types(name))')
    .neq('queue_state', -1)
    .lte('due_date', nowIso)
    .order('due_date', { ascending: true })
    .limit(100);

  if (cardsError) {
    console.error('Error fetching due cards:', cardsError);
    throw cardsError;
  }

  return (cards || []).map((c: any) => {
    const deckName = c.decks?.name || 'Default Deck';
    const note = c.flashcard_notes;
    const cardTypeName = note?.card_types?.name || 'Standard';
    const fields = (note?.fields as Record<string, string>) || {};
    const fieldValues = Object.values(fields);

    // Front: first field or front field; Back: second field or back field
    const front = fields.front || fields.Front || fields.question || fields.Question || fieldValues[0] || 'Card Front';
    const back = fields.back || fields.Back || fields.answer || fields.Answer || fieldValues[1] || 'Card Back';

    return {
      id: c.id,
      user_id: c.user_id,
      note_id: c.note_id,
      deck_id: c.deck_id,
      card_type: c.card_type,
      queue_state: c.queue_state,
      due_date: c.due_date,
      step_index: c.step_index,
      interval_days: c.interval_days,
      ease_factor: c.ease_factor,
      reps: c.reps,
      lapses: c.lapses,
      created_at: c.created_at,
      updated_at: c.updated_at,
      deck_name: deckName,
      card_type_name: cardTypeName,
      note_front: c.card_type === 1 ? back : front,
      note_back: c.card_type === 1 ? front : back,
      note_fields: fields
    };
  });
}

/**
 * Create a new deck.
 */
export async function createDeck(
  payload: {
    name: string;
    description?: string | null;
    parent_id?: string | null;
    config?: Partial<DeckConfig>;
  },
  customClient?: SupabaseClient<Database>
): Promise<DeckRecord> {
  const supabase = getClient(customClient);

  const defaultConfig: DeckConfig = {
    new_cards_per_day: 20,
    max_reviews_per_day: 200,
    learn_steps_minutes: [1, 10],
    leech_threshold: 8,
  };

  const finalConfig: DeckConfig = {
    ...defaultConfig,
    ...(payload.config || {}),
  };

  const { data, error } = await supabase
    .from('decks')
    .insert({
      name: payload.name.trim(),
      description: payload.description || null,
      parent_id: payload.parent_id || null,
      config: finalConfig as any,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating deck:', error);
    throw error;
  }
  return data as unknown as DeckRecord;
}

/**
 * Update an existing deck.
 */
export async function updateDeck(
  id: string,
  payload: {
    name?: string;
    description?: string | null;
    parent_id?: string | null;
    config?: Partial<DeckConfig>;
  },
  customClient?: SupabaseClient<Database>
): Promise<DeckRecord> {
  const supabase = getClient(customClient);

  const updates: Database['public']['Tables']['decks']['Update'] = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.parent_id !== undefined) updates.parent_id = payload.parent_id;
  if (payload.config !== undefined) updates.config = payload.config as any;

  const { data, error } = await supabase
    .from('decks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating deck ${id}:`, error);
    throw error;
  }
  return data as unknown as DeckRecord;
}

/**
 * Delete a deck (cascades to children decks and cards in database).
 */
export async function deleteDeck(
  id: string,
  customClient?: SupabaseClient<Database>
): Promise<void> {
  const supabase = getClient(customClient);
  const { error } = await supabase.from('decks').delete().eq('id', id);

  if (error) {
    console.error(`Error deleting deck ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch all card types owned by the authenticated user.
 */
export async function fetchCardTypes(
  customClient?: SupabaseClient<Database>
): Promise<CardTypeRecord[]> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('card_types')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching card types:', error);
    throw error;
  }
  return (data || []) as unknown as CardTypeRecord[];
}

/**
 * Create a custom card type schema.
 */
export async function createCardType(
  payload: {
    name: string;
    fields_schema: FieldSchemaItem[];
    has_reverse?: boolean;
  },
  customClient?: SupabaseClient<Database>
): Promise<CardTypeRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('card_types')
    .insert({
      name: payload.name.trim(),
      fields_schema: payload.fields_schema as any,
      has_reverse: payload.has_reverse ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating card type:', error);
    throw error;
  }
  return data as unknown as CardTypeRecord;
}

/**
 * Ingest a note with transactional card provisioning via database RPC.
 */
export async function createFlashcardNote(
  deckId: string,
  cardTypeId: string,
  fields: Record<string, string>,
  tags: string[] = [],
  customClient?: SupabaseClient<Database>
): Promise<string> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase.rpc('create_flashcard_note_with_cards', {
    p_deck_id: deckId,
    p_card_type_id: cardTypeId,
    p_fields: fields as any,
    p_tags: tags,
  });

  if (error) {
    console.error('Error creating flashcard note with cards:', error);
    throw error;
  }
  return data as string;
}

/**
 * Fetch study queue for a deck respecting daily quotas and scheduling limits.
 * Joins note and card type definition for rendering study cards.
 */
export async function fetchStudyQueue(
  deckId: string,
  customClient?: SupabaseClient<Database>
): Promise<StudyQueueItem[]> {
  const supabase = getClient(customClient);

  // 1. Invoke RPC to calculate daily-quota and due-date filtered study cards
  const { data: queueCards, error: rpcError } = await supabase.rpc('get_study_queue', {
    p_deck_id: deckId,
  });

  if (rpcError) {
    console.error(`Error fetching study queue for deck ${deckId}:`, rpcError);
    throw rpcError;
  }

  if (!queueCards || queueCards.length === 0) {
    return [];
  }

  const noteIds = Array.from(new Set(queueCards.map((c) => c.note_id)));

  // 2. Hydrate note contents and schemas
  const { data: notes, error: notesError } = await supabase
    .from('flashcard_notes')
    .select('*, card_types(*)')
    .in('id', noteIds);

  if (notesError) {
    console.error('Error hydrating flashcard note details:', notesError);
    throw notesError;
  }

  const noteMap = new Map<string, any>();
  if (notes) {
    for (const n of notes) {
      noteMap.set(n.id, n);
    }
  }

  return queueCards.map((card) => {
    const noteData = noteMap.get(card.note_id);
    const cardTypeDef = noteData?.card_types as CardTypeRecord | undefined;
    const noteRecord: FlashcardNoteRecord | undefined = noteData
      ? {
          id: noteData.id,
          user_id: noteData.user_id,
          card_type_id: noteData.card_type_id,
          fields: noteData.fields as Record<string, string>,
          tags: noteData.tags || [],
          checksum: noteData.checksum,
          created_at: noteData.created_at,
          updated_at: noteData.updated_at,
        }
      : undefined;

    return {
      ...(card as unknown as CardRecord),
      note: noteRecord,
      card_type_def: cardTypeDef,
    };
  });
}

/**
 * Submit an atomic card review via database RPC.
 */
export async function submitReview(
  cardId: string,
  rating: Rating | number,
  timeTakenMs?: number,
  customClient?: SupabaseClient<Database>
): Promise<CardReviewLogRecord> {
  const supabase = getClient(customClient);
  const ratingCode = typeof rating === 'number' ? rating : RATING_MAP[rating];

  const { data, error } = await supabase.rpc('submit_card_review', {
    p_card_id: cardId,
    p_rating: ratingCode,
    p_time_taken_ms: timeTakenMs,
  });

  if (error) {
    console.error(`Error submitting card review for ${cardId}:`, error);
    throw error;
  }

  return data as unknown as CardReviewLogRecord;
}

/**
 * Fetch chronological card review logs for audit ledger inspection.
 */
export async function fetchCardReviewLogs(
  cardId: string,
  customClient?: SupabaseClient<Database>
): Promise<CardReviewLogRecord[]> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('card_review_logs')
    .select('*')
    .eq('card_id', cardId)
    .order('reviewed_at', { ascending: false });

  if (error) {
    console.error(`Error fetching review logs for card ${cardId}:`, error);
    throw error;
  }

  return (data || []) as unknown as CardReviewLogRecord[];
}

/**
 * Suspend card (queue_state = -1).
 */
export async function suspendCard(
  cardId: string,
  customClient?: SupabaseClient<Database>
): Promise<CardRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('cards')
    .update({ queue_state: -1 })
    .eq('id', cardId)
    .select()
    .single();

  if (error) {
    console.error(`Error suspending card ${cardId}:`, error);
    throw error;
  }

  return data as unknown as CardRecord;
}

/**
 * Reset card to new state (queue_state = 0, step_index = 0, reps = 0, interval_days = 0, due_date = today).
 */
export async function resetCardToNew(
  cardId: string,
  customClient?: SupabaseClient<Database>
): Promise<CardRecord> {
  const supabase = getClient(customClient);
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('cards')
    .update({
      queue_state: 0,
      step_index: 0,
      reps: 0,
      interval_days: 0,
      due_date: today,
    })
    .eq('id', cardId)
    .select()
    .single();

  if (error) {
    console.error(`Error resetting card ${cardId} to new:`, error);
    throw error;
  }

  return data as unknown as CardRecord;
}
