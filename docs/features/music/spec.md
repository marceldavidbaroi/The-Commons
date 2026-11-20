# Music — Feature Specification

## 1. User Goal & UX

A single-table personal music catalog and queue-driven YouTube player. Playlists are replaced by dynamic attribute filtering (`language`, `genre`, `version`, `vibe`, `energy`, `rating`).

- **Primary Flow:**
  1. **Add Song:** Paste any YouTube URL (`watch?v=`, `youtu.be/`, `music.youtube.com`) to extract the 11-character `youtube_id`. If `youtube_id` already exists for the user, open it in edit mode instead of creating a duplicate.
  2. **Browse & Filter:** Filter songs by `language`, `genre`, `version`, `vibe`, `energy`, or `rating` using a single inline toolbar.
  3. **Smart Shuffle:** Click **Shuffle All** or **Filtered Shuffle** to fetch a weighted, cooldown-filtered queue from Postgres (`rating * random()`).
  4. **Play:** Stream via an embedded YouTube IFrame Player (`>= 200px × 200px`, never `display: none`) or open up to 50 queued tracks in YouTube's native `watch_videos` player.
  5. **Auto-Advance & Link Health:** On track end, advance immediately and call `record_song_play`. On video error, skip to the next track and mark `is_active = false` while preserving `title` and `artist` for later replacement.
  6. **Export:** One-click `.json` or `.csv` export of the user's catalog.

---

## 2. Data & Schema (`public.songs`)

### SQL Migration Draft

```sql
-- ==========================================
-- 1. SINGLE TABLE & INDEXES
-- ==========================================
create extension if not exists pg_trgm;

create table public.songs (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  artist text,

  -- Playback & Link Health
  youtube_id text not null,
  is_active boolean not null default true,
  needs_attention boolean not null default false,

  -- Filterable Classification & Taste
  language text not null default 'bangla',
  version text not null default 'original',
  genre text not null default 'pop',
  vibe text[] not null default '{}',
  energy smallint not null default 3 check (energy between 1 and 5),
  rating smallint not null default 3 check (rating between 1 and 5),

  -- Anti-Repeat Telemetry
  play_count int not null default 0,
  last_played timestamptz,
  created_at timestamptz not null default now(),

  unique (user_id, youtube_id)
);

create index idx_songs_vibe on public.songs using gin (vibe);
create index idx_songs_queue on public.songs (user_id, is_active, language, genre, version, energy, last_played);
create index idx_songs_cursor on public.songs (user_id, created_at desc, id desc);
create index idx_songs_needs_attention on public.songs (user_id, created_at desc, id desc) where needs_attention = true;
create index idx_songs_title_trgm on public.songs using gin (title gin_trgm_ops);
create index idx_songs_artist_trgm on public.songs using gin (artist gin_trgm_ops);

-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table public.songs enable row level security;

create policy "Users can view their own songs"
  on public.songs for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own songs"
  on public.songs for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own songs"
  on public.songs for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own songs"
  on public.songs for delete to authenticated
  using (auth.uid() = user_id);

-- ==========================================
-- 3. UNIFIED SHUFFLE & FILTER RPC
-- ==========================================
create or replace function public.get_shuffled_queue(
  p_language text default null,
  p_genre text default null,
  p_version text default null,
  p_vibe text default null,
  p_min_energy smallint default null,
  p_max_energy smallint default null,
  p_min_rating smallint default null,
  p_exclude_hours int default 12,
  p_limit int default 30
)
returns table (
  id bigint,
  title text,
  artist text,
  youtube_id text,
  language text,
  version text,
  genre text,
  vibe text[],
  energy smallint,
  rating smallint,
  play_count int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    s.id,
    s.title,
    s.artist,
    s.youtube_id,
    s.language,
    s.version,
    s.genre,
    s.vibe,
    s.energy,
    s.rating,
    s.play_count
  from public.songs s
  where s.user_id = auth.uid()
    and s.is_active = true
    and (p_language is null or s.language = p_language)
    and (p_genre is null or s.genre = p_genre)
    and (p_version is null or s.version = p_version)
    and (p_vibe is null or p_vibe = any(s.vibe))
    and (p_min_energy is null or s.energy >= p_min_energy)
    and (p_max_energy is null or s.energy <= p_max_energy)
    and (p_min_rating is null or s.rating >= p_min_rating)
    and (
      s.last_played is null
      or s.last_played < now() - make_interval(hours => p_exclude_hours)
    )
  order by (s.rating * random()) desc
  limit p_limit;
$$;

-- ==========================================
-- 4. ATOMIC PLAY TELEMETRY RPC
-- ==========================================
create or replace function public.record_song_play(p_song_id bigint)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.songs
  set
    play_count = play_count + 1,
    last_played = now()
  where id = p_song_id
    and user_id = auth.uid();
$$;
```

