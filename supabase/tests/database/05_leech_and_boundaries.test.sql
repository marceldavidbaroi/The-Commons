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
