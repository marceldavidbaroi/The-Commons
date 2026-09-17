# The Commons — Project Documentation

Welcome to the documentation for **The Commons**. This directory serves as the single source of truth for architectural decisions, feature specifications, database conventions, and design standards.

---

## 📚 Documentation Index

### 1. [Features](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features)
- [**Authentication & Access Control (RBAC)**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/authentication-and-access-control/01-prd.md) — Supabase Auth, Google OAuth, magic link OTP, roles (`admin`, `member`, `guest`), SSR session handling, and edge route middleware.
- [**Daily Diary & Multi-Tome Journaling**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/daily-diary/01-prd.md) — Multi-tome journal library, 2-page tactile editor, gratitude rituals, and vitality streaks. ([Page-to-API Matrix](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/daily-diary/05-page-to-api-matrix.md))
- [**Citizen Passport & Identity**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/citizen-passport/01-prd.md) — Archival citizen clearance, identity ledger, badges, and profile preferences.
- [**Design System & Visual Identity**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/design-system.md) — Curated tokens, official broadside seal logo, and feature-scoped styling.
- [**User Profiles & Preferences**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/user-profiles-and-preferences.md) — Profiles schema, email preferences, and custom sorting.
- [**Environment & Local Stack**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/environment-management.md) — Switching between local Docker and production Supabase via pnpm scripts.

### 2. [Architecture & Database](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/architecture)
- [**Feature Development & Documentation Lifecycle**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/architecture/feature-development-process.md) — The UI-First development workflow and standard folder structure (`PRD`, `Data Model`, `API Contract`, `TDD`, `Stubs`).
- [**State Management & Data Fetching**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/architecture/state-management.md) — Server state synchronization with **TanStack Query (v5)** and reactive client stores with **Zustand (v5)**.
- [**Database Conventions & Schema Structure**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/architecture/database-conventions.md) — Declarative schema folders (`tables/`, `rpc/`, `policies/`, `triggers/`, `indexes/`), RLS guidelines, and migrations.

---

## 🚀 Quick Reference Commands

| Task | Command |
| :--- | :--- |
| **Start Dev Server** | `pnpm dev` |
| **Build Project** | `pnpm build` |
| **Switch to Local Docker DB** | `pnpm env:local` |
| **Switch to Production DB** | `pnpm env:prod` |
| **Add shadcn Component** | `pnpm dlx shadcn@latest add <component>` |
| **Explore Design System** | Open `http://localhost:3000/dev/design-system` |
| **Interactive Documentation Codex** | Open `http://localhost:3000/dev/document` |
