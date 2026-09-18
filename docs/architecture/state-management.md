# Architecture: Layered SPA & State Management

This document outlines the **Traditional 3-Tier Layered SPA Architecture** established in **The Commons**, ensuring strict separation of concerns, robust multi-device cloud synchronization, and testable domain logic.

---

## 1. Architectural Philosophy: The 3-Tier Layering

To prevent tight coupling, cache pollution, and dual-source-of-truth desynchronization across devices and browser sessions, the codebase is strictly layered:

```
┌─────────────────────────────────────────────────────────────┐
│                       1. UI / PAGE LAYER                    │
│      (React Components, Broadsheet Layouts, Modals)         │
│  - Declarative consumption via custom React Query hooks     │
│  - Zero knowledge of Supabase SDK, SQL, RPC, or fetch logic  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              2. CACHE & ORCHESTRATION LAYER                 │
│                 (TanStack Query v5 Hooks)                   │
│  - Single source of truth for all remote server state       │
│  - Structured query key factories for predictable sweeps   │
│  - Background revalidation (`placeholderData`, `staleTime`) │
│  - Optimistic UI updates & automatic error rollbacks        │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│      3A. SERVICE LAYER      │ │      3B. UI CLIENT STORE    │
│    (Pure TypeScript / SDK)  │ │      (Zustand v5 Stores)    │
│ • `BaseService` abstraction │ │ • Ephemeral UI states       │
│ • `DiaryService`            │ │ • Active search queries     │
│ • `ProfileService`          │ │ • Drawer / Modal toggles    │
│ • `UserItemsService`        │ │ • Reader mode preferences   │
│ • RPC & SQL Table fallbacks │ │ (NO server data duplication)│
│ • Auth & FK assertions      │ └─────────────────────────────┘
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     SUPABASE POSTGRESQL     │
│  (Tables, RPCs, RLS, Auth)  │
└─────────────────────────────┘
```

---

## 2. Layer 1: The Service Layer (`src/services/`)

The Service Layer consists of pure TypeScript classes containing **zero React dependencies**. It is testable in isolation and reusable across React components, Next.js Server Components, API routes, or CLI scripts.

### `BaseService` ([`src/services/base.service.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/services/base.service.ts))
Provides base transport primitives:
- `getSupabase()`: Accesses the initialized Supabase client singleton.
- `getAuthenticatedUser(required?)`: Verifies active session token.
- `ensureProfile(userId, email)`: Asserts foreign key validity in `public.profiles`.
- `handleError(error, fallbackMessage)`: Formats structured `ServiceError` instances.

### Domain Services
- **`DiaryService`** ([`src/services/diary.service.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/services/diary.service.ts)):
  - `getDiariesOverview()`: Fetches tomes with entry counts (tries RPC, falls back to direct table queries).
  - `getDiaryEntries(diaryId?)`: Fetches leaves ordered by page number.
  - `getDiaryStats(diaryId?)`: Aggregates words, streaks, vitality, and mood chips.
  - `createDiary(input)`: Atomic creation of tome + first page leaf.
  - `updateDiary(id, updates)`, `deleteDiary(id)`
  - `createDiaryEntry(input)`, `updateDiaryEntry(id, updates)`, `deleteDiaryEntry(id)`
  - `reorderDiaries(ids)`, `toggleHeart(id, isHearted)`
- **`ProfileService`** ([`src/services/profile.service.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/services/profile.service.ts)):
  - `getProfile(userId)`
  - `updateProfile(userId, updates)`
  - `getCitizenPassportMetrics(userId)`
  - `updateCitizenPassport(input)`
- **`UserItemsService`** ([`src/services/user-items.service.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/services/user-items.service.ts)):
  - `getUserItems(filters)`
  - `reorderUserItems(itemIds)`
  - `updateSortPreferences(preferences)`

---

## 3. Layer 2: Cache & Query Layer (`src/hooks/queries/`)

TanStack Query (v5) is the **single source of truth** for remote entity state.

### Query Key Factories
All hooks define centralized query key factories to make cache invalidation predictable:

```typescript
// src/hooks/queries/use-diaries.ts
export const diaryKeys = {
  all: ["diaries"] as const,
  lists: () => [...diaryKeys.all, "list"] as const,
  overview: () => [...diaryKeys.all, "overview"] as const,
  stats: (diaryId?: string) => [...diaryKeys.all, "stats", diaryId || "global"] as const,
  detail: (diaryId: string) => [...diaryKeys.all, "detail", diaryId] as const,
  entries: (diaryId?: string) => [...diaryKeys.all, "entries", diaryId || "all"] as const,
  entry: (diaryId: string, entryId: string) => [...diaryKeys.all, "entry", diaryId, entryId] as const,
};
```

### Multi-Device Hydration Pattern
To ensure immediate rendering without masking cloud updates:
1. **`placeholderData`** (rather than `initialData`) provides instantaneous UI painting from local storage.
2. Background fetch executes immediately, revalidating and refreshing the cache with PostgreSQL authority.
3. Mutations update cache in-place (`queryClient.setQueryData`) and trigger surgical cache sweeps (`queryClient.invalidateQueries`).

---

## 4. Layer 3: Client State Layer (Zustand v5)

Located in [`src/stores/`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/stores):

- **`useDiaryStore`**: Manages search query strings, active filter tabs (`all` | `favorites` | `archived`), and selected page index.
- **`useAuthStore`**: Manages active auth session flags and clearance status.
- **`useUIStore`**: Manages editorial theme, typography scale, and reader density.

> [!IMPORTANT]
> **No Duplicate Server Data in Zustand**: Server entities (diaries, entries, profiles) are managed by TanStack Query. Zustand stores only hold ephemeral client-side UI state.

---

## 5. Development Guidelines & Best Practices

1. **Always Call Services in Query/Mutation Functions**: Never write raw `supabase.from()` or `supabase.rpc()` calls directly inside React components or hooks. Route them through the domain `Service`.
2. **Never Swallow Errors in Mutations**: Allow errors to bubble up so that TanStack Query and UI error boundaries can notify the user and roll back optimistic updates.
3. **Use Atomic Selectors in Zustand**: Extract specific state slices (e.g. `useDiaryStore((s) => s.searchQuery)`) to prevent unnecessary component re-renders.
4. **Invalidate Related Query Keys on Mutation Success**: Always pair mutations with targeted invalidations (e.g. `queryClient.invalidateQueries({ queryKey: diaryKeys.overview() })`).
