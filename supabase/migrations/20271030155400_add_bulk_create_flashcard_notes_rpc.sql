-- Bulk create flashcard notes with cards RPC
CREATE OR REPLACE FUNCTION public.bulk_create_flashcard_notes(
    p_deck_id BIGINT,
    p_card_type_id BIGINT,
    p_items JSONB, -- Array of objects: [{"fields": {...}, "tags": [...]}]
    p_default_tags TEXT[] DEFAULT '{}'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_has_reverse BOOLEAN;
    v_item JSONB;
    v_note_id BIGINT;
    v_count INTEGER := 0;
    v_fields JSONB;
    v_tags TEXT[];
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT has_reverse INTO v_has_reverse
    FROM public.card_types
    WHERE id = p_card_type_id AND (user_id = v_user_id OR is_default = true);

    IF v_has_reverse IS NULL THEN
        RAISE EXCEPTION 'Card type schema not found';
    END IF;

    -- Iterate through each item in the batch
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Check if item has fields key or is the fields object itself
        IF v_item ? 'fields' THEN
            v_fields := v_item->'fields';
            IF v_item ? 'tags' THEN
                SELECT COALESCE(array_agg(elem::text), p_default_tags)
                INTO v_tags
                FROM jsonb_array_elements_text(v_item->'tags') elem;
            ELSE
                v_tags := p_default_tags;
            END IF;
        ELSE
            v_fields := v_item;
            v_tags := p_default_tags;
        END IF;

        -- Insert note
        INSERT INTO public.flashcard_notes (user_id, card_type_id, fields, tags)
        VALUES (v_user_id, p_card_type_id, v_fields, v_tags)
        RETURNING id INTO v_note_id;

        -- Insert Card 0: Forward
        INSERT INTO public.cards (user_id, note_id, deck_id, card_type, queue_state, due_date)
        VALUES (v_user_id, v_note_id, p_deck_id, 0, 0, v_now);

        -- Insert Card 1: Reverse (if enabled)
        IF v_has_reverse THEN
            INSERT INTO public.cards (user_id, note_id, deck_id, card_type, queue_state, due_date)
            VALUES (v_user_id, v_note_id, p_deck_id, 1, 0, v_now);
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_create_flashcard_notes TO anon, authenticated, service_role;

