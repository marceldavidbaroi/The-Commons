# Architecture: State Management & Data Fetching

This document outlines the state management architecture and conventions established in **The Commons**, integrating **TanStack Query (v5)** for server state synchronization and **Zustand (v5)** for reactive client-side store management.

---

## 1. Architectural Philosophy

We maintain a strict separation between **Server State** (data originating from PostgreSQL / Supabase) and **Client State** (ephemeral UI interactions, draft states, navigation indices, and device preferences):

```
┌─────────────────────────────────────────────────────────────┐
│                      THE COMMONS UI                         │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
      Server State Requests           Client State Mutations
               │                               │
               ▼                               ▼
  ┌─────────────────────────┐     ┌─────────────────────────┐
  │     TanStack Query      │     │      Zustand Stores     │
  │ • User Profile & Session│     │ • Auth Store            │
  │ • User Items & Ordering │     │ • Diary Store & Search  │
  │ • Diary Overview & TOC  │     │ • UI Density & Reader   │
  │ • Query Keys Factory    │     │ • Local Storage Persist │
  │ • In-Place Updates      │     │                         │
  └────────────┬────────────┘     └─────────────────────────┘
               │
      Supabase Postgres RPC & Tables
               │
               ▼
     ┌───────────────────┐
     │  Supabase Client  │
     └───────────────────┘
```

---

## 2. Server State: TanStack Query (v5)

### Query Client Initialization
The application wraps its root in [`src/providers/query-provider.tsx`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/providers/query-provider.tsx), configuring safe singleton behavior across SSR and browser environments:
- **`staleTime`**: 1 minute (prevents redundant fetches on fast route transitions)
- **`gcTime`**: 10 minutes
- **`refetchOnWindowFocus`**: Disabled for consistent editorial reading experience

### Query Key Factories
All queries define structured key factories to enable predictable invalidation:

```typescript
// src/hooks/queries/use-auth.ts
export const authKeys = {
  all: ["auth"] as const,
  session: ["auth", "session"] as const,
  user: ["auth", "user"] as const,
  profile: (userId?: string) => ["auth", "profile", userId] as const,
};

// src/hooks/queries/use-user-items.ts
export const userItemKeys = {
  all: ["user_items"] as const,
  lists: () => [...userItemKeys.all, "list"] as const,
  list: (filters: UserItemFilters) => [...userItemKeys.lists(), filters] as const,
  detail: (id: string) => [...userItemKeys.all, "detail", id] as const,
};

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

### Key Query & Mutation Hooks
| Hook | Type | Purpose |
| :--- | :--- | :--- |
| `useUserSession()` | Query | Fetches active Supabase user session, listens to `onAuthStateChange`, and syncs to `useAuthStore`. |
| `useUserProfile(userId)` | Query | Fetches profile row (`public.profiles`) including sort preferences and role. |
| `useGoogleSignInMutation()` | Mutation | Initiates Google OAuth clearance protocol with error reporting. |
| `useSignOutMutation()` | Mutation | Signs out from Supabase, purges Query cache, and clears Zustand stores. |
| `useUserItems(filters)` | Query | Executes database RPC `get_sorted_user_items` with fallback to table query. |
| `useReorderUserItemsMutation()` | Mutation | Optimistically reorders items before committing to RPC `reorder_user_items`. |
| `useUpdateSortPreferencesMutation()` | Mutation | Updates default sort order JSONB in profile and invalidates item queries. |
| `useDiariesOverview()` | Query | Executes RPC `get_user_diaries_overview` returning tomes with joined entry counts. |
| `useDiaryEntries(diaryId)` | Query | Fetches all pages for a tome sorted by `page_number DESC`. |
| `useDiaryStats(diaryId)` | Query | Executes RPC `get_diary_stats` for global or tome-specific analytics. |
| `useCreateDiaryMutation()` | Mutation | Atomically creates new tome + page 1 via RPC `create_diary_with_first_page`. |
| `useUpdateDiaryMutation()` | Mutation | Surgically updates tome metadata via table update with RLS. |
| `useDeleteDiaryMutation()` | Mutation | Deletes diary and cascades entries via table delete. |
| `useReorderDiariesMutation()` | Mutation | Persists custom diary ordering via RPC `reorder_diaries`. |

---

## 3. Client State: Zustand Stores (v5)

Located in [`src/stores/`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/stores):

### 1. `useAuthStore` ([`src/stores/auth-store.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/stores/auth-store.ts))
Manages active authentication status, cached profile metadata, clearance loading flags, and error dispatch notices.

```typescript
const { user, isAuthenticated, isLoading } = useAuthStore();
```

### 2. `useDiaryStore` ([`src/stores/diary-store.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/stores/diary-store.ts))
Manages Daily Diary view state, search query, active tome/page index, and favorite heart overrides with local storage persistence:

```typescript
const searchQuery = useDiaryStore((s) => s.searchQuery);
const setSearchQuery = useDiaryStore((s) => s.setSearchQuery);
const toggleHeart = useDiaryStore((s) => s.toggleHeart);
```

### 3. `useUIStore` ([`src/stores/ui-store.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/stores/ui-store.ts))
Handles reading mode toggles, font scaling, and editorial broadsheet density preferences.

---

## 4. Cross-Component Integration

### Citizen Clearance Indicator ([`src/components/brand/citizen-status.tsx`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/components/brand/citizen-status.tsx))
A reusable micro-masthead component that reactively displays:
- **Loading State**: Animated clearance verification pulse.
- **Signed In**: Citizen name, email stamp, PostgreSQL RLS badge, and one-click exit.
- **Guest / Unauthenticated**: "Enter Sanctuary" broadside portal link.

### Login Flow Integration ([`src/app/login/page.tsx`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/app/login/page.tsx))
Refactored to trigger `useGoogleSignInMutation()` and display reactive error dispatches managed through `useAuthStore`.

---

## 5. Development Guidelines

1. **Never duplicate server data in Zustand**: Fetch server entities using TanStack Query hooks; use Zustand only for transient client state or optimistic overrides.
2. **Always use atomic selectors**: Extract specific properties `useDiaryStore((s) => s.searchQuery)` to avoid unnecessary component re-renders.
3. **Always invalidate or surgically update related queries upon mutation**: Use query key factories (`queryClient.invalidateQueries({ queryKey: diaryKeys.overview() })` or `queryClient.setQueryData`) inside `onSuccess` or `onSettled` handlers.
