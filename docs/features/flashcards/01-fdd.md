# Functional Design Document (FDD): SvelteKit Frontend for Core Spaced Repetition Engine

> [!NOTE]
> Living functional design document for the SvelteKit frontend of the Spaced Repetition / Flashcard engine in The Commons. Automatically rendered at `/dev/document`.

---

## 1. System Vision & Architecture

This document defines the functional blueprint for the flashcards frontend application in **The Commons**, built with **SvelteKit** and **Svelte 5 runes** (`$state`, `$derived`, `$props`), conforming directly to the project's design system rules (anti-layer-cake vertical budget, standard list primitives, no blur effects).

Key functional pillars:
* **Zero-Latency Study Canvas:** Optimistic local state transitions for card reviews with background queue syncing (`submit_card_review`).
* **Compact 2-Tier Header:** Anti-layer-cake information density (~80–90px total height) with integrated filter pills and inline search.
* **Unified Design Tokens:** Pure solid/alpha backgrounds, hardware-accelerated shadows, and zero `backdrop-filter: blur()` to guarantee smooth 60–120 FPS.
* **Plain Language & Natural Copy:** Clean terminology ("Decks", "Flashcards", "Card Types", "Review") with no fantasy or esoteric jargon.

---

## 2. Application Map & Route Matrix

| Route / Surface | Modality | Primary Functional Role | Auth Required |
| :--- | :--- | :--- | :--- |
| **`/flashcards`** | Full Page | Flashcard Hub: compact 2-tier header, deck list, card type schemas, and today's due queue | Yes |
| **`Deck Modal`** | Accessible Dialog | In-place modal for creating and configuring decks (nested `parent_id`, daily quotas, leech threshold) | Yes |
| **`/flashcards/[deckId]/study`** | Fullscreen Player | Zero-latency review session with keyboard shortcuts (`Space`, `1`, `2`, `3`, `4`) and prospective interval pills | Yes |
| **`/flashcards/notes/new`** | Compact Page | Schema-driven dynamic note creator with automatic card generation previews | Yes |
| **`/flashcards/card-types/new`** | Compact Page | Dynamic schema builder for defining custom fields and bidirectional generation rules | Yes |
| **`Card Preview Drawer`** | Slide-Over Sheet | Inspect individual card SRS states, field renders, and historical immutable review logs | Yes |

---

## 3. Page 1: Flashcards Hub (`/flashcards`)

The flashcards hub implements The Commons' strict **2-Tier Vertical Budget**:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Page Title ("Flashcards") + Count Badge [3 Decks]  [+ New Deck]│
├────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Inline Search + Tabs [Decks (3) | Card Types (2) | Due Today (14)] │
├────────────────────────────────────────────────────────────────────────┤
│ Content Area: Compact List View (38–52px row height, 8–12 items visible) │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Tier 1: Header & Primary Action (~40–44px)
- Left: Title `Flashcards` with an embedded count badge (`3 decks`, `14 due today`).
- Right: Primary CTA button `+ New Deck` (opens Deck Creation Modal) and secondary action `+ Add Card` (navigates to `/flashcards/notes/new`).

### 3.2 Tier 2: Unified Interactive Toolbar (~36–40px)
- Integrated horizontal toolbar:
  - Inline search bar (`ListFilterSearch`) with debounced querying.
  - Filter tabs (`ListFilterGroup`): `Decks (3)`, `Card Types (2)`, `Due Today (14)`.
  - Item tally (`ListFilterCount`).
- Never stacked on separate rows (Anti-layer-cake rule).

### 3.3 List Content Views (Swapped via Active Tab)
All list rows use standard compact list styling (`py-2 px-3` to `py-2.5 px-3.5`, 38–52px row height):
1. **Decks Tab:**
   - Prefix: Deck icon & hierarchy indentation guide (for subdecks).
   - Content: Deck Name, daily quota pills (`20 new`, `200 rev`).
   - Suffix: Due counter (`8 due`) and action button `Study Now`.
2. **Card Types Tab:**
   - Prefix: Template schema badge.
   - Content: Type name (e.g., "Foreign Vocab", "Code Snippet"), field count (`4 fields`), bidirectional indicator (`Bidirectional`).
   - Suffix: `Edit Schema` action button.
