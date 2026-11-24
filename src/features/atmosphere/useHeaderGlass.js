import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { glassPolarity, glassVars, resolveGlassVariant } from './engine/headerGlass.js';

const CONTRAST_QUERY = '(prefers-contrast: more), (forced-colors: active)';

function subscribeContrast(cb) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(CONTRAST_QUERY);
  mq.addEventListener?.('change', cb);
  return () => mq.removeEventListener?.('change', cb);
}
const getContrast = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(CONTRAST_QUERY).matches : false);

function subscribeTheme(cb) {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => {};
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  return () => obs.disconnect();
}
const getTheme = () => {
  if (typeof document === 'undefined') return 'light';
  const el = document.documentElement;
  return el.dataset.theme === 'dark' || el.classList.contains('dark') ? 'dark' : 'light';
};

/** Timings of the safe switch (ms): ink fades out → surface swaps while ink is hidden → ink fades back in. */
export const GLASS_SWITCH = { fadeOut: 160, swapAt: 180, settle: 420 };

/**
 * Header glass appearance for the current scene. Same-polarity changes (e.g. light → warm) just cross-fade
 * the surface. A polarity flip (light glass ↔ dark glass) runs in two phases so there is never a frame with
 * dark ink on dark glass or light ink on light glass: `switching` is set, ink fades out, the new tokens are
 * applied while the ink is hidden, then the ink fades back in. Reduced motion → immediate swap.
 */
export function useHeaderGlass(scene, { lowPower = false, reducedMotion = false } = {}) {
  const highContrast = useSyncExternalStore(subscribeContrast, getContrast, () => false);
  const themeMode = useSyncExternalStore(subscribeTheme, getTheme, () => 'light');
  const target = resolveGlassVariant(scene, { themeMode, highContrast });
  const [applied, setApplied] = useState(target);
  const [switching, setSwitching] = useState(false);
  const timers = useRef([]);
  const switchingRef = useRef(false);
  const setSwitch = (v) => {
    switchingRef.current = v;
    setSwitching(v);
  };

  useEffect(() => {
    if (target === applied) {
      if (!switchingRef.current) return undefined;
      // A switch interrupted by another scene change still ends with the ink visible.
      const t = setTimeout(() => setSwitch(false), GLASS_SWITCH.settle - GLASS_SWITCH.swapAt);
      return () => clearTimeout(t);
    }
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const flip = glassPolarity(target) !== glassPolarity(applied);
    if (!flip || reducedMotion) {
      // Same-polarity change: CSS transitions the surface; no ink fade needed.
      const t = setTimeout(() => setApplied(target), 0);
      timers.current.push(t);
      return () => clearTimeout(t);
    }
    timers.current.push(
      setTimeout(() => setSwitch(true), 0),
      setTimeout(() => setApplied(target), GLASS_SWITCH.swapAt),
      setTimeout(() => setSwitch(false), GLASS_SWITCH.settle),
    );
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, [target, applied, reducedMotion]);

  const style = useMemo(() => glassVars(applied, { reduceBlur: lowPower }), [applied, lowPower]);
  return { variant: applied, polarity: glassPolarity(applied), switching, style };
}
