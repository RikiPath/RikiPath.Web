import { useEffect, useState } from 'react';
import { computeNextRelativeTickMs } from '@/utils/dateTimeFormat.js';

/**
 * Shared adaptive clock hook for live relative timestamps (e.g. Notification Center).
 * Uses ONE timer per mounted consumer (never one setInterval per row), pauses while the
 * document is hidden, and immediately syncs when returning from background to foreground.
 */
export function useRelativeClock(timestamps = [], enabled = true) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    let timerId = null;

    const schedule = () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      const nextMs = computeNextRelativeTickMs(timestamps, Date.now());
      if (!nextMs) return;
      timerId = window.setTimeout(() => {
        setNowMs(Date.now());
        schedule();
      }, nextMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNowMs(Date.now());
        schedule();
      } else if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    };

    schedule();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [enabled, timestamps]);

  return nowMs;
}
