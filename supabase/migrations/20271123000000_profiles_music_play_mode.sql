ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS music_play_mode text NOT NULL DEFAULT 'shuffle'
CHECK (music_play_mode IN ('serial', 'shuffle'));
