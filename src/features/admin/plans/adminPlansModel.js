/**
 * Admin "Gói học & bảng giá" view-model — pure helpers, no React.
 *
 * Grouping uses the same key as the Learner catalog (`planGroups.js`): the Backend plan category
 * (self_study · speaking · writing · ai_grading · learning_path). Each variant keeps its own plan id;
 * nothing here merges plans or derives prices.
 */
import { PLAN_GROUP_META, PLAN_GROUP_ORDER, featureDisplayName, formatVnd, variantDurationLabel } from '@/features/checkout/planGroups.js';

export { featureDisplayName };

/** Plan groups an Admin can create variants in (same categories the Backend sells). */
export const PLAN_CATEGORY_OPTIONS = [
  { value: 'self_study', label: 'Gói tự học', creditOnly: false },
  { value: 'speaking', label: 'Luyện nói AI', creditOnly: false },
  { value: 'writing', label: 'Luyện viết AI', creditOnly: false },
  { value: 'ai_grading', label: 'Lượt chấm AI', creditOnly: true },
  { value: 'learning_path', label: 'Lượt lộ trình AI', creditOnly: true },
];

/** Admin DTO → the plan shape the Learner catalog helpers/cards use. */
export function toCatalogPlan(plan, featuresById = null) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    kind: plan.planCategory,
    price: Number(plan.price) || 0,
    durationDays: Number(plan.durationDays) || 0,
    aiUses: Number(plan.aiGradingQuota) || 0,
    isPopular: Boolean(plan.isPopular),
    isActive: Boolean(plan.isActive),
    features: featuresById
      ? (plan.featureIds || []).map((id) => featuresById.get(id)).filter(Boolean)
      : [],
  };
}

function compareVariants(a, b) {
  return (Number(a.durationDays) || 0) - (Number(b.durationDays) || 0)
    || (Number(a.aiGradingQuota) || 0) - (Number(b.aiGradingQuota) || 0)
    || (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
    || a.id - b.id;
}

/** Admin plans grouped by category, with sale and price summaries per group. */
export function groupAdminPlans(plans) {
  const byKind = new Map();
  for (const plan of Array.isArray(plans) ? plans : []) {
    const kind = String(plan?.planCategory || 'other');
    if (kind === 'mentor_legacy') continue;
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
      const selling = variants.filter((v) => v.isActive);
      const prices = selling.map((v) => Number(v.price) || 0);
      return {
        key: kind,
        kind,
        meta: PLAN_GROUP_META[kind] ?? null,
        variants,
        sellingCount: selling.length,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
      };
    });
}

export function priceRangeLabel(group) {
  if (group.minPrice === null) return '';
  return group.minPrice === group.maxPrice
    ? formatVnd(group.minPrice)
    : `${formatVnd(group.minPrice)} – ${formatVnd(group.maxPrice)}`;
}

export function adminVariantLabel(plan, i18n) {
  return variantDurationLabel(toCatalogPlan(plan), i18n);
}

/* ------------------------------------------------------------------ feature policy wording */

export const AVAILABILITY = Object.freeze({ ACTIVE: 'ACTIVE', DISABLED: 'DISABLED' });

export const AVAILABILITY_LABELS = {
  ACTIVE: 'Đang hoạt động',
  DISABLED: 'Tạm ngừng cung cấp',
};

export const ACCESS_POLICY_LABELS = {
  FREE: 'Miễn phí',
  PLAN_REQUIRED: 'Cần gói học',
  CREDIT_REQUIRED: 'Cần lượt AI',
  PLAN_AND_CREDIT: 'Cần gói học và lượt AI',
};

export const ACCESS_POLICY_TONES = {
  FREE: 'success',
  PLAN_REQUIRED: 'brand',
  CREDIT_REQUIRED: 'warning',
  PLAN_AND_CREDIT: 'info',
};

/** Effective state codes from the Backend preview (`EffectiveState`) → Vietnamese labels and tones. */
export const EFFECTIVE_STATE_META = {
  AVAILABLE: { label: 'Được sử dụng', tone: 'success' },
  PLAN_LOCKED: { label: 'Cần gói học', tone: 'brand' },
  CREDIT_LOCKED: { label: 'Cần lượt AI', tone: 'warning' },
  PLAN_AND_CREDIT_LOCKED: { label: 'Cần gói học và lượt AI', tone: 'info' },
  ADMIN_DISABLED: { label: 'Tạm ngừng cung cấp', tone: 'neutral' },
};

