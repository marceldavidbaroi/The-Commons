import { getSupabaseClient } from '$lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import type {
  DeckRecord,
  DeckConfig,
  CardTypeRecord,
  FlashcardNoteRecord,
  CardRecord,
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
    .select('id, user_id, parent_id, name, description, config, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching decks:', error);
    throw error;
  }
  return (data || []) as unknown as DeckRecord[];
}

/**
 * Fetch all decks with aggregate stats (total cards, due cards, new cards) from deck_statistics view.
 */
export async function fetchDecksWithStats(customClient?: SupabaseClient<Database>): Promise<import('$lib/types/flashcards').DeckWithStats[]> {
  const supabase = getClient(customClient);

  const { data, error } = await supabase
    .from('deck_statistics')
    .select('id, user_id, parent_id, name, description, config, created_at, updated_at, total_cards, new_cards, due_cards')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching decks with stats:', error);
    throw error;
  }

  let decks: import('$lib/types/flashcards').DeckWithStats[] = (data || []).map((row) => ({
    id: row.id ?? 0,
    user_id: row.user_id,
    parent_id: row.parent_id,
    name: row.name ?? '',
    description: row.description,
    config: row.config as unknown as DeckConfig,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
    totalCards: row.total_cards ?? 0,
    dueCards: row.due_cards ?? 0,
    newCards: row.new_cards ?? 0
  }));

  // If user has no decks at all, auto-create a 'Default' deck so there is always a default deck
  const hasDefaultDeck = decks.some((d) => (d.name || '').toLowerCase() === 'default');
  if (decks.length === 0 || !hasDefaultDeck) {
    try {
      const defaultDeck = await createDeck({ name: 'Default' }, customClient);
      decks = [
        {
          ...defaultDeck,
          totalCards: 0,
          dueCards: 0,
          newCards: 0
        },
        ...decks
      ];
    } catch (e) {
      console.warn('Could not auto-create Default deck:', e);
    }
  }

  // Sort so 'Default' always appears first, followed by others alphabetically
  decks.sort((a, b) => {
    const aName = a.name || '';
    const bName = b.name || '';
    if (aName.toLowerCase() === 'default') return -1;
    if (bName.toLowerCase() === 'default') return 1;
    return aName.localeCompare(bName);
  });

  return decks;
}

/**
 * Fetch cards that are due for review across all decks, joined with note fields and card type.
 */
