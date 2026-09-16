# Feature: Design System & Visual Identity

## 1. Executive Summary & Philosophy

**The Commons** is built upon a **Magazine & Editorial Broadside** aesthetic. Unlike standard modern SaaS web applications that compartmentalize content into repetitive, floating rounded "cards" with heavy drop shadows, The Commons draws inspiration from high-craft print broadsheets, monographs, and literary journals.

Content structure is achieved through:
- **Hairline Rules & Dividers** (`border-b`, `border-t`, `divide-x`, `.editorial-rule`, `.editorial-rule-double`)
- **Columnar Grid Layouts** (Multi-column reading flows, asymmetrical editorial spreads, side dispatches)
- **Typographic Hierarchy & Dignity** (Serif display headlines, small-caps `.kicker` tags, `.drop-cap` lead initials, italic `.pull-quote` blocks, and mono publication folios)
- **Tactile Warmth** (Warm linen `#F2EFE7` canvas, oceanic slate `#3368A0`, muted cerulean `#66A3BF`, and seafoam `#C8DFDB`)

---

## 2. Feature-Scoped Design System Architecture

The Commons employs a **Modular, Feature-Scoped Design System Architecture**. 

While the base application establishes the editorial shell and typography rules, **each feature is empowered to define its own bespoke tactile sub-design system** tailored to its functional and emotional purpose.

```
┌─────────────────────────────────────────────────────────────┐
│                 THE COMMONS BASE DESIGN SYSTEM              │
│  (Editorial Broadside, Mastheads, Hairline Rules, No Cards) │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│   FEATURE: DAILY DIARY    │         │  FUTURE FEATURE (e.g.)    │
│  • Antique Parchment      │         │  • Custom Palette Tokens  │
│  • Walnut Ink Typography  │         │  • Domain-Specific Textures│
│  • Handwriting (Caveat)   │         │  • Bespoke Layout Metaphor│
│  • Wax Seals & Torn Paper │         │  • Scoped Component Styles│
└───────────────────────────┘         └───────────────────────────┘
```

---

## 3. Brand & Feature Design Tokens

### A. Base Magazine Tokens

| Token Name | Hex | CSS Variable | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Ocean Slate** | `#3368A0` | `--color-brand-primary` / `--primary` | Primary CTA buttons, drop caps, masthead highlights, active indicators |
| **Muted Cerulean** | `#66A3BF` | `--color-brand-secondary` / `--secondary` | Secondary kickers, hover highlights, progress states, supporting accents |
| **Seafoam Mist** | `#C8DFDB` | `--color-brand-accent` / `--accent` | Text selection highlights, pill badges, hairline highlights |
| **Linen Warm White** | `#F2EFE7` | `--color-brand-surface` / `--muted` | Broadside paper canvas, subtle ruled surface fills, colophons |
| **Dark Brand Navy** | `#1E2D3D` | `--color-brand-dark` | Dark mode background canvas, high-contrast dark accents |

### B. Feature-Specific Tokens: Daily Diary

| Token Name | Hex | Usage in Daily Diary |
| :--- | :--- | :--- |
| **Walnut Ink** | `#2C241E` | Primary diary handwriting, titles, folio inscriptions, ink contrast |
| **Antique Parchment** | `#F4EAD4` | Aged tea-stained manuscript sheet, deckled scrap chips |
| **Terracotta Wax Seal** | `#8C3A27` | Embossed wax seal action buttons, active page tabs, pencil heart fill |
| **Silk Ribbon Gold** | `#C48C28` | Gilded bookmark ribbons, streak habit flame badges |
| **Botanical Sage** | `#6B8E23` | Organic calm mood tags, nature bullets, mindful seals |
| **Iron-Gall Margin Red** | `#D97D7D` | Vintage 1px vertical notebook margin guide rule |

---

## 4. "No Cards" Layout Guidelines

When building or updating views in The Commons, follow these editorial rules:

### ❌ Anti-Patterns to Avoid:
1. **No generic floating white cards**: Do not wrap every component in `rounded-2xl bg-card shadow-lg p-6`.
2. **No excessive drop shadows**: Avoid floating containers that separate content from the page canvas.
3. **No rounded bubble dashboards**: Avoid the generic SaaS template look.

