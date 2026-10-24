# Supabase TDD Specification: Core Spaced Repetition Engine

> [!NOTE]
> Living TDD specification for the Spaced Repetition / Flashcard engine in The Commons. Executable via `supabase test db` (pgTAP) and `vitest` (integration).

---

## 1. Testing Architecture & Tooling

To ensure absolute parity between relational integrity constraints, atomic operations, and scheduling math, testing is split into two automated layers:

1. **Database Unit & Invariant Testing (pgTAP):** Executed natively inside the Supabase PostgreSQL environment via `supabase test db`. Validates table schemas, CHECK constraints, triggers, and PL/pgSQL stored procedures directly against the database engine.
2. **Integration & Client-Layer Testing (Vitest + Supabase JS Client):** Tests data-access functions, edge cases, payload validation, and atomic API transactions from a consumer perspective using a local Supabase test instance (`127.0.0.1:54321`).

---

## 2. Test Suite Matrix

| Suite ID | Target Component | Test Objectives | Framework |
| :--- | :--- | :--- | :--- |
| **TS-01** | DDL & Constraints | Verify schema invariants, foreign key cascades, CHECK constraints (`ease_factor >= 1.30`, `card_type IN (0,1)`), and GIN indexes on `public.flashcard_notes`. | pgTAP |
| **TS-02** | Note & Card Ingestion | Test transactional card generation: Card 0 created by default; Card 1 conditionally created on `has_reverse = true`. | pgTAP / Vitest |
| **TS-03** | SM-2 Review RPC | Test atomic state transition and append-only ledger write (`card_review_logs`) for all four ratings across Learning and Review queues. | pgTAP |
| **TS-04** | Queue Quota & Retrieval | Verify `new_cards_per_day` and `max_reviews_per_day` limits per deck hierarchy. | Vitest |
| **TS-05** | Leech Suspension & Edge Cases | Ensure auto-suspension when `lapses >= leech_threshold` and check boundary math for Ease Factor flooring. | pgTAP / Vitest |

---

## 3. Detailed Test Specifications

### TS-01: Schema Constraints & Invariants (pgTAP)

#### Target Specifications
- Table existence: `decks`, `card_types`, `flashcard_notes`, `cards`, `card_review_logs`.
- Primary keys: UUID defaults via `gen_random_uuid()`.
- Unique constraint: `cards(note_id, card_type)` prevents duplicate directional cards.
- Check constraints:
  - `cards.ease_factor >= 1.30`
  - `cards.card_type IN (0, 1)`
  - `cards.queue_state IN (-1, 0, 1, 2, 3)`
  - `card_review_logs.rating BETWEEN 1 AND 4`

#### Test Implementation (`supabase/tests/database/01_schema_constraints.test.sql`)

