/**
 * Study plan catalog → dynamic product groups, categories, wallet items, and subscription lifecycle helpers.
 *
 * Grouping logic:
 * - Backend `kind` (`PlanCategory`) defines functional capability: `self_study`, `speaking`, `writing`,
 *   `ai_grading`, `learning_path`, `combo` (or any future category added via Admin).
 * - Within a category, plans that share the same base product family name (e.g. "Tự học tiếng Nhật - 1 tuần / 1 tháng")
 *   collapse cleanly into one multi-variant Product Card with duration/tier chips, while distinct product lines
 *   in the same category render as independent cards in the Dynamic Product Grid.
 * - Names are never parsed to override Backend prices/categories; every number comes straight from the DTO.
 */

import { currentIntlTag } from '@/locales/locale.js';
import { formatDate, formatDateTime, formatTime } from '@/utils/dateTimeFormat.js';
import { parseUtcDate } from '@/utils/vnDateTime.js';

export function formatVnd(value) {
  return new Intl.NumberFormat(currentIntlTag(), { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

const FEATURE_DISPLAY_NAMES = {
  PERSONAL_NOTEBOOK: 'Sổ tay cá nhân',
};

export function featureDisplayName(feature) {
  if (!feature) return '';
  if (typeof feature !== 'object') return String(feature);
  const code = String(feature.code || '').toUpperCase();
  return FEATURE_DISPLAY_NAMES[code] || feature.name || '';
}

export const PLAN_GROUP_ORDER = ['self_study', 'speaking', 'writing', 'ai_grading', 'learning_path', 'combo'];

export const SECTION_ORDER = ['self_study', 'ai_skills', 'ai_credits', 'combo'];

export const SECTION_META = {
  self_study: {
    key: 'self_study',
    tabLabel: 'Gói tự học',
    title: 'Gói tự học',
    description: 'Mở khóa thư viện bài học JLPT, luyện nghe – đọc hiểu chuyên sâu và quyền lợi đi kèm.',
  },
  ai_skills: {
    key: 'ai_skills',
    tabLabel: 'Kỹ năng AI',
    title: 'Luyện kỹ năng với AI',
    description: 'Luyện phát âm, hội thoại và viết tiếng Nhật với nhận xét chi tiết theo từng lượt.',
  },
  ai_credits: {
    key: 'ai_credits',
    tabLabel: 'Lượt AI',
    title: 'Lượt AI bổ sung',
    description: 'Bổ sung nhanh lượt chấm AI hoặc lượt tạo lộ trình cá nhân hóa bất cứ khi nào cần.',
  },
  combo: {
    key: 'combo',
    tabLabel: 'Gói kết hợp',
    title: 'Gói kết hợp',
    description: 'Kết hợp toàn bộ nội dung tự học cùng gói lượt luyện kỹ năng và chấm AI tiết kiệm.',
  },
};

export const PLAN_GROUP_META = {
  self_study: {
    title: 'Gói tự học JLPT',
    eyebrow: 'Gói tự học',
    description: 'Mở khóa toàn bộ bài học JLPT, kèm lượt chấm AI theo thời hạn gói.',
    icon: 'study',
    section: 'self_study',
  },
  speaking: {
    title: 'Luyện nói với AI',
    eyebrow: 'Kỹ năng AI',
    description: 'Luyện phát âm và hội thoại, nhận chấm điểm AI theo lượt.',
    icon: 'speaking',
    section: 'ai_skills',
  },
  writing: {
    title: 'Luyện viết với AI',
    eyebrow: 'Kỹ năng AI',
    description: 'Luyện viết câu và đoạn văn, nhận nhận xét AI theo lượt.',
    icon: 'writing',
    section: 'ai_skills',
  },
  ai_grading: {
    title: 'Lượt chấm AI nói/viết',
    eyebrow: 'Lượt AI bổ sung',
    description: 'Bổ sung lượt chấm bài nói hoặc viết bằng AI khi bạn cần.',
    icon: 'credit',
    section: 'ai_credits',
  },
  learning_path: {
    title: 'Lượt tạo lộ trình AI',
    eyebrow: 'Lượt AI bổ sung',
    description: 'Thêm lượt để AI đề xuất lộ trình học cá nhân hóa.',
    icon: 'path',
    section: 'ai_credits',
  },
  combo: {
    title: 'Gói kết hợp toàn diện',
    eyebrow: 'Gói kết hợp',
    description: 'Kết hợp mở khóa thư viện bài học JLPT và lượt luyện kỹ năng AI.',
    icon: 'combo',
    section: 'combo',
  },
};

/** Unified Soft Sakura accents across all product kinds (clean white card canvas, brand-consistent tokens). */
export const SAKURA_PRODUCT_ACCENT = {
  iconTile: 'bg-rp-brand-tint text-rp-brand-strong border-rp-brand-border/80',
  eyebrow: 'text-rp-brand-strong',
  hoverBorder: 'hover:border-rp-brand-border',
  chipSelected: 'border-rp-brand-strong bg-rp-brand-tint text-rp-brand-strong',
  walletCard: 'border-rp-brand-border/75 bg-rp-brand-tint/35',
  walletValue: 'text-rp-brand-strong',
};

export const PRODUCT_ACCENTS = {
  self_study: SAKURA_PRODUCT_ACCENT,
  speaking: SAKURA_PRODUCT_ACCENT,
  writing: SAKURA_PRODUCT_ACCENT,
  ai_grading: SAKURA_PRODUCT_ACCENT,
  learning_path: SAKURA_PRODUCT_ACCENT,
  combo: SAKURA_PRODUCT_ACCENT,
};

export function productAccentOf(kind) {
  return PRODUCT_ACCENTS[planKind({ kind })] ?? SAKURA_PRODUCT_ACCENT;
}

const EXCLUDED_KINDS = new Set(['mentor', 'mentor_legacy']);

export function planKind(plan) {
  return String(plan?.kind ?? plan?.planCategory ?? '').trim().toLowerCase() || 'other';
}

export function sectionOfKind(kind) {
  const normalized = String(kind || '').trim().toLowerCase();
  if (PLAN_GROUP_META[normalized]?.section) return PLAN_GROUP_META[normalized].section;
  if (normalized.includes('skill') || normalized.includes('speak') || normalized.includes('writ')) return 'ai_skills';
  if (normalized.includes('credit') || normalized.includes('path')) return 'ai_credits';
  if (normalized.includes('combo') || normalized.includes('bundle')) return 'combo';
  return normalized || 'other';
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
 * Derive a clean family key so multiple duration variants of the same product stay on one card,
 * while distinct products created by Admin inside the same category render as separate cards.
 */
function productFamilyName(plan) {
  const raw = String(plan?.name || '').trim();
  if (!raw) return `kind:${planKind(plan)}`;
  // Strip trailing duration/uses variant suffixes like " - 1 tháng", " - 2 tuần", " - 10 lượt"
  const match = raw.match(/^(.+?)\s*[-–—]\s*(?:\d+\s*(?:ngày|tuần|tháng|năm|lượt|buổi).*)$/i);
  if (match && match[1].trim().length >= 3) {
    return match[1].trim();
  }
  return raw;
}

function familySlug(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'plan';
}

/**
 * Group live plans dynamically into Product Cards.
 * @returns {{ key: string, kind: string, sectionKey: string, meta: object|null, title: string|null, customTitle: boolean, variants: object[], defaultPlanId: number, sortOrder: number, minPrice: number, maxPrice: number, maxDurationDays: number, isPopular: boolean }[]}
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

  const rankKind = (kind) => {
    const index = PLAN_GROUP_ORDER.indexOf(kind);
    return index < 0 ? PLAN_GROUP_ORDER.length : index;
  };

  const groups = [];
  for (const [kind, kindPlans] of [...byKind.entries()].sort(([a], [b]) => rankKind(a) - rankKind(b) || a.localeCompare(b))) {
    const byFamily = new Map();
    for (const plan of kindPlans) {
      const fam = productFamilyName(plan);
      const famKey = familySlug(fam);
      if (!byFamily.has(famKey)) byFamily.set(famKey, { label: fam, plans: [] });
      byFamily.get(famKey).plans.push(plan);
    }

    const families = [...byFamily.entries()];
    const hasMultipleProductsInKind = families.length > 1;
    const meta = PLAN_GROUP_META[kind] ?? null;

    families.forEach(([famKey, fam], famIdx) => {
      const variants = [...fam.plans].sort(compareVariants);
      const defaultPlanId = (variants.find((v) => v.isPopular) ?? variants[0]).id;
      const prices = variants.map((v) => Number(v.price) || 0);
      const durations = variants.map((v) => Number(v.durationDays) || 0);
      const sortValues = variants.map((v) => Number(v.sortOrder) || 999);
      const key = hasMultipleProductsInKind ? `${kind}::${famKey}` : kind;

      groups.push({
        key,
        kind,
        sectionKey: sectionOfKind(kind),
        meta,
        title: hasMultipleProductsInKind ? fam.label : (meta ? meta.title : fam.label),
        customTitle: hasMultipleProductsInKind || !meta,
        variants,
        defaultPlanId,
        sortOrder: Math.min(...sortValues, (rankKind(kind) + 1) * 100 + famIdx),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        maxDurationDays: Math.max(...durations),
        isPopular: variants.some((v) => v.isPopular),
      });
    });
  }

  return groups;
}

/**
 * Organizes groups into dynamic ordered product sections (never creating empty sections).
 */
export function buildProductCatalogSections(groups, { search = '', sortBy = 'default', selectedSection = 'all' } = {}) {
  const q = String(search || '').trim().toLowerCase();

  const matchesSearch = (group) => {
    if (!q) return true;
    const hay = [
      group.title,
      group.meta?.title,
      group.meta?.description,
      ...group.variants.map((v) => `${v.name || ''} ${v.description || ''}`),
      ...group.variants.flatMap((v) => (v.features || []).map((f) => featureDisplayName(f))),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  };

  // Discover all live sections from unfiltered groups first so filter tabs only contain non-empty real categories
  const liveSectionKeys = [];
  const countBySection = new Map();
  for (const g of groups) {
    if (!countBySection.has(g.sectionKey)) {
      countBySection.set(g.sectionKey, 0);
      liveSectionKeys.push(g.sectionKey);
    }
    countBySection.set(g.sectionKey, countBySection.get(g.sectionKey) + 1);
  }

  liveSectionKeys.sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a);
    const ib = SECTION_ORDER.indexOf(b);
    return (ia < 0 ? SECTION_ORDER.length : ia) - (ib < 0 ? SECTION_ORDER.length : ib) || a.localeCompare(b);
  });

  const tabs = [
    { value: 'all', label: 'Tất cả', count: groups.length },
    ...liveSectionKeys.map((key) => ({
      value: key,
      label: SECTION_META[key]?.tabLabel || groups.find((g) => g.sectionKey === key)?.title || key,
      count: countBySection.get(key) || 0,
    })),
  ];

  const sortGroups = (list) => {
    const copy = [...list];
    if (sortBy === 'price_asc') return copy.sort((a, b) => a.minPrice - b.minPrice || a.key.localeCompare(b.key));
    if (sortBy === 'price_desc') return copy.sort((a, b) => b.maxPrice - a.maxPrice || a.key.localeCompare(b.key));
    if (sortBy === 'duration_desc') return copy.sort((a, b) => b.maxDurationDays - a.maxDurationDays || a.minPrice - b.minPrice);
    if (sortBy === 'popular') return copy.sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || a.sortOrder - b.sortOrder);
    return copy;
  };

  const filtered = groups.filter((g) => (selectedSection === 'all' || g.sectionKey === selectedSection) && matchesSearch(g));
  const sectionsMap = new Map();
  for (const g of sortGroups(filtered)) {
    if (!sectionsMap.has(g.sectionKey)) sectionsMap.set(g.sectionKey, []);
    sectionsMap.get(g.sectionKey).push(g);
  }

  const sections = [...sectionsMap.entries()]
    .sort(([a], [b]) => {
      const ia = SECTION_ORDER.indexOf(a);
      const ib = SECTION_ORDER.indexOf(b);
      return (ia < 0 ? SECTION_ORDER.length : ia) - (ib < 0 ? SECTION_ORDER.length : ib) || a.localeCompare(b);
    })
    .map(([key, items]) => ({
      key,
      meta: SECTION_META[key] ?? {
        key,
        tabLabel: items[0]?.title || key,
        title: items[0]?.title || key,
        description: '',
      },
      items,
      // Single multi-variant self_study flagship renders horizontally on desktop; multiple self_study products become a dynamic grid.
      useFeaturedLayout: key === 'self_study' && items.length === 1 && items[0].variants.length > 1,
    }));

  return { tabs, sections, totalFilteredCount: filtered.length };
}

export const DURATION_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'WEEKLY', label: 'Theo tuần (7–21 ngày)' },
  { value: 'MONTHLY', label: '1 tháng (30 ngày)' },
  { value: 'LONG', label: 'Dài hạn (Từ 3 tháng)' },
  { value: 'USAGE', label: 'Theo lượt sử dụng' },
];

