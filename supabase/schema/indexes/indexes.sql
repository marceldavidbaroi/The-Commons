-- Indexes for Optimal User-Scoped Queries, Sorting & Performance

-- Profiles indexes
create index if not exists idx_profiles_email_preferences on public.profiles using gin (email_preferences);
create index if not exists idx_profiles_sort_preferences on public.profiles using gin (sort_preferences);

-- User items composite indexes for fast sorted pagination per user
create index if not exists idx_user_items_user_sort_order on public.user_items (user_id, sort_order asc);
create index if not exists idx_user_items_user_created_at on public.user_items (user_id, is_pinned desc, created_at desc);
create index if not exists idx_user_items_user_status on public.user_items (user_id, status);
create index if not exists idx_user_items_tags on public.user_items using gin (tags);

-- Diaries indexes
create index if not exists idx_diaries_user_sort on public.diaries (user_id, is_favorite desc, sort_order asc, created_at desc);
create index if not exists idx_diaries_user_archived on public.diaries (user_id, is_archived);

-- Diary Entries indexes
create index if not exists idx_diary_entries_diary_page on public.diary_entries (diary_id, page_number desc);
create index if not exists idx_diary_entries_user_date on public.diary_entries (user_id, entry_date desc);
create index if not exists idx_diary_entries_user_hearted on public.diary_entries (user_id, is_hearted) where is_hearted = true;
create index if not exists idx_diary_entries_tags on public.diary_entries using gin (tags);
create index if not exists idx_diary_entries_mood on public.diary_entries (user_id, mood);