```sql
BEGIN;
SELECT plan(10);

-- 1. Check Tables Exist
SELECT has_table('decks', 'Table "decks" should exist');
SELECT has_table('card_types', 'Table "card_types" should exist');
SELECT has_table('flashcard_notes', 'Table "flashcard_notes" should exist');
SELECT has_table('cards', 'Table "cards" should exist');
SELECT has_table('card_review_logs', 'Table "card_review_logs" should exist');

-- 2. Validate Ease Factor Lower Bound Constraint
SELECT throws_ok(
    $$
    INSERT INTO cards (note_id, deck_id, ease_factor)
    VALUES (gen_random_uuid(), gen_random_uuid(), 1.29)
    $$,
    '23514', -- check_violation
    NULL,
    'Cards with ease_factor < 1.30 must violate check constraint'
);

-- 3. Validate Card Type Constraint
SELECT throws_ok(
    $$
    INSERT INTO cards (note_id, deck_id, card_type)
    VALUES (gen_random_uuid(), gen_random_uuid(), 2)
    $$,
    '23514',
    NULL,
    'Cards with card_type not in (0, 1) must violate check constraint'
);

-- 4. Validate Review Log Rating Constraint
SELECT throws_ok(
    $$
    INSERT INTO card_review_logs (card_id, rating, previous_state, previous_interval_days, previous_ease_factor, new_interval_days, new_ease_factor)
    VALUES (gen_random_uuid(), 5, 0, 0, 2.50, 1, 2.50)
    $$,
    '23514',
    NULL,
    'Ratings outside 1-4 must violate check constraint'
);

-- 5. Test Unique Constraint on (note_id, card_type)
PREPARE insert_deck AS
    INSERT INTO decks (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Test Deck');
PREPARE insert_card_type AS
    INSERT INTO card_types (id, name) VALUES ('00000000-0000-0000-0000-000000000002', 'Basic');
PREPARE insert_note AS
    INSERT INTO flashcard_notes (id, card_type_id, fields) 
    VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '{"front":"Q","back":"A"}');

EXECUTE insert_deck;
EXECUTE insert_card_type;
EXECUTE insert_note;

INSERT INTO cards (note_id, deck_id, card_type)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 0);

SELECT throws_ok(
    $$
    INSERT INTO cards (note_id, deck_id, card_type)
    VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 0)
    $$,
    '23505', -- unique_violation
    NULL,
    'Duplicate (note_id, card_type) must fail unique constraint'
);

SELECT col_is_pk('cards', 'id', 'cards.id must be a primary key');

SELECT * FROM finish();
ROLLBACK;
```

---

### TS-02: Note Ingestion & Card Provisioning

#### Target Specifications
When a flashcard note is created:
1. Card 0 (`card_type = 0`, Forward) is always created with `queue_state = 0` (New).
2. If `card_types.has_reverse = TRUE`, Card 1 (`card_type = 1`, Reverse) is also created.
3. If `card_types.has_reverse = FALSE`, only Card 0 exists.
4. Cards are tied to the target deck provided during ingestion.

#### Stored Function Contract (`create_flashcard_note_with_cards`)

```sql
CREATE OR REPLACE FUNCTION create_flashcard_note_with_cards(
    p_deck_id UUID,
    p_card_type_id UUID,
    p_fields JSONB,
    p_tags TEXT[] DEFAULT '{}'
) RETURNS UUID;
```

#### Test Implementation (`supabase/tests/database/02_card_generation.test.sql`)

```sql
BEGIN;
SELECT plan(4);

-- Setup fixtures
INSERT INTO decks (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Default Deck');

INSERT INTO card_types (id, name, has_reverse) 
VALUES ('22222222-2222-2222-2222-222222222222', 'Single Orientation', FALSE);

INSERT INTO card_types (id, name, has_reverse) 
VALUES ('33333333-3333-3333-3333-333333333333', 'Bidirectional', TRUE);

-- Test Case 1: Ingest forward-only note
SELECT create_flashcard_note_with_cards(
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '{"prompt": "Hello", "answer": "World"}'::jsonb,
    ARRAY['vocab']
) AS note_id \gset note_single_

SELECT is(
    (SELECT COUNT(*)::INT FROM cards WHERE note_id = :'note_single_note_id'),
    1,
    'Forward-only note generates exactly one card'
);

SELECT is(
    (SELECT card_type::INT FROM cards WHERE note_id = :'note_single_note_id'),
    0,
    'Generated card is card_type 0 (Forward)'
);

-- Test Case 2: Ingest reversible note
SELECT create_flashcard_note_with_cards(
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '{"prompt": "Car", "answer": "Voiture"}'::jsonb,
    ARRAY['french']
) AS note_id \gset note_bi_

SELECT is(
    (SELECT COUNT(*)::INT FROM cards WHERE note_id = :'note_bi_note_id'),
    2,
    'Reversible note generates two cards'
);

SELECT set_eq(
    $$ SELECT card_type::INT FROM cards WHERE note_id = '$$ || :'note_bi_note_id' || $$' $$,
    ARRAY[0, 1],
    'Generated cards include both Forward (0) and Reverse (1)'
);

SELECT * FROM finish();
ROLLBACK;
```

---

### TS-03: SM-2 Engine & Atomic Review Transition RPC

