-- RLS Policies: Profiles, User Items, Diaries & Diary Entries

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_items enable row level security;
alter table public.diaries enable row level security;
alter table public.diary_entries enable row level security;

-- PROFILES POLICIES
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- USER ITEMS POLICIES (Guarantees strict isolation of each user's data)
create policy "Users can view their own items"
  on public.user_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own items"
  on public.user_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own items"
  on public.user_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own items"
  on public.user_items for delete
  using (auth.uid() = user_id);

-- DIARIES POLICIES
create policy "Users can view their own diaries"
  on public.diaries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own diaries"
  on public.diaries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own diaries"
  on public.diaries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own diaries"
  on public.diaries for delete
  using (auth.uid() = user_id);

-- DIARY ENTRIES POLICIES
create policy "Users can view their own diary entries"
  on public.diary_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own diary entries"
  on public.diary_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own diary entries"
  on public.diary_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own diary entries"
  on public.diary_entries for delete
  using (auth.uid() = user_id);
