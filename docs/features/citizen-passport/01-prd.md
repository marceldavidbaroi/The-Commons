# PRD: Citizen Passport & Identity

## 1. Executive Summary & Objective
- **Problem Statement**: Members need a personal identity ledger ("Citizen Passport") displaying clearance tier, member seal, personal bio, completed monographs, and account activity stats.
- **Proposed Solution**: A tactile passport card and settings management screen where citizens manage their profiles, privacy, and theme preferences.
- **Target Persona**: Registered members of The Commons.

## 2. User Stories & Acceptance Criteria
- **User Story 1 (View Passport)**: As a user, I want to view my archival clearance status, registration folio number, and membership badge.
  - [ ] Displays user profile photo, citizen title, and member since date.
  - [ ] Shows total diaries written, words penned, and streak records.
- **User Story 2 (Edit Passport Details)**: As a user, I want to update my public bio, display name, and avatar.
  - [ ] Changes persist to `public.profiles` with optimistic update.
  - [ ] Displays validation feedback on invalid inputs.

## 3. Page Routes & UI Breakdown
| Route / URL | Component / View | Description | Key User Actions |
|---|---|---|---|
| `/citizen-passport` | `CitizenPassportPage` | Visual passport booklet & badges | View stats, view seals, open settings |
| `/settings` | `SettingsPage` | Account & preference manager | Update name, theme, email notifications |

## 4. Visual & Interactive States
- **Default State**: Passport folio card with embossed seal and metadata stamps.
- **Loading State**: Skeleton card matching exact passport dimensions.
- **Saving State**: Inline success checkmark toast.