/** Plain-language scope per feature, shown instead of technical route paths. */
const FEATURE_SCOPE = {
  LESSONS_CONTENT: 'Áp dụng cho thư viện bài học và các nội dung luyện nghe, luyện đọc liên quan.',
  JAPANESE_LIBRARY: 'Áp dụng cho thư viện Kana, Kanji, Ngữ pháp và luyện viết Hán tự.',
  PRACTICE_EXERCISES: 'Áp dụng cho bài luyện tập sau bài học và các bộ đề luyện tập.',
  MOCK_TESTS: 'Áp dụng cho đề thi thử JLPT và trang kết quả thi.',
  STANDARD_ROADMAP: 'Áp dụng cho lộ trình học chuẩn JLPT theo cấp độ.',
  AI_MOCK_EXPLANATION: 'Áp dụng cho phần giải thích đáp án bằng AI trong đề thi thử.',
  PERSONAL_NOTEBOOK: 'Áp dụng cho sổ tay cá nhân và sổ tay nhanh.',
  SRS_STUDY: 'Áp dụng cho ôn tập thẻ ghi nhớ theo lịch (SRS).',
  PLACEMENT_TEST: 'Áp dụng cho bài đánh giá năng lực đầu vào.',
  AI_LEARNING_PATH: 'Áp dụng cho lộ trình học cá nhân hóa do AI đề xuất.',
  AI_SPEAKING: 'Áp dụng cho luyện nói và chấm phát âm bằng AI.',
  AI_WRITING: 'Áp dụng cho luyện viết và nhận xét bài viết bằng AI.',
};

export function featureScopeText(feature) {
  const code = String(feature?.code || '').toUpperCase();
  return FEATURE_SCOPE[code] || '';
}

/** Availability + policy the Admin edits, read from the DTO (works with older API responses too). */
export function featurePolicyState(feature) {
  const availability = String(feature?.availability || '').toUpperCase()
    || (String(feature?.accessMode || '').toUpperCase() === 'DISABLED' ? AVAILABILITY.DISABLED : AVAILABILITY.ACTIVE);
  const rawPolicy = feature?.accessPolicy ?? (String(feature?.accessMode || '').toUpperCase() === 'DISABLED' ? null : feature?.accessMode);
  const policy = ACCESS_POLICY_LABELS[String(rawPolicy || '').toUpperCase()] ? String(rawPolicy).toUpperCase() : null;
  return { availability, policy, policyKnown: policy !== null };
}

/* ------------------------------------------------------------------ learner sidebar grouping */

function cleanNavPath(to) {
  return String(to || '').split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase() || '/';
}

function flattenNav(items, groupLabel, out) {
  for (const item of items || []) {
    if (item.to) out.push({ path: cleanNavPath(item.to), group: groupLabel });
    if (item.children?.length) flattenNav(item.children, groupLabel, out);
  }
  return out;
}

/**
 * Groups feature policies under the Learner sidebar groups they appear in (same order as the Learner sees them),
 * so an Admin finds "Ôn tập SRS" under "Góc học tập của tôi", lessons under "Lộ trình học JLPT", etc.
 * Matching uses each feature's own route prefixes against the sidebar destinations — nothing is hard-coded per feature.
 * @returns {{ label: string, features: object[] }[]}
 */