---

## 3. Route & Layer Matrix

| Layer | File | Responsibility |
| --- | --- | --- |
| **Route / View** | `src/routes/(app)/music/+page.svelte` | Catalog list, inline filter toolbar, add/edit modal, YouTube IFrame player, export trigger |
| **Store** | `src/lib/stores/music.svelte.ts` | In-memory song list, active queue, current track index, optimistic CUD updates |
| **Service** | `src/lib/services/music-service.ts` | Pure async Supabase calls (`fetchSongs`, `upsertSong`, `deleteSong`, `getShuffledQueue`, `recordSongPlay`, `markSongInactive`) |
| **Types** | `src/lib/types/database.types.ts` | Auto-generated via `supabase gen types typescript` (`Tables<'songs'>`) |
| **Database** | `supabase/migrations/<timestamp>_create_songs.sql` | `public.songs` table, indexes, RLS policies, `get_shuffled_queue`, `record_song_play` |

---

## 4. Acceptance Criteria & Invariants

- **User Isolation (RLS):** Every query and RPC is scoped to `auth.uid() = user_id`; `(user_id, youtube_id)` is unique per user.
- **No Refetch on CUD:** Inserts, updates, and deletes use `.select().single()` and update the Svelte store in-place.
- **Cooldown Auto-Fallback:** If `get_shuffled_queue` returns `0` rows with `p_exclude_hours = 12`, the client automatically retries with `p_exclude_hours = 0`.
- **Infinite Queue Refill:** When fewer than 3 tracks remain in the local queue, fetch `get_shuffled_queue` and append non-duplicate tracks.
- **Atomic Play Count:** Track completions call `record_song_play(p_song_id)` rather than computing `play_count + 1` on the client.

---

## 5. UI & Frontend Architecture (v2)

### Visual System & Layout Philosophy

- **Design Language:** Flat 2.0 with crisp `1px` borders, subtle surface elevation (no heavy drop shadows or `backdrop-blur-*` effects), high-contrast typography, and the app's existing theme tokens.
- **No Module Outer Padding:** `.content-wrapper` in `src/routes/(app)/+layout.svelte` controls outer page padding; `/music` must not add its own outer padding or vertical margin.
- **Strict Layer Separation:** `.svelte` views never import Supabase directly; all queries and RPCs live in `src/lib/services/music-service.ts` and state/optimistic CUD updates live in `src/lib/stores/music.svelte.ts`.
- **Zero Modal Dialogs:** Adding a single song, editing an existing row, and importing/exporting Excel spreadsheets all happen inside **collapsible inline workspace drawers** directly beneath the top header—never blocking modals.
- **Single-Viewport Workspace:** Desktop uses a **2-column split** (Left: Filter & Queue Controls + Embedded Player; Right: Cursor-paginated Song Catalog) anchored by a **persistent bottom player bar**.

### Page Structure & Wireframe Map

