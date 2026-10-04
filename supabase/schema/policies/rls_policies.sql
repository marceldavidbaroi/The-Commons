-- RLS Policies: Profiles, User Items, Diaries & Diary Entries (Integer ID Model)

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_items enable row level security;
alter table public.diaries enable row level security;
alter table public.diary_entries enable row level security;

-- PROFILES POLICIES
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth_user_id = (select auth.uid()));

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth_user_id = (select auth.uid()));

-- USER ITEMS POLICIES (Guarantees strict isolation of each user's data)
create policy "Users can view their own items"
  on public.user_items for select
  to authenticated
  using (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

create policy "Users can insert their own items"
  on public.user_items for insert
  to authenticated
  with check (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

create policy "Users can update their own items"
  on public.user_items for update
  to authenticated
  using (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())))
  with check (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

create policy "Users can delete their own items"
  on public.user_items for delete
  to authenticated
  using (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

-- DIARIES POLICIES
create policy "Users can view their own diaries"
  on public.diaries for select
  to authenticated
  using (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

create policy "Users can insert their own diaries"
  on public.diaries for insert
  to authenticated
  with check (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

create policy "Users can update their own diaries"
  on public.diaries for update
  to authenticated
  using (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())))
  with check (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

create policy "Users can delete their own diaries"
  on public.diaries for delete
  to authenticated
  using (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

-- DIARY ENTRIES POLICIES
create policy "Users can view their own diary entries"
  on public.diary_entries for select
  to authenticated
  using (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

create policy "Users can insert their own diary entries"
  on public.diary_entries for insert
  to authenticated
  with check (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

create policy "Users can update their own diary entries"
  on public.diary_entries for update
  to authenticated
  using (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())))
  with check (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));

create policy "Users can delete their own diary entries"
  on public.diary_entries for delete
  to authenticated
  using (user_id = (select p.id from public.profiles p where p.auth_user_id = (select auth.uid())));