#### Target Specifications
Reviews must run inside a single transaction via `submit_card_review`:

- **Learning Queue (`queue_state = 0` or `1`):**
  - Rating `1` (Again): `step_index = 0`, `interval_days = 0`, `due_date = CURRENT_DATE`.
  - Rating `3` (Normal): If `step_index = 0`, increments to `step_index = 1`. If `step_index = 1`, graduates to `queue_state = 2`, `interval_days = 1`, `due_date = CURRENT_DATE + 1`.
  - Rating `4` (Easy): Immediate graduation to `queue_state = 2`, `interval_days = 4`, `due_date = CURRENT_DATE + 4`.

- **Review Queue (`queue_state = 2`):**
  - Rating `1` (Again): `lapses += 1`, `queue_state = 3` (or `-1` if lapses $\ge$ threshold), `interval_days = 1`, $EF = \max(1.30, EF - 0.20)$.
  - Rating `2` (Hard): $EF = \max(1.30, EF - 0.15)$, $I_{\text{new}} = \max(I + 1, \text{round}(I \times 1.20))$.
  - Rating `3` (Normal): $EF_{\text{new}} = EF$, $I_{\text{new}} = \max(I + 1, \text{round}(I \times EF))$.
  - Rating `4` (Easy): $EF_{\text{new}} = EF + 0.15$, $I_{\text{new}} = \max(I + 1, \text{round}(I \times EF \times 1.30))$.

- **Ledger Verification:** Every call produces an immutable row in `card_review_logs`.

#### Stored Function Contract (`submit_card_review`)

```sql
CREATE OR REPLACE FUNCTION submit_card_review(
    p_card_id UUID,
    p_rating SMALLINT,
    p_time_taken_ms INT DEFAULT NULL
) RETURNS card_review_logs;
```

#### Test Implementation (`supabase/tests/database/03_sm2_transitions.test.sql`)

```sql
BEGIN;
SELECT plan(12);

-- Fixtures
INSERT INTO decks (id, name, config) 
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'SR Deck', '{"learn_steps_minutes": [1, 10], "leech_threshold": 3}'::jsonb);

INSERT INTO card_types (id, name) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Basic');
INSERT INTO flashcard_notes (id, card_type_id) VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Insert initial card in Learning (queue_state = 1, step_index = 0)
INSERT INTO cards (id, note_id, deck_id, queue_state, step_index, interval_days, ease_factor, due_date)
VALUES ('d0000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, 0, 0, 2.50, CURRENT_DATE);

-- 1. Advance Step (Rating 3 - Normal)
SELECT submit_card_review('d0000000-0000-0000-0000-000000000001', 3::SMALLINT, 1200);

SELECT is(step_index, 1, 'Card step index advances to 1') FROM cards WHERE id = 'd0000000-0000-0000-0000-000000000001';
SELECT is(queue_state::INT, 1, 'Card remains in Learning state') FROM cards WHERE id = 'd0000000-0000-0000-0000-000000000001';

-- 2. Graduate Card (Rating 3 - Normal at final step)
SELECT submit_card_review('d0000000-0000-0000-0000-000000000001', 3::SMALLINT, 800);

SELECT is(queue_state::INT, 2, 'Card graduates to Review queue (queue_state = 2)') FROM cards WHERE id = 'd0000000-0000-0000-0000-000000000001';
SELECT is(interval_days, 1, 'Graduated interval is set to 1 day') FROM cards WHERE id = 'd0000000-0000-0000-0000-000000000001';
SELECT is(due_date, CURRENT_DATE + 1, 'Due date set to CURRENT_DATE + 1') FROM cards WHERE id = 'd0000000-0000-0000-0000-000000000001';

-- 3. Review Queue Rating 3 (Normal): Interval = round(1 * 2.5) = 3 (due to max(I+1, round(I*EF)))
SELECT submit_card_review('d0000000-0000-0000-0000-000000000001', 3::SMALLINT, 1500);

SELECT is(interval_days, 3, 'Next review interval scaled by Ease Factor: round(1 * 2.50) = 3') FROM cards WHERE id = 'd0000000-0000-0000-0000-000000000001';
SELECT is(ease_factor, 2.50, 'Ease factor remains unchanged on Normal review') FROM cards WHERE id = 'd0000000-0000-0000-0000-000000000001';

-- 4. Review Queue Rating 2 (Hard): interval = round(3 * 1.2) = 4, ease = 2.50 - 0.15 = 2.35
SELECT submit_card_review('d0000000-0000-0000-0000-000000000001', 2::SMALLINT, 2500);

SELECT is(interval_days, 4, 'Hard review scales interval by 1.20') FROM cards WHERE id = 'd0000000-0000-0000-0000-000000000001';
SELECT is(ease_factor, 2.35, 'Ease factor decreased by 0.15 on Hard review') FROM cards WHERE id = 'd0000000-0000-0000-0000-000000000001';

-- 5. Review Log Audit Trail
SELECT is(COUNT(*)::INT, 4, 'Exactly 4 review logs recorded') FROM card_review_logs WHERE card_id = 'd0000000-0000-0000-0000-000000000001';

SELECT * FROM finish();
ROLLBACK;
```