### ✅ Recommended Editorial Patterns:
1. **Hairline Rules**: Use 1px single (`.editorial-rule`) or 3px double (`.editorial-rule-double`) borders to divide sections.
2. **Column Splits**: Use vertical hairline rules (`.column-rule` or `border-r border-border`) to separate lead stories from side dispatches.
3. **Kickers**: Place uppercase small-caps mono tags (`.kicker`) above headlines to designate categories (`§ 01 • DISPATCH`).
4. **Drop Caps**: Style the first letter of lead paragraphs with `.drop-cap`.
5. **Pull Quotes**: Highlight key insights with `.pull-quote` (italic serif typography with a vertical primary accent bar).
6. **Folios & Mastheads**: Use publication folio bars (`.folio-bar`) to display issue dates, volume numbers, and edition metadata.

---

## 5. How to Create a New Feature Sub-Design System

When adding a new feature (e.g. `src/app/library`, `src/app/agora`):

1. **Define Feature Tokens**: Declare domain-specific color variables, fonts, and tactile backgrounds in `globals.css` or the feature directory.
2. **Scope Layout Elements**: Build feature components that adopt the domain's tactile aesthetic (e.g., blueprints, ledger tables, or manuscript sheets) while maintaining clean navigation back to the main editorial shell.
3. **Document in Docs**: Create `docs/features/<feature-name>.md` detailing its visual vocabulary and token semantics.
4. **Register in Showcase**: Add a dedicated showcase tab in `/dev/design-system` so developers can inspect and test the feature tokens live.

---

## 6. Mobile Responsiveness Standards & Guidelines

All pages and feature sub-systems across The Commons must be **100% fluidly responsive** from mobile devices (320px+) to large widescreen desktop displays.

### A. Breakpoint Tokens

| Breakpoint | Minimum Width | Primary Layout Behavior |
| :--- | :--- | :--- |
| **Mobile (`<640px`)** | Default / `base` | Single-column stacked layouts, compact sheet padding (`p-4`), concise folios, touch-friendly hit areas (≥40px). |
| **Tablet (`sm` / `640px+`)** | `640px` | 2-column feature grids, expanded folios, visible auxiliary tags. |
| **Desktop (`lg` / `1024px+`)** | `1024px` | Asymmetrical broadside spreads (e.g., 7/5 or 8/4 column splits), 3-4 column feature grids, rich marginalia. |

### B. Core Responsiveness Rules

1. **Fluid Typography Scaling**:
   - Never hardcode rigid large font sizes. Use responsive step scales:
     - Masthead Titles: `text-3xl sm:text-5xl md:text-7xl`
     - Editorial Headlines: `text-2xl sm:text-3xl md:text-4xl`
     - Folio / Date Lines: `text-xs sm:text-sm md:text-base`
2. **Tactile Canvas Sheet Padding**:
   - For tactile parchment sheets (such as the Daily Diary), use progressive responsive padding: `p-4 sm:p-7 md:p-9 lg:p-11` to prevent small screens from having excessive wasted whitespace.
3. **Touch Targets & Interactive Density**:
   - Mobile buttons and selection chips (e.g., energy levels, mood tags, weather chips) must maintain a minimum touch target of `40px` height or `px-2.5 py-1.5` padding for comfortable finger tapping.
4. **Horizontal Overflow Prevention**:
   - Avoid fixed widths (`w-[600px]`). Always use `w-full max-w-[...]` and responsive container constraints.
   - Long metadata strings (e.g., dates and duration stamps) must use `truncate` or flex wrapping on small screens.
5. **No Cluttered Card Grids**:
   - Multi-column broadsides must cleanly stack vertically (`grid-cols-1 lg:grid-cols-12`) with hairline dividers (`border-t-2` or `border-b`) adapting to the stack direction.

---

## 7. Live Interactive Showcase

Inspect, copy hex tokens, and test UI components live at:
`http://localhost:3000/dev/design-system`
