# Data Model: [Feature Name]

> **Document Type**: **Data Model & Database Schema**  
> **Purpose**: Defines PostgreSQL DDL (tables, foreign keys, timestamps, indexes), Row Level Security (RLS) policies, and Zod client/server validation schemas.

---

## 1. Database Schema (PostgreSQL / Supabase)

### Table: `public.[table_name]`
```sql
create table if not exists public.[table_name] (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    status text not null check (status in ('draft', 'published', 'archived')) default 'draft',
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Performance Indexes
create index idx_[table_name]_user_id on public.[table_name](user_id);
create index idx_[table_name]_created_at on public.[table_name](created_at desc);

-- Row Level Security (RLS) - Mandatory User Scoping
alter table public.[table_name] enable row level security;

create policy "Users can view own items"
    on public.[table_name] for select
    using (auth.uid() = user_id);

create policy "Users can insert own items"
    on public.[table_name] for insert
    with check (auth.uid() = user_id);

create policy "Users can update own items"
    on public.[table_name] for update
    using (auth.uid() = user_id);

create policy "Users can delete own items"
    on public.[table_name] for delete
    using (auth.uid() = user_id);
```

---

## 2. Zod Client & Server Validation
```typescript
import { z } from "zod";

export const create[Entity]Schema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  metadata: z.record(z.unknown()).optional(),
});

export type Create[Entity]Input = z.infer<typeof create[Entity]Schema>;

export const update[Entity]Schema = create[Entity]Schema.partial();
export type Update[Entity]Input = z.infer<typeof update[Entity]Schema>;
```