---

### TS-04: Daily Deck Quota & Due Queue Fetching

#### Target Specifications
The query function `get_study_queue(p_deck_id UUID)` must:
1. Limit `queue_state = 0` (New) cards by `decks.config->>'new_cards_per_day'`.
2. Limit `queue_state IN (1, 2, 3)` where `due_date <= CURRENT_DATE` by `decks.config->>'max_reviews_per_day'`.
3. Exclude suspended cards (`queue_state = -1`).
4. Exclude future due dates (`due_date > CURRENT_DATE`).

#### Test Implementation (`tests/integration/studyQueue.test.ts`)

```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
);

describe('TS-04: Daily Deck Quota & Due Queue Fetching', () => {
  let deckId: string;
  let cardTypeId: string;

  beforeAll(async () => {
    // Create Deck with strict limits: 2 new cards/day, 3 reviews/day
    const { data: deck } = await supabase
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

    const { data: ct } = await supabase
      .from('card_types')
      .insert({ name: 'Standard', has_reverse: false })
      .select('id')
      .single();

    deckId = deck!.id;
    cardTypeId = ct!.id;
  });

  beforeEach(async () => {
    await supabase.from('flashcard_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  });

  it('enforces new_cards_per_day quota', async () => {
    // Seed 5 New Cards
    for (let i = 0; i < 5; i++) {
      const { data: note } = await supabase
        .from('flashcard_notes')
        .insert({ card_type_id: cardTypeId, fields: { prompt: `Q${i}`, answer: `A${i}` } })
        .select('id')
        .single();

      await supabase.from('cards').insert({
        note_id: note!.id,
        deck_id: deckId,
        card_type: 0,
        queue_state: 0,
        due_date: new Date().toISOString().split('T')[0],
      });
    }

    const { data: queue, error } = await supabase.rpc('get_study_queue', { p_deck_id: deckId });

    expect(error).toBeNull();
    const newCards = queue.filter((c: any) => c.queue_state === 0);
    expect(newCards.length).toBe(2); // Capped by new_cards_per_day = 2
  });

  it('enforces max_reviews_per_day and ignores future or suspended cards', async () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Seed 4 Due Review cards (queue_state = 2, due today)
    for (let i = 0; i < 4; i++) {
      const { data: note } = await supabase
        .from('flashcard_notes')
        .insert({ card_type_id: cardTypeId, fields: { prompt: `RevQ${i}` } })
        .select('id')
        .single();

      await supabase.from('cards').insert({
        note_id: note!.id,
        deck_id: deckId,
        queue_state: 2,
        due_date: today,
      });
    }

    // Seed 1 Future Review card (due tomorrow)
    const { data: futureNote } = await supabase
      .from('flashcard_notes')
      .insert({ card_type_id: cardTypeId, fields: { prompt: 'FutureQ' } })
      .select('id')
      .single();

    await supabase.from('cards').insert({
      note_id: futureNote!.id,
      deck_id: deckId,
      queue_state: 2,
      due_date: tomorrow,
    });

    // Seed 1 Suspended card (queue_state = -1)
    const { data: suspNote } = await supabase
      .from('flashcard_notes')
      .insert({ card_type_id: cardTypeId, fields: { prompt: 'SuspendedQ' } })
      .select('id')
      .single();

    await supabase.from('cards').insert({
      note_id: suspNote!.id,
      deck_id: deckId,
      queue_state: -1,
      due_date: today,
    });

    const { data: queue } = await supabase.rpc('get_study_queue', { p_deck_id: deckId });

    const reviewCards = queue.filter((c: any) => c.queue_state === 2);
    expect(reviewCards.length).toBe(3); // Capped by max_reviews_per_day = 3
    expect(queue.some((c: any) => c.queue_state === -1)).toBe(false); // No suspended
    expect(queue.some((c: any) => c.due_date === tomorrow)).toBe(false); // No future cards
  });
});
```

