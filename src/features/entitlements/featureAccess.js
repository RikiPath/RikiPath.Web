/**
 * Smart Feature Lock — pure decision helpers (no React, unit-testable).
 *
 * Single source of truth for "does this destination need something the learner does not own?":
 *  - Which destinations are gated comes from the route table (`study: true` in routeTable.js), which mirrors
 *    the Backend controllers carrying `[RequireSelfStudy]` (lessons/lesson progress, practice exercises,
 *    notebook, assessment-roadmap lessons). Nothing here is keyed on route names.
 *  - Whether the learner owns the self-study plan comes only from `GET /subscriptions/me` (server truth),
 *    never from localStorage or a cached purchase flag.
 *
 * Kinds of entitlement are kept apart on purpose:
 *  - `self-study`  → route-level lock (sidebar, quick search, dashboard shortcuts, direct URL gate).
 *  - AI credits    → checked per action by the AI features themselves (writing/speaking/Haru), NOT a nav lock.
 *  - Group Learning enrollment → per cohort inside Group Learning pages, NOT a nav lock.
 *  - Roles         → handled by ProtectedRoute / ROLE_NAV (a role never sees another role's nav).
 * So only `self-study` routes can ever show a lock in navigation.
 */
import { matchRoute } from '@/app/routes/routeTable.js';

export const ACCESS = Object.freeze({
  NOT_APPLICABLE: 'not-applicable', // not a learner / preview session: no lock UI at all
  LOADING: 'loading',
  ERROR: 'error',
  FORBIDDEN: 'forbidden',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  PENDING_PAYMENT: 'pending-payment',
  FREE: 'free',
});

/** Statuses that are a confirmed "you do not own it" answer from the Backend. */
const LOCKING = new Set([ACCESS.FREE, ACCESS.EXPIRED, ACCESS.PENDING_PAYMENT]);

// Mirrors SubscriptionAccessService.IsStudy (plan ids 1–6 are self-study plans; 81xx are AI/credit packs).
function isSelfStudyPlan(purchase) {
  const id = Number(purchase?.subscriptionPlanId);
  return Number.isInteger(id) && id >= 1 && id <= 6;
}

function isPendingPurchase(purchase) {
  const status = String(purchase?.paymentStatus ?? purchase?.status ?? '').toLowerCase();
  return status === 'pending' || status === 'pendingpayment' || status === 'awaitingpayment';
}

function cleanPath(path) {
  return String(path || '').split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
}

/**
 * Maps the subscription query to one explicit status. An API failure is ERROR (or FORBIDDEN), never FREE.
 */
export function studyAccessStatus({ enabled = true, isPending = false, isError = false, error = null, data = null } = {}) {
  if (!enabled) return ACCESS.NOT_APPLICABLE;
  if (isError) return error?.status === 403 ? ACCESS.FORBIDDEN : ACCESS.ERROR;
  if (isPending || !data) return ACCESS.LOADING;
  if (data.active === true) return ACCESS.ACTIVE;
  const studyPurchases = (Array.isArray(data.purchases) ? data.purchases : []).filter(isSelfStudyPlan);
  if (studyPurchases.some(isPendingPurchase)) return ACCESS.PENDING_PAYMENT;
  if (studyPurchases.some((p) => p.isActive === false || p.endDate)) return ACCESS.EXPIRED;
  return ACCESS.FREE;
}

/** Which entitlement a destination needs (from the route table), or null when it is freely reachable. */
export function requiredEntitlement(to) {
  const route = matchRoute(cleanPath(to));
  return route?.study ? 'self-study' : null;
}

/**
 * Lock state for a destination: 'locked' | 'open' | 'unknown'.
 * 'unknown' (loading / error / forbidden) must render exactly like 'open' in navigation — no lock flash,
 * no false "buy a plan" — and the direct-URL gate + Backend keep protecting the content.
 */
export function featureLockState(to, status) {
  if (!requiredEntitlement(to)) return 'open';
  if (status === ACCESS.ACTIVE || status === ACCESS.NOT_APPLICABLE) return 'open';
  if (LOCKING.has(status)) return 'locked';
  return 'unknown';
}

export function isLockingStatus(status) {
  return LOCKING.has(status);
}