```text
+-----------------------------------------------------------------------------------+
| HEADER: /music | [ Search... ] | [ + Add Song ] [ ↑ Import Excel ] [ ↓ Export ] |
+-----------------------------------------------------------------------------------+
| [ COLLAPSIBLE INLINE DRAWER — opens when "+ Add Song" or "Import Excel" clicked ]  |
|  Mode A (Add/Edit): URL -> ID | Title | Artist | Lang | Genre | Ver | Vibe | ⚡ | ★ |
|  Mode B (Excel):    [ Download .xlsx Template ]  [ Drop .xlsx/.csv ] -> Preview   |
+------------------------------------+----------------------------------------------+
| LEFT RAIL (340px, sticky)          | MAIN CATALOG (Fluid width)                   |
|                                    |                                              |
| [1. FILTER & PLAYBACK LAUNCHER]    | Active Filter Chips: [Bangla ×] [Coding ×]   |
|  - Language: [All|Bangla|Hindi|..] | Showing 20 loaded tracks                     |
|  - Genre:    [All|Electronic|...]  |                                              |
|  - Version:  [All|Original|Lofi..] | +------------------------------------------+ |
|  - Vibe:     [coding] [drive] [..] | | ▶ | Jhumka               | Bangla · EDM  | |
|  - Energy:   [1] [2] [3] [4] [5]   | |   | Xefer x Muza         | ⚡4 ★5 · 12x  | |
|  - Min ★:    [Any] [3+] [4+] [5]   | +------------------------------------------+ |
|                                    | | ▶ | Beni Khuley          | Bangla · EDM  | |
|  [ ▶ Play Serial ]  [ 🔀 Shuffle ]  | |   | Muza, Habib, Fuad    | ⚡4 ★4 · 8x   | |
|  [ ↗ Open Queue in YouTube ]       | +------------------------------------------+ |
|                                    | | ... (20 items per cursor batch)          | |
| [2. EMBEDDED YOUTUBE STAGE]        | +------------------------------------------+ |
|  +------------------------------+  |                                              |
|  |  YouTube IFrame (308×173px)  |  |        [ Load More (20) ]  (Cursor-based)    |
|  +------------------------------+  |                                              |
|  Up Next (3):                      |                                              |
|   1. Beni Khuley - Muza            |                                              |
|   2. Dhulabali - Ashes             |                                              |
+------------------------------------+----------------------------------------------+
| STICKY BOTTOM PLAYER BAR (72px height)                                            |
| [Thumb] Track Title • Artist [Lang][Genre][⚡4]  |  [⏮][⏯][⏭][🔁]  01:42 / 03:18 |
|         [ ↗ Open on YouTube ]                    |  [────────●────────────]       |
+-----------------------------------------------------------------------------------+
```

### A. Top Header Bar (`56px` height, `1px` bottom border)

- **Route Title:** `/music`
- **Quick Search Input:** Debounced (`300ms`) text search matching `title` or `artist` (`ilike`).
- **Toolbar Actions (Right-Aligned):**
  1. **`+ Add Song` (Primary Accent Button):** Toggles the inline **Single Song Add/Edit Drawer**.
  2. **`↑ Import Excel` (Secondary Outline Button):** Toggles the inline **Bulk Excel Import Drawer**.
  3. **`↓ Export Excel` (Secondary Outline Button):** Triggers immediate `.xlsx` download of the catalog (with optional `.csv` dropdown choice).

### B. Inline Action Drawers (Collapsible, `1px` bottom border)

Only one drawer is open at a time directly below the header; pressing `Esc` or clicking `Cancel` collapses it smoothly.

#### Drawer Mode 1: Add / Edit Song Form (with Quick Add)

- **Quick Add Mode (Fast Entry):**
  - Requires only **YouTube URL / ID** and **Title** (**Artist** is optional).
  - Pressing `Enter` or clicking **`Quick Add`** saves immediately with `needs_attention = true` (using schema defaults for `language`, `genre`, `version`, `energy`, `rating`), prepends to the catalog store, and resets the inputs for rapid consecutive entry.
- **Full Form / Edit Mode:**
  - **Row 1 — Link & Identity:**
    - **YouTube URL / ID Input (Auto-Focused):** Accepts full YouTube URLs (`watch?v=`, `youtu.be/`, `music.youtube.com/watch?v=`) or raw 11-char IDs. Automatically extracts `youtube_id` on paste/blur and displays a live `120×68px` thumbnail preview + duplicate check warning if the ID already exists in Supabase.
    - **Title Input (Required):** Clean song title.
    - **Artist Input (Optional on Quick Add):** Singer, band, or collaboration string (e.g., `"Xefer x Muza"`).
  - **Row 2 — Classification & Taste Controls:**
    - **Language Select:** `bangla` (default), `hindi`, `punjabi`, `english`, `instrumental`.
    - **Genre Select:** `pop` (default), `electronic`, `folk`, `rock`, `bollywood`, `lofi`, `classic`.
    - **Version Select:** `original` (default), `lofi`, `remix`, `mashup`, `cover`, `live`.
    - **Vibe Tag Picker:** Clickable multi-select chips (`coding`, `drive`, `late_night`, `nostalgic`, `workout`, `chill`, `romantic`) + freeform tag input (`Enter` to add custom chip).
    - **Energy (`1–5`) & Rating (`1–5`):** Compact segmented `1–5` pill selectors.
  - **Row 3 — Submit Actions:**
    - **`Save Song`** (inserts/updates in Supabase, clears `needs_attention = false` when full details are saved, updates the local catalog store without re-fetching) · **`Save & Play Next`** · **`Cancel`**.