export function durationBucketOfPlan(plan) {
  const days = Number(plan?.durationDays || 0);
  if (days <= 0) return 'USAGE';
  if (days < 30) return 'WEEKLY';
  if (days < 90) return 'MONTHLY';
  return 'LONG';
}

export function matchesDurationBucket(plan, bucket) {
  if (!bucket || bucket === 'ALL') return true;
  return durationBucketOfPlan(plan) === bucket;
}

/**
 * Organizes groups into one unified flat dynamic product grid + non-empty category tabs + dynamic duration options.
 */
export function buildUnifiedProductCatalog(
  groups,
  { search = '', sortBy = 'default', selectedSection = 'all', durationFilter = 'ALL' } = {},
) {
  const q = String(search || '').trim().toLowerCase();

  const matchesSearch = (group) => {
    if (!q) return true;
    const hay = [
      group.title,
      group.meta?.title,
      group.meta?.eyebrow,
      group.meta?.description,
      ...group.variants.map((v) => `${v.name || ''} ${v.description || ''}`),
      ...group.variants.flatMap((v) => (v.features || []).map((f) => featureDisplayName(f))),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  };

  const liveSectionKeys = [];
  const countBySection = new Map();
  const liveDurationBuckets = new Set();
  for (const g of groups) {
    if (!countBySection.has(g.sectionKey)) {
      countBySection.set(g.sectionKey, 0);
      liveSectionKeys.push(g.sectionKey);
    }
    countBySection.set(g.sectionKey, countBySection.get(g.sectionKey) + 1);
    for (const v of g.variants) liveDurationBuckets.add(durationBucketOfPlan(v));
  }

  liveSectionKeys.sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a);
    const ib = SECTION_ORDER.indexOf(b);
    return (ia < 0 ? SECTION_ORDER.length : ia) - (ib < 0 ? SECTION_ORDER.length : ib) || a.localeCompare(b);
  });

  const tabs = [
    { value: 'all', label: 'Tất cả', count: groups.length },
    ...liveSectionKeys.map((key) => ({
      value: key,
      label: SECTION_META[key]?.tabLabel || groups.find((g) => g.sectionKey === key)?.title || key,
      count: countBySection.get(key) || 0,
    })),
  ];

  const durationOptions = DURATION_FILTER_OPTIONS.filter(
    (opt) => opt.value === 'ALL' || liveDurationBuckets.has(opt.value),
  );

  const rankKind = (kind) => {
    const idx = PLAN_GROUP_ORDER.indexOf(kind);
    return idx < 0 ? PLAN_GROUP_ORDER.length : idx;
  };

  const sortGroups = (list) => {
    const copy = [...list];
    if (sortBy === 'price_asc') return copy.sort((a, b) => a.minPrice - b.minPrice || a.key.localeCompare(b.key));
    if (sortBy === 'price_desc') return copy.sort((a, b) => b.maxPrice - a.maxPrice || a.key.localeCompare(b.key));
    if (sortBy === 'popular') return copy.sort((a, b) => Number(b.isPopular) - Number(a.isPopular) || rankKind(a.kind) - rankKind(b.kind) || a.sortOrder - b.sortOrder);
    return copy.sort((a, b) => rankKind(a.kind) - rankKind(b.kind) || a.sortOrder - b.sortOrder || a.key.localeCompare(b.key));
  };

  const filtered = groups.filter((g) => {
    if (selectedSection !== 'all' && g.sectionKey !== selectedSection) return false;
    if (durationFilter && durationFilter !== 'ALL' && !g.variants.some((v) => matchesDurationBucket(v, durationFilter))) return false;
    return matchesSearch(g);
  });

  return {
    tabs,
    durationOptions,
    items: sortGroups(filtered),
    totalCatalogCount: groups.length,
    totalFilteredCount: filtered.length,
  };
}

