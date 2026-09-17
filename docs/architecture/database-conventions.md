# Architecture: Database & Schema Conventions

## Directory Organization
All database code lives in [`supabase/`](file:///Users/daviditc/Documents/personal_projects/The-Commons/supabase) with a modular schema hierarchy:

```text
supabase/
├── config.toml           # Local Supabase configuration
├── migrations/           # Versioned, chronological SQL migration files
├── seed.sql              # Development test seed data
└── schema/               # Declarative source-of-truth SQL definitions
    ├── tables/           # DDL table creation scripts
    ├── rpc/              # Stored procedures & RPC functions
    ├── policies/         # Row Level Security (RLS) policies
    ├── triggers/         # Auth signup hooks and updated_at triggers
    └── indexes/          # Performance indexes (B-tree, GIN)
```

---

## Conventions & Rules

> [!IMPORTANT]
> ### 1. Strict Authenticated User Isolation (Zero Cross-Tenant Leakage)
> **Every single table query, RPC procedure, and Server Action MUST fetch data strictly for the authenticated user only.**
> - Every application table storing member data MUST have a `user_id uuid not null references auth.users(id) on delete cascade` (or `public.profiles(id)`).
> - Every table MUST enable Row Level Security (`alter table public.[table] enable row level security;`).
> - Every select, insert, update, and delete policy MUST enforce `using (auth.uid() = user_id)`.
> - Never accept arbitrary `user_id` from client payloads without validating against the server session `auth.uid()`.

2. **Timestamps**: Every table must include `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()`, using the `handle_updated_at` trigger.
3. **JSONB Indexing**: Columns storing structured preferences (`email_preferences`, `sort_preferences`) should use `gin` indexes for efficient JSON queries.
4. **RPC Function Security**:
   - Use `security definer` with explicit `set search_path = public` when performing authorized administrative operations.
   - Use `security invoker` for caller-scoped queries.
