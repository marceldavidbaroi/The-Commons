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
