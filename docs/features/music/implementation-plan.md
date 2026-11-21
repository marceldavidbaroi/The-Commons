# Music — Implementation Plan

Reference: [spec.md](./spec.md)

## Phase 1: Database & Type Generation
1. **Create Migration (`supabase/migrations/<timestamp>_create_songs.sql`):**
   - Enable `pg_trgm` extension.
   - Create `public.songs` table with `unique (user_id, youtube_id)`.
   - Add composite & GIN indexes (`idx_songs_vibe`, `idx_songs_queue`, `idx_songs_cursor`, `idx_songs_needs_attention`, `idx_songs_title_trgm`, `idx_songs_artist_trgm`).
   - Enable RLS on `public.songs` with `select`, `insert`, `update`, and `delete` policies scoped to `auth.uid() = user_id`.
   - Create `public.get_shuffled_queue(...)` and `public.record_song_play(p_song_id)` RPCs (`security invoker`, `set search_path = public`).
2. **Apply & Generate Types:**
   - Apply the migration to Supabase.
   - Regenerate `src/lib/types/database.types.ts` via `supabase gen types typescript`.

---

## Phase 2: Service, Utilities & Store Layers
1. **Service Layer (`src/lib/services/music-service.ts`):**
   - Pure async Supabase functions with explicit column selection (no `select('*')`):
     - `fetchSongs(filters, cursor)` — keyset cursor pagination on `(created_at, id)` with `limit(20)` and `ilike` search on `title`/`artist`.
     - `fetchAllFilteredSongs(filters)` — unpaginated fetch for Excel/CSV export.
     - `findSongByYoutubeId(youtubeId)` — duplicate check before insert.
     - `upsertSong(payload)` / `deleteSong(id)` — using `.select().single()`.
     - `bulkInsertSongs(rows)` — chunked inserts (`100` rows) with `ignoreDuplicates: true`.
     - `getShuffledQueue(filters)` — calls `get_shuffled_queue` with `p_exclude_hours = 12`, auto-falling back to `p_exclude_hours = 0` if `0` rows are returned.
     - `recordSongPlay(songId)` — calls `record_song_play`.
     - `markSongInactive(songId)` — sets `is_active = false`.
2. **YouTube & Spreadsheet Utilities (`src/lib/utils/music.ts`):**
   - `extractYoutubeId(input)` supporting `watch?v=`, `youtu.be/`, `music.youtube.com`, and raw 11-char IDs.
   - SheetJS (`xlsx`) helpers for sample template generation, `.xlsx`/`.csv` parsing + row validation, and catalog export (`music-YYYY-MM-DD.xlsx`).
3. **Store Layer (`src/lib/stores/music.svelte.ts`):**
   - Svelte 5 runes store managing `songs`, `cursor`, `hasMore`, `filters`, `queue`, `currentIndex`, `playMode` (`serial` | `shuffle`), and drawer state.
   - In-place CUD updates (prepend on insert, `.map()` on update, `.filter()` on delete — zero refetch).
   - Queue management: `playSerial`, `playShuffled`, `queueNext`, `jumpTo`, `removeFromQueue`, and infinite queue refill when `< 3` tracks remain.

---

## Phase 3: Route Shell, Catalog & Inline Filters
1. **Route (`src/routes/(app)/music/+page.svelte`):**
   - Respect `.content-wrapper` (no module-level outer padding) and Flat 2.0 styling (no `backdrop-blur-*`).
   - **Top Header (`56px`):** `/music` title, debounced (`300ms`) search input, `+ Add Song`, `↑ Import Excel`, `↓ Export Excel`.
   - **2-Column Split Layout:**
     - **Left Rail (`340px` sticky):** Filter controls (`Language`, `Genre`, `Version`, `Vibe`, `Energy`, `Min ★`, `Needs Attention`, `Reset Filters`) + Playback Launchers (`▶ Play Serial`, `🔀 Shuffle`, `↗ Open Queue in YouTube`).
     - **Main Catalog:** Built with `@/components/ui/list` (`38px–52px` compact rows), active track indicator, inline quick actions (`Queue Next`, `Open on YouTube`, `Edit`), and cursor-based `Load More` footer.

---

## Phase 4: Inline Action Drawers (Add/Edit & Excel Import/Export)
1. **Single Song Add/Edit Drawer (`src/routes/(app)/music/_components/SongFormDrawer.svelte`):**
   - Collapsible inline drawer directly below the header (`Esc` / `Cancel` to close).
   - **Quick Add Mode:** YouTube URL/ID + Title (`Enter` saves immediately with `needs_attention = true` and resets inputs).
   - **Full / Edit Mode:** Auto-extracted `youtube_id` with `120×68px` thumbnail preview, duplicate check (switches to edit mode if ID exists), classification selects, vibe tag chips + custom input, `1–5` energy/rating pills, and `Save Song` / `Save & Play Next`.
2. **Excel Bulk Import Drawer (`src/routes/(app)/music/_components/ExcelImportDrawer.svelte`):**
   - `Download Sample .xlsx Template` button + drag-and-drop `.xlsx`/`.xls`/`.csv` parser.
   - Validation preview table showing `Valid`, `Duplicates (Skipped)`, and `Invalid/Missing ID` counts, plus chunked `Import Valid Rows`.
3. **Export Action:**
   - Wire `↓ Export Excel` to `fetchAllFilteredSongs` + SheetJS workbook download.

---

## Phase 5: YouTube IFrame Player & Sticky Bottom Bar
1. **Embedded YouTube Stage (`src/routes/(app)/music/_components/YouTubeStage.svelte`):**
   - Load YouTube IFrame API; render `308px × 173px` container (`>= 200px` rule, never `display: none`).
   - Handle `onStateChange` (auto-advance on `ENDED` + call `recordSongPlay`) and `onError` (call `markSongInactive` + skip to next track).
   - Mini **Up Next (3)** list with click-to-jump and remove (`×`).
2. **Sticky Bottom Player Bar (`src/routes/(app)/music/_components/PlayerBar.svelte`):**
   - `72px` height, `1px` top border, solid surface.
   - Left: `48×48px` thumbnail, title, `↗ Open on YouTube`, artist, and attribute badges.
   - Center: `⏮` / `⏯` (Spacebar shortcut) / `⏭` / `🔁` controls + `500ms` polled time & clickable seek bar.
   - Right: Inline `1–5★` rating updater, volume/mute toggle, and `⚠` dead-link flag.

---

## Phase 6: Verification
- Run `npm run check` (`svelte-check`) and verify zero TypeScript/Svelte errors.
- Verify RLS isolation, duplicate `youtube_id` handling, cursor pagination, cooldown fallback (`12h` → `0h`), YouTube error auto-skip, and Excel round-trip import/export.
