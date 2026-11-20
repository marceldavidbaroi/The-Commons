-- Drop journal (diaries, diary_entries), goals, and homeops (user_items) tables and functions

-- Drop functions
DROP FUNCTION IF EXISTS public.create_diary_with_first_page CASCADE;
DROP FUNCTION IF EXISTS public.get_user_diaries_overview CASCADE;
DROP FUNCTION IF EXISTS public.purge_item CASCADE;
DROP FUNCTION IF EXISTS public.reorder_user_items CASCADE;
DROP FUNCTION IF EXISTS public.seed_homeops_tags_for_user CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.diary_entries CASCADE;
DROP TABLE IF EXISTS public.diaries CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.user_items CASCADE;
