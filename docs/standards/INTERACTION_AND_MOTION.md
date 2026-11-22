# Interaction & motion

Motion tokens live in `src/styles/design-system.css` (`--rp-dur-fast` 140ms, `--rp-dur-standard` 200ms,
`--rp-dur-overlay` 260ms, `--rp-ease`, spring). Use them; do not invent per-screen durations.

| Kind | Duration | Notes |
|---|---|---|
| Press / focus feedback | 120–160ms | scale ≤ 0.98, colour |
| Hover (cards, links, icons) | 180–240ms | lift ≤ 4px, no layout change |
| Dialogs, popovers, drawers | 220–320ms | opacity + transform |
| Scene crossfades (sky, slideshow) | 600–1400ms | opacity only |

## Rules

1. Animate `transform` and `opacity` only (paint-only exceptions: `stroke-dashoffset`, `background-size`).
2. No React state per animation frame; pointer effects write CSS variables inside `requestAnimationFrame`.
3. Decorative animation pauses when the tab is hidden and when off-screen (IntersectionObserver), and stops
   under `prefers-reduced-motion` (content stays visible and complete).
4. Content must be readable without JavaScript animation: reveal effects are armed by JS (`rp-reveal-on`).
5. Never animate tables, forms or data-heavy workspace views; Mentor/Admin screens favour stillness.
6. No WebGL/Three.js for icons or controls. A 3D scene is allowed only when it adds clear value, is lazy-loaded,
   has a static fallback and caps device pixel ratio. (The current landing uses CSS/SVG 2.5D, no WebGL.)
7. Limit particles (≤ ~20 DOM nodes per decorative scene); clean up timers, observers and listeners on unmount.
8. Locale changes must not trigger animation or layout shift.
