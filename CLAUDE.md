# RikiPath.Web — rules for every change

Follow the standards in `docs/standards/` (single source; do not restate them elsewhere):

- `PRODUCT_TERMINOLOGY.md` — VI/JA product vocabulary and business facts copy must respect.
- `UX_WRITING_AND_I18N.md` — `tr` / `trf` / `fmt`, error mapping, UI states, writing voice.
- `UI_DESIGN_SYSTEM.md` — tokens, surfaces per role, illustrations, shared components.
- `INTERACTION_AND_MOTION.md` — durations, transform/opacity only, reduced motion, no needless WebGL.

Every new screen ships with Vietnamese + Japanese text (no hard-coded strings), uses shared components and
tokens, handles loading/empty/error/offline/forbidden states, and keeps layout stable for longer Japanese labels.
Check dictionaries with `node scripts/check-locales.mjs` (missing JA entries, duplicate keys).