export function findGroupOfPlan(groups, planId) {
  return groups.find((group) => group.variants.some((variant) => variant.id === planId)) ?? null;
}

export function variantDurationLabel(plan, { tr, trf }) {
  const days = Number(plan?.durationDays) || 0;
  if (days <= 0) return trf('{0} lượt', { 0: Math.max(1, Number(plan?.aiUses) || 1) });
  if (days % 30 === 0) return trf('{0} tháng', { 0: days / 30 });
  if (days % 7 === 0 && days < 30) return trf('{0} tuần', { 0: days / 7 });
  return days === 1 ? tr('1 ngày') : trf('{0} ngày', { 0: days });
}

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

const TRUSTED_CHECKOUT_HOSTS = new Set(['pay.payos.vn']);

export function isTrustedCheckoutUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && TRUSTED_CHECKOUT_HOSTS.has(url.hostname) && !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}

export const CHECKOUT_PLAN_PARAM = 'checkoutPlan';

export function parsePlanIdParam(value) {
  const text = String(value ?? '').trim();
  if (!/^[1-9][0-9]{0,8}$/.test(text)) return null;
  return Number(text);
}

/** Detect sentinel unlimited expiry dates (year >= 2099) or null unlimited grants without altering DB data. */
export function isUnlimitedSubscription(expiresAt, daysRemaining) {
  if (daysRemaining === null) return true;
  if (!expiresAt) return false;
  const parsed = parseUtcDate(expiresAt);
  return Boolean(parsed && parsed.getUTCFullYear() >= 2099);
}

