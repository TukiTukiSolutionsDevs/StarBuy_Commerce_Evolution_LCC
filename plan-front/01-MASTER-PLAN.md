# Admin Redesign — Master Plan

## Strategy: Design System First, Then Page-by-Page Migration

We do NOT redesign 29 pages at once. We build a design system with reusable components,
then migrate each page to use them. This guarantees consistency and makes future changes trivial.

---

## Phase 0 — Design Tokens & Theme System (Sprint 0)

**Goal**: Build the foundation. Every color, spacing, and typography value becomes a CSS variable.

### Tasks:

1. **Create CSS custom properties** in `globals.css` for dark/light themes
   - `--admin-bg`, `--admin-bg-card`, `--admin-bg-elevated`
   - `--admin-border`, `--admin-border-hover`
   - `--admin-text`, `--admin-text-secondary`, `--admin-text-muted`
   - `--admin-brand`, `--admin-brand-hover`
   - `--admin-accent`, `--admin-success`, `--admin-warning`, `--admin-error`
2. **Create Tailwind theme extension** that maps to CSS vars
   - `bg-admin`, `bg-admin-card`, `text-admin`, `border-admin`, etc.
3. **Create theme context** (`ThemeProvider`) with localStorage persistence
   - Toggle: system / dark / light
   - Applies `data-theme="dark"` or `data-theme="light"` on root
4. **Typography classes** in CSS:
   - `.admin-h1`, `.admin-h2`, `.admin-h3`, `.admin-label`, `.admin-caption`
   - Replaces all inline `style={{ fontFamily }}` usage
5. **Theme toggle component** in top bar

### Files created:

- `src/styles/admin-tokens.css`
- `src/components/admin/ThemeProvider.tsx`
- `src/components/admin/ThemeToggle.tsx`
- Updates to `tailwind.config.ts` or `globals.css`

### Deliverable: Theme toggle works, no page looks different yet (tokens map to current dark values)

---

## Phase 1 — Shared UI Components (Sprint 1)

**Goal**: Build reusable admin components that every page will use.

### Tasks:

1. **`<AdminCard>`** — Consistent card with token-based colors, border, padding, radius
   - Props: `variant?: 'default' | 'elevated' | 'ghost'`, `padding?: 'sm' | 'md' | 'lg'`
2. **`<AdminPageHeader>`** — Page title + subtitle + optional actions
   - Replaces the inconsistent h1/h2 headers on every page
3. **`<AdminEmptyState>`** — Icon + title + description + CTA
   - Replaces 10+ custom empty states
4. **`<AdminErrorState>`** — Consistent error display with retry
5. **`<AdminSkeleton>`** — Unified skeleton loader (card, table row, stat)
6. **`<AdminBadge>`** — Status badge with variants (success, warning, error, info, neutral)
7. **`<AdminDataTable>`** — Sortable table with pagination skeleton
   - Headers, rows, empty state, loading state built-in
8. **`<AdminScoreBar>`** — Reusable score bar (replaces 3 different implementations)
9. **`<AdminStatCard>`** — KPI card with icon, value, label, change indicator
10. **`<AdminSearchInput>`** — Consistent search bar with icon + clear button

### Files created:

- `src/components/admin/ui/Card.tsx`
- `src/components/admin/ui/PageHeader.tsx`
- `src/components/admin/ui/EmptyState.tsx`
- `src/components/admin/ui/ErrorState.tsx`
- `src/components/admin/ui/Skeleton.tsx`
- `src/components/admin/ui/Badge.tsx`
- `src/components/admin/ui/DataTable.tsx`
- `src/components/admin/ui/ScoreBar.tsx`
- `src/components/admin/ui/StatCard.tsx`
- `src/components/admin/ui/SearchInput.tsx`

### Deliverable: Component library ready, documented with examples

---

## Phase 2 — Layout & Navigation Redesign (Sprint 2)

**Goal**: Fix the layout shell that wraps ALL pages.

### Tasks:

