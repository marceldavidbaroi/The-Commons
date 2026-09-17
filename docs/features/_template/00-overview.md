# Feature Documentation Guide & Acronym Glossary

This boilerplate template provides the standard 6-document framework for specifying and building features in **The Commons**. 

Whenever you build a new feature, copy the `_template/` directory into `docs/features/<feature-name>/` and fill out these documents according to the UI-First lifecycle.

---

## 📚 Document Breakdown & Full Forms

### 1. `01-prd.md` — Product Requirements Document (PRD) / Functional Specification Document (FSD)
- **Full Form**: **P**roduct **R**equirements **D**ocument (or **F**unctional **S**pecification **D**ocument).
- **Primary Purpose**: Defines **WHAT** the feature is, **WHY** it is being built, and **HOW** users interact with it from a product and UI perspective.
- **Key Sections**:
  - Executive Problem Statement & User Personas.
  - User Stories & Acceptance Criteria (Gherkin or checkbox style).
  - Page Routes & UI breakdown.
  - Visual & Interactive states (Active, Loading Skeletons, Empty states, Form validation errors).

---

### 2. `02-data-model.md` — Data Model & Schema Specification
- **Full Form**: **Data Model & Schema** (PostgreSQL DDL + Client/Server Validation Schemas).
- **Primary Purpose**: Defines the **database table structure**, indexes, foreign keys, and security policies, ensuring zero schema mismatch between database and UI forms.
- **Key Sections**:
  - PostgreSQL Table Definitions (`create table ...`).
  - Performance Indexes (B-tree, GIN for JSONB/Arrays).
  - **RLS (Row Level Security)** policies isolating records to `auth.uid() = user_id`.
  - **Zod** schema definitions for client and server input validation.

---

### 3. `03-api-contract.md` — Application Programming Interface (API) Contract
- **Full Form**: **A**pplication **P**rogramming **I**nterface Contract / Specification.
- **Primary Purpose**: Acts as the explicit agreement between frontend and backend on endpoint names, RPC procedures, Server Actions, request payloads, and response JSON formats.
- **Key Sections**:
  - Operation table (Method, Action/Route, Role required, Description).
  - Exact JSON Request Body payloads.
  - Success response shapes (`200 OK`, `201 Created`).
  - Error response formats (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`).

---

### 4. `04-tdd.md` — Technical Design Document (TDD)
- **Full Form**: **T**echnical **D**esign **D**ocument.
- **Primary Purpose**: Defines the **engineering implementation plan**, system architecture, component tree, and state management boundaries.
- **Key Sections**:
  - System Architecture & Data Flow diagrams (`mermaid`).
  - Component hierarchy and file mapping (`src/app/...`, `src/components/...`, `src/hooks/...`).
  - State Management split: **TanStack Query v5** (remote server cache) vs. **Zustand v5** (client/transient state).
  - Sequential step-by-step engineering checklist for AI or developers.

---

### 5. `05-page-to-api-matrix.md` — Page-to-API Matrix & Cache Synchronization
- **Full Form**: **Page-to-API Mapping Matrix**.
- **Primary Purpose**: Provides an exhaustive 1-to-1 mapping connecting every page route, UI view, tab, component, and user interaction directly to its underlying API endpoint/RPC, TanStack Query hook, and in-memory cache synchronization strategy.
- **Key Sections**:
  - Page-to-API mapping table (Page Route, View/Tab, Component, User Trigger/Event, Target API/RPC/Action, HTTP Method, TanStack Hook / Store Action, Cache Strategy).
  - Client State & Store Matrix (Zustand store variables, modifying actions, affected views, purposes).
  - Zero-redundant-call caching and optimistic update strategies.

---

### 6. `stubs.ts` — Type Definitions & Function Signatures
- **Full Form**: **TypeScript Type Stubs & Interface Declarations**.
- **Primary Purpose**: Provides concrete TypeScript type targets and declared function headers so code can be written with 100% type safety without guessing object shapes.
- **Key Sections**:
  - Database Row, Insert, and Update types.
  - Zustand UI Store state interfaces.
  - Standard `ApiResponse<T>` wrappers.
  - `declare function ...` signatures to be implemented.

---

## 🔁 Workflow Order (UI-First)
1. **Design UI**: Build pages and components in `src/` using mock state.
2. **Fill Specs & Page Matrix**: Complete `01-prd.md`, `02-data-model.md`, `03-api-contract.md`, `04-tdd.md`, `05-page-to-api-matrix.md`, and `stubs.ts` based on what the UI actually needs.
3. **Database Migration**: Run the SQL schema and generate Supabase types.
4. **Wire Backend**: Implement Server Actions / RPCs, TanStack Query hooks, Zustand stores, and test end-to-end.
