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

describe('TS-04: Daily Deck Quota & Due Queue Fetching', () => {
  let adminClient: SupabaseClient<Database>;
  let userClient: SupabaseClient<Database>;
  let testUserId: string;
  let deckId: string;
  let cardTypeId: string;

  const testUserEmail = `test_studyqueue_${Date.now()}@thecommons-test.internal`;
  const testUserPassword = 'TestPassword123!#';

  beforeAll(async () => {
    adminClient = createClient<Database>(supabaseUrl, serviceRoleKey);

    const { data: userRecord, error: createErr } = await adminClient.auth.admin.createUser({
      email: testUserEmail,
      password: testUserPassword,
      email_confirm: true,
    });

    if (createErr || !userRecord?.user) {
      throw new Error(`Failed to create test user: ${createErr?.message}`);
    }

    testUserId = userRecord.user.id;

    userClient = createClient<Database>(supabaseUrl, anonKey);
    const { error: signInErr } = await userClient.auth.signInWithPassword({
      email: testUserEmail,
      password: testUserPassword,
    });

    if (signInErr) {
      throw new Error(`Failed to sign in test user: ${signInErr.message}`);
    }

    // Create Deck with strict limits: 2 new cards/day, 3 reviews/day
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
      .select('id')
      .single();

    const { data: ct } = await userClient
      .from('card_types')
      .insert({ name: 'Standard', has_reverse: false })
      .select('id')
      .single();

    deckId = deck!.id;
    cardTypeId = ct!.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await adminClient.auth.admin.deleteUser(testUserId);
    }
  });

  beforeEach(async () => {
    await userClient.from('cards').delete().eq('deck_id', deckId);
    await userClient.from('flashcard_notes').delete().eq('user_id', testUserId);
  });

  it('enforces new_cards_per_day quota', async () => {
    // Seed 5 New Cards
    for (let i = 0; i < 5; i++) {
      const { data: note } = await userClient
        .from('flashcard_notes')
        .insert({ card_type_id: cardTypeId, fields: { prompt: `Q${i}`, answer: `A${i}` } })
        .select('id')
        .single();

      await userClient.from('cards').insert({
        note_id: note!.id,
        deck_id: deckId,
        card_type: 0,
        queue_state: 0,
        due_date: new Date().toISOString().split('T')[0],
      });
    }

    const { data: queue, error } = await userClient.rpc('get_study_queue', { p_deck_id: deckId });

    expect(error).toBeNull();
    const newCards = queue!.filter((c) => c.queue_state === 0);
    expect(newCards.length).toBe(2); // Capped by new_cards_per_day = 2
  });

  it('enforces max_reviews_per_day and ignores future or suspended cards', async () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Seed 4 Due Review cards (queue_state = 2, due today)
    for (let i = 0; i < 4; i++) {
      const { data: note } = await userClient
        .from('flashcard_notes')
        .insert({ card_type_id: cardTypeId, fields: { prompt: `RevQ${i}` } })
        .select('id')
        .single();

      await userClient.from('cards').insert({
        note_id: note!.id,
        deck_id: deckId,
        queue_state: 2,
        due_date: today,
      });
    }

    // Seed 1 Future Review card (due tomorrow)
    const { data: futureNote } = await userClient
      .from('flashcard_notes')
      .insert({ card_type_id: cardTypeId, fields: { prompt: 'FutureQ' } })
      .select('id')
      .single();

    await userClient.from('cards').insert({
      note_id: futureNote!.id,
      deck_id: deckId,
      queue_state: 2,
      due_date: tomorrow,
    });

    // Seed 1 Suspended card (queue_state = -1)
    const { data: suspNote } = await userClient
      .from('flashcard_notes')
      .insert({ card_type_id: cardTypeId, fields: { prompt: 'SuspendedQ' } })
      .select('id')
      .single();

    await userClient.from('cards').insert({
      note_id: suspNote!.id,
      deck_id: deckId,
      queue_state: -1,
      due_date: today,
    });

    const { data: queue, error } = await userClient.rpc('get_study_queue', { p_deck_id: deckId });
    expect(error).toBeNull();

    const reviewCards = queue!.filter((c) => c.queue_state === 2);
    expect(reviewCards.length).toBe(3); // Capped by max_reviews_per_day = 3
    expect(queue!.some((c) => c.queue_state === -1)).toBe(false); // No suspended cards
    expect(queue!.some((c) => c.due_date === tomorrow)).toBe(false); // No future cards
  });
});