export function computeRemainingDays(expiresAt, nowMs = Date.now()) {
  if (!expiresAt) return null;
  const parsed = parseUtcDate(expiresAt);
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  if (parsed.getUTCFullYear() >= 2099) return null;
  return Math.ceil((parsed.getTime() - nowMs) / 86_400_000);
}

/** Classify learner subscriptions across all lifecycle states cleanly. */
export function summarizeSubscriptions(access, nowMs = Date.now()) {
  const purchases = Array.isArray(access?.purchases) ? access.purchases : [];
  const activeOrders = purchases.filter((p) => {
    if (!p?.active) return false;
    if (String(p.paymentStatus || '').toLowerCase() !== 'paid') return false;
    // Credit-only orders with 0 remaining credits shouldn't show as active subscription cards
    if (!p.endDate && Number(p.aiUsesRemaining || 0) <= 0 && (p.kind === 'ai_grading' || p.kind === 'learning_path')) return false;
    return true;
  });

  const upcomingOrders = purchases.filter((p) => {
    if (p?.active || String(p?.paymentStatus || '').toLowerCase() !== 'paid') return false;
    const startMs = parseUtcDate(p?.startDate)?.getTime();
    return Boolean(startMs && startMs > nowMs);
  });

  const expiredOrders = purchases.filter((p) => !p?.active && String(p?.paymentStatus || '').toLowerCase() === 'paid' && !upcomingOrders.includes(p));

  const expiringSoon = activeOrders.some((p) => {
    const rem = computeRemainingDays(p.endDate, nowMs);
    return rem !== null && rem >= 0 && rem <= 7;
  });

  let lifecycle = 'none';
  if (activeOrders.length > 0) {
    if (expiringSoon) lifecycle = 'expiring_soon';
    else if (activeOrders.every((p) => isUnlimitedSubscription(p.endDate, undefined))) lifecycle = 'unlimited';
    else lifecycle = 'active';
  } else if (upcomingOrders.length > 0) {
    lifecycle = 'upcoming';
  } else if (expiredOrders.length > 0) {
    lifecycle = 'expired';
  }

  return {
    lifecycle,
    activeOrders,
    upcomingOrders,
    expiredOrders,
    purchases,
    hasMultipleActive: activeOrders.length > 1,
    activeCategories: new Set(activeOrders.map((p) => String(p.kind || '').toLowerCase()).filter(Boolean)),
  };
}

