# Movies — Feature Specification

## 1. User Goal & UX
- **Goal**: Personal movie vault for tracking `watchlist`, `watched`, and `dropped` films with lean TMDB metadata hydration, language/origin-country filtering, custom tags, audience recommendations (`recommend_to`), ratings (`0.5–10.0`), rewatch counts, and Letterboxd CSV import.
- **Primary Flow**:
  1. Search movies via TMDB autocomplete (`tmdb-proxy?action=search`) or import a Letterboxd export ZIP.
  2. Hydrate lean metadata (`original_language`, `origin_countries`, `genres`, `poster_path`, `trailer_youtube_key`, IMDb/Letterboxd links) via `tmdb-proxy?action=hydrate` and upsert into `public.movies`.
  3. Browse/filter the vault using keyset-paginated lists (20/page) across tabs (`Watched`, `Wish List`, `Recommendations`) and indexed filters, with facets from `get_movie_facets()`.

---

## 2. Data & Schema

### Migration 1: `<timestamp>_create_movies.sql` (e.g. `20271122000000_create_movies.sql`)

```sql
create extension if not exists pg_trgm;

-- 1. Enums
create type public.movie_status as enum ('watchlist', 'watched', 'dropped');

create type public.recommend_audience as enum (
  'anyone',
  'partner',
  'friends',
  'family',
  'cinephiles',
  'solo_rewatch'
);

-- 2. Lean Movies Table
create table public.movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tmdb_id integer,
  imdb_id text,

  -- External Links
  imdb_url text,
  letterboxd_url text,

  -- Lean Cached TMDB Metadata
  media_type text not null default 'movie' check (media_type in ('movie', 'series')),
  title text not null,
  release_year smallint,
  original_language text,                        -- ISO 639-1, e.g. 'en', 'bn', 'hi', 'ko'
  origin_countries text[] not null default '{}', -- ISO 3166-1, e.g. {'US'}, {'IN'}, {'KR', 'US'}
  genres text[] not null default '{}',
  poster_path text,                              -- relative path only, e.g. '/x9yj...jpg'
  trailer_youtube_key text,
  series_progress jsonb,                         -- { "seasons": [{ "season": 1, "episode_count": 6, "watched": [1, 2] }] }

  -- Personal Layer
  status public.movie_status not null default 'watchlist',
  rating numeric(3,1) check (rating >= 0.5 and rating <= 10.0),
  tags text[] not null default '{}',
  recommend_to public.recommend_audience[] not null default '{}',
  notes text,
  watched_at date,
  rewatch_count smallint not null default 0,
  metadata_synced_at timestamptz default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_user_media_tmdb
  on public.movies (user_id, media_type, tmdb_id)
  where tmdb_id is not null;

-- 3. Indexes (GIN for array filters + trigram search, B-Tree for sorting/keyset pagination)
create index idx_movies_title_trgm on public.movies using gin (title gin_trgm_ops);
create index idx_movies_tags on public.movies using gin (tags);
create index idx_movies_genres on public.movies using gin (genres);
create index idx_movies_origin_countries on public.movies using gin (origin_countries);
create index idx_movies_recommend_to on public.movies using gin (recommend_to);
create index idx_movies_lang_year on public.movies (user_id, status, original_language, release_year);
create index idx_movies_status_cursor on public.movies (user_id, status, watched_at desc nulls last, id desc);
create index idx_movies_rating_cursor on public.movies (user_id, status, rating desc nulls last, id desc);
create index idx_movies_year_cursor on public.movies (user_id, status, release_year desc nulls last, id desc);
create index idx_movies_title_cursor on public.movies (user_id, status, title asc, id desc);

-- 4. Normalization Trigger
create or replace function public.handle_movie_before_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  select coalesce(array_agg(distinct lower(btrim(t))), '{}')
    into new.tags
    from unnest(new.tags) as t
   where btrim(t) <> '';

  if new.imdb_url is null and new.imdb_id is not null and new.imdb_id <> '' then
    new.imdb_url := 'https://www.imdb.com/title/' || new.imdb_id || '/';
  end if;

  if new.letterboxd_url is null and new.tmdb_id is not null then
    new.letterboxd_url := 'https://letterboxd.com/tmdb/' || new.tmdb_id::text || '/';
  end if;

  return new;
end;
$$;

create trigger trg_movies_before_write
  before insert or update on public.movies
  for each row execute function public.handle_movie_before_write();

-- 5. Row-Level Security
alter table public.movies enable row level security;

create policy "Owner full access"
  on public.movies
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Migration 2: `<timestamp>_movies_rpcs.sql` (e.g. `20271122010000_movies_rpcs.sql`)

Single round-trip on `/movies` load to populate all filter dropdowns and tab counts dynamically:

```sql
create or replace function public.get_movie_facets()
returns jsonb
language sql
stable
security invoker
as $$
  select jsonb_build_object(
    'counts_by_status', coalesce((
      select jsonb_object_agg(status, cnt)
      from (
        select status, count(*) as cnt
        from public.movies
        group by status
      ) s
    ), '{}'::jsonb),
    'recommendation_count', (
      select count(*)
      from public.movies
      where status = 'watched'
        and (cardinality(recommend_to) > 0 or rating >= 8.0)
    ),
    'languages', coalesce((
      select jsonb_agg(distinct original_language order by original_language)
      from public.movies
      where original_language is not null
    ), '[]'::jsonb),
    'origin_countries', coalesce((
      select jsonb_agg(distinct c order by c)
      from public.movies, unnest(origin_countries) as c
    ), '[]'::jsonb),
    'genres', coalesce((
      select jsonb_agg(distinct g order by g)
      from public.movies, unnest(genres) as g
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('tag', t, 'count', cnt) order by cnt desc, t asc)
      from (
        select unnest(tags) as t, count(*) as cnt
        from public.movies
        group by t
      ) sub
    ), '[]'::jsonb)
  );