export function groupFeaturesByLearnerSidebar(features, learnerNav) {
  const entries = [];
  (learnerNav?.groups || []).forEach((group) => flattenNav(group.items, group.label, entries));
  const groupOrder = (learnerNav?.groups || []).map((g) => g.label);
  const OTHER = 'Tính năng khác';

  const placed = (Array.isArray(features) ? features : []).map((feature, index) => {
    const routes = (feature.routes || []).map(cleanNavPath);
    const navIndex = entries.findIndex((entry) => routes.some((route) =>
      entry.path === route || entry.path.startsWith(`${route}/`) || route.startsWith(`${entry.path}/`)));
    return {
      feature,
      group: navIndex >= 0 ? entries[navIndex].group : OTHER,
      rank: navIndex >= 0 ? navIndex : entries.length + index,
    };
  });

  const byGroup = new Map();
  for (const item of placed.sort((a, b) => a.rank - b.rank)) {
    if (!byGroup.has(item.group)) byGroup.set(item.group, []);
    byGroup.get(item.group).push(item.feature);
  }
  return [...byGroup.entries()]
    .sort(([a], [b]) => {
      const ia = groupOrder.indexOf(a);
      const ib = groupOrder.indexOf(b);
      return (ia < 0 ? groupOrder.length : ia) - (ib < 0 ? groupOrder.length : ib);
    })
    .map(([label, list]) => ({ label, features: list }));
}

/* ------------------------------------------------------------------ audit history */

export const PLANS_AUDIT_SCOPE = 'SubscriptionPlan,FeatureAccessPolicy';

function parseJson(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function pick(obj, ...keys) {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key];
    const camel = key.charAt(0).toLowerCase() + key.slice(1);
    if (obj[camel] !== undefined) return obj[camel];
  }
  return undefined;
}

function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

const PLAN_CATEGORY_LABELS = {
  self_study: 'Gói tự học',
  speaking: 'Luyện nói AI',
  writing: 'Luyện viết AI',
  ai_grading: 'Lượt chấm AI',
  learning_path: 'Lượt lộ trình AI',
};

/**
 * Human-readable audit entry. Only fields present in the stored before/after snapshots are compared —
 * nothing is invented when a snapshot is missing.
 * @returns {{ subject: string, kind: 'plan'|'feature'|'other', sentence: string, sentenceArgs?: object, changes: {label: string, from: string, to: string}[] }}
 */
