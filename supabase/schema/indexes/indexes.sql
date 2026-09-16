-- Indexes for Optimal User-Scoped Queries & Sorting

-- Profiles indexes
create index if not exists idx_profiles_email_preferences on public.profiles using gin (email_preferences);
create index if not exists idx_profiles_sort_preferences on public.profiles using gin (sort_preferences);

-- User items composite indexes for fast sorted pagination per user
create index if not exists idx_user_items_user_sort_order on public.user_items (user_id, sort_order asc);
create index if not exists idx_user_items_user_created_at on public.user_items (user_id, is_pinned desc, created_at desc);
create index if not exists idx_user_items_user_status on public.user_items (user_id, status);
create index if not exists idx_user_items_tags on public.user_items using gin (tags);
