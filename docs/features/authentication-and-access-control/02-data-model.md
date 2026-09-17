# Data Model: Authentication & Access Control (RBAC)

## 1. Database Schema & Role Definitions (PostgreSQL / Supabase)

### Table: `public.profiles`
```sql
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique not null,
    full_name text,
    username text unique,
    avatar_url text,
    bio text,
    
    -- RBAC Role Definition
    role text not null default 'member' check (role in ('admin', 'member', 'guest')),
    
    -- Display & Layout Settings
    display_settings jsonb not null default jsonb_build_object(
      'theme', 'system',
      'density', 'comfortable',
      'view_mode', 'grid'
    ),
    
    -- Citizen Clearance & Sanctuary Metadata
    metadata jsonb not null default jsonb_build_object(
      'residence', 'Archival Broadside',
      'clearance_title', 'Citizen Member',
      'ritual_streak_days', 0,
      'unlocked_stamps', jsonb_build_array('founding_scribe')
    ),
    
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Performance Indexes
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_role on public.profiles(role);

-- Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policy 1: Members can view all authenticated profiles (for community & presence)
create policy "Authenticated users can view profiles"
    on public.profiles for select
    using (auth.role() = 'authenticated');

-- Policy 2: Users can only update their own profile details (excluding role elevation)
create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- Policy 3: Admins can update any profile (including roles)
create policy "Admins can update any profile"
    on public.profiles for update
    using (
      exists (
        select 1 from public.profiles 
        where id = auth.uid() and role = 'admin'
      )
    );

-- Trigger: Auto-create profile on auth.users insert with default 'member' role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    'member'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## 2. Zod Client & Server Validation
```typescript
import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "member", "guest"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const emailSignInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(60).optional(),
  bio: z.string().max(280).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
});
```
