-- Add self-referencing parent_list_id to lists for nested sub-lists
ALTER TABLE public.lists
  ADD COLUMN IF NOT EXISTS parent_list_id bigint REFERENCES public.lists(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lists_no_self_parent'
  ) THEN
    ALTER TABLE public.lists
      ADD CONSTRAINT lists_no_self_parent
      CHECK (parent_list_id IS NULL OR parent_list_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lists_parent_list_id
  ON public.lists (parent_list_id)
  WHERE deleted_at IS NULL;
