# The Commons — SvelteKit Web Application


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

## 2. Component Modularity (< 300-400 lines)
- Keep client page components concise and composable.
- Extract domain sub-views and reusable panels into `src/lib/components/`.
- Extract custom SVG icons and graphics into dedicated icon components.
- Extract complex domain logic and shared helpers into `src/lib/`.

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


