# Technical Design Document: Authentication & Access Control (RBAC)

## 1. System Architecture & RBAC Flow

```mermaid
graph TD
    User[User on Browser] -->|1. Google Sign-In| SupabaseAuth[Supabase OAuth Provider]
    SupabaseAuth -->|2. Redirect with ?code=| CallbackRoute[/auth/callback Route Handler]
    CallbackRoute -->|3. exchangeCodeForSession| SetCookies[HTTP-only Session Cookies]
    CallbackRoute -->|4. Redirect to next or /home| NextPage[Target Application Route]
    NextPage -->|5. Sync Token & Profile| ZustandStore[Zustand useAuthStore]
    ZustandStore -->|6. Token Expired / Invalid| AutoLogout[Auto Logout -> /login?redirectUrl=...]
    NextPage -->|7. Data Query| RLS[(Postgres RLS: auth.uid = user_id)]
```

## 2. Component Hierarchy & File Mapping

```text
src/
├── app/
│   ├── login/
│   │   └── page.tsx                   # Editorial broadside login portal
│   └── auth/
│       └── callback/
│           └── route.ts               # Code exchange & session cookie setter (handles ?next=)
├── middleware.ts                      # Edge route guard & role authorization
├── hooks/
│   └── queries/
│       └── use-auth.ts                # TanStack query auth & profile hooks (session listener)
├── stores/
│   └── auth-store.ts                  # Client Zustand auth store (accessToken, user, profile, autoLogout)
├── components/
│   └── brand/
│       └── citizen-status.tsx         # Clearance header indicator with role badge
└── lib/
    └── supabase/
        ├── client.ts                  # Browser Supabase client
        ├── server.ts                  # Server Component Supabase client
        └── middleware.ts              # Edge middleware session handler
```

## 3. Detailed Engineering Implementation

### A. Zustand Token Storage & Expiry Listener
- **Store**: `useAuthStore` in `src/stores/auth-store.ts`.
- **Token Management**:
  - Stores `accessToken`, `expiresAt`, `user`, and `profile`.
  - Subscribes to `supabase.auth.onAuthStateChange((event, session) => ...)`:
    - If `event === 'SIGNED_IN'` or `event === 'TOKEN_REFRESHED'`: Updates Zustand store with new `session.access_token` and timestamp.
    - If `event === 'SIGNED_OUT'` or `session === null`: Clears Zustand store and dispatches `clearSessionAndLogout()`.
  - Client-side timer / check: When making queries, if `Date.now() >= expiresAt`, triggers automatic logout with return URL query param.

### B. Post-Login Routing & Redirects
- When unauthenticated users hit a protected page (e.g. `/daily-diary`), `middleware.ts` redirects to:
  ```text
  /login?redirectUrl=/daily-diary
  ```
- When user signs in with Google on `/login`, pass the target destination to Supabase OAuth:
  ```typescript
  const redirectUrl = searchParams.get('redirectUrl') || '/home';
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl)}`,
    },
  });
  ```
- `/auth/callback/route.ts` reads `next` parameter from URL and redirects the browser to `next` (or fallback to `/home`).

### C. Universal Authenticated User Data Isolation
- **Row Level Security (RLS)**:
  - Every single table in Supabase MUST have RLS enabled.
  - Queries MUST only return rows where `auth.uid() = user_id`.
- **Client & Server Actions**:
  - Always verify authenticated user session before executing queries or mutations.
  - Never allow passing arbitrary `user_id` from client payloads without verifying `auth.uid() === payload.user_id`.