const KNOWN_WALLET_KEYS = [
  {
    key: 'aiGradingUsesRemaining',
    kind: 'ai_grading',
    label: 'Lượt chấm AI nói/viết',
    unit: 'lượt chấm',
    hint: 'Dùng chung cho chấm phát âm & bài viết AI',
    icon: 'credit',
  },
  {
    key: 'learningPathUsesRemaining',
    kind: 'learning_path',
    label: 'Lượt tạo lộ trình AI',
    unit: 'lượt lộ trình',
    hint: 'Cá nhân hóa lộ trình học theo cấp độ JLPT',
    icon: 'path',
  },
  {
    key: 'speakingUsesRemaining',
    kind: 'speaking',
    label: 'Lượt luyện nói riêng',
    unit: 'lượt nói',
    hint: 'Luyện hội thoại và phản xạ phát âm với AI',
    icon: 'speaking',
  },
  {
    key: 'writingUsesRemaining',
    kind: 'writing',
    label: 'Lượt luyện viết riêng',
    unit: 'lượt viết',
    hint: 'Sửa câu, ngữ pháp và bố cục bài viết',
    icon: 'writing',
  },
];

/**
 * Dynamically build AI Credit Wallet entries without losing separate balances or hardcoding a fixed ceiling.
 */
export function buildAiWalletItems(access, groups = []) {
  if (!access) return [];
  const groupByKind = new Map();
  for (const g of groups) {
    if (!groupByKind.has(g.kind)) groupByKind.set(g.kind, g);
  }

  const purchases = Array.isArray(access.purchases) ? access.purchases : [];
  const activeExpiryOfKind = (kind) => {
    const match = purchases.find(
      (p) => p?.active && String(p?.kind || '').toLowerCase() === kind && Number(p?.aiUsesRemaining || 0) > 0,
    );
    return match?.endDate ?? null;
  };

  const seenKeys = new Set();
  const items = [];

  for (const spec of KNOWN_WALLET_KEYS) {
    seenKeys.add(spec.key);
    const remaining = Number(access[spec.key] ?? 0);
    const matchingGroup = groupByKind.get(spec.kind);
    items.push({
      ...spec,
      remaining,
      expiresAt: activeExpiryOfKind(spec.kind),
      topUpPlanId: matchingGroup?.defaultPlanId ?? null,
      accent: productAccentOf(spec.kind),
    });
  }

  // Auto-discover any extra `*UsesRemaining` fields or `creditBalances` items returned by future Backend updates
  if (Array.isArray(access.creditBalances)) {
    for (const extra of access.creditBalances) {
      if (!extra?.key || seenKeys.has(extra.key)) continue;
      seenKeys.add(extra.key);
      const k = String(extra.kind || 'ai_grading').toLowerCase();
      items.push({
        key: extra.key,
        kind: k,
        label: extra.label || extra.key,
        unit: extra.unit || 'lượt',
        hint: extra.description || '',
        icon: 'credit',
        remaining: Number(extra.remaining ?? 0),
        expiresAt: extra.expiresAt ?? null,
        topUpPlanId: groupByKind.get(k)?.defaultPlanId ?? null,
        accent: productAccentOf(k),
      });
    }
  } else {
    for (const [field, val] of Object.entries(access)) {
      if (!field.endsWith('UsesRemaining') || seenKeys.has(field)) continue;
      if (field === 'mentorSessionsRemaining') continue;
      seenKeys.add(field);
      const count = Number(val ?? 0);
      const rawName = field.replace(/UsesRemaining$/, '');
      items.push({
        key: field,
        kind: rawName,
        label: rawName,
        unit: 'lượt',
        hint: '',
        icon: 'credit',
        remaining: count,
        expiresAt: activeExpiryOfKind(rawName),
        topUpPlanId: groupByKind.get(rawName)?.defaultPlanId ?? null,
        accent: productAccentOf(rawName),
      });
    }
  }

  return items;
}

