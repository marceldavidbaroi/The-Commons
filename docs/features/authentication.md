# Feature: Authentication & Citizen Clearance

## 1. Overview & Architectural Philosophy

Authentication in **The Commons** is presented through the **Magazine & Editorial Broadside** design language under the metaphor of the **Citizen Passport & Record Chamber**.

Rather than utilizing generic floating modal boxes, the `/login` portal is designed as an authentic editorial broadsheet spread:
- **Hairline Rules & Folio Headers**: Clean columnar structure with `.editorial-rule`, `.editorial-rule-double`, and publication volume stamps (`VOL. I — NO. 01`).
- **Tactile Registry Seal**: SVG broadsheet embossed seal inscribed with *The Commons Archive • Littera Scripta Manet*.
- **Direct Multi-Mode Clearance**: Seamless switching between Master Cipher Key (Password), Magic Courier (OTP Email link), and Citizen Passport Enrollment (Sign Up).

---

## 2. Authentication Protocol

The login flow is streamlined to **Google OAuth 2.0**:
- **One-Click Authorization**: Prominent, dignified broadside action initiating Google authentication via `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- **Session Code Exchange**: Handled securely via the server route [`src/app/auth/callback/route.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/app/auth/callback/route.ts).
- **PostgreSQL Row-Level Security**: Automatically isolates all user diaries, monographs, and vault items to the authenticated `auth.uid()`.
- **Encrypted Session**: Session tokens stored and managed securely across SSR middleware.

---

## 3. Key Files & Routes

- **[`src/app/login/page.tsx`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/app/login/page.tsx)**: Main editorial broadside login page.
- **[`src/app/auth/callback/route.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/app/auth/callback/route.ts)**: Next.js Route Handler for Supabase session code exchange.
- **[`src/lib/supabase/client.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/lib/supabase/client.ts)**: Browser client initialization.
- **[`src/lib/supabase/middleware.ts`](file:///Users/daviditc/Documents/personal_projects/The-Commons/src/lib/supabase/middleware.ts)**: Session validation & edge route protection.
