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
| **Page Background (Warm Ivory)** | `--color-rp-bg` / `--color-rp-bg-2` / `--color-rp-admin-bg` | `#FAF8F6` / `#FCFBFA` / `#F8F6F4` | App shell paper canvas, Admin creamy neutral workspace background (`#F8F6F4`) |
| **Table Header / Row Hover / Active Pill** | `--color-rp-table-head` / `--color-rp-row-hover` / `--color-rp-tab-active-bg` | `#FAF7F8` / `#FFF9FA` / `#FFF0F4` | Crisp table header separation, subtle Sakura row hover, and active segmented pill highlight |
| **Card / Elevated Surface** | `--color-rp-surface` | `#FFFFFF` | Cards, modals, drawers, popovers, tables, calendar grids |
| **Border / Hairline Divider** | `--color-rp-line` / `--color-rp-line-strong` | `#EAE3E4` / `#DEC9CE` | Card borders, table dividers, form control borders |
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
- **Semantic Schedule Status Colors (4 Main + 2 Exception Statuses)**:
  - **Chờ duyệt (`pending`)**: Amber Yellow `#E4A020` (surface `#FFFBF2`, border `#F3D7A4`, left accent `#E4A020`, ink `#784506`).
  - **Đã duyệt (`approved` — Đã duyệt bởi Admin, chưa xếp lớp)**: Teal `#0D9488` (surface `#F0FDFA`, border `#99F6E4`, left accent `#0D9488`, ink `#115E59`).
  - **Đã xếp lớp (`session` / `booked` — Buổi lớp nhóm)**: Sakura Pink `#CE476D` (surface `#FFF5F7`, border `#F2CCD7`, left accent `#CE476D`, ink `#7D2941`). Tuyệt đối không dùng màu xanh biển cho trạng thái đã xếp lớp hoặc nhãn `"Đã công bố"`.
  - **Đã hoàn thành (`present` — Xác nhận hoàn thành theo lifecycle Backend)**: Green `#16A34A` (surface `#F0FDF4`, border `#BBF7D0`, left accent `#16A34A`, ink `#14532D`).
  - **Bị từ chối (`rejected` / `conflict`)**: Red `#DC3545` (surface `#FFF5F5`, border `#F5C2C7`, left accent `#DC3545`, ink `#842029`).
  - **Đã hủy (`cancelled`)**: Neutral Gray `#8B8B97` (surface `#F8F8FA`, border `#E2E2E8`, left accent `#8B8B97`, ink `#5E5E6A`).
  - **Đang chọn chưa gửi (`selected` — Draft cục bộ trên client)**: Light Green `#22C55E` (surface `#F3FEF6`, border `#86EFAC`, left accent `#22C55E`, ink `#14532D`).

## Surfaces & roles

- App shell: Japanese paper background (`.rp-paper-bg`, dotted, fixed layer) — full for Learner, subtle grain for
  Mentor / Content Author (`data-paper="quiet"`), and clean distraction-free warm creamy ivory (`#F8F6F4`, no background dots) for Admin (`data-shell="admin"`).
- Header: Dynamic Sky 2.0 (`src/features/atmosphere`, engine in `engine/`) — one shared engine for every role
  (no role-based effect policy); the user chooses display mode (sky + weather / sky only / off), effect intensity
  (Nhẹ default / Vừa / Mạnh) and seasonal decoration (auto / on / off). Weak devices, data-saver and reduced motion
  lower the effects automatically. Weather visuals come only from provider data; seasonal decoration is an estimate.
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
Admin catalog/CRUD screens (`AdminStudyCatalog`, `AdminCertificateSections`, `AdminUsers`) follow the **Compact Management Table + Contextual Create/Edit Modal** pattern defined in `WORKSPACE_LAYOUT_AND_INTERACTION_STANDARDS.md` (Section 3) — avoid inline multi-column `.course-form` blocks or technical `#id` labels on regular management tables.

## UI Sizing, Spacing & Density Standards

All controls, overlays, and views follow the **Compact Premium Sakura UI** scale defined in `src/styles/tokens.css`, `src/styles/design-system.css`, and `src/components/ui/*`:

