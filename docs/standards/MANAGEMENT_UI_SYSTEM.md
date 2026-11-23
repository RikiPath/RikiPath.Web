# Management UI System (Admin · Mentor · Content Author)

Rules for every management screen. They extend `UI_DESIGN_SYSTEM.md` and `WORKSPACE_LAYOUT_AND_INTERACTION_STANDARDS.md`;
when in doubt, reuse the shared component named here instead of writing page-local CSS.

## 0. Page headings

No visual title/icon block on management pages: the global breadcrumb and the active sidebar item name the page.
`AdminPageHeader` renders the title as a screen-reader `h1` only. Create/refresh/filter actions go in the page's
toolbar row (`UnifiedToolbar` / `AdminToolbar` `actions`); navigation shortcuts that repeat the sidebar are not added.
Detail pages whose heading is content (a user's name + email) pass `showTitle`.

## 1. App shell (`src/layouts/AppShell.jsx`)

| Region | Behaviour | Owner |
|---|---|---|
| Global header | `sticky top-0`, height `--spacing-rp-topbar`, `z-[45]` | AppShell |
| Sidebar | `fixed` under the header, its own `overflow-y-auto` nav, "Thu gọn" pinned in a `shrink-0` footer | AppShell |
| Main | starts below the header, offset by `--spacing-rp-sidebar(-collapsed)` | AppShell / page |

- Never add `overflow: hidden/auto` to an ancestor of the header (it breaks `sticky`).
- Never put `overflow-x: hidden` on `html`, `body` or the shell to hide a layout bug — fix the overflowing element.
- Mobile/tablet (< `lg`): the sidebar is the shared `Drawer` (overlay, focus trap, scroll lock, close button).

## 2. Scrolling responsibilities

| Page type | What scrolls |
|---|---|
| Content / dashboard / settings / detail | the document (header stays sticky) |
| Data listing (Template B) | **only the table rows**: use `AdminWorkspace viewportLocked` + `DataRefreshBoundary fillHeight` + `AdminDataTable fillHeight` |
| Modal | `Modal` body only (header + footer fixed) |
| Drawer / wizard | `DrawerBody` only; step navigation is a `shrink-0` band between `DrawerHeader` and `DrawerBody` |
| Sidebar | the nav list only |

One scroll owner per region. Do not nest a `max-h` scroll box inside a scrolling modal/drawer body — let the body
scroll and make the inner table header `sticky top-0` (no `overflow-hidden` on the table wrapper, it breaks sticky).

## 3. Sidebar (management shells)

Defined once in `src/styles/tokens.css` for `[data-shell="admin" | "mentor" | "contentauthor"]`:

- Default: gray tile (`#f3f4f6`) + gray glyph, neutral text — regardless of the item's feature `tone`.
- Hover: slightly darker gray tile; no size change.
- Active: Sakura solid tile + white glyph, Sakura text, light Sakura row, 3px left indicator.
- Group labels: one style (11px, uppercase, `tracking-[0.1em]`); the active group label is Sakura.
- The Learner sidebar keeps its per-feature colours. Do not change role navigation structure for styling.

## 4. Data listing template (Template B)

```
AdminWorkspace viewportLocked
├─ AdminPageHeader              (shrink-0)
├─ UnifiedToolbar               (shrink-0; hidden while the dataset is empty)
├─ Banners                      (shrink-0)
└─ DataRefreshBoundary fillHeight
   └─ AdminDataTable fillHeight (sticky header · scrolling rows · pagination footer)
```

### Table contract (`DataTable` in `components/ui/data.jsx`, admin defaults in `AdminDataTable`)

- Header row is sticky inside the table's scroll area; only rows scroll; pagination is a `shrink-0` footer.
- With `fillHeight`, short lists keep the card only as tall as their rows. Longer lists scroll within the available
  workspace height, with pagination directly below the rows. Client-side lists may show more rows when the viewport
  has room; server-side lists only show rows actually returned by the API.
- Pagination comes from real counts: client mode = filtered `rows.length`; server mode = `page` + `total` +
  `onPageChange`. Page sizes 10 / 20 / 50 / 100. No footer when everything fits on one page; never "1–0 / 0".
- Pass `resetPageKey` (e.g. `` `${status}|${query}` ``) so a filter/search change returns to page 1.
  Deleting the last row of a page clamps to the last existing page automatically.
- Alignment: text left, numbers/money right (`align: 'right'`), status centre, actions at the end.
- Long text: `line-clamp-1/2` + `title` (or a detail drawer). Never raw JSON, enum values or route paths in cells.
- Large datasets (users, payments, content) use server-side pagination when the API supports it.

### Empty / loading / error states

| State | UI |
|---|---|
| Loading | skeleton / `SakuraLoader` (never "no data") |
| Empty dataset | illustration + short title + create CTA; **hide** toolbar filters, sort and pagination |
| Empty filtered result | "Không tìm thấy kết quả phù hợp." + "Xóa bộ lọc"; **keep** the active filters visible |
| Error | `ErrorState` with retry (never an empty state) |
| Forbidden | the permission state, not an empty state |

## 5. Modal & drawer

- `Modal`: header (title, description, X) and footer are `shrink-0`; only the body scrolls; bottom sheet on mobile.
  Sizes: `sm` confirm · `md` short form · `lg` long form / comparison · `xl` two-column with preview.
  Two-column editors (form + preview): on `lg` the form column scrolls and the preview stays put
  (see `AdminPlanEditModal`).
- `SideDrawer` / `Drawer`: fixed `DrawerHeader`, optional fixed step band, scrolling `DrawerBody`, fixed `DrawerFooter`.
- Wizards keep form state across steps, show the current step, validate before publish, and confirm discard.
- Submit buttons show `loading` and block double submit; dismiss is disabled while saving.

## 6. Toolbar

`UnifiedToolbar`: tabs/left · search · filters · refresh · primary action. 40px controls (`--rp-control-h-md`),
`flex-wrap` on narrow widths. Primary = create/save/publish; secondary = refresh/export/back;
danger only for destructive actions.

## 7. Dashboard (Template A)

Header → action queue → KPI cards → charts → recent activity.

- Action queue: only categories with work are listed; when everything is 0 show one compact summary line
  (categories stay reachable via "Xem từng hạng mục").
- Charts: an all-zero or empty series renders the compact empty state — no fake axes or flat lines.
- The date range applies only to time-bound metrics; system totals are labelled as totals.

## 8. Other templates

- C — Detail: breadcrumb, title/status, content, related info, actions. No toolbar/pagination.
- D — Settings: sections, optional sticky preview (`lg:sticky lg:top-4` inside the page's scroll area), save/reset, history.
- E — Wizard: see §5.
- F — Calendar/scheduling: date controls, calendar, slot details, action drawer. Calendars are never forced into tables.

## 9. Spacing, typography, language

- Spacing scale 4 · 8 · 12 · 16 · 20 · 24 · 32 px; page gutters via `rp-container` / `--rp-space-page-x`.
- One page title (`AdminPageHeader`), section titles 15px bold, table headers 12px uppercase, captions 11–12px.
- Vietnamese UI text through `tr`/`trf` with JA entries; never show class names, enum values, JSON, route paths or
  debug strings. JLPT, SRS, AI, PayOS, KPI stay as product terms.

## 10. Accessibility

Keyboard reachable controls, visible focus, dialog focus trap + return focus + Escape, `aria-expanded` on toggles,
`aria-sort` on sortable headers, `aria-pressed` on filter pills, labelled icon buttons (tooltip + `aria-label`),
status never conveyed by colour alone, reduced-motion respected.
