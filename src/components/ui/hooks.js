import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

let openLayers = 0;

/** Traps Tab focus inside `ref`, closes on Escape, restores focus and locks body scroll. */
export function useFocusTrap(ref, { open, onEscape, initialFocusRef } = {}) {
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!open) return undefined;
    const node = ref.current;
    const previouslyFocused = document.activeElement;
    openLayers += 1;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const target = initialFocusRef?.current || node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE) || node;
      target?.focus?.({ preventScroll: true });
    };
    const raf = window.requestAnimationFrame(focusFirst);

    function onKeyDown(event) {
      if (!node) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    node?.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      node?.removeEventListener('keydown', onKeyDown);
      openLayers = Math.max(0, openLayers - 1);
      if (openLayers === 0) document.body.style.overflow = prevOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus({ preventScroll: true });
    };
  }, [open, ref, initialFocusRef]);
}



function subscribeOnline(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

export function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/* ------------------------------------------------------------------ Hooks */

/**
 * Guards an async action against double submit (double click, Enter + click,
 * StrictMode re-entry). Returns [run, pending]. `run` ignores calls while one is in flight.
 */
export function useSubmitGuard(action) {
  const inFlight = useRef(false);
  const actionRef = useRef(action);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    actionRef.current = action;
  }, [action]);
  const run = useCallback(async (...args) => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setPending(true);
    try {
      return await actionRef.current(...args);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);
  return [run, pending];
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Delays showing a loading indicator (e.g. 180ms) to avoid flashing on fast
 * local/cached responses, without forcing already-resolved requests to wait.
 */
export function useDelayedLoading(active, delayMs = 180) {
  const [pastDelay, setPastDelay] = useState(delayMs <= 0);
  useEffect(() => {
    if (!active || delayMs <= 0) return undefined;
    const resetTimer = window.setTimeout(() => setPastDelay(false), 0);
    const showTimer = window.setTimeout(() => setPastDelay(true), delayMs);
    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(showTimer);
    };
  }, [active, delayMs]);

  if (!active) return false;
  if (delayMs <= 0) return true;
  return pastDelay;
}