export function formatPlanDate(value) {
  return formatDate(value, '—');
}

export function formatPlanTime(value) {
  return formatTime(value, '');
}

export function formatPlanDateTime(value) {
  return formatDateTime(value, '—');
}

export function orderDurationLabel(order, { tr, trf }) {
  const days = Number(order?.durationDays) || 0;
  const uses = Number(order?.aiUsesGranted || order?.aiUsesRemaining || 0);
  if (days <= 0) {
    return uses > 0 ? trf('{0} lượt', { 0: uses }) : tr('Theo lượt');
  }
  return variantDurationLabel({ durationDays: days, aiUses: uses }, { tr, trf });
}

/** Concise purchased quantity label for Purchase History ("3 tháng" vs "5 lượt AI"). */
export function orderQuantityLabel(order, { tr, trf }) {
  const days = Number(order?.durationDays) || 0;
  const uses = Number(order?.aiUsesGranted || order?.aiUsesRemaining || 0);
  if (days <= 0) {
    return uses > 0 ? trf('{0} lượt AI', { 0: uses }) : tr('Theo lượt AI');
  }
  return variantDurationLabel({ durationDays: days, aiUses: uses }, { tr, trf });
}

/** Payment status ONLY (never mixes Payment Status with Entitlement/Validity Status). */
export function paymentStatusMeta(order, { tr }) {
  const payStatus = String(order?.paymentStatus || 'Paid').toLowerCase();
  if (payStatus === 'pending') return { label: tr('Đang xử lý'), tone: 'warning' };
  if (payStatus === 'cancelled') return { label: tr('Đã hủy'), tone: 'danger' };
  if (payStatus === 'expired') return { label: tr('Hết hạn thanh toán'), tone: 'neutral' };
  if (payStatus === 'failed') return { label: tr('Thất bại'), tone: 'danger' };
  if (payStatus === 'refunded') return { label: tr('Đã hoàn tiền'), tone: 'info' };
  return { label: tr('Thành công'), tone: 'success' };
}

