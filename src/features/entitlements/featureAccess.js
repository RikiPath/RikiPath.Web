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

function isSelfStudyPlan(purchase) {
  if (!purchase) return false;
  const kind = String(purchase.kind ?? purchase.planKind ?? purchase.category ?? '').toLowerCase();
  if (kind) {
    if (kind === 'mentor' || kind.includes('ai') || kind.includes('credit')) return false;
    if (kind.includes('study') || kind === 'bundle' || kind === 'subscription') return true;
  }
  if (purchase.durationDays != null) {
    return Number(purchase.durationDays) > 0;
  }
  if (purchase.endDate != null) {
    return true;
  }
  const name = String(purchase.planName || '');
  if (/(lượt ai|gói ai|chấm ai|lộ trình ai|credit|speaking|writing|learning path)/i.test(name)) {
    return false;
  }
  if (purchase.isSelfStudy != null) return Boolean(purchase.isSelfStudy);
  const id = Number(purchase.planId ?? purchase.subscriptionPlanId);
  return Number.isInteger(id) && id > 0 && (purchase.aiUsesRemaining ?? 0) === 0;
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
  if (studyPurchases.some((p) => (p.active ?? p.isActive) === false || p.endDate)) return ACCESS.EXPIRED;
  return ACCESS.FREE;
}

/** Which entitlement a destination needs (from the route table), or null when it is freely reachable. */
export function requiredEntitlement(to) {
  const route = matchRoute(cleanPath(to));
  return route?.study ? 'self-study' : null;
}

/** Longest-prefix match against server-returned `data.features[].routes` (or legacy `routePrefixes`). */
export function findFeatureForPath(to, features = null) {
  if (!Array.isArray(features) || features.length === 0) return null;
  const path = cleanPath(to).toLowerCase();
  let best = null;
  let bestLen = -1;
  for (const feature of features) {
    const prefixes = Array.isArray(feature?.routes)
      ? feature.routes
      : Array.isArray(feature?.routePrefixes)
        ? feature.routePrefixes
        : [];
    for (const rawPrefix of prefixes) {
      const prefix = cleanPath(rawPrefix).toLowerCase();
      if (!prefix) continue;
      const matches = path === prefix || path.startsWith(`${prefix}/`);
      if (matches && prefix.length > bestLen) {
        best = feature;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}

/** Why a destination is locked — drives the copy and CTA of the unlock dialog. */
export const LOCK_KIND = Object.freeze({
  ADMIN_DISABLED: 'admin-disabled',
  CREDIT: 'credit',
  PLAN_AND_CREDIT: 'plan-and-credit',
  PLAN: 'plan',
});

/**
 * Lock cause for a destination from the server-evaluated feature (same rules as the Backend
 * `SubscriptionAccessService.EffectiveState`): an Admin suspension is never reported as a missing plan or credits.
 * Returns null when the destination is not locked by a server feature.
 */
export function featureLockKind(to, features = null) {
  const feature = findFeatureForPath(to, features);
  if (!feature || feature.allowed === true) return null;
  const mode = String(feature.accessMode || '').toUpperCase();
  if (String(feature.accessSource || '').toUpperCase() === 'DISABLED' || mode === 'DISABLED') return LOCK_KIND.ADMIN_DISABLED;
  if (mode === 'CREDIT_REQUIRED') return LOCK_KIND.CREDIT;
  if (mode === 'PLAN_AND_CREDIT') return feature.grantedByPlanName ? LOCK_KIND.CREDIT : LOCK_KIND.PLAN_AND_CREDIT;
  return LOCK_KIND.PLAN;
}

/** What a locked feature needs, as shown to the learner (badge, art, wording). */
export const ACCESS_REASON = Object.freeze({
  PLAN: 'plan',
  CREDIT: 'credit',
});

/** Missing plan wins over missing credits; only a credits-only lock reads as "needs AI credits". */
export function accessReasonForKind(kind) {
  return kind === LOCK_KIND.CREDIT ? ACCESS_REASON.CREDIT : ACCESS_REASON.PLAN;
}

/** Tooltip / aria reasons per lock cause (VI keys; JA in locales/ja/learnerScreens.js). */
export const LOCK_REASON_PLAN = 'Bạn cần mua gói tự học để mở khóa tính năng này.';
export const LOCK_REASON_CREDIT = 'Bạn cần có lượt AI để sử dụng tính năng này.';
export const LOCK_REASON_DISABLED = 'Tính năng này hiện chưa khả dụng.';

/**
 * Lock reason for a destination, decided by the lock cause rather than by free server text, so a learner
 * who only ran out of AI credits is never told to buy a plan again. A missing plan wins over missing
 * credits (`PLAN_AND_CREDIT` without a plan → plan reason). Only an Admin suspension keeps the server text.
 */
export function featureLockReason(to, features = null) {
  const kind = featureLockKind(to, features);
  if (kind === LOCK_KIND.CREDIT) return LOCK_REASON_CREDIT;
  if (kind === LOCK_KIND.ADMIN_DISABLED) return findFeatureForPath(to, features)?.lockReason || LOCK_REASON_DISABLED;
  return LOCK_REASON_PLAN;
}

/**
 * Lock state for a destination: 'locked' | 'open' | 'unknown'.
 * 'unknown' (loading / error / forbidden) must render exactly like 'open' in navigation — no lock flash,
 * no false "buy a plan" — and the direct-URL gate + Backend keep protecting the content.
 */
export function featureLockState(to, status, features = null) {
  if (status === ACCESS.NOT_APPLICABLE) return 'open';
  const serverFeature = findFeatureForPath(to, features);
  if (serverFeature) {
    if (serverFeature.allowed === true) return 'open';
    if (status === ACCESS.LOADING || status === ACCESS.ERROR || status === ACCESS.FORBIDDEN) return 'unknown';
    return 'locked';
  }
  if (!requiredEntitlement(to)) return 'open';
  if (status === ACCESS.ACTIVE) return 'open';
  if (LOCKING.has(status)) return 'locked';
  return 'unknown';
}

export function isLockingStatus(status) {
  return LOCKING.has(status);
}
