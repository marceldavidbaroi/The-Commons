# The Commons — Architectural Blueprint & Development Rules

## 1. High-Level Architecture (Pure SPA + Layered Design)
- **Deployment Mode:** Pure Single-Page Application (SPA). `export const ssr = false` and `export const prerender = false` on the root layout. No SSR runtime dependencies.
- **Strict Layer Separation:**
  1. **View Layer** (`.svelte`): Markup, user events, and reactive derivations only. Never import Supabase directly into views.
  2. **Store Layer** (`data.svelte.ts` / Runes): Single source of truth. Handles in-memory caching, optimistic updates, and component state.
  3. **Service Layer** (`*-service.ts`): Pure async TypeScript functions executing Supabase SDK calls and returning typed data.
  4. **Database Layer** (PostgreSQL): RLS policies, aggregate views, and composite indexes.

## 2. Data Fetching & Pagination Rules
- **Cursor/Keyset Pagination Only:** Never use `OFFSET` / `LIMIT`. Use keyset pagination using indexed fields (e.g., `created_at` + tiebreaker `id`).
- **Default Batch Size:** Fixed to 20 records (`limit(20)`) for every list or paginated endpoint.
- **Postgres Aggregations:** Summary statistics, deck badge counts, or entity metrics must be handled in PostgreSQL via Views or RPC functions. Never fetch raw lists to count or reduce in JavaScript.
- **Explicit Column Selection:** Prohibit `select('*')`. Explicitly name required columns (e.g., `select('id, front, back, created_at')`) to minimize wire payload.

## 3. Store Mutation Rules (Zero-Refetch Policy)
- The global store is called `data` (or specialized sub-stores managed under `dataStore`).
- **Cache-First / Stale-While-Revalidate:** On navigation, check if the store already contains data for the given entity/ID. If present, render immediately; do not flash loading spinners.
- **No Refetch on CUD Operations:**
  - **Create:** Insert via Supabase with `.select().single()`, then prepend/append the returned entity directly into the store array.
  - **Edit/Update:** Update via Supabase with `.select().single()`, then update the existing record in-place in the store array via `Array.prototype.map()`.
  - **Delete:** Delete via Supabase by `id`, then immediately filter out the record from the store array via `Array.prototype.filter()`.
  - **Never** re-call fetch or list APIs after a mutation completes.

## 4. Supabase Security & Indexing Standard
- Every table must have `alter table <table> enable row level security;`.
- Strict RLS policies checking `auth.uid() = user_id` for `select`, `insert`, `update`, and `delete`.
- Multi-column composite indexes must match cursor sort fields exactly: `CREATE INDEX ... ON <table> (foreign_key, created_at desc, id desc);`.

## 5. Token Reduction & Modular Code Rules (For LLM Responses)
- **Modular Snippets Only:** Do not reprint the entire codebase or unchanged boilerplate. Provide only the targeted function, store snippet, SQL script, or component fragment being created or edited.
- **No Fluff or Over-explanation:** Jump straight to the code and concise structural bullets.
- **Use Unified DTOs/Types:** Reference shared TypeScript interfaces rather than duplicating definitions across multiple files.

# Architecture & Code Quality: SvelteKit Modular Design
1. **Component Modularity:**
   - Keep components focused and single-purpose (< 120 lines where possible).
   - Break large routes into nested sub-components inside local `$lib/components/` or route-level `_components/` folders.
   - Separate UI presentation from data manipulation: use stores or Svelte 5 runes (`$state`, `$derived`, `$props`) isolated in `.svelte.js`/`.svelte.ts` files when logic spans multiple components.
   - Extract custom SVG icons and graphics into dedicated icon components.
   - Extract complex domain logic and shared helpers into `src/lib/`.

2. **Route Design:**
   - Adhere strictly to SvelteKit conventions (`+page.svelte`, `+page.server.ts`, `+layout.svelte`, `+server.ts`).
   - Keep `+page.server.ts` actions and `load` functions minimal; offload business logic, database queries, and external APIs to service modules in `$lib/server/`.

3. **State Management & Type Safety:**
   - Use strict TypeScript interfaces for all component props, page data (`PageData`), and form actions (`ActionData`).
   - Prefer fine-grained reactivity over monolithic state objects.