/**
 * Authoritative validity presentation for Purchase History Column 3 ("Hiệu lực sử dụng").
 * - Never fabricates an expiry date from purchasedAt + durationDays.
 * - Never labels unactivated / failed / cancelled orders as unlimited.
 * - Clearly distinguishes "Không giới hạn thời gian" from unlimited AI uses.
 */
export function purchaseValidityLines(order, { tr, trf }) {
  const payStatus = String(order?.paymentStatus || 'Paid').toLowerCase();
  if (payStatus === 'pending') {
    return { primary: tr('Chưa kích hoạt'), secondary: null, muted: true };
  }
  if (payStatus !== 'paid') {
    return { primary: '—', secondary: null, muted: true };
  }

  const kind = String(order?.kind || '').toLowerCase();
  const days = Number(order?.durationDays) || 0;
  const isCreditOrder = days <= 0 || kind === 'ai_grading' || kind === 'learning_path';
  const startRaw = order?.startDate || (isCreditOrder ? order?.purchasedAt : null);
  const startText = startRaw ? formatDate(startRaw, '') : '';
  const hasEnd = Boolean(order?.endDate);
  const sentinelUnlimited = hasEnd && isUnlimitedSubscription(order.endDate, undefined);

  if (hasEnd && !sentinelUnlimited) {
    const endText = formatDate(order.endDate, '');
    if (startText && endText) {
      return { primary: startText, secondary: trf('Đến {0}', { 0: endText }), muted: false };
    }
    if (endText) {
      return { primary: trf('Đến {0}', { 0: endText }), secondary: null, muted: false };
    }
  }

  if ((!hasEnd && isCreditOrder) || sentinelUnlimited) {
    return {
      primary: startText ? trf('Từ {0}', { 0: startText }) : tr('Không giới hạn thời gian'),
      secondary: startText ? tr('Không giới hạn thời gian') : null,
      muted: false,
    };
  }

  if (startText) {
    return { primary: trf('Từ {0}', { 0: startText }), secondary: null, muted: false };
  }

  return { primary: '—', secondary: null, muted: true };
}

