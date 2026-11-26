/**
 * One gate for every celebration / reminder modal in the Learner app (Learning Moments, streak dialog).
 *
 * The server already guarantees exactly-once per event (atomic claim); this gate decides *when* a claimed event may
 * open in this tab so that dialogs never stack or chain:
 *  - one modal at a time (`holder`);
 *  - after the learner closes a dialog, the next celebration waits `MOMENT_GAP_MS`;
 *  - reminders (streak) never open while a Learning Moment is pending, nor in the same visit right after a
 *    celebration was shown/closed (`REMINDER_COOLDOWN_MS`) — "Để sau" is never followed by another popup;
 *  - state is scoped to the signed-in user, so switching accounts starts clean.
 *
 * Module state (not React state) so re-renders, StrictMode double effects and remounts cannot re-open anything.
 * The last close time is mirrored to sessionStorage per user purely as pacing (a refresh right after "Để sau" must
 * not pop the next reminder). Nothing here decides business state: entitlements and milestones come only from the
 * Backend, and storage failures simply fall back to in-memory pacing.
 */
export const CELEBRATION_KIND = Object.freeze({ MOMENT: 'moment', REMINDER: 'reminder' });

export const MOMENT_GAP_MS = 45_000;
export const REMINDER_COOLDOWN_MS = 10 * 60_000;

const state = {
  scope: null,
  holder: null,
  lastClosedAt: 0,
  lastMomentAt: 0,
  pendingMoments: false,
};

function now() {
  return Date.now();
}

function storageKey(scope) {
  return `rp.celebration.lastClosed.${scope}`;
}

function readLastClosed(scope) {
  if (scope == null || typeof window === 'undefined') return 0;
  try {
    const value = Number(window.sessionStorage.getItem(storageKey(scope)));
    return Number.isFinite(value) && value > 0 && value <= now() ? value : 0;
  } catch {
    return 0;
  }
}

function writeLastClosed(scope, value) {
  if (scope == null || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey(scope), String(value));
  } catch {
    // Pacing only — ignore storage errors.
  }
}

/** Resets the gate when the signed-in learner changes (logout/login, account switch). */
export function scopeCelebrationGate(userId) {
  const scope = userId ?? null;
  if (state.scope === scope) return;
  state.scope = scope;
  state.holder = null;
  state.lastClosedAt = readLastClosed(scope);
  state.lastMomentAt = 0;
  state.pendingMoments = false;
}

/** Learning Moments publishes whether server moments are still waiting, so reminders yield to them. */
export function setPendingMoments(pending) {
  state.pendingMoments = Boolean(pending);
}

/** True when a dialog of `kind` may open now (pure check; does not reserve the slot). */
export function canOpenCelebration(kind, at = now()) {
  if (state.holder) return false;
  if (kind === CELEBRATION_KIND.REMINDER) {
    if (state.pendingMoments) return false;
    const lastCelebration = Math.max(state.lastClosedAt, state.lastMomentAt);
    return !lastCelebration || at - lastCelebration >= REMINDER_COOLDOWN_MS;
  }
  return !state.lastClosedAt || at - state.lastClosedAt >= MOMENT_GAP_MS;
}

/** Reserves the single modal slot. Returns a release function, or null when the slot is not available. */
export function acquireCelebration(kind, owner) {
  if (!canOpenCelebration(kind)) return null;
  const token = { kind, owner };
  state.holder = token;
  if (kind === CELEBRATION_KIND.MOMENT) state.lastMomentAt = now();
  let released = false;
  return function release({ shown = true } = {}) {
    if (released) return;
    released = true;
    if (state.holder === token) state.holder = null;
    if (shown) {
      state.lastClosedAt = now();
      writeLastClosed(state.scope, state.lastClosedAt);
    }
  };
}

/** Test/debug helper: snapshot of the gate state. */
export function celebrationGateSnapshot() {
  return { ...state, holder: state.holder ? { ...state.holder } : null };
}
