# Feature Spec: [Feature Name]

> [!NOTE]
> High-density living feature spec for The Commons. Visualized automatically at `/dev/document`.

---

## 1. User Story & UX Flow
- **Problem Statement**: What friction or missing capability does this feature address?
- **Target Persona**: Member | Admin | All Users
- **Primary User Flow**:
  1. User navigates to `[Page Route]`.
  2. User interacts with `[Component / Button / Input]`.
  3. System updates UI optimistically and persists to database.

---

## 2. Database Schema Delta
- **Tables Touched**: `[e.g. tasks, tags]`
- **New Tables / Columns (SQL Draft)**:
```sql
-- Migration draft
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';
```
- **RLS & Security Rules**:
  - `SELECT`: Only rows where `auth.uid() = auth_user_id` (or profile id match).
  - `INSERT / UPDATE`: Must match authenticated user.

---

## 3. Routes & Server Actions Matrix

| Route Path | Type | Purpose | Auth Required |
| :--- | :--- | :--- | :--- |
| `src/routes/(app)/[feature]/+page.svelte` | Page | Primary interactive view | Yes |
| `src/routes/(app)/[feature]/+page.server.ts` | Loader & Actions | `load()`, `default` action | Yes |

---

## 4. Acceptance Criteria & Invariants
- [ ] User can successfully perform primary action without full page reload.
- [ ] Non-authenticated users are redirected to `/login`.
- [ ] RLS policies prevent users from accessing or mutating other users' records.
- [ ] UI displays proper empty state and skeleton loading state.
