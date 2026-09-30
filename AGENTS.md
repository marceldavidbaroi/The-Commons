# The Commons — SvelteKit Web Application


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
- **Server State**: Managed exclusively through `@tanstack/react-query` and Supabase.
- **Client State**: Zustand (`useDiaryStore`, `useUIStore`) is strictly for transient UI state (e.g. search query, active filter tabs, modals, reading density).
- **Prohibited**: Never cache, duplicate, or mirror database records (`diaries`, `entries`, `profiles`) inside Zustand stores or `localStorage`.

## 2. Component Modularity (< 300-400 lines)
- Keep client page components concise and composable.
- Extract theme-specific editors into `src/components/diary/theme-*-editor.tsx`.
- Extract sub-views (Table of Contents, Summary Digest) into `entry-index-view.tsx` and `entry-summary-view.tsx`.
- Extract custom SVG icons and graphics into `diary-icons.tsx`.
- Extract live draft and autosave handlers into custom hooks like `useDiaryAutosave`.

## 3. Direct Supabase Query Layer
- Use standard Supabase query builder syntax with relation joins:
  ```ts
  const { data, error } = await supabase
    .from("diaries")
    .select("*, diary_entries(id, page_number, entry_date)")
    .eq("user_id", user.id);
  ```
- Do **NOT** implement dual-track code (calling an RPC then catching an error to fall back to direct table queries). Standard direct queries with RLS are the default.

## 4. UUID-First Navigation & Lookups
- Always use database UUID (`entry.id` / `diary.id`) for lookups and App Router navigation.
- Treat `page_number` purely as a visual UI badge ("Leaf No. 12"). Never use `String(e.pageNumber) === id` for entity identification.
- Use `router.replace(url, { scroll: false })` or `router.push(url)` for route transitions. Avoid manual `window.history.replaceState` hacks.

# UI Simplicity & Plain Language Rules
- **No Fantasy Vocabulary**: Avoid grandiose/fantasy copy such as "Citizen Passport", "Sanctuary", "Sacred Codex", "Broadside Inscription", "Sovereign Passport", "Wax Seal", "Colophon". Use clean, direct, standard words: "Account", "Profile", "Settings", "Sign In", "Dashboard", "Notes", "Journals", "Tasks", "Goals".
- **Simple, Minimalist UI**:
  - Avoid excessive nested decorative cards, heavy frames, badge borders, and artificial layered boxes.
  - Keep layouts clean, flat, high-density, and straightforward with subtle borders and clear whitespace.

## 5. Directory & File Responsibilities Sitemap
- `src/hooks/queries/`: React Query hooks for fetching, mutating, and cache invalidation.
- `src/services/`: Direct Supabase database client functions and error normalization.
- `src/stores/`: Pure transient client UI state (sidebar, filters, search query).
- `src/components/diary/`: Modular UI pieces (< 300 lines each) for the diary experience.
- `src/app/`: Next.js App Router route declarations and page layouts.