1. **Layout.tsx** — Replace all hardcoded colors with token classes
2. **Sidebar** — Token-based, theme-aware
3. **Top bar** — Add theme toggle, fix page title logic, breadcrumbs
4. **Main content area** — Add consistent `max-w-7xl mx-auto px-6 py-6` wrapper
5. **Mobile responsive** — Test and fix sidebar/content on tablet + mobile
6. **Scroll behavior** — Ensure content scrolls independently from sidebar

### Files modified:

- `src/app/admin/layout.tsx`

### Deliverable: Layout looks correct in both dark AND light mode

---

## Phase 3 — Core Store Pages (Sprint 3)

**Goal**: Migrate the most-used store management pages.

### Tasks:

1. Dashboard (`/admin`) — Redesign with `AdminStatCard` grid + recent activity
2. Products (`/admin/products`) — `AdminDataTable` + proper search
3. Orders (`/admin/orders`) — `AdminDataTable` + status badges
4. Order Detail (`/admin/orders/[id]`) — Structured layout with cards
5. Customers (`/admin/customers`) — `AdminDataTable`
6. Customer Detail (`/admin/customers/[id]`) — Profile card + order history
7. Collections (`/admin/collections`) — Grid/list view
8. Inventory (`/admin/inventory`) — Table with stock levels
9. Discounts (`/admin/discounts`) — Table with status

### Deliverable: All core store pages using shared components + theme tokens

---

## Phase 4 — Intelligence Pages (Sprint 4)

**Goal**: Migrate the intelligence/research pages.

### Tasks:

1. Trend Engine (`/admin/trends`) — Token-based, use shared components
2. Market Intel (`/admin/market-research`) — Token-based cards + listings
3. Market Explorer (`/admin/explorer`) — Category grid with proper contrast
4. Explorer Category Detail (`/admin/explorer/[category]`) — Fix cards
5. Research Board (`/admin/research`) — Kanban-style with tokens
6. State Intel (`/admin/states`) — Map + table with tokens
7. State Detail (`/admin/states/[stateCode]`) — Charts + data cards
8. Monitor (`/admin/monitor`) — Dashboard cards
9. Monitor Detail (`/admin/monitor/[shopifyId]`) — Product tracking

### Deliverable: All intelligence pages themed and consistent

---

## Phase 5 — System & Utility Pages (Sprint 5)

**Goal**: Migrate remaining pages.

### Tasks:

1. Settings (`/admin/settings`) — Form cards with proper spacing
2. Automations (`/admin/automations`) — Rule cards
3. Activity Log (`/admin/activity`) — Timeline/table
4. Alerts (`/admin/alerts`) — Notification list
5. AI Chat (`/admin/chat`) — Chat UI polish
6. Login (`/admin/login`) — Themed login form
7. Error page (`/admin/error.tsx`) — Branded error
8. Not Found (`/admin/not-found.tsx`) — Branded 404

### Deliverable: ALL 29 pages migrated. Full dark/light mode working.

---

## Phase 6 — Polish & QA (Sprint 6)

**Goal**: Final polish pass.

### Tasks:

1. Cross-browser testing (Chrome, Safari, Firefox)
2. Mobile responsiveness audit (all pages)
3. Accessibility audit (contrast, focus, aria)
4. Performance audit (bundle size, lazy loading)
5. Remove all remaining hardcoded hex colors
6. Search & replace audit: grep for `#0a0f1e`, `#111827`, `#1f2d4e`, etc.
7. Screenshot documentation of final state

### Deliverable: Production-ready admin panel

---

## Estimated Effort

| Phase                 | Sprint   | Pages          | Est. Hours |
| --------------------- | -------- | -------------- | ---------- |
| 0 — Design Tokens     | Sprint 0 | 0 (foundation) | 3-4h       |
| 1 — Shared Components | Sprint 1 | 0 (library)    | 4-6h       |
| 2 — Layout            | Sprint 2 | 1 (layout.tsx) | 2-3h       |
| 3 — Core Store        | Sprint 3 | 9 pages        | 6-8h       |
| 4 — Intelligence      | Sprint 4 | 9 pages        | 6-8h       |
| 5 — System            | Sprint 5 | 8 pages        | 4-6h       |
| 6 — Polish            | Sprint 6 | QA all         | 3-4h       |
| **TOTAL**             |          | **29 pages**   | **28-39h** |
