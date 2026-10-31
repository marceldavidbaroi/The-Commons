-- Update card_types default fields_schema to only store label and type
ALTER TABLE public.card_types 
  ALTER COLUMN fields_schema SET DEFAULT '[{"label": "Front", "type": "title"}, {"label": "Back", "type": "description"}]'::jsonb;

-- Backfill existing basic default types
UPDATE public.card_types
SET fields_schema = '[{"label": "Front", "type": "title"}, {"label": "Back", "type": "description"}]'::jsonb
WHERE is_default = true;