$$;
```

---

## 3. Architecture & API Specification

```text
[Client SPA]
  ├── Direct Supabase SDK (PostgREST + RPC) ──► Postgres (movies table + GIN/B-Tree indexes)
  └── Authenticated Call ──► Edge Function (/functions/v1/tmdb-proxy) ──► api.themoviedb.org/3
```

### Layer 1: `/movies` Filter Bar & PostgREST Query Plan

All filters map directly to indexed PostgREST query parameters with 20-item keyset pagination (`order=watched_at.desc.nullslast,id.desc`, `limit=20`) and URL query sync:

| Filter | UI Control | PostgREST Query Filter |
| :--- | :--- | :--- |
| **Top Tab** | Segmented Tabs (`Watched`, `Wish List`, `Recommendations`) | `status=eq.watched` / `status=eq.watchlist` / `status=eq.watched&or=(recommend_to.neq.{},rating.gte.8)` |
| **Title Search** | Debounced search input | `title=ilike.*{query}*` (backed by `gin_trgm_ops`) |
| **Language** | Multi-select dropdown (`Intl.DisplayNames(['en'], { type: 'language' })`) | `original_language=in.(en,ko,hi)` |
| **Origin Country** | Multi-select dropdown (`Intl.DisplayNames(['en'], { type: 'region' })`) | `origin_countries=ov.{US,KR,IN}` (`&&` overlap) |
| **Genre** | Multi-select chips | `genres=cs.{Thriller,Drama}` (`@>` contains) |
| **Release Era** | Era presets (`2020s`, `2010s`, `2000s`, `90s`, `< 1990`) | `release_year=gte.1990&release_year=lte.1999` |
| **Audience** | Pills (`Partner`, `Friends`, `Family`, `Cinephiles`, `Solo`) | `recommend_to=ov.{friends,partner}` |
| **Personal Rating** | Min rating selector (`All`, `9+`, `8+`, `7+`, `Unrated`) | `rating=gte.8.0` or `rating=is.null` |
| **Custom Tags** | Multi-select autocomplete chips | `tags=cs.{mind-bending,comfort}` |

- **Explicit Column Selection**: `select('id, tmdb_id, imdb_id, imdb_url, letterboxd_url, title, release_year, original_language, origin_countries, genres, poster_path, trailer_youtube_key, status, rating, tags, recommend_to, notes, watched_at, rewatch_count')` (never `select('*')`).
- **Keyset Cursor**: `or=(watched_at.lt.${cursorDate},and(watched_at.eq.${cursorDate},id.lt.${cursorId}))` (or matching cursor for `rating`, `release_year`, `title` with `id.desc` tiebreaker).
- **Display Names**: Use `new Intl.DisplayNames(['en'], { type: 'language' })` and `new Intl.DisplayNames(['en'], { type: 'region' })` on the client to render human-readable names from ISO codes without lookup tables.

### Layer 2: TMDB API v3 & Edge Function (`supabase/functions/tmdb-proxy/index.ts`)
- **Auth**: Verify `Authorization: Bearer <supabase_user_jwt>` so unauthenticated callers cannot consume TMDB quota.
- **TMDB Auth**: `Authorization: Bearer <TMDB_READ_ACCESS_TOKEN>` against `https://api.themoviedb.org/3`.
- **Routes / Actions**:
  1. `GET /tmdb-proxy?action=search&q={title}&year={yyyy}&media_type={movie|series|all}`
     - Calls `GET /3/search/multi` (or `/3/search/movie` / `/3/search/tv`) (`include_adult=false`, `language=en-US`, `page=1`, optional `year`).
     - Returns top 8 matches: `{ tmdb_id, media_type, title, release_year, poster_path }`.
  2. `GET /tmdb-proxy?action=hydrate&tmdb_id={id}&media_type={movie|series}`
     - Calls `GET /3/movie/{id}` or `GET /3/tv/{id}` with `?append_to_response=videos,external_ids&language=en-US`.
     - For `series`, maps `seasons` (excluding season `0` specials unless present) into `series_progress: { seasons: [{ season, episode_count, watched: [] }] }`.
     - Normalizes payload into `public.movies` columns for direct `upsert(...)` on Add Movie and Refresh Metadata:

