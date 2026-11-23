# RikiPath.Web — rules for every change

Follow the standards in `docs/standards/` (single source; do not restate them elsewhere):

- `PRODUCT_TERMINOLOGY.md` — VI/JA product vocabulary and business facts copy must respect.
- `UX_WRITING_AND_I18N.md` — `tr` / `trf` / `fmt`, error mapping, UI states, writing voice.
- `UI_DESIGN_SYSTEM.md` — tokens, Sakura surfaces per role, shared primitives, and UI Sizing, Spacing & Density Standards.
- `INTERACTION_AND_MOTION.md` — durations, transform/opacity only, reduced motion, no needless WebGL.
- `WORKSPACE_ARCHITECTURE.md` — multi-role workspace navigation, sidebar hierarchy, and route contracts.
- `WORKSPACE_LAYOUT_AND_INTERACTION_STANDARDS.md` — mandatory 12 rules for compact workspaces, one-primary-view-at-a-time (`Lịch | Danh sách`), modal/drawer/popover selection, multi-select calendar UX, user-first terminology, and the **Complete Workspace UX Review Standard**.
- `MANAGEMENT_UI_SYSTEM.md` — Admin / Mentor / Content Author shell, scroll ownership, neutral sidebar, data-listing template, table + pagination contract, empty states, modal/drawer/wizard layout.
- `AUTHENTICATION_FLOW.md` — Login, registration OTP, recovery, Google identity, and anti-abuse boundaries.

Every new screen ships with Vietnamese + Japanese text (no hard-coded strings), uses shared components and
tokens, handles loading/empty/error/offline/forbidden states, and keeps layout stable for longer Japanese labels.
Check dictionaries with `node scripts/check-locales.mjs` (missing JA entries, duplicate keys).

Note for cross-repo tasks: `RikiPath.Backend` enforces a permanent **No Backend Tests** rule (`RikiPath.Backend/CLAUDE.md`) — never create `.NET` test files or run `dotnet test` in `RikiPath.Backend`.
