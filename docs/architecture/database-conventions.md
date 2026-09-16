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
1. **User Scoping & Isolation**: Every personal user entity MUST link to `public.profiles(id)` or `auth.users(id)` and implement RLS policies checking `auth.uid()`.
2. **Timestamps**: Every table must include `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()`, using the `handle_updated_at` trigger.
3. **JSONB Indexing**: Columns storing structured preferences (`email_preferences`, `sort_preferences`) should use `gin` indexes for efficient JSON queries.
4. **RPC Function Security**:
   - Use `security definer` with explicit `set search_path = public` when performing authorized administrative operations.
   - Use `security invoker` for caller-scoped queries.
