# UI Design System — RikiPath Soft Sakura Rose × Elegant Japanese EdTech

Sources of truth: `src/styles/tokens.css` (colour/spacing/type tokens), `src/styles/design-system.css`
(controls, focus, motion tokens), `src/components/ui/*` (shared components). Reuse before adding.

## Official Design Reference: Login Page (`Auth.jsx` / `AuthLayout.jsx`)

The Login screen is the **canonical color & surface reference** for all RikiPath.Web workspaces (Public, Learner, Giáo viên / Mentor, Admin, Content Author):
- **Aesthetic**: **Soft Sakura Rose × Elegant Japanese EdTech × Clean Premium UI**.
- **Rule of Restraint**: Pink is a refined accent, never a blanket background fill. Cards, tables, and calendar grids stay crisp white (`#FFFFFF`) on warm ivory paper (`#FAF8F6` / `#FCFBFA`).
- **No Dark Burgundy / Harsh Maroon**: Never use overly dark wine/burgundy (`#A1334E`, `#8C2340`, `#AD3155`, `#8E1B36`, `#681630`) or oversaturated neon red/pink for primary buttons, active tabs, or calendar event cards.

## Global Color Tokens (`src/styles/tokens.css`)

| Role | Token | Value | Usage |
|---|---|---|---|
| **Sakura Accent** | `--color-rp-brand` | `#E05A7A` | Checkboxes, switches, progress bars, active indicator bars, focus rings |
| **Primary Rose (Login Button)** | `--color-rp-brand-pressed` | `#CC4B6B` | Primary CTA buttons, selected calendar day circles, active view pills |
| **Primary Hover / Strong Rose Text** | `--color-rp-brand-strong` | `#B53D5C` | Primary button hover, active sidebar nav label, readable Sakura text (WCAG AA ≥ 4.7:1 on white & `#FFF4F7`) |
| **Primary Active / Pressed** | `--color-rp-brand-deep` | `#9E3350` | Active/pressed button state, deep rose emphasis |
| **Soft Pink / Rose Tint Surface** | `--color-rp-brand-tint` | `#FFF4F7` | Active sidebar item fill, subtle badge/chip fill, hover tint |
| **Soft Rose Pill Surface** | `--color-rp-brand-soft` | `#FCEAEF` | Progress track, soft Sakura tag/pill background |
| **Soft Rose Border** | `--color-rp-brand-border` | `#F2CCD7` | Active card/chip border, subtle Sakura outline |
| **Page Background (Warm Ivory)** | `--color-rp-bg` / `--color-rp-bg-2` | `#FAF8F6` / `#FCFBFA` | App shell paper canvas, subtle secondary container fill |
| **Card / Elevated Surface** | `--color-rp-surface` | `#FFFFFF` | Cards, modals, drawers, popovers, tables, calendar grids |
| **Border / Hairline Divider** | `--color-rp-line` / `--color-rp-line-strong` | `#E8E1E3` / `#DEC9CE` | Card borders, table dividers, form control borders |
| **Text Hierarchy** | `--color-rp-text` / `--color-rp-text-2` / `--color-rp-text-muted` | `#2D282A` / `#5F5559` / `#776C70` | Primary charcoal ink, secondary copy, WCAG AA muted captions |
| **Semantic Status** | `--color-rp-success[-bg/-line]` | `#0D7A42` / `#ECF8F0` / `#BBE5C8` | Completed, approved, valid selection (always paired with text + icon) |
| **Semantic Warning** | `--color-rp-warning[-bg/-line]` | `#8C4D0C` / `#FFF9EB` / `#F5DC9C` | Pending review, reminder, caution notice |
| **Semantic Danger** | `--color-rp-danger[-bg/-line]` | `#C22A2A` / `#FEF1F1` / `#F3C4C4` | Errors, conflicts, destructive actions (distinct from Sakura pink) |
| **Semantic Info** | `--color-rp-info[-bg/-line]` | `#1D62AB` / `#EEF5FD` / `#CFE2F8` | Informational banners, approved schedule badges |
| **Feature & Sidebar Tones** | `--color-tone-*` & `.rp-nav-tile[data-tone]` | Harmonized pastel bg + high-contrast glyph | 2D colorful feature icon tiles (vocab, grammar, kanji, listening, reading, writing, speaking, mock, mentor, haru) |

## Calendar & Schedule Color Harmonization (`calendarGeometry.js`)

- **Grid Canvas**: Uniform clean white (`#FFFFFF`) across all hours and days (Mon–Sun share identical white surface; no weekend column fill and no colored Morning/Noon/Afternoon/Evening background bands).
- **Gridlines**: Subtle light gray (`border-gray-200/80` hour lines, `border-dashed border-gray-100` half-hour lines).
- **15-Minute Rest Buffer**: Subtle dashed border indicator (`border-dashed border-rp-line/80`), never yellow striped blocks.
- **Semantic Schedule Status & Event Type Colors**:
  - **Buổi lớp nhóm / Đã xếp lớp (`session` / `booked`)**: Sakura Pink `#CE476D` (surface `#FFF5F7`, border `#F2CCD7`, left accent `#CE476D`, ink `#7D2941`).
  - **Chờ duyệt (`pending`)**: Amber `#E4A020` (surface `#FFFBF2`, border `#F3D7A4`, left accent `#E4A020`, ink `#784506`).
  - **Đã duyệt (`approved`)**: Teal `#0D9488` (surface `#F0FDFA`, border `#99F6E4`, left accent `#0D9488`, ink `#115E59`).
  - **Đã công bố (`open`)**: Blue `#3B82F6` (surface `#EFF6FF`, border `#BFDBFE`, left accent `#3B82F6`, ink `#1E3A8A`).
  - **Đã hoàn thành (`present`)**: Green `#16A34A` (surface `#F0FDF4`, border `#BBF7D0`, left accent `#16A34A`, ink `#14532D`).
  - **Bị từ chối (`rejected` / `conflict`)**: Red `#DC3545` (surface `#FFF5F5`, border `#F5C2C7`, left accent `#DC3545`, ink `#842029`).
  - **Đã hủy (`cancelled`)**: Gray `#8B8B97` (surface `#F8F8FA`, border `#E2E2E8`, left accent `#8B8B97`, ink `#5E5E6A`).
  - **Đang chọn chưa gửi (`selected` Draft)**: Light Green `#22C55E` (surface `#F3FEF6`, border `#86EFAC`, left accent `#22C55E`, ink `#14532D`).

## Surfaces & roles

- App shell: Japanese paper background (`.rp-paper-bg`, dotted, fixed layer) — full for Learner, quiet for
  Mentor / Content Author / Admin (`data-paper="quiet"`).
- Header: dynamic sky (`src/features/atmosphere`), full for Learner, subtle for Mentor, minimal for
  Admin / Content Author, user-switchable (sky + weather / sky only / off).
- Landing: one hero container + section bands (white → ivory → mint → peach → cinematic CTA).

## Illustrations & icons

- UI icons: `lucide-react` at 16–20px, semantic tone colour.
- Feature illustrations: `StudyIllustration` (`src/features/landing/components/StudyIllustrations.jsx`) —
  original "Sakura clay" SVGs (contact shadow, extrusion, gradient face, gloss). Sizes `sm` 40 / `md` 72 /
  `lg` 120. Add new ones with the same recipe; never use emoji or flat icons with a shadow as "3D".
- Photography: `src/assets/photos.js` only (licence/provenance noted there).

## Components

Buttons, inputs, selects, checkboxes, radios, popovers, modals, toasts, loaders and empty/error states come
from `src/components/ui`. Do not restyle them per screen; extend the shared component instead.
