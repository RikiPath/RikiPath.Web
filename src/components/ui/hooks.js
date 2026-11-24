import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { confirmAction } from './feedbackStore.js';

const FOCUSABLE =
  'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

const activeTrapStack = [];
let baseBodyOverflow = '';

/** Traps Tab focus inside `ref`, closes on Escape (topmost layer only), restores focus and locks body scroll cleanly across stacked overlays. */
export function useFocusTrap(ref, { open, onEscape, initialFocusRef } = {}) {
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!open) return undefined;
    const node = ref.current;
    const previouslyFocused = document.activeElement;
    const layerId = Symbol('focus-trap');
    if (activeTrapStack.length === 0) {
      baseBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeTrapStack.push(layerId);

    const focusFirst = () => {
      const target = initialFocusRef?.current || node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE) || node;
      target?.focus?.({ preventScroll: true });
    };
    const raf = window.requestAnimationFrame(focusFirst);

    function onKeyDown(event) {
      if (!node || activeTrapStack[activeTrapStack.length - 1] !== layerId) return;
      if (event.key === 'Escape') {
        if (document.querySelector('[data-rp-floating-portal="true"]')) {
          return;
        }
        event.stopPropagation();
        escapeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      if (document.activeElement?.closest?.('[data-rp-floating-portal="true"]')) {
        return;
      }
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
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      const idx = activeTrapStack.lastIndexOf(layerId);
      if (idx !== -1) activeTrapStack.splice(idx, 1);
      if (activeTrapStack.length === 0) {
        document.body.style.overflow = baseBodyOverflow;
      }
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, ref, initialFocusRef]);
}

/**
 * Registers browser `beforeunload` warning when `dirty` is true and provides
 * an async `guardLeave` helper backed by `AlertDialog` (`confirmAction`) for in-app transitions.
 */
export function useUnsavedGuard(dirty, options = {}) {
  const {
    title = 'Bỏ thay đổi chưa lưu?',
    description = 'Nội dung bạn đang chỉnh sửa chưa được lưu lại.',
    confirmLabel = 'Rời khỏi',
    cancelLabel = 'Tiếp tục chỉnh sửa',
  } = options;

  useEffect(() => {
    if (!dirty || typeof window === 'undefined') return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const confirmLeave = useCallback(async () => {
    if (!dirty) return true;
    return confirmAction({
      title,
      description,
      confirmLabel,
      cancelLabel,
      tone: 'warning',
    });
  }, [dirty, title, description, confirmLabel, cancelLabel]);

  return { dirty: Boolean(dirty), confirmLeave };
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