#### Drawer Mode 2: Excel Bulk Import (`.xlsx` / `.csv`)

Powered client-side using **SheetJS (`xlsx`)** so files parse instantly in the browser before hitting Supabase:

- **Step 1 — Template & File Dropzone:**
  - **`Download Sample .xlsx Template`** link generating a pre-formatted workbook with exact headers and 2 example rows (`Jhumka`, `Dhulabali`).
  - **Drag-and-Drop / File Picker** accepting `.xlsx`, `.xls`, and `.csv`.
- **Step 2 — Expected Spreadsheet Columns:**

| Excel Column Header | Required | Accepted Format / Example | Default if Blank |
| --- | --- | --- | --- |
| `title` | **Yes** | `Jhumka` | *(Row skipped if empty)* |
| `artist` | **Yes** | `Xefer x Muza` | *(Row skipped if empty)* |
| `youtube_url` or `youtube_id` | **Yes** | Full YouTube URL or 11-char ID | *(Row flagged invalid)* |
| `language` | No | `bangla`, `hindi`, `punjabi`, `english` | `bangla` |
| `genre` | No | `electronic`, `folk`, `rock`, `pop`, `bollywood`, `lofi` | `pop` |
| `version` | No | `original`, `lofi`, `remix`, `mashup`, `cover`, `live` | `original` |
| `vibe` | No | Comma-separated string: `party, drive` | `{}` |
| `energy` | No | Integer `1` to `5` | `3` |
| `rating` | No | Integer `1` to `5` | `3` |

- **Step 3 — Validation Preview Table & Insert:**
  - Displays parsed row counts: **`Valid: 28`** · **`Duplicates (Skipped): 3`** · **`Invalid/Missing ID: 1`** (highlighted in amber/red with inline reason).
  - **`Import Valid Rows`** inserts only non-duplicate valid rows in chunks of 100 (`ignoreDuplicates: true` on `(user_id, youtube_id)`), skips any uniqueness violations without modifying existing records, prepends newly inserted rows to the store, and lists skipped/duplicate rows in the completion report.

### C. Excel Export Behavior (`↓ Export Excel`)

- **Scope & Unpaginated Fetch:** Exports all songs matching the currently active filters (or all songs when no filters are active) in a single unpaginated query via `music-service.ts`—never limited to the currently loaded cursor pages.
- **Generated Workbook (`music-YYYY-MM-DD.xlsx`):**
  - Contains clean human-readable columns: `title`, `artist`, `youtube_id`, `youtube_url` (`https://www.youtube.com/watch?v={youtube_id}`), `language`, `genre`, `version`, `vibe` (joined with `", "`), `energy`, `rating`, `play_count`, `is_active`, `last_played`, `created_at`.
  - Formatted with auto-fitted column widths so the exported file doubles as both an offline spreadsheet backup and a valid re-import file.

### D. Left Rail: Filter & Queue Launcher (`340px` sticky on desktop)

#### 1. Filter Controls

- **Language:** Single-select segmented pills (`All`, `Bangla`, `Hindi`, `Punjabi`, `English`, `Instrumental`).
- **Genre:** Single-select pill wrap (`All`, `Electronic`, `Folk`, `Rock`, `Pop`, `Bollywood`, `Lo-Fi`, `Classic`).
- **Version:** Single-select pill wrap (`All`, `Original`, `Lo-Fi`, `Remix`, `Mashup`, `Cover`, `Live`).
- **Vibe:** Multi-select toggle chips (`coding`, `drive`, `late_night`, `nostalgic`, `workout`, `chill`, `romantic`).
- **Energy Range:** `1` to `5` clickable intensity blocks.
- **Minimum Rating:** Quick star filter (`Any`, `3★+`, `4★+`, `5★`).
- **Needs Attention:** Toggle pill to isolate tracks with `needs_attention = true` for batch tagging/cleanup.
- **Reset Filters:** Appears whenever any filter is active.

#### 2. Playback Launch Actions (Applies to Active Filter or Full Library)

