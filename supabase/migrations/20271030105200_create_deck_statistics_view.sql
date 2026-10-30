-- Migration: Add deck_statistics view and cursor pagination composite index for cards
-- Step 2 of Flashcard Architecture Alignment

-- 1. Create multi-column composite index for keyset/cursor pagination on cards
CREATE INDEX IF NOT EXISTS idx_cards_deck_cursor 
ON public.cards (deck_id, created_at DESC, id DESC);

-- 2. Create deck_statistics view for fast SQL aggregation
-- Security invoker ensures RLS on decks and cards is respected
CREATE OR REPLACE VIEW public.deck_statistics
WITH (security_invoker = true) AS
SELECT 
    d.id,
    d.user_id,
    d.parent_id,
    d.name,
    d.description,
    d.config,
    d.created_at,
    d.updated_at,
    COUNT(c.id)::int AS total_cards,
    COUNT(c.id) FILTER (WHERE c.queue_state = 0)::int AS new_cards,
    COUNT(c.id) FILTER (WHERE c.queue_state NOT IN (0, -1) AND c.due_date <= now())::int AS due_cards
FROM public.decks d
LEFT JOIN public.cards c ON c.deck_id = d.id
GROUP BY d.id;

