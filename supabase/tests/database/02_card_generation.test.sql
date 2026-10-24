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
