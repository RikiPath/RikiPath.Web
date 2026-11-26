import { useEffect, useState } from 'react';
import { ACCESS } from './featureAccess.js';

const HIGHLIGHT_MS = 12_000;
const SETTLED = new Set([ACCESS.ACTIVE, ACCESS.FREE, ACCESS.EXPIRED, ACCESS.PENDING_PAYMENT]);

/**
 * Detects real lock → unlock transitions of navigation destinations, driven only by the Backend entitlement
 * cache (`useStudyAccess` / `GET /subscriptions/me`). Returns the destinations that were locked in a previous
 * settled answer and are open now, for a short one-time "Đã mở khóa" highlight.
 *
 * - The first settled answer only records a baseline (no highlight on page load or navigation).
 * - Loading/error answers are ignored (no false unlock flash, no false lock).
 * - The highlight is held while a modal is open (e.g. the purchase celebration) so the learner still sees it.
 */
export function useJustUnlocked(access, destinations) {
  const ready = Boolean(access && SETTLED.has(access.status));
  const lockedNow = ready ? destinations.filter((to) => access.lockStateFor(to) === 'locked') : null;
  const signature = lockedNow ? lockedNow.join('|') : null;
  const [snap, setSnap] = useState({ signature: null, locked: [], recent: [] });

  // Derived-state update during render (React "storing information from previous renders" pattern).
  if (signature !== null && signature !== snap.signature) {
    const opened = snap.signature === null ? [] : snap.locked.filter((to) => !lockedNow.includes(to));
    setSnap({
      signature,
      locked: lockedNow,
      recent: opened.length > 0 ? opened : snap.recent.filter((to) => !lockedNow.includes(to)),
    });
  }

  useEffect(() => {
    if (snap.recent.length === 0) return undefined;
    let timer = 0;
    const clear = () => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        timer = window.setTimeout(clear, 2000);
        return;
      }
      setSnap((prev) => ({ ...prev, recent: [] }));
    };
    timer = window.setTimeout(clear, HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [snap.recent]);

  return snap.recent;
}
