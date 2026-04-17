# Admin UI Audit — April 2026

## Critical Issues Found

### 1. NO DESIGN SYSTEM — Hardcoded colors everywhere

- Every page uses raw hex codes: `#0a0f1e`, `#111827`, `#1f2d4e`, `#d4a843`, `#6b7280`, etc.
- NO CSS variables, NO Tailwind theme tokens, NO design tokens
- Changing a single brand color means editing 29+ files
- Inconsistent shades used across pages (some use `#0d1526`, others `#0a0f1e` for backgrounds)

### 2. NO LIGHT MODE — Dark-only, broken contrast

- Layout has `bg-[#0a0f1e]` hardcoded on `<div className="fixed inset-0">`
- No `dark:` classes anywhere — impossible to add light mode without rewriting everything
- Titles invisible against dark background (white text on near-white/transparent cards)
- No `prefers-color-scheme` support

### 3. POOR TYPOGRAPHY HIERARCHY

- Page titles use inconsistent sizes (some `text-2xl`, some `text-lg`, some `text-base`)
- Headings use inline `style={{ fontFamily: 'var(--font-heading)' }}` — should be a class
- Section headers: some are `text-[10px] uppercase tracking-widest`, others are `text-xs font-medium`
- No consistent heading scale (h1, h2, h3 → always ad-hoc)

### 4. INCONSISTENT CARD PATTERNS

- Cards use different combos: `bg-[#111827]`, `bg-[#0a0f1e]`, `bg-[#0d1526]`
- Border radius: mix of `rounded-2xl`, `rounded-xl`, `rounded-lg`
- Padding: mix of `p-4`, `p-5`, `p-6` with no pattern
- Some cards have borders, some don't
- No reusable `<Card>` component

### 5. LAYOUT PROBLEMS

- Main content `<main>` has no max-width constraint on ultra-wide screens
- Each page sets its own `max-w-*` and `p-*` — inconsistent page margins
- No responsive breakpoint strategy — some pages break on tablet
- Sidebar takes fixed width but content doesn't adapt well

### 6. NO SHARED COMPONENTS

Each page reinvents the wheel:

- Score bars (Trends, Market Intel, Research — all different implementations)
- Status badges (3+ different badge styles)
- Skeleton loaders (each page has its own)
- Empty states (each page custom)
- Error states (each page custom)
- Data tables (each page builds its own table)

### 7. ACCESSIBILITY

- Material Symbols icons have inconsistent `aria-hidden` usage
- Color contrast: `#374151` text on `#0a0f1e` background = FAILS WCAG AA
- Focus indicators: none visible (all `focus:outline-none`)
- Interactive elements: some use `<button>`, some use `<div onClick>`

## Pages Inventory (29 admin pages)

| Page                    | Route                                      | Complexity | Priority               |
| ----------------------- | ------------------------------------------ | ---------- | ---------------------- |
| Layout (sidebar/topbar) | `/admin/layout.tsx`                        | HIGH       | P0 — affects ALL pages |
| Dashboard               | `/admin/page.tsx`                          | MEDIUM     | P0                     |
| Login                   | `/admin/login/page.tsx`                    | LOW        | P2                     |
| Products                | `/admin/products/page.tsx`                 | HIGH       | P1                     |
| Products Metafields     | `/admin/products/[id]/metafields/page.tsx` | MEDIUM     | P2                     |
| Orders                  | `/admin/orders/page.tsx`                   | HIGH       | P1                     |
| Order Detail            | `/admin/orders/[id]/page.tsx`              | HIGH       | P1                     |
| Customers               | `/admin/customers/page.tsx`                | HIGH       | P1                     |
| Customer Detail         | `/admin/customers/[id]/page.tsx`           | MEDIUM     | P1                     |
| Collections             | `/admin/collections/page.tsx`              | MEDIUM     | P1                     |
| Inventory               | `/admin/inventory/page.tsx`                | MEDIUM     | P1                     |
| Discounts               | `/admin/discounts/page.tsx`                | MEDIUM     | P1                     |
| Market Intel            | `/admin/market-research/page.tsx`          | HIGH       | P1                     |
| Market Explorer         | `/admin/explorer/page.tsx`                 | MEDIUM     | P1                     |
| Explorer Category       | `/admin/explorer/[category]/page.tsx`      | MEDIUM     | P2                     |
| Trend Engine            | `/admin/trends/page.tsx`                   | HIGH       | P1                     |
| Research Board          | `/admin/research/page.tsx`                 | HIGH       | P1                     |
| State Intel             | `/admin/states/page.tsx`                   | MEDIUM     | P2                     |
| State Detail            | `/admin/states/[stateCode]/page.tsx`       | HIGH       | P2                     |
| Monitor                 | `/admin/monitor/page.tsx`                  | MEDIUM     | P2                     |
| Monitor Detail          | `/admin/monitor/[shopifyId]/page.tsx`      | MEDIUM     | P2                     |
| Alerts                  | `/admin/alerts/page.tsx`                   | MEDIUM     | P2                     |
| Automations             | `/admin/automations/page.tsx`              | MEDIUM     | P2                     |
| Activity Log            | `/admin/activity/page.tsx`                 | LOW        | P2                     |
| AI Chat                 | `/admin/chat/page.tsx`                     | LOW        | P2                     |
| Settings                | `/admin/settings/page.tsx`                 | MEDIUM     | P1                     |
| Error Page              | `/admin/error.tsx`                         | LOW        | P3                     |
| Not Found               | `/admin/not-found.tsx`                     | LOW        | P3                     |

## Current Color Palette (extracted from code)

```
Background:   #0a0f1e (darkest), #0d1526 (sidebar), #111827 (cards)
Borders:      #1f2d4e (primary), #374151 (hover)
Text:         #ffffff (primary), #f9fafb (headings), #e5e7eb (body)
              #9ca3af (secondary), #6b7280 (muted), #374151 (disabled)
Brand:        #d4a843 (gold), #b8922e (gold hover)
Accent:       #6366f1 (indigo), #6b8cff (blue)
Success:      #10b981
Warning:      #f59e0b
Error:        #ef4444
```
