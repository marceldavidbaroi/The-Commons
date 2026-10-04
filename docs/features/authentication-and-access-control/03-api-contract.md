# API Contract: Authentication, Member Whitelist & Access Control

## 1. Authentication & Permission Operations

| Operation | Handler / Method | Role Required | Description |
|---|---|---|---|
| **Member Sign-In** | `signInWithOAuth({ provider: 'google', options: { redirectTo } })` | `guest` | Initiates Google OAuth for regular member login |
| **Admin Sign-In** | `signInWithOAuth({ provider: 'google', options: { redirectTo } })` | `guest` | Initiates Google OAuth targeting `/admin` destination |
| **Session & Whitelist Check** | `GET /auth/callback?code=...&next=...` | `guest` -> `member`/`admin` | Exchanges code, verifies whitelist / admin status, redirects or rejects |
| **Sign Out** | `supabase.auth.signOut()` | `member` / `admin` | Invalidates session and clears client auth state |
| **List Allowed Members** | `GET /api/admin/members` or Supabase Query | `admin` | Fetches all whitelisted member records |
| **Add Allowed Member** | `POST /api/admin/members` or Supabase RPC | `admin` | Whitelists a new member Gmail address |
| **Revoke Member Access** | `DELETE /api/admin/members/:id` | `admin` | Removes/revokes a member from whitelist |

---

## 2. Session Code Exchange & Verification Contract (`/auth/callback`)

- **Route**: `GET /auth/callback`
- **Query Parameters**:
  - `code` (string, required): Authorization code returned by Google OAuth.
  - `next` (string, optional): Target destination (`/home` for members, `/admin` for admins).
- **Workflow**:
  1. Server/Client exchanges `code` for session token.
  2. Reads user email from verified auth session.
  3. **Access Verification**:
     - If `next.startsWith('/admin')`:
       - Verify if `profiles.role === 'admin'`. If not, sign out and redirect to `/admin/login?error=unauthorized_admin`.
     - Else (Member Flow):
       - Verify if `allowed_members` contains `email` with `status = 'active'` OR `profiles.role === 'admin'`.
       - If unauthorized: Sign out and redirect to `/login?error=not_whitelisted`.
  4. If authorized, redirect to target destination (`next`).

---

## 3. Admin Member Operations Payload & Response Shapes

### A. Add Member
- **Action**: Add new Gmail to member whitelist.
- **Request Payload**:
  ```json
  {
    "email": "colleague@gmail.com",
    "notes": "Department scribe member"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": {
      "id": "7b8f9e61-a1b2-4c3d-8e5f-0123456789ab",
      "email": "colleague@gmail.com",
      "status": "active",
      "notes": "Department scribe member",
      "added_by": "12345678-1234-1234-1234-123456789012",
      "created_at": "2026-10-04T21:50:00Z",
      "updated_at": "2026-10-04T21:50:00Z"
    },
    "error": null
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Invalid email address or already registered." }`
  - `403 Forbidden`: `{ "error": "Administrative permissions required." }`

---

## 4. Universal Data Isolation Rule

> [!IMPORTANT]
> - Regular member workspace data (`diaries`, `diary_entries`, `user_items`) is strictly isolated to the authenticated user (`auth.uid() = user_id`).
> - The `allowed_members` table is strictly protected by RLS and writable only by users with `profiles.role = 'admin'`.

