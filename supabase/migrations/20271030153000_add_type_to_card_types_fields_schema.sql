-- Update existing card_types default schema and records to include type
ALTER TABLE public.card_types 
  ALTER COLUMN fields_schema SET DEFAULT '[{"name": "Front", "label": "Front", "type": "title"}, {"name": "Back", "label": "Back", "type": "description"}]'::jsonb;

-- Backfill existing basic default types if they lack type
UPDATE public.card_types
SET fields_schema = '[{"name": "Front", "label": "Front (Prompt)", "type": "title"}, {"name": "Back", "label": "Back (Answer)", "type": "description"}]'::jsonb
WHERE is_default = true AND (fields_schema->0->>'type') IS NULL;