export async function fetchDueCards(customClient?: SupabaseClient<Database>): Promise<import('$lib/types/flashcards').DueTodayItem[]> {
  const supabase = getClient(customClient);
  const nowIso = new Date().toISOString();

  const { data: cards, error: cardsError } = await supabase
    .from('cards')
    .select(`
      id,
      user_id,
      note_id,
      deck_id,
      card_type,
      queue_state,
      due_date,
      step_index,
      interval_days,
      ease_factor,
      reps,
      lapses,
      created_at,
      updated_at,
      decks(name),
      flashcard_notes(fields, card_types(name))
    `)
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

export interface FetchCardsOptions {
  limit?: number;
  cursorCreatedAt?: string;
  cursorId?: number;
}

/**
 * Fetch cards belonging to a specific deck with keyset/cursor pagination,
 * including note content and card type details.
 */
export async function fetchCardsForDeck(
  deckId: number | string,
  options?: FetchCardsOptions,
  customClient?: SupabaseClient<Database>
): Promise<import('$lib/types/flashcards').DueTodayItem[]> {
  const supabase = getClient(customClient);
  const numericDeckId = Number(deckId);
  const batchLimit = options?.limit ?? 20;

  let query = supabase
    .from('cards')
    .select(`
      id,
      user_id,
      note_id,
      deck_id,
      card_type,
      queue_state,
      due_date,
      step_index,
      interval_days,
      ease_factor,
      reps,
      lapses,
      created_at,
      updated_at,
      decks(name),
      flashcard_notes(fields, card_types(name))
    `)
    .eq('deck_id', numericDeckId);

  // Keyset / cursor condition: (created_at, id) < (cursorCreatedAt, cursorId)
  if (options?.cursorCreatedAt && options?.cursorId !== undefined) {
    query = query.or(
      `created_at.lt.${options.cursorCreatedAt},and(created_at.eq.${options.cursorCreatedAt},id.lt.${options.cursorId})`
    );
  }

  query = query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(batchLimit);

  const { data: cards, error: cardsError } = await query;

  if (cardsError) {
    console.error(`Error fetching cards for deck ${deckId}:`, cardsError);
    throw cardsError;
  }

  return (cards || []).map((c: any) => {
    const deckName = c.decks?.name || 'Deck';
    const note = c.flashcard_notes;
    const cardTypeName = note?.card_types?.name || 'Standard';
    const fields = (note?.fields as Record<string, string>) || {};
    const fieldValues = Object.values(fields);

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
    parent_id?: number | string | null;
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

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('decks')
    .insert({
      user_id: user?.id,
      name: payload.name.trim(),
      description: payload.description || null,
      parent_id: payload.parent_id === null || payload.parent_id === undefined ? null : Number(payload.parent_id),
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
  id: number | string,
  payload: {
    name?: string;
    description?: string | null;
    parent_id?: number | string | null;
    config?: Partial<DeckConfig>;
  },
  customClient?: SupabaseClient<Database>
): Promise<DeckRecord> {
  const supabase = getClient(customClient);
  const numericId = Number(id);

  const updates: Database['public']['Tables']['decks']['Update'] = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.parent_id !== undefined) updates.parent_id = payload.parent_id === null ? null : Number(payload.parent_id);
  if (payload.config !== undefined) updates.config = payload.config as any;

  const { data, error } = await supabase
    .from('decks')
    .update(updates)
    .eq('id', numericId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating deck ${id}:`, error);
    throw error;
  }
  return data as unknown as DeckRecord;
}

/**
 * Delete a deck (deletes all related cards and subdecks).
 */
export async function deleteDeck(
  id: number | string,
  customClient?: SupabaseClient<Database>
): Promise<void> {
  const supabase = getClient(customClient);
  const numericId = Number(id);

  // Explicitly purge all cards in this deck (as well as child cards) to guarantee cards are deleted
  await supabase.from('cards').delete().eq('deck_id', numericId);

  const { error } = await supabase.from('decks').delete().eq('id', numericId);

  if (error) {
    console.error(`Error deleting deck ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch all card types owned by the authenticated user, automatically provisioning the default type if none exists.
 */
export async function fetchCardTypes(
  customClient?: SupabaseClient<Database>
): Promise<CardTypeRecord[]> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('card_types')
    .select('id, user_id, name, fields_schema, has_reverse, is_default, created_at, updated_at')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching card types:', error);
    throw error;
  }

  const types = (data || []) as unknown as CardTypeRecord[];

  // If user has no default card type, create the system default 'Basic' card type
  const hasDefault = types.some((t) => t.is_default);
  if (!hasDefault) {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const { data: defaultType, error: defaultError } = await supabase
        .from('card_types')
        .insert({
          user_id: user?.id,
          name: 'Basic',
          fields_schema: [
            { label: 'Front', type: 'title' },
            { label: 'Back', type: 'description' }
          ] as any,
          has_reverse: false,
          is_default: true
        })
        .select()
        .single();

      if (!defaultError && defaultType) {
        return [defaultType as unknown as CardTypeRecord, ...types];
      }
    } catch (e) {
      console.warn('Could not auto-provision default card type:', e);
    }
  }

  return types;
}

/**
 * Create a custom card type schema.
 */
export async function createCardType(
  payload: {
    name: string;
    fields_schema: FieldSchemaItem[];
    has_reverse?: boolean;
    is_default?: boolean;
  },
  customClient?: SupabaseClient<Database>
): Promise<CardTypeRecord> {
  const supabase = getClient(customClient);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('card_types')
    .insert({
      user_id: user?.id,
      name: payload.name.trim(),
      fields_schema: payload.fields_schema as any,
      has_reverse: payload.has_reverse ?? false,
      is_default: payload.is_default ?? false,
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
 * Update an existing card type schema. Default card types cannot be edited.
 */
export async function updateCardType(
  id: number | string,
  payload: {
    name?: string;
    fields_schema?: FieldSchemaItem[];
    has_reverse?: boolean;
  },
  customClient?: SupabaseClient<Database>
): Promise<CardTypeRecord> {
  const supabase = getClient(customClient);
  const numericId = Number(id);

  // Guard against editing default card types
  const { data: existing } = await supabase
    .from('card_types')
    .select('is_default')
    .eq('id', numericId)
    .single();

  if (existing?.is_default) {
    throw new Error('Default card type cannot be edited or modified.');
  }

  const updates: Database['public']['Tables']['card_types']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.fields_schema !== undefined) updates.fields_schema = payload.fields_schema as any;
  if (payload.has_reverse !== undefined) updates.has_reverse = payload.has_reverse;

  const { data, error } = await supabase
    .from('card_types')
    .update(updates)
    .eq('id', numericId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating card type ${id}:`, error);
    throw error;
  }
  return data as unknown as CardTypeRecord;
}

/**
 * Delete a card type schema.
 * All related notes and cards are deleted. Default card types cannot be deleted.
 */
export async function deleteCardType(
  id: number | string,
  customClient?: SupabaseClient<Database>
): Promise<void> {
  const supabase = getClient(customClient);
  const numericId = Number(id);

  // Guard against deleting default card type
  const { data: existing } = await supabase
    .from('card_types')
    .select('is_default')
    .eq('id', numericId)
    .single();

  if (existing?.is_default) {
    throw new Error('Default card type cannot be deleted.');
  }

  // Explicitly purge related notes (which in turn cascades to all child cards in PostgreSQL)
  await supabase.from('flashcard_notes').delete().eq('card_type_id', numericId);

  const { error } = await supabase.from('card_types').delete().eq('id', numericId);

  if (error) {
    console.error(`Error deleting card type ${id}:`, error);
    throw error;
  }
}

/**
 * Ingest a note with transactional card provisioning via database RPC.
 */
export async function createFlashcardNote(
  deckId: number | string,
  cardTypeId: number | string,
  fields: Record<string, string>,
  tags: string[] = [],
  customClient?: SupabaseClient<Database>
): Promise<number> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase.rpc('create_flashcard_note_with_cards', {
    p_deck_id: Number(deckId),
    p_card_type_id: Number(cardTypeId),
    p_fields: fields as any,
    p_tags: tags,
  });

  if (error) {
    console.error('Error creating flashcard note with cards:', error);
    throw error;
  }
  return data as number;
}

/**
 * Bulk create multiple flashcard notes with cards in a single database RPC call.
 */
export async function bulkCreateFlashcardNotes(
  deckId: number | string,
  cardTypeId: number | string,
  items: Array<Record<string, string> | { fields: Record<string, string>; tags?: string[] }>,
  defaultTags: string[] = ['csv-import'],
  customClient?: SupabaseClient<Database>
): Promise<number> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase.rpc('bulk_create_flashcard_notes', {
    p_deck_id: Number(deckId),
    p_card_type_id: Number(cardTypeId),
    p_items: items as any,
    p_default_tags: defaultTags
  });

  if (error) {
    console.error('Error bulk creating flashcard notes:', error);
    throw error;
  }
  return data as number;
}

/**
 * Fetch study queue for a deck respecting daily quotas and scheduling limits.
 * Joins note and card type definition for rendering study cards.
 */
export async function fetchStudyQueue(
  deckId: number | string,
  customClient?: SupabaseClient<Database>
): Promise<StudyQueueItem[]> {
  const supabase = getClient(customClient);

  // 1. Invoke RPC to calculate daily-quota and due-date filtered study cards
  const { data: queueCards, error: rpcError } = await supabase.rpc('get_study_queue', {
    p_deck_id: Number(deckId),
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
    .select('id, user_id, card_type_id, fields, tags, checksum, created_at, updated_at, card_types(id, user_id, name, fields_schema, has_reverse, is_default, created_at, updated_at)')
    .in('id', noteIds);

  if (notesError) {
    console.error('Error hydrating flashcard note details:', notesError);
    throw notesError;
  }

  const noteMap = new Map<number | string, any>();
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

    const cardId = (card as any).id ?? card.card_id;

    return {
      ...(card as unknown as CardRecord),
      id: cardId,
      note: noteRecord,
      card_type_def: cardTypeDef,
    };
  });
}

/**
 * Submit an atomic card review via database RPC.
 */
export async function submitReview(
  cardId: number | string,
  rating: Rating | number,
  timeTakenMs?: number,
  customClient?: SupabaseClient<Database>
): Promise<void> {
  const supabase = getClient(customClient);
  const ratingCode = typeof rating === 'number' ? rating : RATING_MAP[rating];

  const { error } = await supabase.rpc('submit_card_review', {
    p_card_id: Number(cardId),
    p_rating: ratingCode,
    p_time_taken_ms: timeTakenMs,
  });

  if (error) {
    console.error(`Error submitting card review for ${cardId}:`, error);
    throw error;
  }
}

/**
 * Suspend card (queue_state = -1).
 */
export async function suspendCard(
  cardId: number | string,
  customClient?: SupabaseClient<Database>
): Promise<CardRecord> {
  const supabase = getClient(customClient);
  const { data, error } = await supabase
    .from('cards')
    .update({ queue_state: -1 })
    .eq('id', Number(cardId))
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
  cardId: number | string,
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
    .eq('id', Number(cardId))
    .select()
    .single();

  if (error) {
    console.error(`Error resetting card ${cardId} to new:`, error);
    throw error;
  }

  return data as unknown as CardRecord;
}

/**
 * Bulk delete flashcards by their card IDs.
 * Also deletes orphaned flashcard notes when all associated cards are removed.
 */
export async function deleteCards(
  cardIds: (number | string)[],
  customClient?: SupabaseClient<Database>
): Promise<void> {
  if (!cardIds || cardIds.length === 0) return;
  const supabase = getClient(customClient);
  const ids = cardIds.map((id) => (typeof id === 'number' ? id : id));

  // Find note IDs associated with these cards to clean up parent notes
  const { data: cardsToDelete } = await supabase
    .from('cards')
    .select('id, note_id')
    .in('id', ids as any);

  const noteIds = Array.from(new Set((cardsToDelete || []).map((c: any) => c.note_id).filter(Boolean)));

  const { error } = await supabase
    .from('cards')
    .delete()
    .in('id', ids as any);

  if (error) {
    console.error('Error deleting cards:', error);
    throw error;
  }

  // Clean up notes if any
  if (noteIds.length > 0) {
    // Delete notes that have no remaining cards
    const { data: remainingCards } = await supabase
      .from('cards')
      .select('note_id')
      .in('note_id', noteIds as any);

    const remainingNoteIds = new Set((remainingCards || []).map((c: any) => c.note_id));
    const orphanedNoteIds = noteIds.filter((nid) => !remainingNoteIds.has(nid));

    if (orphanedNoteIds.length > 0) {
      await supabase
        .from('flashcard_notes')
        .delete()
        .in('id', orphanedNoteIds as any);
    }
  }
}