export function describeAuditLog(log, { tr, trf, featureNamesById, planNamesById } = {}) {
  const before = parseJson(log?.beforeJson);
  const after = parseJson(log?.afterJson);
  const changes = [];

  if (log?.entityType === 'SubscriptionPlan') {
    const name = pick(after, 'Name') ?? pick(before, 'Name') ?? planNamesById?.get(log.entityId) ?? trf('Gói học #{0}', { 0: log.entityId });
    const money = (v) => (v === undefined || v === null ? '—' : formatVnd(v));
    const days = (v) => (v === undefined || v === null ? '—' : trf('{0} ngày', { 0: v }));
    const uses = (v) => (v === undefined || v === null ? '—' : trf('{0} lượt', { 0: v }));
    const yesNo = (v) => (v ? tr('Có') : tr('Không'));
    const fields = [
      ['Name', 'Tên gói', (v) => v ?? '—'],
      ['Price', 'Giá bán', money],
      ['DurationDays', 'Thời hạn', days],
      ['AiGradingQuota', 'Lượt AI', uses],
      ['PlanCategory', 'Loại gói', (v) => tr(PLAN_CATEGORY_LABELS[v] || v || '—')],
      ['Description', 'Mô tả', (v) => v || '—'],
      ['SortOrder', 'Thứ tự hiển thị', (v) => (v ?? '—')],
      ['IsPopular', 'Nhãn phổ biến', yesNo],
      ['IsActive', 'Trạng thái bán', (v) => (v ? tr('Đang mở bán') : tr('Đã ngừng bán'))],
    ];
    if (before && after) {
      for (const [key, label, fmt] of fields) {
        const from = pick(before, key);
        const to = pick(after, key);
        if (from === undefined || to === undefined || sameValue(from, to)) continue;
        changes.push({ label: tr(label), from: String(fmt(from)), to: String(fmt(to)) });
      }
      const beforeIds = pick(before, 'FeatureIds');
      const afterIds = pick(after, 'FeatureIds');
      if (Array.isArray(beforeIds) && Array.isArray(afterIds) && !sameValue([...beforeIds].sort(), [...afterIds].sort())) {
        const added = afterIds.filter((id) => !beforeIds.includes(id)).map((id) => featureNamesById?.get(id) || `#${id}`);
        const removed = beforeIds.filter((id) => !afterIds.includes(id)).map((id) => featureNamesById?.get(id) || `#${id}`);
        if (added.length) changes.push({ label: tr('Thêm quyền lợi'), from: '', to: added.join(', ') });
        if (removed.length) changes.push({ label: tr('Bỏ quyền lợi'), from: removed.join(', '), to: '' });
      }
    }

    const action = String(log?.action || '');
    let sentence = 'Quản trị viên đã cập nhật gói học.';
    if (action === 'Created') sentence = 'Quản trị viên đã tạo gói học mới.';
    else if (action === 'SaleStopped') sentence = 'Quản trị viên đã ngừng bán gói học.';
    else if (action === 'SaleResumed') sentence = 'Quản trị viên đã mở bán trở lại gói học.';
    else if (changes.length === 1 && changes[0].label === tr('Giá bán')) {
      return {
        subject: name,
        kind: 'plan',
        sentence: 'Quản trị viên đã cập nhật giá bán từ {0} lên {1}.',
        sentenceArgs: { 0: changes[0].from, 1: changes[0].to },
        changes,
      };
    }
    return { subject: name, kind: 'plan', sentence, changes };
  }

  if (log?.entityType === 'FeatureAccessPolicy') {
    const code = pick(after, 'Code') ?? pick(before, 'Code');
    const rawName = pick(after, 'Name') ?? pick(before, 'Name') ?? featureNamesById?.get(log.entityId) ?? trf('Tính năng #{0}', { 0: log.entityId });
    const name = featureDisplayName({ code, name: rawName });
    const policyOf = (snapshot) => {
      const policy = pick(snapshot, 'AccessPolicy');
      if (policy !== undefined) return policy;
      const legacy = String(pick(snapshot, 'AccessMode') || '').toUpperCase();
      return legacy && legacy !== 'DISABLED' ? legacy : undefined;
    };
    const availabilityOf = (snapshot) => {
      const value = pick(snapshot, 'Availability');
      if (value !== undefined) return String(value).toUpperCase();
      const legacy = String(pick(snapshot, 'AccessMode') || '').toUpperCase();
      return legacy ? (legacy === 'DISABLED' ? 'DISABLED' : 'ACTIVE') : undefined;
    };
    if (before && after) {
      const fromAvailability = availabilityOf(before);
      const toAvailability = availabilityOf(after);
      if (fromAvailability && toAvailability && fromAvailability !== toAvailability) {
        changes.push({ label: tr('Trạng thái cung cấp'), from: tr(AVAILABILITY_LABELS[fromAvailability]), to: tr(AVAILABILITY_LABELS[toAvailability]) });
      }
      const fromPolicy = policyOf(before);
      const toPolicy = policyOf(after);
      if (fromPolicy && toPolicy && fromPolicy !== toPolicy) {
        changes.push({
          label: tr('Điều kiện truy cập'),
          from: tr(ACCESS_POLICY_LABELS[fromPolicy] || fromPolicy),
          to: tr(ACCESS_POLICY_LABELS[toPolicy] || toPolicy),
        });
      }
      const fromName = pick(before, 'Name');
      const toName = pick(after, 'Name');
      if (fromName !== undefined && toName !== undefined && fromName !== toName) {
        changes.push({ label: tr('Tên tính năng'), from: fromName, to: toName });
      }
      const fromDesc = pick(before, 'Description');
      const toDesc = pick(after, 'Description');
      if (fromDesc !== undefined && toDesc !== undefined && (fromDesc || '') !== (toDesc || '')) {
        changes.push({ label: tr('Mô tả'), from: fromDesc || '—', to: toDesc || '—' });
      }
    }
    const action = String(log?.action || '');
    const sentence = action === 'FeatureSuspended'
      ? 'Quản trị viên đã tạm ngừng cung cấp tính năng này.'
      : action === 'FeatureReopened'
        ? 'Quản trị viên đã mở lại tính năng {0}.'
        : action === 'AccessPolicyChanged'
          ? 'Quản trị viên đã đổi điều kiện truy cập của tính năng.'
          : 'Quản trị viên đã cập nhật cấu hình tính năng.';
    return { subject: name, kind: 'feature', sentence, sentenceArgs: { 0: name }, changes };
  }

  return { subject: trf('Bản ghi #{0}', { 0: log?.entityId ?? '' }), kind: 'other', sentence: 'Quản trị viên đã cập nhật cấu hình.', changes };
}
