-- Migration: 20271024100000_create_flashcards_and_srs_schema.sql
-- Description: Create decks, card_types, flashcard_notes, cards, and card_review_logs with SM-2 RPCs

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. DECKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    parent_id UUID REFERENCES public.decks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL CHECK (char_length(name) > 0),
    description TEXT,
    config JSONB NOT NULL DEFAULT '{
        "new_cards_per_day": 20,
        "max_reviews_per_day": 200,
        "learn_steps_minutes": [1, 10],
        "leech_threshold": 8
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_decks_user_id ON public.decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_parent_id ON public.decks(parent_id);

-- ============================================================================
-- 2. CARD TYPES (Schema Definition)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.card_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name VARCHAR(100) NOT NULL CHECK (char_length(name) > 0),
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    has_reverse BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_card_types_user_id ON public.card_types(user_id);

-- ============================================================================
-- 3. FLASHCARD NOTES (Data Records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.flashcard_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    card_type_id UUID NOT NULL REFERENCES public.card_types(id) ON DELETE RESTRICT,
    fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags TEXT[] NOT NULL DEFAULT '{}',
    checksum VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_flashcard_notes_user_id ON public.flashcard_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_notes_card_type ON public.flashcard_notes(card_type_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_notes_tags ON public.flashcard_notes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_flashcard_notes_fields ON public.flashcard_notes USING GIN (fields);

-- ============================================================================
-- 4. CARDS (SRS State Machine)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    note_id UUID NOT NULL REFERENCES public.flashcard_notes(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    card_type SMALLINT NOT NULL DEFAULT 0 CHECK (card_type IN (0, 1)),
    queue_state SMALLINT NOT NULL DEFAULT 0 CHECK (queue_state IN (-1, 0, 1, 2, 3)),
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    step_index INT NOT NULL DEFAULT 0,
    interval_days INT NOT NULL DEFAULT 0,
    ease_factor NUMERIC(4, 2) NOT NULL DEFAULT 2.50 CHECK (ease_factor >= 1.30),
    reps INT NOT NULL DEFAULT 0,
    lapses INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_card_note_type UNIQUE (note_id, card_type)
);

CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_study_queue ON public.cards (deck_id, queue_state, due_date);
CREATE INDEX IF NOT EXISTS idx_cards_note_id ON public.cards(note_id);

-- ============================================================================
-- 5. CARD REVIEW LOGS (Append-only Ledger)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.card_review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 4),
    previous_state SMALLINT NOT NULL,
    previous_interval_days INT NOT NULL,
    previous_ease_factor NUMERIC(4, 2) NOT NULL,
    new_interval_days INT NOT NULL,
    new_ease_factor NUMERIC(4, 2) NOT NULL,
    time_taken_ms INT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_card_review_logs_user_id ON public.card_review_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_card_review_logs_card_id ON public.card_review_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_card_review_logs_reviewed_at ON public.card_review_logs(reviewed_at);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================
CREATE OR REPLACE TRIGGER on_decks_updated
    BEFORE UPDATE ON public.decks
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_card_types_updated
    BEFORE UPDATE ON public.card_types
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_flashcard_notes_updated
    BEFORE UPDATE ON public.flashcard_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER on_cards_updated
    BEFORE UPDATE ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own decks" ON public.decks
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own card_types" ON public.card_types
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own flashcard_notes" ON public.flashcard_notes
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own cards" ON public.cards
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own card_review_logs" ON public.card_review_logs
    FOR ALL
    TO authenticated
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- STORED PROCEDURES (RPCs)
-- ============================================================================

-- 1. create_flashcard_note_with_cards
CREATE OR REPLACE FUNCTION public.create_flashcard_note_with_cards(
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
    WHERE id = p_card_type_id AND (v_user_id IS NULL OR user_id = v_user_id);

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

-- 2. submit_card_review
CREATE OR REPLACE FUNCTION public.submit_card_review(
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

    IF p_rating NOT BETWEEN 1 AND 4 THEN
        RAISE EXCEPTION 'Invalid rating: %, must be between 1 and 4', p_rating;
    END IF;

    -- Lock card for update
    SELECT * INTO v_card 
    FROM public.cards 
    WHERE id = p_card_id AND (v_user_id IS NULL OR user_id = v_user_id)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Card % not found', p_card_id;
    END IF;

    SELECT * INTO v_deck FROM public.decks WHERE id = v_card.deck_id;

    -- Parse deck configurations with defaults
    IF v_deck.config IS NOT NULL AND v_deck.config ? 'learn_steps_minutes' THEN
        v_learn_steps := ARRAY(
            SELECT jsonb_array_elements_text(v_deck.config->'learn_steps_minutes')::INT
        );
    ELSE
        v_learn_steps := ARRAY[1, 10];
    END IF;

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

-- 3. get_study_queue
CREATE OR REPLACE FUNCTION public.get_study_queue(p_deck_id UUID)
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

-- Permissions and grants
GRANT ALL ON TABLE public.decks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.card_types TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.flashcard_notes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cards TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.card_review_logs TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_flashcard_note_with_cards TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_card_review TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_study_queue TO anon, authenticated, service_role;