| Postgres Column | TMDB Field | Fallback / Rule |
| :--- | :--- | :--- |
| `tmdb_id` | `id` | Integer |
| `imdb_id` | `imdb_id` / `external_ids.imdb_id` | String |
| `title` | `title` | String |
| `release_year` | `release_date` | First 4 digits as integer |
| `original_language` | `original_language` | Lowercase ISO 639-1 string (`en`, `bn`, `hi`, `ko`) |
| `origin_countries` | `origin_country` | Fallback to `production_countries.map(c => c.iso_3166_1)` if `origin_country` is empty |
| `genres` | `genres.map(g => g.name)` | String array |
| `poster_path` | `poster_path` | Relative path string |
| `trailer_youtube_key` | `videos.results` | First `site === 'YouTube' && type === 'Trailer'` |

- **Poster URL Construction (Frontend Helper)**:
  - Grid card thumbnail: `https://image.tmdb.org/t/p/w342${poster_path}`
  - Detail drawer poster: `https://image.tmdb.org/t/p/w500${poster_path}`

### Layer 3: Bulk Letterboxd Import (Superseded by In-App Import Drawer)
- The in-app Import Drawer (Section 7) handles Letterboxd CSVs directly via `tmdb-proxy` (`batch_hydrate`). A one-time local CLI runner (`tsx`/`node` with `SUPABASE_SERVICE_ROLE_KEY` + `TMDB_READ_ACCESS_TOKEN`) is optional only for initial bulk migrations >500 rows.

---

## 4. Route & Action Matrix
- `/movies` (`src/routes/(app)/movies/+page.svelte`): Main movies vault (keyset-paginated list/grid, inline filter toolbar, detail drawer, add/edit modal).
- `/functions/v1/tmdb-proxy` (`supabase/functions/tmdb-proxy/index.ts`): Authenticated TMDB search & single-call hydration proxy.

---

## 5. Acceptance Criteria & Invariants
- **RLS Isolation**: `public.movies` enforces `auth.uid() = user_id` for all operations; unauthenticated requests to `tmdb-proxy` are rejected.
- **Keyset Pagination Only**: All list and export queries use keyset cursors with `id desc` tiebreakers—never `OFFSET`/`LIMIT`.
- **Zero-Refetch & Layer Separation**: `.svelte` views → `data.svelte.ts` store → `*-service.ts` (explicit column selects); CUD operations use `.select().single()` and update the store in-place.
- **Tag & URL Normalization**: `handle_movie_before_write()` trigger lowercases, trims, deduplicates `tags[]`, and auto-populates `imdb_url` / `letterboxd_url` when omitted.
- **Token Security & Setup**: `TMDB_READ_ACCESS_TOKEN` is stored as a Supabase Edge Function secret for `supabase/functions/tmdb-proxy/index.ts`; `src/lib/types/database.types.ts` is regenerated after migration.

---

## 6. UI Specification (`/movies`)