---

### TS-05: Leech Suspension & Ease Factor Floor Invariants

#### Target Specifications
1. When a graduated card (`queue_state = 2`) receives `Again` (1), `lapses` increments by 1.
2. When `lapses` reaches `decks.config.leech_threshold`, `queue_state` changes to `-1` (Suspended).
3. Continuous negative ratings never reduce `ease_factor` below the absolute floor of `1.30`.

#### Test Implementation (`supabase/tests/database/05_leech_and_boundaries.test.sql`)

```sql
BEGIN;
SELECT plan(4);

-- Setup: Leech threshold set to 2
INSERT INTO decks (id, name, config) 
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Leech Deck', '{"leech_threshold": 2}'::jsonb);

INSERT INTO card_types (id, name) VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Basic');
INSERT INTO flashcard_notes (id, card_type_id) VALUES ('12121212-1212-1212-1212-121212121212', 'ffffffff-ffff-ffff-ffff-ffffffffffff');

-- Seed graduated card with lapses = 1, ease_factor = 1.35
INSERT INTO cards (id, note_id, deck_id, queue_state, ease_factor, lapses, interval_days)
VALUES (
    '34343434-3434-3434-3434-343434343434',
    '12121212-1212-1212-1212-121212121212',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    2,
    1.35,
    1,
    10
);

-- Review 1: Lapse 2 reached (Trigger leech suspension)
SELECT submit_card_review('34343434-3434-3434-3434-343434343434', 1::SMALLINT);

SELECT is(lapses, 2, 'Lapses increment to 2') 
FROM cards WHERE id = '34343434-3434-3434-3434-343434343434';

SELECT is(queue_state::INT, -1, 'Card is automatically moved to Suspended state (-1)') 
FROM cards WHERE id = '34343434-3434-3434-3434-343434343434';

SELECT is(ease_factor, 1.30, 'Ease factor is floored at 1.30 (1.35 - 0.20 = 1.15 -> 1.30)') 
FROM cards WHERE id = '34343434-3434-3434-3434-343434343434';

-- Ensure review log accurately captured the transition
SELECT is(new_ease_factor, 1.30, 'Review log captures the floored ease factor')
FROM card_review_logs WHERE card_id = '34343434-3434-3434-3434-343434343434'
ORDER BY reviewed_at DESC LIMIT 1;

SELECT * FROM finish();
ROLLBACK;
```

---

## 4. Supabase Reference Production Implementations

### 1. `create_flashcard_note_with_cards` (Passes TS-02)