3. **Due Today Tab:**
   - Itemized list of cards due for review today.
   - Content: Front prompt preview, target deck name, queue badge (New, Learning, Review).
   - Suffix: Click opens the Slide-Over Card Preview Drawer.

---

## 4. Modal: Deck Creation & Configuration Dialog

A compact dialog modal conforming to The Commons modal standards:

```
┌──────────────────────────────────────────────────────────────────┐
│  Create New Deck                                            [×]  │
├──────────────────────────────────────────────────────────────────┤
│  Deck Name: [ Computer Science                                 ] │
│  Parent Deck: [ None (Root Deck)                             ▼ ] │
│  Description: [ Core algorithms, data structures, and theory   ] │
│                                                                  │
│  Daily Scheduling Limits                                         │
│  ┌──────────────────────────────┬──────────────────────────────┐ │
│  │ New Cards / Day: [ 20      ] │ Max Reviews / Day: [ 200   ] │ │
│  └──────────────────────────────┴──────────────────────────────┘ │
│                                                                  │
│  Advanced Parameters                                             │
│  ┌──────────────────────────────┬──────────────────────────────┐ │
│  │ Learning Steps (min): [ 1, 10 ] │ Leech Threshold: [ 8    ] │ │
│  └──────────────────────────────┴──────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│  [ Cancel ]                                  [ Create Deck ]     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Page 2: Schema-Driven Card Note Creation (`/flashcards/notes/new`)

Eliminates hardcoded input forms by dynamically rendering input fields from `card_types.fields_schema`.

```
┌──────────────────────────────────────────────────────────────────┐
│  Create Flashcard Note                                           │
├──────────────────────────────────────────────────────────────────┤
│  Target Deck: [ Computer Science                             ▼ ] │
│  Card Type:   [ Code Implementation (+Reverse)               ▼ ] │
│                                                                  │
│  Dynamic Schema Fields                                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Prompt (Question / Function Goal)                           │ │
│  │ [ Write a debounce utility function                       ] │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Implementation (Answer / Code Body)                         │ │
│  │ [ function debounce(fn, ms) { ... }                       ] │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Edge Cases / Notes                                          │ │
│  │ [ Immediate execution flag, trailing cancel support       ] │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Tags: [ javascript × ] [ utility × ] [ + add tag ]              │
│                                                                  │
│  ℹ Reverse Enabled: This note will generate 2 cards:             │
│    • Card 0: Prompt ──► Implementation                           │
│    • Card 1: Implementation ──► Prompt                           │
├──────────────────────────────────────────────────────────────────┤
│  [ Save and Add Another ]                        [ Save Note ]   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Page 3: Card Type Schema Builder (`/flashcards/card-types/new`)

Enables users to construct custom flashcard schemas with arbitrary field structures without writing database migrations.

