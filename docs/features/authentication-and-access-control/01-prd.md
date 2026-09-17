# PRD: Authentication & Access Control (RBAC)

## 1. Executive Summary & Objective
- **Problem Statement**: The application requires secure identity verification (Authentication) alongside granular Role-Based Access Control (RBAC) to distinguish between unauthenticated guests, standard citizen members, and system administrators.
- **Proposed Solution**: A unified authentication and access control layer combining Supabase Auth, SSR session exchange, PostgreSQL Row-Level Security (RLS) policies, Next.js Edge Middleware route guards, and Zustand client session state with auto-expiry handling.
- **Target Personas**:
  - **`guest`**: Public visitors browsing documentation, landing pages, and login.
  - **`member`**: Authenticated citizens with isolated read/write access to their personal sanctuary, diaries, passport, and settings.
  - **`admin`**: System stewards with platform-wide inspection, user clearance, and maintenance permissions.

## 2. Core Authentication & Session Requirements

### 🔑 Authentication Flow & Token Management
1. **Google OAuth Handshake**:
   - One-click Google login sends user to OAuth consent, returning to `/auth/callback?code=...`.
   - On successful exchange, the user profile, session, and access token are synchronized into the **Zustand client store (`useAuthStore`)**.
2. **Token Expiration & Auto-Logout**:
   - The client actively listens to session validity and auth state changes (`supabase.auth.onAuthStateChange`).
   - If the access token expires or the refresh token becomes invalid, the system **automatically logs the user out**, purges Zustand store state, and redirects to `/login`.

### 🧭 Post-Login Routing & Return URLs
1. **Default Destination**:
   - Upon successful login, the user is navigated directly to **`/home`**.
2. **Contextual Return URL**:
   - If the user was kicked to `/login` from a specific protected page (e.g. `/daily-diary/tome-1` or `/citizen-passport`), the URL stores a `redirectUrl` query parameter (e.g. `/login?redirectUrl=/daily-diary/tome-1`).
   - After completing login, the system detects `redirectUrl` and navigates them back to their intended destination instead of `/home`.

### 🔒 Strict Authenticated User Isolation Principle
> [!IMPORTANT]
> **Every single database table query and API request MUST fetch data for the authenticated user ONLY (`auth.uid() = user_id`).**
> No cross-user data leakage is permitted under any circumstances. All application tables (`profiles`, `diaries`, `diary_entries`, `user_items`, etc.) MUST enforce PostgreSQL Row-Level Security (RLS) checked against `auth.uid()`.

---

## 3. User Stories & Acceptance Criteria

### Authentication (AuthN)
- **User Story 1 (Google OAuth)**: As a user, I want to sign in with Google OAuth in one click so that I don't have to manage passwords.
  - [ ] Clicking Google sign-in completes the OAuth handshake and redirects to `/auth/callback`.
  - [ ] Access token and user profile are loaded into Zustand.
  - [ ] Automatically creates a `public.profiles` entry with default role `'member'`.
- **User Story 2 (Token Expiry)**: As a user with an expired session, I want the system to safely log me out and prompt me to log in again.
  - [ ] Triggers clean logout when token expires.
  - [ ] Preserves current page path in `redirectUrl`.

### Access Control & Roles (AuthZ / RBAC)
- **User Story 3 (Role-Based Route Protection)**:
  - [ ] Unauthenticated `guest` users attempting to access `/home`, `/daily-diary`, `/citizen-passport`, or `/settings` are redirected to `/login?redirectUrl=[currentPage]`.
  - [ ] Standard `member` users can only view and mutate their own data (strictly isolated by `auth.uid()`).
  - [ ] Protected admin routes (e.g. `/admin/*`) verify `profile.role === 'admin'` via Edge Middleware.
  - [ ] Authenticated users visiting `/login` are automatically redirected to `/home`.

---

## 4. Page Routes & UI Breakdown
| Route / URL | Access Level | Description | Key Actions |
|---|---|---|---|
| `/` | `guest` / `member` | Editorial landing page | Explore platform, navigate to login or dashboard |
| `/login` | `guest` only | Clearance login portal | Google OAuth, OTP link, credential sign-in, redirectUrl support |
| `/auth/callback` | `guest` -> `member` | Session code exchange handler | Exchanges code for session cookies, sets role claims, routes to target URL |
| `/home` | `member` / `admin` | Personal Sanctuary overview | View active tomes, stats, recent entries |
| `/dev/document` | `guest` / `member` / `admin` | Documentation Codex | Browse specifications and architecture |

---

## 5. Visual & Interactive States
- **Guest State**: Public navigation with "Sign In / Enter Sanctuary" call to action.
- **Member State**: Citizen header with live profile badge, avatar, clearance title, and Sign Out action.
- **Admin State**: Admin banner / tools enabled with elevated clearance badge.
- **Expired Session / Unauthorized State**: Immediate purge of client cache + toast alert: *"Your session has expired. Please sign in again."*