| Component / Surface | Standard Size / Padding | Implementation Contract |
|---|---|---|
| Button Small (`size="sm"`) | `32–36px` height (`h-8` = `32px`) | Toolbar actions, row buttons, compact retry CTAs (`Button`, `Pagination`) |
| Button Medium (`size="md"`) | `36–40px` height (`h-[38px]` / `--rp-control-h-md`) | Default form, dialog footer, and workspace actions (`Button`) |
| Button Large (`size="lg"`) | `40–44px` height (`h-[42px]` / `--rp-control-h-lg`) | Auth submit, wizard primary step CTA, high-emphasis flows (`Button size="lg"`) |
| Input / Select / Date / Time | `40–44px` height (`h-10` = `40px`) | Unified field focus ring and icon offset (`Input`, `Select`, `DateInput`, `TimeInput`) |
| OTP Digit Field | `48–54px` height, comfortable 6-column grid (`grid-cols-6`) | Spans form width comfortably with clear borders even when disabled (`VerifyEmail`) |
| Status Badge | `24–28px` height (`min-h-[26px]` default, `min-h-[22px]` sm) | Text label + semantic icon/dot (`Badge`) |
| Filter / Segmented Control | `34–40px` height (`h-8` pills in `p-1`, `h-8.5` triggers) | `Tabs`, `StatusDotListbox`, `ScheduleMoreFiltersPopover` |
| Table Row | `44–52px` height (`--rp-table-cell-y`, compact/comfortable) | `DataTable` without redundant pagination wrapper padding |
| Modal / Drawer Header & Footer | `16–20px` padding (`px-5 py-3.5` header, `px-5 py-3` footer) | `Modal`, `Drawer`, `AlertDialog` (`max-w-[420px] p-5`), and domain modals |
| Popover / Mini Calendar | Content-sized + viewport cap (`max-w-[calc(100vw-24px)]`) | `HeaderCalendarPopover` (`w-[328px] sm:w-[340px]`), `MiniDateJump` (`w-[252px]`), compact inline errors |

Mandatory rules for every new or updated screen:
1. **Use shared size tokens and primitives**: never hard-code oversized control heights (`h-12`+ buttons, `py-3` inputs) or bloated modal padding (`p-6`/`p-8` on compact dialogs).
2. **Avoid unnecessary whitespace**: keep banners, cards, empty/error states, and section spacing proportional to content so primary workspace controls stay within the first viewport.
3. **Clear visual hierarchy & readable contrast**: never shrink text below readable limits just to cram density; keep line-height, icon size (`16–20px`), and icon-text gaps balanced.
4. **Accessible touch & keyboard targets**: maintain `>= 40px` touch comfort on coarse pointers (`--rp-tap-min`), visible focus rings (`--rp-focus-ring`), keyboard navigation, and zero horizontal overflow at desktop, tablet, and mobile widths.
5. **Preserve Sakura restraint**: keep large surfaces neutral white/ivory and reserve Sakura Pink for primary CTAs, active selection, and Today indicators.

## Unified UI Component & Motion Standards

1. **Custom Select over Native Select**: All workspace toolbars, filters, and form dialogs must use the shared accessible `CustomSelect` (`Select` from `@/components/ui`) instead of raw native `<select>`. This guarantees soft popover surfaces, subtle borders, Sakura hover, selected checkmarks, status dotClass/count support, auto-flip collision positioning, and full ARIA `combobox`/`listbox` keyboard navigation (ArrowUp/Down, Home/End, Enter, Space, Escape).
2. **Sliding Segmented Tabs**: `Tabs` with `variant="pill"` use a hardware-accelerated (`transform: translate3d(...)`), spring-eased (`var(--rp-ease)`), sliding active pill background that smoothly glides between tabs while respecting `prefers-reduced-motion`.
3. **Accessible Form Controls**: `Input`, `Textarea`, `Checkbox`, `Radio`, and `Switch` share consistent border tokens, focus rings (`focus:shadow-[0_0_0_3px_rgba(224,90,122,0.18)]`), and semantic error styling (`border-rp-danger`).
4. **Reusable Listbox Foundations**: Teacher status filters (`StatusDotListbox`) and Admin entity dropdowns share the exact same `CustomSelect` primitive, avoiding duplicate dropdown logic across workspaces.
5. **Unified Soft Sakura Profile Surface**: `/profile` across all roles (`Learner`, `Mentor`, `ContentAuthor`, `Admin`) uses the calm `#FFFFFF` card / `#FAF7F8` subtle tint / `#FFF0F4` active pill nav / `#EAE3E4` hairline hierarchy with shared `<Avatar>`, `<Switch>`, `<Modal>`, and `<AlertDialog>` primitives (no oversized pink hero banners or raw unguarded `<img>` tags).