# Agent Behavior & Token Optimization
1. **Zero Fluff & Direct Delivery:**
   - Do not include conversational filler, greetings, summaries, or post-implementation explanations.
   - Output only the requested code diffs or the immediate solution directly.

2. **Minimal Thinking & Output:**
   - Do not perform broad architectural rewrites unless explicitly instructed.
   - Target only the exact file and lines required to resolve the task.
   - Provide minimal context lines in code snippets; do not reprint unchanged full files.

3. **No Unprompted Brainstorming:**
   - Implement the direct solution immediately without proposing alternative approaches or follow-up suggestions unless an execution error blocks progress.

# AI Research & Execution Strategy
- **Implementation Tasks (Code Changes & Bug Fixes)**:
  - **Minimal Research**: Do NOT perform wide repository greps, broad folder sweeps, or scan unrelated files.
  - **Direct Target Execution**: Jump immediately to the specified or active target file, inspect only necessary lines, and apply changes directly.
  - **Fast Iteration**: Avoid premature refactors or over-exploring codebase abstractions during quick code modifications.
- **Documentation & Feature Discussions (Architecture, Docs, Planning)**:
  - **Deep Exploration**: Go deep into the codebase, analyze full context, trace cross-module dependencies, compare architectural tradeoffs, and document comprehensive plans before proceeding.

# Rendering Performance Rules
- **No Blur Effects**: Avoid `backdrop-blur-*`, `backdrop-filter: blur()`, `filter: blur()`, and simulated blurred shadow layers. Use clean solid/alpha backgrounds and hardware-accelerated CSS box-shadows to ensure smooth 60-120 FPS rendering.

# Common & List Page Design System Rules

## 1. Vertical Budget & Information Density (Anti-Layer-Cake)
- **Max 2 Tiers Above Content**: The header area above any list or working canvas must NEVER exceed 2 compact vertical tiers (~80–90px total height combined):
  - **Tier 1 (Header & Primary Action)**: Page title / breadcrumb context + item count badge on the left; primary CTA (e.g. `+ Inscribe Goal`, `+ New Entry`) on the right (~40–44px).
  - **Tier 2 (Unified Interactive Toolbar)**: Inline search (`ListFilterSearch`), filter tabs/pills (`ListFilterGroup`), status/sort selectors, and item tally (`ListFilterCount`) all arranged on a single row (~36–40px).
- **Never Stack Search and Filters on Separate Lines**: Do NOT dedicate a full vertical row to a search bar and another row to filter pills. Always merge them into a single horizontal toolbar using `ListFilter variant="inline"`.
- **Stat Consolidation**: Do not scatter duplicate counters across page titles, filter chips, and card footers. Embed counts directly into filter tabs (e.g., `Today (3)`, `Completed (12)`).

## 2. Standardized List Primitives
- **Use Official List Components**: All list views, task ledgers, and index pages must use `@/components/ui/list`:
  - `<List variant="default" | "cards" | "bordered" | "inset">`
  - `<ListItem variant="interactive" | "card" | "bordered">`
  - `<ListPrefix>`, `<ListContent>`, `<ListText>`, `<ListDescription>`, `<ListSuffix>`
  - `<ListEmpty>` with an action button for zero-state recovery.
- **Row Density Guidelines**:
  - List row height should remain compact (between 38px and 52px, `py-2 px-3` to `py-2.5 px-3.5`).
  - At least 8–12 list items must be visible within a standard desktop viewport above the fold.
  - Avoid thick 24px+ card padding around simple text entries unless displaying rich multimedia cards or accordion forms.

## 3. Creation & Form Ergonomics
- Prefer inline quick-add inputs, compact sheets/drawers, or dialog modals for creating/editing items instead of placing massive static multi-field form boxes directly on the list canvas.

# State & Data Architecture Guidelines

## 1. Single Source of Truth
- **Server State**: Managed through SvelteKit page loaders (`+page.server.ts` / `+page.ts`), form actions, and Supabase client queries.
- **Client State**: Svelte 5 runes (`$state`, `$derived`, `$props`) or modular Svelte stores for transient UI state (e.g. search query, active filter tabs, modals, drawer toggles).
- **Prohibited**: Never cache, duplicate, or mirror database records (`diaries`, `tasks`, `profiles`) inside browser `localStorage`.