```sql
CREATE OR REPLACE FUNCTION create_flashcard_note_with_cards(
    p_deck_id UUID,
    p_card_type_id UUID,
    p_fields JSONB,
    p_tags TEXT[] DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_note_id UUID;
    v_has_reverse BOOLEAN;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    SELECT has_reverse INTO v_has_reverse 
    FROM public.card_types 
    WHERE id = p_card_type_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Card type with ID % not found or not owned by user', p_card_type_id;
    END IF;

    INSERT INTO public.flashcard_notes (user_id, card_type_id, fields, tags)
    VALUES (v_user_id, p_card_type_id, p_fields, p_tags)
    RETURNING id INTO v_note_id;

    -- Card 0: Forward
    INSERT INTO public.cards (user_id, note_id, deck_id, card_type, queue_state, due_date)
    VALUES (v_user_id, v_note_id, p_deck_id, 0, 0, CURRENT_DATE);

    -- Card 1: Reverse (conditional)
    IF v_has_reverse THEN
        INSERT INTO public.cards (user_id, note_id, deck_id, card_type, queue_state, due_date)
        VALUES (v_user_id, v_note_id, p_deck_id, 1, 0, CURRENT_DATE);
    END IF;

    RETURN v_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. `submit_card_review` (Passes TS-03 & TS-05)

```sql
CREATE OR REPLACE FUNCTION submit_card_review(
    p_card_id UUID,
    p_rating SMALLINT,
    p_time_taken_ms INT DEFAULT NULL
) RETURNS public.card_review_logs AS $$
DECLARE
    v_card public.cards%ROWTYPE;
    v_deck public.decks%ROWTYPE;
    v_log public.card_review_logs%ROWTYPE;
    v_user_id UUID;
    
    v_new_state SMALLINT;
    v_new_interval INT;
    v_new_ease NUMERIC(4, 2);
    v_new_step INT;
    v_new_lapses INT;
    v_new_due DATE;
    
    v_learn_steps INT[];
    v_leech_threshold INT;
BEGIN
    v_user_id := auth.uid();

    -- Lock card for update (RLS enforced)
    SELECT * INTO v_card 
    FROM public.cards 
    WHERE id = p_card_id AND (v_user_id IS NULL OR user_id = v_user_id)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Card % not found', p_card_id;
    END IF;

    SELECT * INTO v_deck FROM public.decks WHERE id = v_card.deck_id;

    -- Parse deck configurations with defaults
    v_learn_steps := ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(v_deck.config->'learn_steps_minutes', '[1, 10]'::jsonb))::INT
    );
    v_leech_threshold := COALESCE((v_deck.config->>'leech_threshold')::INT, 8);

    -- Initialize mutable values
    v_new_state := v_card.queue_state;
    v_new_interval := v_card.interval_days;
    v_new_ease := v_card.ease_factor;
    v_new_step := v_card.step_index;
    v_new_lapses := v_card.lapses;

    -- Intraday / Acquisition Processing (0: New, 1: Learning, 3: Relearning)
    IF v_card.queue_state != 2 THEN
        IF p_rating = 1 THEN -- Again
            v_new_step := 0;
            v_new_state := 1;
            v_new_interval := 0;
            v_new_due := CURRENT_DATE;
        ELSIF p_rating = 2 THEN -- Hard
            v_new_state := 1;
            v_new_due := CURRENT_DATE;
        ELSIF p_rating = 3 THEN -- Normal
            IF v_card.step_index < (array_length(v_learn_steps, 1) - 1) THEN
                v_new_step := v_card.step_index + 1;
                v_new_state := 1;
                v_new_due := CURRENT_DATE;
            ELSE
                v_new_state := 2; -- Graduate
                v_new_step := 0;
                v_new_interval := 1;
                v_new_due := CURRENT_DATE + 1;
            END IF;
        ELSIF p_rating = 4 THEN -- Easy
            v_new_state := 2;
            v_new_step := 0;
            v_new_interval := 4;
            v_new_due := CURRENT_DATE + 4;
        END IF;

    -- Graduated Review Processing (queue_state = 2)
    ELSE
        IF p_rating = 1 THEN -- Again
            v_new_lapses := v_card.lapses + 1;
            v_new_ease := GREATEST(1.30, ROUND(v_card.ease_factor - 0.20, 2));
            v_new_interval := 1;
            v_new_due := CURRENT_DATE + 1;

            IF v_new_lapses >= v_leech_threshold THEN
                v_new_state := -1; -- Suspended
            ELSE
                v_new_state := 3;  -- Relearning
                v_new_step := 0;
            END IF;

        ELSIF p_rating = 2 THEN -- Hard
            v_new_ease := GREATEST(1.30, ROUND(v_card.ease_factor - 0.15, 2));
            v_new_interval := GREATEST(v_card.interval_days + 1, ROUND(v_card.interval_days * 1.20)::INT);
            v_new_due := CURRENT_DATE + v_new_interval;

        ELSIF p_rating = 3 THEN -- Normal
            v_new_interval := GREATEST(v_card.interval_days + 1, ROUND(v_card.interval_days * v_card.ease_factor)::INT);
            v_new_due := CURRENT_DATE + v_new_interval;

        ELSIF p_rating = 4 THEN -- Easy
            v_new_ease := ROUND(v_card.ease_factor + 0.15, 2);
            v_new_interval := GREATEST(v_card.interval_days + 1, ROUND(v_card.interval_days * v_card.ease_factor * 1.30)::INT);
            v_new_due := CURRENT_DATE + v_new_interval;
        END IF;
    END IF;

    -- Persist Card State
    UPDATE public.cards SET
        queue_state = v_new_state,
        step_index = v_new_step,
        interval_days = v_new_interval,
        ease_factor = v_new_ease,
        due_date = v_new_due,
        reps = v_card.reps + 1,
        lapses = v_new_lapses,
        updated_at = NOW()
    WHERE id = p_card_id;

    -- Insert Audit Ledger Record
    INSERT INTO public.card_review_logs (
        user_id,
        card_id,
        rating,
        previous_state,
        previous_interval_days,
        previous_ease_factor,
        new_interval_days,
        new_ease_factor,
        time_taken_ms,
        reviewed_at
    ) VALUES (
        v_card.user_id,
        p_card_id,
        p_rating,
        v_card.queue_state,
        v_card.interval_days,
        v_card.ease_factor,
        v_new_interval,
        v_new_ease,
        p_time_taken_ms,
        NOW()
    ) RETURNING * INTO v_log;

    RETURN v_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. `get_study_queue` (Passes TS-04)

