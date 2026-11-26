-- Quick Note feature: quick_notes & quick_note_settings

CREATE TABLE public.quick_notes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT '',
  content     text NOT NULL DEFAULT '',
  preview     text NOT NULL DEFAULT '',
  is_pinned   boolean NOT NULL DEFAULT false,
  is_locked   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz NULL
);

-- Composite indexes matching keyset cursor pagination
CREATE INDEX idx_quick_notes_user_active_cursor
  ON public.quick_notes (user_id, is_pinned DESC, updated_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_quick_notes_user_trashed_cursor
  ON public.quick_notes (user_id, deleted_at DESC, id DESC)
  WHERE deleted_at IS NOT NULL;

ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_notes_select_own"
  ON public.quick_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "quick_notes_insert_own"
  ON public.quick_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quick_notes_update_own"
  ON public.quick_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "quick_notes_delete_own"
  ON public.quick_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Per-user passcode hash for locked notes
CREATE TABLE public.quick_note_settings (
  user_id       uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  passcode_hash text NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_note_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_note_settings_own"
  ON public.quick_note_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
