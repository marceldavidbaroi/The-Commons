# Data Model: Citizen Passport & Member Profiles

## 1. Database Schema (PostgreSQL / Supabase)

### Table: `public.profiles` (Extended Attributes)
```sql
alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists folio_number text default 'COM-0001';
alter table public.profiles add column if not exists citizenship_tier text default 'Standard' check (citizenship_tier in ('Standard', 'Archivist', 'Founder'));
alter table public.profiles add column if not exists badges jsonb default '[]'::jsonb;
```

## 2. Zod Client & Server Validation
```typescript
import { z } from "zod";

export const updatePassportSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(60),
  bio: z.string().max(200, "Bio must be 200 characters or fewer").optional(),
  citizenTitle: z.string().max(50).optional(),
  avatarUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional(),
});

export type UpdatePassportInput = z.infer<typeof updatePassportSchema>;
```
