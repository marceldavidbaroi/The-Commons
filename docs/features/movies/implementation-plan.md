# Movies — Phased Implementation Plan

Based on [spec.md](file:///Users/daviditc/Documents/personal_projects/The-Commons/docs/features/movies/spec.md) and aligned with `AGENTS.md` (SPA + 3-layer separation, keyset pagination, zero-refetch CUD, Flat 2.0 design).

---

## Phase 1: Database, Types & Edge Function
1. **Migrations**:
   - Create `supabase/migrations/<timestamp>_create_movies.sql`: `pg_trgm` extension, `movie_status` & `recommend_audience` enums, `public.movies` table, GIN/B-Tree keyset cursor indexes (`watched_at`, `rating`, `release_year`, `title` with `id desc` tiebreakers), `handle_movie_before_write()` trigger, and RLS policy.
   - Create `supabase/migrations/<timestamp>_movies_rpcs.sql`: `get_movie_facets()` RPC.
2. **Types**:
   - Apply migrations and regenerate `src/lib/types/database.types.ts` via `supabase gen types typescript`.
3. **TMDB Proxy Edge Function**:
   - Create `supabase/functions/tmdb-proxy/index.ts` verifying `Authorization: Bearer <supabase_user_jwt>` and reading `TMDB_READ_ACCESS_TOKEN` from Supabase secrets.
   - Implement `GET ?action=search`, `GET ?action=hydrate`, and `POST action=batch_hydrate` (up to 25 items, concurrency `10`).

---

## Phase 2: Service & Store Layers
1. **Service (`src/lib/services/movies-service.ts`)**:
   - Pure async functions using explicit column selection (`select('id, tmdb_id, imdb_id, imdb_url, letterboxd_url, title, release_year, original_language, origin_countries, genres, poster_path, trailer_youtube_key, status, rating, tags, recommend_to, notes, watched_at, rewatch_count')`).
   - `fetchMoviesPage(filters, sort, cursor)` with `limit(20)` keyset pagination.
   - `fetchMovieFacets()` calling `supabase.rpc('get_movie_facets')`.
   - `upsertMovie(payload)` / `updateMovie(id, payload)` with `.select(...).single()`, and `deleteMovie(id)`.
   - `searchTmdb(q, year)` / `hydrateTmdb(tmdbId)` / `batchHydrateTmdb(items)` calling `/functions/v1/tmdb-proxy`.
2. **Store (`src/lib/stores/movies.svelte.ts`)**:
   - Svelte 5 runes (`$state`, `$derived`) holding `items`, `facets`, `filters`, `sort`, `activeTab`, `selectedMovieId`, `rightPaneMode` (`closed | details | add | import`), and `hasMore`.
   - Zero-refetch CUD: prepend on insert, `.map()` in-place on update, `.filter()` on delete.
   - URL query sync helper (`/movies?tab=...&lang=...&era=...&tags=...&movie=...`).

---

## Phase 3: `/movies` 3-Pane UI & CSS (Flat 2.0)
1. **Route & Layout (`src/routes/(app)/movies/+page.svelte`)**:
   - Enable `full-bleed` on `.content-wrapper` in `src/routes/(app)/+layout.svelte` so `/movies` runs as a `100dvh` workspace without outer padding.
   - **CSS Grid & Responsive Breakpoints**:
     - Desktop (`>= 1200px`): `grid-template-columns: 260px minmax(0, 1fr)` (expands to `260px minmax(0, 1fr) 400px` when `rightPaneMode !== 'closed'`).
     - Tablet (`768px – 1199px`): `240px minmax(0, 1fr)` + `400px` right-docked overlay with `1px solid #E5DFD5` left border.
     - Mobile (`< 768px`): Single column + full-screen slide-over sheets for Filters and Details.
   - **Flat 2.0 Visual Tokens**:
     - Canvas `#FBFAF7`, surfaces `#FFFDFA`, pills/hover/active `#F4EFE6`, borders `1px solid #E5DFD5` (no `backdrop-blur`, no drop-shadows, no gradients), text `#1C1917` / `#6B655E`, primary accent `#292524` fill with `#FFFDFA` text.
     - Top Header (`52px`) + Center List sub-header (`<= 38px`) kept within `~80–90px` combined height.
2. **Components (`src/routes/(app)/movies/_components/`)**:
   - `MoviesHeader.svelte`: `/movies` title, 3 segmented tabs (`Watched`, `Wish List`, `Recommendations`), `[Export ▾]`, `[Import]`, `[Copy Link]`, `[+ Add]`.
   - `MoviesFilterSidebar.svelte`: `Search Title` (250ms debounce, `/` shortcut), `Language` (`Intl.DisplayNames`), `Origin Country` (`Intl.DisplayNames`), `Genre`, `Release Era`, `Audience`, `Personal Rating`, `Tags` with counts, `Reset Filters`.
   - `MoviesList.svelte`: Active filter chips, total count, Sort dropdown, `76px` rows (`40×60px` `w185` poster, 2-line metadata, rating badge, `IMDb`/`LB` links with `stopPropagation`), `Load More (20)` button.
   - `MovieDetailsPane.svelte`: Details/Edit mode (Status, Rating, Watched Date, Rewatch stepper, Recommend To pills, Tag chip input with autocomplete, Notes textarea, on-demand `youtube-nocookie.com` trailer embed, `Delete` two-click confirm, `Refresh TMDB`, `Save`) + Add Movie mode (live TMDB search, top 8 matches, click-to-hydrate & edit).

---

## Phase 4: Filtered Export & Excel/CSV Import
1. **Dependency**: Install `xlsx` (SheetJS) in `package.json`.
2. **Export (`src/lib/utils/movies-export.ts`)**:
   - Keyset-paginated 500-row batches using active filters (no `OFFSET`/`LIMIT`).
   - Client-side `.xlsx` and `.csv` generation + 2-row sample `.xlsx` template download.
3. **Import (`MovieImportPane.svelte` + `src/lib/utils/movies-import.ts`)**:
   - Dropzone (`.xlsx`, `.xls`, `.csv`), Letterboxd vs. `/movies` template auto-detection, client-side validation & in-file deduplication.
   - Check existing vault rows first, batch-hydrate new rows via `tmdb-proxy` (`batch_hydrate`, 25/batch), chunked upsert (50/chunk), downloadable unmatched rows `.xlsx`, and live `get_movie_facets()` + list refresh.

---

## Phase 5: Verification
- Run `npm run check` (SvelteKit/TypeScript) and `npm run build`.
- Verify RLS isolation, keyset pagination, URL query sync, keyboard shortcuts (`/`, `Esc`), and responsive 3-pane / 2-pane / mobile drawer behavior.
