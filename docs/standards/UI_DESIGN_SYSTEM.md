# UI design system — RikiPath Sakura Wonderland

Sources of truth: `src/styles/tokens.css` (colour/spacing/type tokens), `src/styles/design-system.css`
(controls, focus, motion tokens), `src/components/ui/*` (shared components). Reuse before adding.

## Palette (existing tokens first)

| Role | Token / value |
|---|---|
| Primary Sakura (buttons, links) | `--color-rp-brand-pressed` #C24362 |
| Sakura soft / tint | `--color-rp-brand-soft` #FCE7EB, `--color-rp-brand-tint` #FFF0F3 (≈ #FCE9EE) |
| Warm ivory page | #FAF9F6 (`.rp-paper-bg`) |
| Mint / Lavender / Sky fields | #E6F7F3 / #F1EBFF / #EAF4FF (section bands, illustration fields) |
| Deep ink (dark scrims, night sky) | #17243A |
| Feature tones | `--color-tone-*` (vocab, grammar, kanji, listening, reading, writing, speaking, mock, mentor, haru) |

Pink is an accent, not a background for everything. Cards stay white on tinted fields.

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
