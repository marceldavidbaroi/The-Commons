# PRD: Daily Diary & Multi-Tome Journaling

## 1. Executive Summary & Objective
- **Problem Statement**: Members need a tactile, mindful digital sanctuary to record daily reflections, 3-item gratitude rituals, vitality energy scores, mood tags, and weather.
- **Proposed Solution**: A multi-tome journal system where users create styled books (vintage codex, classic ledger, modern chronicle) and write sequential daily entries with real-time autosave.
- **Target Persona**: Writers, thinkers, and daily journaling enthusiasts.

## 2. User Stories & Acceptance Criteria
- **User Story 1 (Tome Management)**: As a user, I want to create multiple custom-themed journals so I can separate personal reflections from work chronicles.
  - [ ] Users can create a new diary with custom cover color, theme, and title.
  - [ ] Diaries can be reordered, favorited, and archived.
- **User Story 2 (Sequential Entry Writing)**: As a user, I want to write daily pages with structured rituals (gratitude, energy score, mood, weather).
  - [ ] Page numbers increment sequentially per diary.
  - [ ] Entries autosave with debounced mutation.
  - [ ] Users can bookmark/heart special entries.
- **User Story 3 (Analytics & Streaks)**: As a user, I want to see my writing streak and word count stats.
  - [ ] System computes consecutive days written, total words, and mood breakdown.

## 3. Page Routes & UI Breakdown
| Route / URL | Component / View | Description | Key User Actions |
|---|---|---|---|
| `/my-diaries` | `MyDiariesPage` | Tome gallery with 3D covers | Create tome, reorder, open tome |
| `/my-diaries/[diaryId]` | `DiaryOverviewPage` | Tome table of contents & entries | Filter by mood/tag, search entries |
| `/my-diaries/[diaryId]/pages/[entryId]` | `DiaryCanvasPage` | Tactile two-page editor | Write reflection, gratitude, change mood |
| `/daily-diary` | `DailyDiaryRedirect` | Fast redirect to active diary entry | Auto-opens latest daily entry |

## 4. Visual & Interactive States
- **Default State**: Tactile open-book reader with realistic page rules and margins.
- **Autosaving State**: Discreet "Ink drying..." / "Saved" status pill in header.
- **Empty State**: Elegant prompt card suggesting first reflection with sample opening kickers.
