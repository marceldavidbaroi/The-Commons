# API Contract: Authentication & Access Control

## 1. Authentication & Permission Operations

| Operation | Handler / Method | Role Required | Description |
|---|---|---|---|
| **Google Sign-In** | `signInWithOAuth({ provider: 'google', options: { redirectTo } })` | `guest` | Initiates Google OAuth with return destination |
| **Email OTP Link** | `supabase.auth.signInWithOtp({ email })` | `guest` | Sends one-time magic link / code |
| **Session Code Exchange** | `GET /auth/callback?code=...&next=...` | `guest` -> `member` | Exchanges code for session cookies & routes to `next` |
| **Sign Out** | `supabase.auth.signOut()` | `member` / `admin` | Invalidates session, purges Zustand store & clears cookies |
| **Auto-Logout On Expiry** | `onAuthStateChange('SIGNED_OUT' \| 'TOKEN_REFRESHED')` | Client Listener | Dispatches logout & redirects to `/login?redirectUrl=...` on invalid token |

---

## 2. Session Code Exchange & Routing Contract (`/auth/callback`)

- **Route**: `GET /auth/callback`
- **Query Parameters**:
  - `code` (string, required): Authorization code returned by Google OAuth.
  - `next` (string, optional): Target URL to navigate to after authentication (e.g. `/daily-diary/tome-1`). Defaults to **`/home`** if omitted.
- **Workflow**:
  1. Server exchanges `code` for Supabase session token.
  2. Sets secure HTTP-only session cookies via `@supabase/ssr`.
  3. Returns HTTP 303 Redirect to `next` (or `/home`).

---

## 3. Zustand Auth Store State Contract (`useAuthStore`)

```typescript
export interface AuthStoreState {
  // Session Tokens & Identity
  accessToken: string | null;
  expiresAt: number | null; // UNIX timestamp
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name?: string;
      avatar_url?: string;
    };
  } | null;

  // Profile & RBAC
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    role: "admin" | "member" | "guest";
    display_settings: Record<string, unknown>;
    metadata: {
      clearance_title?: string;
      residence?: string;
      ritual_streak_days?: number;
      unlocked_stamps?: string[];
    };
  } | null;

  // State flags
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;

  // Actions
  setSession: (session: { accessToken: string; expiresAt: number; user: any; profile: any }) => void;
  clearSessionAndLogout: (redirectPath?: string) => void;
}
```

---

## 4. Universal Data Isolation Rule (All Feature Endpoints)

> [!IMPORTANT]
> **Data Access Constraint**:
> Every database query, RPC function, and Server Action across the application MUST include the authenticated user condition:
> ```typescript
> // Example Supabase query pattern:
> const { data, error } = await supabase
>   .from('diaries')
>   .select('*')
>   .eq('user_id', user.id); // ALWAYS scoped to active auth.uid()
> ```
> PostgreSQL Row Level Security (RLS) acts as the hard barrier enforcing `using (auth.uid() = user_id)`.
