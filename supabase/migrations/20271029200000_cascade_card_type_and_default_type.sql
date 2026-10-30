-- Incremental migration: Cascade delete cards when card type is deleted, and add is_default flag to card_types

-- 1. Add is_default column to card_types
ALTER TABLE public.card_types
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Update foreign key on flashcard_notes to cascade when card_types is deleted
ALTER TABLE public.flashcard_notes
  DROP CONSTRAINT IF EXISTS flashcard_notes_card_type_id_fkey,
  ADD CONSTRAINT flashcard_notes_card_type_id_fkey
    FOREIGN KEY (card_type_id) REFERENCES public.card_types(id) ON DELETE CASCADE;

-- 3. Create or seed a default 'Basic' card type for existing users who do not have one
INSERT INTO public.card_types (name, fields_schema, has_reverse, is_default, user_id)
SELECT 
  'Basic',
  '[{"name": "Front", "label": "Front (Prompt)"}, {"name": "Back", "label": "Back (Answer)"}]'::jsonb,
  false,
  true,
  u.id
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.card_types ct WHERE ct.user_id = u.id AND ct.is_default = true
);