- **`▶ Play Serial` (Primary Outline Button):** Fetches matching active songs ordered deterministically (`created_at DESC`) and plays sequentially from index `0`.
- **`🔀 Shuffle` (Primary Solid Accent Button):** Calls `musicService.getShuffledQueue(activeFilters)` (which invokes `get_shuffled_queue`, weighted by `rating * random()` with a 12-hour `last_played` cooldown; auto-falls back to `p_exclude_hours: 0` if all matching tracks were recently played). Acts as **"Shuffle All"** when no filters are selected.
- **`↗ Open Queue in YouTube` (Secondary Subtle Link):** Opens `https://www.youtube.com/watch_videos?video_ids=...` in a new tab (up to 50 tracks) for native YouTube playback.

#### 3. Embedded YouTube Stage & Mini "Up Next"

- **IFrame Container:** `308px × 173px` (`16:9`, strictly `>= 200px` dimension rule so YouTube IFrame API playback never throttles).
- **Up Next Peek:** Shows the next 3 tracks in the active queue with click-to-jump and remove (`×`).

### E. Main Catalog: Song List & Cursor Pagination

#### 1. Standardized List & Row Anatomy (`38px–52px` compact row height, `py-2 px-3`)

Built with `@/components/ui/list` (`<List>`, `<ListItem variant="interactive">`, `<ListPrefix>`, `<ListContent>`, `<ListText>`, `<ListDescription>`, `<ListSuffix>`, and `<ListEmpty>`):

1. **Play Trigger / Active Indicator:** Hover reveals `▶`; active playing track highlights with a left accent bar and animated equalizer icon.
2. **Track Identity:**
   - Line 1: **Title** (`font-medium`) + subtle version badge when not `original` (e.g., `[Lo-Fi]`, `[Remix]`).
   - Line 2: **Artist** (`text-muted`) + `vibe` tags rendered inline (`#coding #late_night`).
3. **Classification & Telemetry (Right-Aligned):**
   - Pills: `Language` · `Genre`
   - Metrics: `⚡4` (Energy), `★5` (Rating), `12 plays`
4. **Row Quick Actions (Hover on desktop / visible on mobile):**
   - **Queue Next:** Inserts song immediately after current track.
   - **Open on YouTube (`↗`):** Direct external link (`https://www.youtube.com/watch?v={youtube_id}`).
   - **Edit:** Opens the inline Add/Edit drawer pre-filled with this row (also lets you swap a dead `youtube_id` and re-enable `is_active`).

#### 2. Cursor-Based Pagination (`batch_size = 20`)

- Uses keyset cursor pagination on `(created_at, id)` inside `music-service.ts`—never `OFFSET`:

```ts
let query = supabase
  .from('songs')
  .select('id, title, artist, youtube_id, is_active, needs_attention, language, version, genre, vibe, energy, rating, play_count, last_played, created_at')
  .order('created_at', { ascending: false })
  .order('id', { ascending: false })
  .limit(20);

if (cursor) {
  query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
}
```

- **Load More Footer:** Displays `"Showing {loadedCount} songs"` and a **`Load More`** button. All edits, rating tweaks, and play-count increments mutate the client store in place without re-fetching pages.

### F. Sticky Bottom Player Bar (`72px` height, `1px` top border, solid surface—no `backdrop-blur`)

Pinned across the bottom of `/music` whenever a queue is active:

- **Left Zone — Now Playing & Direct YouTube Link:**
  - **Thumbnail:** `48px × 48px` square crop (`https://i.ytimg.com/vi/{youtube_id}/mqdefault.jpg`).
  - **Track Info:** **Title** + clickable **`↗ Open on YouTube`** link (`https://www.youtube.com/watch?v={youtube_id}`, `target="_blank"`), plus **Artist** and compact badges: `[Language]` `[Genre]` `[Version]` `[⚡ Energy]` `[★ Rating]`.
- **Center Zone — Transport & Duration Scrubber:**
  - **Controls:** `⏮ Previous` · `⏯ Play / Pause` (Spacebar shortcut) · `⏭ Next` · `🔁 Mode` (`Serial` vs `Shuffle`).
  - **Live Time & Seek Bar:** Polls `player.getCurrentTime()` and `player.getDuration()` every `500ms`, rendering **`01:42 / 03:18`** alongside a clickable seek bar (`player.seekTo(seconds, true)`).
- **Right Zone — Quick Telemetry & Link Health:**
  - **Inline Star Rating (`1–5★`):** Updates `rating` in Supabase + local store immediately.
  - **Volume / Mute Toggle.**
  - **Dead-Link Flag (`⚠`):** One-click marks `is_active = false` and skips to the next song if YouTube blocks or mutes the video.
