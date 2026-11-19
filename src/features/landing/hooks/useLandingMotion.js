import { useLayoutEffect } from 'react';

const INTRO_KEY = 'rikipath.landingIntroSeen';
const INTRO_WINDOW_MS = 1500;
// The decision is taken once per page load; React StrictMode re-runs the effect within this window,
// while a later in-app navigation back to "/" falls outside it and skips the intro.
let introPlayUntil = 0;

function shouldPlayIntro() {
  const now = Date.now();
  if (now < introPlayUntil) return true;
  if (introAlreadySeen()) return false;
  markIntroSeen();
  introPlayUntil = now + INTRO_WINDOW_MS;
  return true;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function introAlreadySeen() {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return true; // storage blocked: skip the cinematic intro rather than replaying it on every visit
  }
}

function markIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_KEY, '1');
  } catch {
    // best-effort
  }
}

/**
 * Landing motion wiring (no per-frame React state):
 *  - `rp-intro-play` on the root plays the first-visit hero sequence once per browser session.
 *  - `rp-reveal-on` arms scroll reveals; one IntersectionObserver adds `.is-in` to each
 *    `[data-reveal]` the first time it enters the viewport, then stops watching it.
 *  - `[data-idle]` regions get `data-paused` while off-screen so idle loops stop compositing.
 * Content is visible by default: classes are only added after JS runs, and never under
 * prefers-reduced-motion, so a script failure or reduced motion shows everything immediately.
 */
export function useLandingMotion(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return undefined;

    if (shouldPlayIntro()) root.classList.add('rp-intro-play');

    root.classList.add('rp-reveal-on');
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    root.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));

    const idle = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.toggleAttribute('data-paused', !entry.isIntersecting);
    });
    root.querySelectorAll('[data-idle]').forEach((el) => idle.observe(el));

    return () => {
      reveal.disconnect();
      idle.disconnect();
      root.classList.remove('rp-reveal-on', 'rp-intro-play');
    };
  }, [rootRef]);
}

export const __testing = {
  INTRO_KEY,
  shouldPlayIntro,
  reset() {
    introPlayUntil = 0;
  },
};
