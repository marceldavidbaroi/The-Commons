# Feature: Authentication & Citizen Clearance

## 1. Overview & Architectural Philosophy

Authentication in **The Commons** is presented through the **Magazine & Editorial Broadside** design language under the metaphor of the **Citizen Passport & Record Chamber**.

Rather than utilizing generic floating modal boxes, the `/login` portal is designed as an authentic editorial broadsheet spread:
- **Hairline Rules & Folio Headers**: Clean columnar structure with `.editorial-rule`, `.editorial-rule-double`, and publication volume stamps (`VOL. I — NO. 01`).
- **Tactile Registry Seal**: SVG broadsheet embossed seal inscribed with *The Commons Archive • Littera Scripta Manet*.
- **Direct Multi-Mode Clearance**: Seamless switching between Master Cipher Key (Password), Magic Courier (OTP Email link), and Citizen Passport Enrollment (Sign Up).

---

## 2. Authentication Protocol & State Architecture

The authentication system combines **Supabase Auth** with **TanStack Query** mutations and **Zustand** client state:
- **One-Click Authorization**: Initiated via the `useGoogleSignInMutation()` TanStack Query hook, which calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- **Reactive Auth Store**: `useAuthStore` (Zustand) tracks authenticated citizen records, active profile, clearance loading flags, and error dispatches.
- **Session Code Exchange**: Handled securely via the server route [`src/app/auth/callback/route.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/app/auth/callback/route.ts).
- **PostgreSQL Row-Level Security**: Automatically isolates all user diaries, monographs, and vault items to the authenticated `auth.uid()`.
- **Session Listener & Sync**: `useUserSession()` subscribes to `supabase.auth.onAuthStateChange` to keep TanStack Query cache and Zustand state in sync.
- **Citizen Status Indicator**: [`src/components/brand/citizen-status.tsx`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/components/brand/citizen-status.tsx) displays live clearance status and sign-out controls across headers.

---

## 3. Key Files & Routes

- **[`src/app/login/page.tsx`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/app/login/page.tsx)**: Main editorial broadside login page powered by `useGoogleSignInMutation()` and `useAuthStore`.
- **[`src/hooks/queries/use-auth.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/hooks/queries/use-auth.ts)**: TanStack Query hooks (`useUserSession`, `useUserProfile`, `useGoogleSignInMutation`, `useSignOutMutation`).
- **[`src/stores/auth-store.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/stores/auth-store.ts)**: Zustand auth state and error dispatch store.
- **[`src/components/brand/citizen-status.tsx`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/components/brand/citizen-status.tsx)**: Reactive citizen clearance indicator and sign-out button.
- **[`src/app/auth/callback/route.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/app/auth/callback/route.ts)**: Next.js Route Handler for Supabase session code exchange.
- **[`src/lib/supabase/client.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/lib/supabase/client.ts)**: Browser client initialization.
- **[`src/lib/supabase/middleware.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/lib/supabase/middleware.ts)**: Session validation & edge route protection.