## 3. Direct Supabase Query Layer
- Use standard Supabase query builder syntax with relation joins:
  ```ts
  const { data, error } = await supabase
    .from("diaries")
    .select("*, diary_entries(id, entry_date)")
    .eq("user_id", user.id);
  ```
- Do **NOT** implement dual-track code (calling an RPC then catching an error to fall back to direct table queries). Standard direct queries with RLS are the default.

## 4. Mutation & State Synchronization (No Redundant Re-fetching)
- **Use Returned Mutation Data**: Whenever creating, updating, or deleting via Supabase or SvelteKit form actions/endpoints, use `.select()` on inserts/updates to return the mutated record immediately:
  ```ts
  const { data: updatedItem, error } = await supabase
    .from("items")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  ```
- **Local State Updates**: Update client state directly using the returned record instead of triggering a full secondary GET/list re-fetch:
  - **Insert**: Prepend/append `updatedItem` to the local list state: `items = [newItem, ...items]`.
  - **Update**: Replace in-place: `items = items.map(i => i.id === id ? updatedItem : i)`.
  - **Delete**: Filter locally: `items = items.filter(i => i.id !== id)`.
- **Prohibited**: Do NOT execute a write operation and immediately fire a separate `fetchList()` or `load()` query unless complex server-computed aggregates require recalculation.

## 5. UUID-First Navigation & Lookups
- Always use database UUID (`entry.id` / `task.id`) for lookups and route navigation.
- Use SvelteKit `goto(url)` for programmatic navigation. Avoid manual `window.history.replaceState` hacks.

# UI Simplicity & Plain Language Rules
- **No Fantasy Vocabulary**: Avoid grandiose/fantasy copy such as "Citizen Passport", "Sanctuary", "Sacred Codex", "Broadside Inscription", "Sovereign Passport", "Wax Seal", "Colophon". Use clean, direct, standard words: "Account", "Profile", "Settings", "Sign In", "Dashboard", "Notes", "Journals", "Tasks", "Goals".
- **Simple, Minimalist UI**:
  - Avoid excessive nested decorative cards, heavy frames, badge borders, and artificial layered boxes.
  - Keep layouts clean, flat, high-density, and straightforward with subtle borders and clear whitespace.

## 5. Directory & File Responsibilities Sitemap
- `src/routes/`: SvelteKit routes, pages (`+page.svelte`), and server endpoints (`+server.ts`, `+page.server.ts`).
- `src/lib/`: Reusable components, utility functions, and Supabase client instances.
- `src/lib/types/`: TypeScript type definitions (including auto-generated database types).
- `docs/`: Feature specifications, architecture diagrams, and guides visualized via `/dev/document`.

# Pragmatic Feature Documentation & Spec Rules

To keep high engineering velocity and prevent documentation drift, avoid fragmented multi-file waterfall specs.

### Single Feature Spec (`docs/features/<feature-name>/spec.md`)
For any new feature or major enhancement, use a **single, high-density spec file** visible in the `/dev/document` viewer:
1. **User Goal & UX**: What problem does this solve and what is the primary user interaction flow?
2. **Data & Schema**: Which database tables/columns are added or modified (SQL migration draft).
3. **Route & Action Matrix**: List of SvelteKit routes (`+page.svelte`), form actions, or API endpoints (`+server.ts`).
4. **Acceptance Criteria & Invariants**: 3–5 bullet points verifying the feature is functional and secure (RLS/Auth rules).

### Living Contracts Over Manual Duplication
- **Database Ground Truth**: Auto-generate types from Supabase (`supabase gen types typescript`) into `src/lib/types/database.types.ts`.
- **API Matrix**: SvelteKit routes in `src/routes/` are the authoritative route contracts.
- **Visualizer**: Use `/dev/document` to review architecture and feature specs, and Supabase Studio for schema inspection.
- **Migration Immutability (Token & State Safety)**:
  - **NEVER modify or rewrite past/applied migration files** in `supabase/migrations/`. Applied migrations are immutable history. Always write a new incremental migration file (`<timestamp>_*.sql`) for any schema changes.
  - **Avoid reading past migration history**: Do NOT sweep or read through dozens of legacy migration files to understand the current database schema. Check generated types (`src/lib/types/database.types.ts`) or active schema definitions directly to conserve tokens.


