# The Commons — Project Documentation

Welcome to the documentation for **The Commons**. This directory serves as the single source of truth for architectural decisions, feature specifications, database conventions, and design standards.

---

## 📚 Documentation Index

### 1. [Features](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features)
- [**Design System & Visual Identity**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/design-system.md) — Magazine broadside aesthetic ("no cards" philosophy, hairline rules, drop caps, kickers) and modular feature-scoped design systems.
- [**Daily Diary**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/daily-diary.md) — Tactile analog manuscript journal, antique parchment paper, walnut ink, prompt suggestions, and streak tracking.
- [**Authentication & User Session Management**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/authentication.md) — Supabase Auth, SSR session handling, and middleware.
- [**User Profiles & Preferences**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/user-profiles-and-preferences.md) — Profiles schema, email preferences, and per-user custom sorting.
- [**Environment & Local Stack**](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/environment-management.md) — Switching between local Docker and production Supabase via pnpm scripts.

### 2. [Architecture & Database](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/architecture)
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
