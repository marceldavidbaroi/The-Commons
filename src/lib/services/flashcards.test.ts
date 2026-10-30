import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database.types';
import fs from 'node:fs';
import path from 'node:path';

function loadEnv() {
  const envFiles = ['.env.local', '.env.local.prod', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1).trim();
          }
          if (val.length > 0 && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_TEST_URL || process.env.PUBLIC_SUPABASE_URL || 'https://rbnbgyytxgkkcrmkgnro.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibmJneXl0eGdra2NybWtnbnJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1Njc4NjgsImV4cCI6MjEwNTE0Mzg2OH0.3VGwo91QH7aBPxoA8ibDebk1YB9UfGeL-8hLl5gK064';

describe('Spaced Repetition & Flashcards Engine Suite (TS-01 through TS-05)', () => {
  let adminClient: SupabaseClient<Database>;
  let userClient: SupabaseClient<Database>;
  let otherUserClient: SupabaseClient<Database>;
  let testUserId: string;
  let otherUserId: string;

  const testUserEmail = `test_flashcards_${Date.now()}@thecommons-test.internal`;
  const otherUserEmail = `test_flashcards_other_${Date.now()}@thecommons-test.internal`;
  const testUserPassword = 'TestPassword123!#';

  beforeAll(async () => {
    adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);

    // Create primary test user
    const { data: u1, error: err1 } = await adminClient.auth.admin.createUser({
      email: testUserEmail,
      password: testUserPassword,
      email_confirm: true,
    });
    if (err1 || !u1.user) throw new Error(`Failed to create primary user: ${err1?.message}`);
    testUserId = u1.user.id;

    // Create second user to test RLS boundary
    const { data: u2, error: err2 } = await adminClient.auth.admin.createUser({
      email: otherUserEmail,
      password: testUserPassword,
      email_confirm: true,
    });
    if (err2 || !u2.user) throw new Error(`Failed to create secondary user: ${err2?.message}`);
    otherUserId = u2.user.id;

    // Sign in primary user
    userClient = createClient<Database>(supabaseUrl, anonKey);
    const { error: sign1Err } = await userClient.auth.signInWithPassword({
      email: testUserEmail,
      password: testUserPassword,
    });
    if (sign1Err) throw new Error(`Failed to sign in primary user: ${sign1Err.message}`);

    // Sign in second user
    otherUserClient = createClient<Database>(supabaseUrl, anonKey);
    const { error: sign2Err } = await otherUserClient.auth.signInWithPassword({
      email: otherUserEmail,
      password: testUserPassword,
    });
    if (sign2Err) throw new Error(`Failed to sign in secondary user: ${sign2Err.message}`);
  });

  afterAll(async () => {
    if (testUserId) await adminClient.auth.admin.deleteUser(testUserId);
    if (otherUserId) await adminClient.auth.admin.deleteUser(otherUserId);
  });

  beforeEach(async () => {
    // Clean up flashcards tables for test users
    await adminClient.from('cards').delete().in('user_id', [testUserId, otherUserId]);
    await adminClient.from('flashcard_notes').delete().in('user_id', [testUserId, otherUserId]);
    await adminClient.from('card_types').delete().in('user_id', [testUserId, otherUserId]);
    await adminClient.from('decks').delete().in('user_id', [testUserId, otherUserId]);
  });

  it('TS-01: Multi-tenant RLS Isolation prevents cross-user access', async () => {
    // User 1 creates a deck
    const { data: deck1, error: d1Err } = await userClient
      .from('decks')
      .insert({ name: 'Private Deck User 1' })
      .select()
      .single();
    expect(d1Err).toBeNull();
    expect(deck1?.user_id).toBe(testUserId);

    // User 2 cannot see User 1's deck
    const { data: u2Decks } = await otherUserClient.from('decks').select('*').eq('id', deck1!.id);
    expect(u2Decks?.length).toBe(0);

    // User 2 cannot mutate User 1's deck
    const { data: updateRes } = await otherUserClient
      .from('decks')
      .update({ name: 'Hacked Deck' })
      .eq('id', deck1!.id)
      .select();
    expect(updateRes?.length).toBe(0);
  });

  it('TS-02: create_flashcard_note_with_cards handles forward-only and bidirectional schemas', async () => {
    // 1. Create a deck
    const { data: deck } = await userClient.from('decks').insert({ name: 'Biology' }).select().single();

    // 2. Create forward-only card type
    const { data: singleCt } = await userClient
      .from('card_types')
      .insert({ name: 'Single Card', has_reverse: false })
      .select()
      .single();

    // Ingest forward-only note
    const { data: singleNoteId, error: singleErr } = await userClient.rpc('create_flashcard_note_with_cards', {
      p_deck_id: deck!.id,
      p_card_type_id: singleCt!.id,
      p_fields: { prompt: 'What is ATP?', answer: 'Cellular energy currency' },
      p_tags: ['bio', 'energy'],
    });
    expect(singleErr).toBeNull();
    expect(singleNoteId).toBeDefined();

    // Verify exactly 1 card generated with card_type = 0
    const { data: singleCards } = await userClient
      .from('cards')
      .select('*')
      .eq('note_id', singleNoteId!);
    expect(singleCards?.length).toBe(1);
    expect(singleCards![0].card_type).toBe(0);
    expect(singleCards![0].queue_state).toBe(0); // New

    // 3. Create bidirectional card type
    const { data: biCt } = await userClient
      .from('card_types')
      .insert({ name: 'Vocabulary (Bi-directional)', has_reverse: true })
      .select()
      .single();

    // Ingest reversible note
    const { data: biNoteId, error: biErr } = await userClient.rpc('create_flashcard_note_with_cards', {
      p_deck_id: deck!.id,
      p_card_type_id: biCt!.id,
      p_fields: { prompt: 'Apple', answer: 'Pomme' },
      p_tags: ['vocab'],
    });
    expect(biErr).toBeNull();

    // Verify 2 cards generated: forward (0) and reverse (1)
    const { data: biCards } = await userClient
      .from('cards')
      .select('*')
      .eq('note_id', biNoteId!)
      .order('card_type', { ascending: true });
    expect(biCards?.length).toBe(2);
    expect(biCards![0].card_type).toBe(0);
    expect(biCards![1].card_type).toBe(1);
  });

  it('TS-03: submit_card_review processes Learning advancement and Review queue interval math', async () => {
    const { data: deck } = await userClient
      .from('decks')
      .insert({
        name: 'Math Deck',
        config: { learn_steps_minutes: [1, 10], leech_threshold: 4 },
      })
      .select()
      .single();

    const { data: ct } = await userClient.from('card_types').insert({ name: 'Formulas', has_reverse: false }).select().single();
    const { data: noteId } = await userClient.rpc('create_flashcard_note_with_cards', {
      p_deck_id: deck!.id,
      p_card_type_id: ct!.id,
      p_fields: { prompt: 'E=mc^2', answer: 'Mass-energy equivalence' },
    });

    const { data: initialCards } = await userClient.from('cards').select('*').eq('note_id', noteId!);
    const cardId = initialCards![0].id;

    // Review 1: Rating 3 (Normal) -> Advances learning step from 0 to 1
    const { error: r1Err } = await userClient.rpc('submit_card_review', {
      p_card_id: cardId,
      p_rating: 3,
      p_time_taken_ms: 1200,
    });
    expect(r1Err).toBeNull();

    const { data: cardStep1 } = await userClient.from('cards').select('*').eq('id', cardId).single();
    expect(cardStep1!.step_index).toBe(1);
    expect(cardStep1!.queue_state).toBe(1); // Still learning

    // Review 2: Rating 3 (Normal at final step) -> Graduates to Review (queue_state = 2, interval_days = 1)
    const { error: r2Err } = await userClient.rpc('submit_card_review', {
      p_card_id: cardId,
      p_rating: 3,
      p_time_taken_ms: 900,
    });
    expect(r2Err).toBeNull();

    const { data: cardGraduated } = await userClient.from('cards').select('*').eq('id', cardId).single();
    expect(cardGraduated!.queue_state).toBe(2);
    expect(cardGraduated!.interval_days).toBe(1);
    expect(cardGraduated!.ease_factor).toBe(2.50);

    // Review 3: Rating 3 (Normal on Review queue): interval = round(1 * 2.50) = 3
    const { error: r3Err } = await userClient.rpc('submit_card_review', {
      p_card_id: cardId,
      p_rating: 3,
      p_time_taken_ms: 1500,
    });
    expect(r3Err).toBeNull();

    const { data: cardReview1 } = await userClient.from('cards').select('*').eq('id', cardId).single();
    expect(cardReview1!.interval_days).toBe(3);
    expect(cardReview1!.ease_factor).toBe(2.50);

    // Review 4: Rating 2 (Hard on Review queue): ease = 2.50 - 0.15 = 2.35, interval = round(3 * 1.20) = 4
    const { error: r4Err } = await userClient.rpc('submit_card_review', {
      p_card_id: cardId,
      p_rating: 2,
      p_time_taken_ms: 2200,
    });
    expect(r4Err).toBeNull();

    const { data: cardReview2 } = await userClient.from('cards').select('*').eq('id', cardId).single();
    expect(cardReview2!.interval_days).toBe(4);
    expect(cardReview2!.ease_factor).toBe(2.35);
  });

  it('TS-04: get_study_queue enforces daily limits and ignores future/suspended cards', { timeout: 25000 }, async () => {
    // Create deck with strict limits: 2 new cards/day, 3 reviews/day
    const { data: deck } = await userClient
      .from('decks')
      .insert({
        name: 'Quota Deck',
        config: {
          new_cards_per_day: 2,
          max_reviews_per_day: 3,
          learn_steps_minutes: [1, 10],
          leech_threshold: 8,
        },
      })
      .select()
      .single();

    const { data: ct } = await userClient.from('card_types').insert({ name: 'Standard', has_reverse: false }).select().single();

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Bulk seed 4 New notes
    const { data: newNotes } = await userClient
      .from('flashcard_notes')
      .insert(Array.from({ length: 4 }, (_, i) => ({ card_type_id: ct!.id, fields: { prompt: `NewQ${i}` } })))
      .select('id');

    await userClient.from('cards').insert(
      newNotes!.map((n) => ({
        note_id: n.id,
        deck_id: deck!.id,
        card_type: 0,
        queue_state: 0,
        due_date: today,
      }))
    );

    // Bulk seed 4 Due Review notes
    const { data: revNotes } = await userClient
      .from('flashcard_notes')
      .insert(Array.from({ length: 4 }, (_, i) => ({ card_type_id: ct!.id, fields: { prompt: `RevQ${i}` } })))
      .select('id');

    await userClient.from('cards').insert(
      revNotes!.map((n) => ({
        note_id: n.id,
        deck_id: deck!.id,
        queue_state: 2,
        due_date: today,
      }))
    );

    // Seed 1 Future note
    const { data: futureNote } = await userClient
      .from('flashcard_notes')
      .insert({ card_type_id: ct!.id, fields: { prompt: 'FutureQ' } })
      .select('id')
      .single();
    await userClient.from('cards').insert({
      note_id: futureNote!.id,
      deck_id: deck!.id,
      queue_state: 2,
      due_date: tomorrow,
    });

    // Seed 1 Suspended note
    const { data: suspNote } = await userClient
      .from('flashcard_notes')
      .insert({ card_type_id: ct!.id, fields: { prompt: 'SuspendedQ' } })
      .select('id')
      .single();
    await userClient.from('cards').insert({
      note_id: suspNote!.id,
      deck_id: deck!.id,
      queue_state: -1,
      due_date: today,
    });

    // Query study queue via RPC
    const { data: queue, error: qErr } = await userClient.rpc('get_study_queue', { p_deck_id: deck!.id });
    expect(qErr).toBeNull();
    expect(queue).toBeDefined();

    const newCards = queue!.filter((c) => c.queue_state === 0);
    const reviewCards = queue!.filter((c) => c.queue_state === 2);

    expect(newCards.length).toBe(2); // Capped by new_cards_per_day = 2
    expect(reviewCards.length).toBe(3); // Capped by max_reviews_per_day = 3
    expect(queue!.some((c) => c.queue_state === -1)).toBe(false); // No suspended cards
    expect(queue!.some((c) => c.due_date === tomorrow)).toBe(false); // No future cards
  });

  it('TS-05: Leech suspension and ease factor floor of 1.30', async () => {
    // Deck with leech threshold of 2
    const { data: deck } = await userClient
      .from('decks')
      .insert({
        name: 'Leech Test Deck',
        config: { leech_threshold: 2 },
      })
      .select()
      .single();

    const { data: ct } = await userClient.from('card_types').insert({ name: 'Basic', has_reverse: false }).select().single();
    const { data: note } = await userClient
      .from('flashcard_notes')
      .insert({ card_type_id: ct!.id, fields: { prompt: 'Tricky Q' } })
      .select()
      .single();

    // Create graduated review card with 1 previous lapse and ease = 1.35
    const { data: card } = await userClient
      .from('cards')
      .insert({
        note_id: note!.id,
        deck_id: deck!.id,
        queue_state: 2,
        ease_factor: 1.35,
        lapses: 1,
        interval_days: 10,
      })
      .select()
      .single();

    // Rate Again (1) -> Lapses become 2 (reaches threshold 2) -> Suspended (-1)
    // Ease decreases: max(1.30, 1.35 - 0.20 = 1.15) = 1.30
    const { error: revErr } = await userClient.rpc('submit_card_review', {
      p_card_id: card!.id,
      p_rating: 1,
    });
    expect(revErr).toBeNull();

    const { data: updatedCard } = await userClient.from('cards').select('*').eq('id', card!.id).single();
    expect(updatedCard!.lapses).toBe(2);
    expect(updatedCard!.queue_state).toBe(-1); // Suspended
    expect(updatedCard!.ease_factor).toBe(1.30); // Floored at 1.30
  });
});