```
┌──────────────────────────────────────────────────────────────────┐
│  Define New Card Type                                            │
├──────────────────────────────────────────────────────────────────┤
│  Schema Name: [ Foreign Language Vocabulary                  ]   │
│                                                                  │
│  Field Definitions                                               │
│  ┌──┬──────────────────────┬──────────────────────┬────────────┐ │
│  │# │ Field Key (System)   │ Display Label (UI)   │ Actions    │ │
│  ├──┼──────────────────────┼──────────────────────┼────────────┤ │
│  │1 │ word                 │ Foreign Word         │ [Drag] [×] │ │
│  │2 │ definition           │ Native Translation   │ [Drag] [×] │ │
│  │3 │ example_sentence     │ Usage Example        │ [Drag] [×] │ │
│  │4 │ audio_url            │ Pronunciation Asset  │ [Drag] [×] │ │
│  └──┴──────────────────────┴──────────────────────┴────────────┘ │
│  [ + Add Schema Field ]                                          │
│                                                                  │
│  Card Generation Orientation                                     │
│  [✓] Enable Reverse Card Generation                              │
│      Generates Card #0 (Field 1 ──► Field 2) and                 │
│      Card #1 (Field 2 ──► Field 1) automatically.                │
├──────────────────────────────────────────────────────────────────┤
│  [ Cancel ]                                  [ Save Schema ]     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Page 4: Fullscreen Flashcard Study Player (`/flashcards/[deckId]/study`)

A distraction-free, low-latency review interface designed around muscle-memory keyboard execution with zero layout shift.

```
┌──────────────────────────────────────────────────────────────────┐
│  [← Exit]   Deck: Computer Science      New: 4 | Learn: 2 | Due: 8│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ PROMPT                                                     │  │
│  │                                                            │  │
│  │ What is the time complexity of looking up a key in a       │  │
│  │ balanced Binary Search Tree (BST)?                         │  │
│  │                                                            │  │
│  │────────────────────────────────────────────────────────────│  │
│  │ (Hidden until user presses Space or clicks Reveal)         │  │
│  │                                                            │  │
│  │ ANSWER                                                     │  │
│  │ O(log n) average and worst-case for balanced trees         │  │
│  │ (e.g., Red-Black or AVL).                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Rating Action Bar                                               │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│  │ Again [1]    │ Hard [2]     │ Normal [3]   │ Easy [4]     │  │
│  │ 1 min        │ 12 days      │ 24 days      │ 32 days      │  │
│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 7.1 Study Lifecycle States
1. **State 1 (`QUESTION_SHOWN`)**: Front prompt rendered in a container with a fixed minimum height (`min-h-[380px]`). Space or Enter reveals answer.
2. **State 2 (`ANSWER_SHOWN`)**: Answer rendered; rating buttons activate, displaying calculated prospective intervals beneath each button.
3. **State 3 (`OPTIMISTIC_COMMIT`)**: User presses `1`, `2`, `3`, or `4`. The next card slides in immediately (0ms local latency). Stored procedure `submit_card_review` is invoked asynchronously. If card lapsed (Again), it is re-queued 3 slots later in local session state.

---

## 8. Slide-Over Drawer: Card Details & SRS Audit Ledger

A lightweight slide-over panel displaying scheduling metrics and immutable review history.

```
┌──────────────────────────────────────────────────────────────────┐
│  Card Details & SRS Ledger                                  [×]  │
├──────────────────────────────────────────────────────────────────┤
│  Card ID: 4f9e...     Orientation: Forward (Card 0)             │
│  Current Queue: Review (2)     Due Date: 2026-10-28              │
│  Interval: 14 days             Ease Factor: 2.35                 │
│  Total Reps: 6                 Lapses: 1                         │
├──────────────────────────────────────────────────────────────────┤
│  Rendered Content                                                │
│  Prompt: What is an idempotent REST method?                      │
│  Answer: An operation that can be applied multiple times without │
│          changing the result beyond the initial application.     │
├──────────────────────────────────────────────────────────────────┤
│  Historical Review Ledger (Immutable Audit Trail)                │
│  ┌────────────┬────────┬──────────┬──────────┬─────────────────┐ │
│  │ Timestamp  │ Rating │ Interval │ Ease Δ   │ Latency         │ │
│  ├────────────┼────────┼──────────┼──────────┼─────────────────┤ │
│  │ Oct 14, 26 │ Normal │ 14d      │ 2.35     │ 1,420 ms        │ │
│  │ Oct 08, 26 │ Hard   │ 6d       │ 2.50→2.35│ 3,890 ms        │ │
│  │ Oct 07, 26 │ Normal │ 1d       │ 2.50     │ 980 ms          │ │
│  └────────────┴────────┴──────────┴──────────┴─────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. Global Keyboard Navigation Map

| Scope | Shortcut | Action |
| :--- | :--- | :--- |
| **Flashcards Hub** | `Alt + 1` | Switch to Decks tab |
| **Flashcards Hub** | `Alt + 2` | Switch to Card Types tab |
| **Flashcards Hub** | `Alt + 3` | Switch to Due Today tab |
| **Flashcards Hub** | `/` | Focus search filter input |
| **Flashcards Hub** | `C` | Open Deck Creation Modal |
| **Flashcards Hub** | `J` / `K` or `↓` / `↑` | Navigate list items |
| **Flashcards Hub** | `Enter` | Launch study session for highlighted deck |
| **Study Player** | `Space` or `Enter` | Reveal answer |
| **Study Player** | `1` | Select **Again** rating |
| **Study Player** | `2` | Select **Hard** rating |
| **Study Player** | `3` | Select **Normal** rating |
| **Study Player** | `4` | Select **Easy** rating |
| **Study Player** | `Esc` | Safely pause and return to flashcards hub |
