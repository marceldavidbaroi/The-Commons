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