### Layout & Viewport Architecture
Full-height (`100dvh`) single-page workspace with `full-bleed` on `.content-wrapper` in `src/routes/(app)/+layout.svelte` and independent column scrolling (`overflow-y: auto` per pane). Top header bar + Center List sub-header strip combined stay within the `~80–90px` vertical budget.

| Breakpoint | Layout Behavior |
| :--- | :--- |
| **Desktop (`>= 1200px`)** | **3-Pane Split**: Left Filter Sidebar (`260px`) + Center List (`minmax(0, 1fr)`) + Right Details Pane (`400px`, shown when a movie is selected or `+ Add` is active; collapses when closed). |
| **Laptop / Tablet (`768px – 1199px`)** | **2-Pane + Slide-Over**: Left Filter Sidebar (`240px`) + Center List (`1fr`). Clicking a movie opens the Right Details Pane as a `400px` right-docked overlay with a `1px` left border. |
| **Mobile (`< 768px`)** | **Single Column + Drawers**: Center List full-width; Filters and Details open as full-screen slide-over sheets. |

### Visual System (Flat 2.0)
- **Page Canvas**: `#FBFAF7`
- **Pane & Card Surfaces**: `#FFFDFA`
- **Muted Pills / Active Tabs / Hover Fill**: `#F4EFE6`
- **Borders**: `1px solid #E5DFD5` (zero drop-shadows, zero gradients)
- **Primary Text / Muted Meta**: `#1C1917` / `#6B655E`
- **Accent (Active Tab / Primary Save)**: `#292524` fill with `#FFFDFA` text

### Pane-by-Pane Component Specification
1. **Top Header Bar** (`height: 52px`, `border-bottom: 1px solid #E5DFD5`):
   - Left: `/movies` + 3 segmented tabs (`Watched`, `Wish List`, `Recommendations`) driven by `get_movie_facets()`.
   - Right: `Copy Link` (copies `window.location.href` with active query params, 2s `"Copied"` state) and `+ Add` (opens Right Pane in Add Movie mode).
2. **Pane 1: Left Filter Sidebar** (`width: 260px`, `border-right: 1px solid #E5DFD5`):
   - Populated once on mount via `get_movie_facets()` + `Intl.DisplayNames`:
   - `Search Title` (250ms debounced `title=ilike.*{q}*`), `Language` checkboxes, `Origin Country` multi-select dropdown, `Genre` checkboxes, `Release Era` radio pills (`All`, `2020s`, `2010s`, `2000s`, `90s`, `Pre-1990`), `Audience` toggle pills, `Personal Rating` select (`Any`, `9.0+`, `8.0+`, `7.0+`, `Unrated`), `Tags` mini filter + clickable top tag pills with counts, and `Reset Filters` button.
3. **Pane 2: Center Movie List** (`flex: 1`, `min-width: 0`):
   - Sub-header strip: removable active filter chips (`×`), total matching count, and Sort dropdown (`Recently Watched`, `Highest Personal Rating`, `Newest Release`, `Title A–Z`).
   - List Row (`min-height: 76px`, `border-bottom: 1px solid #E5DFD5`): `#F4EFE6` + `2px` left accent border when selected; `40×60px` poster (`https://image.tmdb.org/t/p/w185${poster_path}` or `#F4EFE6` fallback); 2-line content (`Title (Year)` + `EN · US · Genres · #tags · For: Audience`); right actions (rating badge + `IMDb` / `LB` buttons with `e.stopPropagation()`).
   - Keyset-paginated (`20` rows/page) with a flat `Load More` button.
4. **Pane 3: Right Details & Edit Pane** (`width: 400px`, `border-left: 1px solid #E5DFD5`):
   - **Closed**: Hidden on desktop until a row is clicked or `+ Add` is triggered.
   - **Details & Edit Mode**: Header (`Title (Year)`, `Language · Origin · Genres`, `[Open IMDb ↗]`, `[Open Letterboxd ↗]`, `[✕]`), `Status` segmented control, `Rating` (`0.5–10.0`, step `0.5`) + `Watched Date`, `Rewatch Count` (`[-] 0 [+]`), `Recommend To` multi-toggle pills, `Tags` chip input with `get_movie_facets().tags` autocomplete, `Notes` auto-growing 3-row textarea, on-demand `[ ▶ Watch Trailer ]` (`youtube-nocookie.com/embed/{key}`), and footer actions (`Delete` two-click confirm, `Refresh TMDB`, `Save` in-place).
   - **Add Movie Mode**: Live `tmdb-proxy?action=search&q=...` returning top 8 matches (`w185` poster, Title, Year); clicking a match calls `hydrate`, inserts into `public.movies`, prepends to Center List, and switches to Details & Edit Mode.

