/**
 * Study plan catalog → purchase groups.
 *
 * Grouping key: the Backend plan category `kind` (`SubscriptionAccessService.ResolveCategory`:
 * self_study · speaking · writing · ai_grading · learning_path). Plans of one category grant the same
 * entitlement type and differ only by duration / AI uses / price, so each category is one product card
 * whose variants are its real, active plans. Different categories are never merged (speaking ≠ writing).
 * Names are never parsed; prices are never derived — every number comes from the plan DTO.
 */

import { currentIntlTag } from '@/locales/locale.js';

export function formatVnd(value) {
  return new Intl.NumberFormat(currentIntlTag(), { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

/**
 * Feature display names keyed by the stable feature code (shared by the Learner catalog and Admin screens).
 * The stored name is untouched and still editable through the API; this only replaces labels that mixed
 * English product jargon into the Vietnamese UI.
 */
const FEATURE_DISPLAY_NAMES = {
  PERSONAL_NOTEBOOK: 'Sổ tay cá nhân',
};

export function featureDisplayName(feature) {
  if (!feature) return '';
  if (typeof feature !== 'object') return String(feature);
  const code = String(feature.code || '').toUpperCase();
  return FEATURE_DISPLAY_NAMES[code] || feature.name || '';
}

export const PLAN_GROUP_ORDER = ['self_study', 'speaking', 'writing', 'ai_grading', 'learning_path'];

/** Display metadata per category. Unknown categories fall back to the first plan's own name. */
export const PLAN_GROUP_META = {
  self_study: {
    title: 'Gói tự học JLPT',
    eyebrow: 'Gói tự học',
    description: 'Mở khóa toàn bộ bài học JLPT, kèm lượt chấm AI theo thời hạn gói.',
    icon: 'study',
  },
  speaking: {
    title: 'Luyện nói với AI',
    eyebrow: 'Kỹ năng & Lượt AI',
    description: 'Luyện phát âm và hội thoại, nhận chấm điểm AI theo lượt.',
    icon: 'speaking',
  },
  writing: {
    title: 'Luyện viết với AI',
    eyebrow: 'Kỹ năng & Lượt AI',
    description: 'Luyện viết câu và đoạn văn, nhận nhận xét AI theo lượt.',
    icon: 'writing',
  },
  ai_grading: {
    title: 'Lượt chấm AI nói/viết',
    eyebrow: 'Kỹ năng & Lượt AI',
    description: 'Bổ sung lượt chấm bài nói hoặc viết bằng AI khi bạn cần.',
    icon: 'credit',
  },
  learning_path: {
    title: 'Lượt tạo lộ trình AI',
    eyebrow: 'Kỹ năng & Lượt AI',
    description: 'Thêm lượt để AI đề xuất lộ trình học cá nhân hóa.',
    icon: 'path',
  },
};

const EXCLUDED_KINDS = new Set(['mentor', 'mentor_legacy']);

export function planKind(plan) {
  return String(plan?.kind || '').trim().toLowerCase() || 'other';
}

/** Plans whose access is counted in uses rather than days. */
export function isUsageBased(plan) {
  return Number(plan?.durationDays || 0) <= 0;
}

function compareVariants(a, b) {
  return (Number(a.durationDays) || 0) - (Number(b.durationDays) || 0)
    || (Number(a.aiUses) || 0) - (Number(b.aiUses) || 0)
    || (Number(a.price) || 0) - (Number(b.price) || 0)
    || a.id - b.id;
}

/**
 * @returns {{ key: string, kind: string, meta: object|null, variants: object[], defaultPlanId: number }[]}
 */
export function groupStudyPlans(plans) {
  const byKind = new Map();
  const seenIds = new Set();
  for (const plan of Array.isArray(plans) ? plans : []) {
    if (!plan || !Number.isInteger(plan.id) || seenIds.has(plan.id)) continue;
    const kind = planKind(plan);
    if (EXCLUDED_KINDS.has(kind)) continue;
    seenIds.add(plan.id);
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(plan);
  }

  const rank = (kind) => {
    const index = PLAN_GROUP_ORDER.indexOf(kind);
    return index < 0 ? PLAN_GROUP_ORDER.length : index;
  };

  return [...byKind.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([kind, list]) => {
      const variants = [...list].sort(compareVariants);
      // Default: the variant the catalog marks popular, otherwise the first (shortest) — never "the most expensive".
      const defaultPlanId = (variants.find((v) => v.isPopular) ?? variants[0]).id;
      return { key: kind, kind, meta: PLAN_GROUP_META[kind] ?? null, variants, defaultPlanId };
    });
}

export function findGroupOfPlan(groups, planId) {
  return groups.find((group) => group.variants.some((variant) => variant.id === planId)) ?? null;
}

/**
 * Short, human duration for a variant chip ("1 tuần", "3 tháng", "45 ngày", "1 lượt").
 * Only exact week/month multiples get week/month wording; everything else stays in days.
 */
export function variantDurationLabel(plan, { tr, trf }) {
  const days = Number(plan?.durationDays) || 0;
  if (days <= 0) return trf('{0} lượt', { 0: Math.max(1, Number(plan?.aiUses) || 1) });
  if (days % 30 === 0) return trf('{0} tháng', { 0: days / 30 });
  if (days % 7 === 0 && days < 30) return trf('{0} tuần', { 0: days / 7 });
  return days === 1 ? tr('1 ngày') : trf('{0} ngày', { 0: days });
}

/** Chip labels for a group; when two variants would read the same, the AI uses / plan id disambiguate them. */
export function variantLabels(variants, i18n) {
  const base = variants.map((variant) => variantDurationLabel(variant, i18n));
  return variants.map((variant, index) => {
    const clashes = base.filter((label) => label === base[index]).length > 1;
    if (!clashes) return base[index];
    return Number(variant.aiUses) > 0
      ? i18n.trf('{0} · {1} lượt AI', { 0: base[index], 1: variant.aiUses })
      : `${base[index]} · #${variant.id}`;
  });
}

/** Fields that decide what the learner pays for; a change in any of them requires a fresh confirmation. */
export function planCommercialSnapshot(plan) {
  if (!plan) return null;
  return {
    id: plan.id,
    price: Number(plan.price) || 0,
    durationDays: Number(plan.durationDays) || 0,
    aiUses: Number(plan.aiUses) || 0,
    kind: planKind(plan),
  };
}

export function sameCommercialTerms(a, b) {
  return Boolean(a && b)
    && a.id === b.id && a.price === b.price && a.durationDays === b.durationDays && a.aiUses === b.aiUses && a.kind === b.kind;
}

/** Only PayOS hosted checkout is a valid redirect target. */
const TRUSTED_CHECKOUT_HOSTS = new Set(['pay.payos.vn']);

export function isTrustedCheckoutUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && TRUSTED_CHECKOUT_HOSTS.has(url.hostname) && !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}

/** `?checkoutPlan=6` deep link (also what the legacy `/study-payment?planId=6` redirects to). */
export const CHECKOUT_PLAN_PARAM = 'checkoutPlan';

export function parsePlanIdParam(value) {
  const text = String(value ?? '').trim();
  if (!/^[1-9][0-9]{0,8}$/.test(text)) return null;
  return Number(text);
}