/** Distinguish Payment Status from Plan Validity Status cleanly so Failed/Cancelled are never mislabeled as Expired. */
export function purchaseStatusMeta(order, { tr }) {
  const payStatus = String(order?.paymentStatus || 'Paid').toLowerCase();
  if (payStatus === 'pending') {
    return { label: tr('Đang chờ thanh toán'), tone: 'warning', validityLabel: null, validityTone: null };
  }
  if (payStatus === 'cancelled') {
    return { label: tr('Đã hủy'), tone: 'neutral', validityLabel: null, validityTone: null };
  }
  if (payStatus === 'expired') {
    return { label: tr('Hết hạn thanh toán'), tone: 'neutral', validityLabel: null, validityTone: null };
  }
  if (payStatus === 'failed') {
    return { label: tr('Thanh toán thất bại'), tone: 'danger', validityLabel: null, validityTone: null };
  }
  if (payStatus === 'refunded') {
    return { label: tr('Đã hoàn tiền'), tone: 'info', validityLabel: null, validityTone: null };
  }

  // Payment succeeded ('paid')
  const nowMs = Date.now();
  const startMs = parseUtcDate(order?.startDate)?.getTime();
  if (!order?.active && startMs && startMs > nowMs) {
    return { label: tr('Thành công'), tone: 'success', validityLabel: tr('Chờ kích hoạt'), validityTone: 'info' };
  }
  if (order?.active) {
    const unlimited = isUnlimitedSubscription(order?.endDate, undefined);
    if (unlimited) {
      return { label: tr('Thành công'), tone: 'success', validityLabel: tr('Không giới hạn'), validityTone: 'brand' };
    }
    const rem = computeRemainingDays(order?.endDate, nowMs);
    if (rem !== null && rem <= 7) {
      return { label: tr('Thành công'), tone: 'success', validityLabel: tr('Sắp hết hạn'), validityTone: 'warning' };
    }
    return { label: tr('Thành công'), tone: 'success', validityLabel: tr('Đang hiệu lực'), validityTone: 'success' };
  }
  return { label: tr('Thành công'), tone: 'success', validityLabel: tr('Hết hiệu lực gói'), validityTone: 'neutral' };
}
