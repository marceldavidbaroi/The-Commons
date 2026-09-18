<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Rendering Performance Rules
- **No Blur Effects**: Avoid `backdrop-blur-*`, `backdrop-filter: blur()`, `filter: blur()`, and simulated blurred shadow layers. Use clean solid/alpha backgrounds and hardware-accelerated CSS box-shadows to ensure smooth 60-120 FPS rendering.

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

## 5. Directory & File Responsibilities Sitemap
- `src/hooks/queries/`: React Query hooks for fetching, mutating, and cache invalidation.
- `src/services/`: Direct Supabase database client functions and error normalization.
- `src/stores/`: Pure transient client UI state (sidebar, filters, search query).
- `src/components/diary/`: Modular UI pieces (< 300 lines each) for the diary experience.
- `src/app/`: Next.js App Router route declarations and page layouts.