### URL State & Keyboard Ergonomics
- **URL Query Sync**: Syncs active tab, filters, sort, and open movie ID (`/movies?tab=watched&lang=en,ko&era=2010s&tags=thriller&movie=<uuid>`).
- **Keyboard Shortcuts**: `/` focuses Search Title; `Esc` closes the Right Details Pane.

---

## 7. Import & Export Specification (`/movies`)

### UI Integration (Top Header + Right Pane)
- **Top Header**: Adds `[Export ▾]` and `[Import]` alongside `[Copy Link]` and `[+ Add]`.
  - `[Export ▾]`:
    - **Export Filtered View (`.xlsx`)**: Downloads rows matching the currently active tab and left-sidebar filters (e.g., `movies-recommendations-friends-2026-11-21.xlsx`).
    - **Export Filtered View (`.csv`)**: Same filtered query as UTF-8 CSV.
    - **Download Import Template (`.xlsx`)**: Pre-formatted 2-row sample Excel sheet with exact column headers and valid enum values.
  - `[Import]`: Opens the **Right Pane (`400px`)** in **Import Mode** (file dropzone for `.xlsx`, `.xls`, `.csv`, validation summary, live TMDB hydration progress bar, and row-level error report).

### Filtered Export Spec
- **Query**: Runs the active PostgREST filter chain in silent 500-row keyset cursor batches (never `OFFSET`/`LIMIT`), selecting only exportable columns.
- **Client-Side Generation**: Uses **SheetJS (`xlsx`)** (requires adding `xlsx` to `package.json`) with round-trip columns (`title`, `release_year`, `status`, `rating`, `watched_at`, `rewatch_count`, `tags`, `recommend_to`, `language`, `origin_countries`, `genres`, `notes`, `tmdb_id`, `imdb_id`, `imdb_url`, `letterboxd_url`) so exported files are 100% re-importable without re-searching TMDB.

### Excel / CSV Import Spec
- **Supported Formats**:
  1. **Standard `/movies` Template (`.xlsx` / `.csv`)**: Only `title` is required; defaults `status = 'watchlist'`, `rewatch_count = 0`, `tags = []`.
  2. **Letterboxd Auto-Detection**: Detects `Name`, `Year`, `Letterboxd URI`, `Rating` and normalizes (`Rating * 2` to `1.0–10.0`, `Watched Date` / `Date` -> `watched_at` + `status = 'watched'`, `Tags` -> `tags[]`).
- **Client-Side Validation & Normalization**:
  - Trim headers/cells, skip blank rows, coerce enums (`status`, `recommend_to`), clamp/flag `rating` (`0.5–10.0`), parse Excel serial dates (`XLSX.SSF.parse_date_code`) or `YYYY-MM-DD`, deduplicate by `tmdb_id` or `${title.toLowerCase()}::${release_year ?? ''}` (last row wins).
- **Backend Batch Resolution & Upsert Pipeline**:
  1. **Check Existing Vault Rows**: Query `public.movies` for existing `(tmdb_id, title, release_year)` for `auth.uid()`; skip TMDB hydration for matches and update personal fields only (unless *"Overwrite cached TMDB metadata"* is checked).
  2. **Batch Hydrate (`POST /functions/v1/tmdb-proxy` `action: "batch_hydrate"`)**: Accepts up to 25 items/batch; uses `GET /3/movie/{tmdb_id}?append_to_response=videos,external_ids` directly if `tmdb_id` is present, else `/3/search/movie` + hydrate, paced at concurrency `10`. Returns `{ resolved, unresolved }`.
  3. **Chunked Upsert**: Upserts resolved rows in chunks of 50 with `{ onConflict: 'user_id,tmdb_id' }`; `trg_movies_before_write` normalizes `tags[]` and auto-fills `imdb_url` / `letterboxd_url`.
- **Post-Import Ergonomics**:
  - **Download Unmatched Rows (`.xlsx`)**: Generates a downloadable `.xlsx` of failed rows with an `error_reason` column for quick fix & re-upload.
  - **Live Store Sync**: Re-runs `get_movie_facets()` and refreshes the Center List immediately.