```sql
CREATE OR REPLACE FUNCTION get_study_queue(p_deck_id UUID)
RETURNS SETOF public.cards AS $$
DECLARE
    v_deck public.decks%ROWTYPE;
    v_new_limit INT;
    v_review_limit INT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_deck 
    FROM public.decks 
    WHERE id = p_deck_id AND (v_user_id IS NULL OR user_id = v_user_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deck % not found or not owned by user', p_deck_id;
    END IF;

    v_new_limit := COALESCE((v_deck.config->>'new_cards_per_day')::INT, 20);
    v_review_limit := COALESCE((v_deck.config->>'max_reviews_per_day')::INT, 200);

    RETURN QUERY
    WITH due_reviews AS (
        SELECT *
        FROM public.cards
        WHERE deck_id = p_deck_id
          AND (v_user_id IS NULL OR user_id = v_user_id)
          AND queue_state IN (1, 2, 3)
          AND due_date <= CURRENT_DATE
        ORDER BY queue_state DESC, due_date ASC
        LIMIT v_review_limit
    ),
    new_cards AS (
        SELECT *
        FROM public.cards
        WHERE deck_id = p_deck_id
          AND (v_user_id IS NULL OR user_id = v_user_id)
          AND queue_state = 0
        ORDER BY created_at ASC
        LIMIT v_new_limit
    )
    SELECT * FROM due_reviews
    UNION ALL
    SELECT * FROM new_cards;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

## 5. Local Runner & CI Pipeline Setup

Execute the complete TDD suite against your Supabase environment:

```bash
# 1. Start local Supabase instance
supabase start

# 2. Run SQL Database Unit Tests (TS-01, TS-02, TS-03, TS-05)
supabase test db

# 3. Run Client-layer Integration Tests (TS-04)
npm run test:vitest
```
