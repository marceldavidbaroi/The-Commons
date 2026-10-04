# Feature: Environment & Migration Management

## Overview
The Commons provides automated scripts to switch between local Docker and production Supabase environments, and to deploy SQL migrations directly to production.

---

## Commands

| Command | Purpose |
| :--- | :--- |
| `pnpm run env:local` | Copies `.env.local.docker` to `.env.local` to point the app to the local Docker stack. |
| `pnpm run env:prod` | Copies `.env.local.prod` to `.env.local` to point the app to the production Supabase instance. |
| `pnpm run backend:prod` | Runs `pnpm env:prod` first, loads production credentials, and deploys all migrations from `supabase/migrations/` to the production database. |

---

## Production Migration Setup
To deploy migrations with `pnpm run backend:prod`:
1. Open [`.env.local.prod`](file:///Users/daviditc/Documents/personal_projects/The-Commons/.env.local.prod)
2. Add your direct database URL or password:
   ```env
   # Option A (Recommended): Direct Postgres Connection URI
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.rbnbgyytxgkkcrmkgnro.supabase.co:5432/postgres"

   # Option B: Database Password
   SUPABASE_DB_PASSWORD="your-db-password"
   ```
3. Run:
   ```bash
   pnpm run backend:prod
   ```
