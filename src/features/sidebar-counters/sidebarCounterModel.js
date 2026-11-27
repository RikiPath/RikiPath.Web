import { normalizeBadgeCount } from '@/components/ui/sidebarBadgeLogic.js';

export const SIDEBAR_COUNTER_KEYS = Object.freeze({
  LEARNER_SRS_DUE: 'learner.srs_due',
  LEARNER_HOMEWORK_PENDING: 'learner.homework_pending',

  MENTOR_COHORT_ATTENDANCE_PENDING: 'mentor.cohort_attendance_pending',
  MENTOR_HOMEWORK_TO_GRADE: 'mentor.homework_to_grade',
  MENTOR_PROPOSALS_ACTION_REQUIRED: 'mentor.proposals_action_required',
  MENTOR_COMPLAINTS_AWAITING_RESPONSE: 'mentor.complaints_awaiting_response',
  MENTOR_PROFILE_ACTION_REQUIRED: 'mentor.profile_action_required',

  ADMIN_PAYMENTS_REVIEW: 'admin.payments_review',
  ADMIN_RETAKE_REQUESTS: 'admin.retake_requests',
  ADMIN_MENTOR_SCHEDULES: 'admin.mentor_schedules',
  ADMIN_SCHEDULE_REQUESTS: 'admin.schedule_requests',
  ADMIN_COHORT_TRANSFERS: 'admin.cohort_transfers',
  ADMIN_COMPLAINTS: 'admin.complaints',
  ADMIN_MENTOR_VERIFICATIONS: 'admin.mentor_verifications',
  ADMIN_CONTENT_REVIEW: 'admin.content_review',

  AUTHOR_MANUAL_CHANGES_REQUIRED: 'author.manual_changes_required',
  AUTHOR_SRS_TEMPLATES_CHANGES_REQUIRED: 'author.srs_templates_changes_required',
  AUTHOR_LESSONS_CHANGES_REQUIRED: 'author.lessons_changes_required',
  AUTHOR_EXAMS_CHANGES_REQUIRED: 'author.exams_changes_required',
  AUTHOR_QUESTION_BANK_CHANGES_REQUIRED: 'author.question_bank_changes_required',
});

export const COUNTER_TOOLTIP_TEMPLATES = Object.freeze({
  [SIDEBAR_COUNTER_KEYS.LEARNER_SRS_DUE]: '{0} thẻ đến hạn ôn tập',
  [SIDEBAR_COUNTER_KEYS.LEARNER_HOMEWORK_PENDING]: '{0} bài tập cần hoàn thành',

  [SIDEBAR_COUNTER_KEYS.MENTOR_COHORT_ATTENDANCE_PENDING]: '{0} buổi học cần điểm danh',
  [SIDEBAR_COUNTER_KEYS.MENTOR_HOMEWORK_TO_GRADE]: '{0} bài tập chờ chấm điểm',
  [SIDEBAR_COUNTER_KEYS.MENTOR_PROPOSALS_ACTION_REQUIRED]: '{0} đăng ký cần xử lý',
  [SIDEBAR_COUNTER_KEYS.MENTOR_COMPLAINTS_AWAITING_RESPONSE]: '{0} khiếu nại cần phản hồi',
  [SIDEBAR_COUNTER_KEYS.MENTOR_PROFILE_ACTION_REQUIRED]: '{0} phản hồi hồ sơ cần xử lý',

  [SIDEBAR_COUNTER_KEYS.ADMIN_PAYMENTS_REVIEW]: '{0} giao dịch cần xem xét',
  [SIDEBAR_COUNTER_KEYS.ADMIN_RETAKE_REQUESTS]: '{0} yêu cầu ôn lại JLPT chờ duyệt',
  [SIDEBAR_COUNTER_KEYS.ADMIN_MENTOR_SCHEDULES]: '{0} đề xuất lịch dạy chờ duyệt',
  [SIDEBAR_COUNTER_KEYS.ADMIN_SCHEDULE_REQUESTS]: '{0} yêu cầu đổi hoặc hủy lịch chờ xử lý',
  [SIDEBAR_COUNTER_KEYS.ADMIN_COHORT_TRANSFERS]: '{0} yêu cầu chuyển lớp chờ duyệt',
  [SIDEBAR_COUNTER_KEYS.ADMIN_COMPLAINTS]: '{0} khiếu nại khóa học cần xử lý',
  [SIDEBAR_COUNTER_KEYS.ADMIN_MENTOR_VERIFICATIONS]: '{0} hồ sơ Giáo viên chờ xét duyệt',
  [SIDEBAR_COUNTER_KEYS.ADMIN_CONTENT_REVIEW]: '{0} mục nội dung chờ duyệt',

  [SIDEBAR_COUNTER_KEYS.AUTHOR_MANUAL_CHANGES_REQUIRED]: '{0} mục biên soạn cần chỉnh sửa',
  [SIDEBAR_COUNTER_KEYS.AUTHOR_SRS_TEMPLATES_CHANGES_REQUIRED]: '{0} thẻ mẫu SRS cần chỉnh sửa',
  [SIDEBAR_COUNTER_KEYS.AUTHOR_LESSONS_CHANGES_REQUIRED]: '{0} bài học cần chỉnh sửa',
  [SIDEBAR_COUNTER_KEYS.AUTHOR_EXAMS_CHANGES_REQUIRED]: '{0} đề thi thử cần chỉnh sửa',
  [SIDEBAR_COUNTER_KEYS.AUTHOR_QUESTION_BANK_CHANGES_REQUIRED]: '{0} câu hỏi hoặc đoạn đọc cần chỉnh sửa',
});

const DEFAULT_AGGREGATE_TEMPLATE = '{0} công việc cần xử lý';
const MAX_SRS_TIMER_MS = 6 * 60 * 60 * 1000;
const MIN_SRS_TIMER_MS = 1500;

export function normalizeSidebarCountersResponse(raw) {
  const payload = raw?.result ?? raw ?? {};
  const list = Array.isArray(payload.counters) ? payload.counters : [];
  const byKey = {};
  for (const entry of list) {
    if (!entry || typeof entry.key !== 'string' || !entry.key.trim()) continue;
    const key = entry.key.trim();
    byKey[key] = {
      key,
      count: normalizeBadgeCount(entry.count),
      kind: String(entry.kind || 'ActionRequired'),
      metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : null,
    };
  }
  const serverVersionMs = Number(payload.serverVersionMs)
    || (payload.updatedAtUtc ? Date.parse(payload.updatedAtUtc) : 0)
    || Date.now();
  return {
    role: String(payload.role || ''),
    updatedAtUtc: payload.updatedAtUtc || null,
    serverVersionMs: Number.isFinite(serverVersionMs) ? serverVersionMs : Date.now(),
    nextDueAtUtc: payload.nextDueAtUtc || null,
    byKey,
  };
}

/**
 * Out-of-order protection: when two responses for the same role arrive out of sequence,
 * never allow a snapshot with an older server timestamp to overwrite a fresher snapshot.
 */
export function shouldAcceptCounterResponse(prevData, nextData) {
  if (!nextData) return false;
  if (!prevData) return true;
  if (prevData.role && nextData.role && prevData.role.toLowerCase() !== nextData.role.toLowerCase()) {
    return true;
  }
  const prevVer = Number(prevData.serverVersionMs) || 0;
  const nextVer = Number(nextData.serverVersionMs) || 0;
  if (prevVer > 0 && nextVer > 0 && nextVer < prevVer) {
    return false;
  }
  return true;
}

/**
 * Recursively collects unique counter keys from a nav branch's descendants.
 * Using a Set prevents double counting if any key ever appears in multiple child entries.
 */
export function collectUniqueCounterKeys(navItem, out = new Set()) {
  if (!navItem) return [];
  const children = Array.isArray(navItem.children) ? navItem.children : [];
  for (const child of children) {
    if (child?.counterKey) out.add(child.counterKey);
    if (child?.children?.length) collectUniqueCounterKeys(child, out);
  }
  return [...out];
}

export function formatCounterTooltip({
  counterKey,
  count,
  stale = false,
  tr = (s) => s,
  trf = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars?.[k] ?? '')),
}) {
  const safeCount = normalizeBadgeCount(count);
  if (safeCount <= 0) return '';
  const tpl = (counterKey && COUNTER_TOOLTIP_TEMPLATES[counterKey]) || DEFAULT_AGGREGATE_TEMPLATE;
  const text = trf(tpl, { 0: safeCount });
  return stale ? `${text} (${tr('đang hiển thị số liệu gần nhất')})` : text;
}

/**
 * Tracks genuine realtime count increases per counter key without treating initial load,
 * same-count refetches, or count decreases as new-work notifications.
 */
export function attachCounterIncreaseMetadata(prevSnapshot, nextSnapshot, nowMs = Date.now()) {
  if (!nextSnapshot || !nextSnapshot.byKey) return nextSnapshot;
  const prevByKey = prevSnapshot?.byKey || null;
  const nextByKey = {};

  for (const [key, entry] of Object.entries(nextSnapshot.byKey)) {
    const prevEntry = prevByKey?.[key] || null;
    if (!prevByKey) {
      // Initial baseline load: never fire a new-item pop.
      nextByKey[key] = { ...entry, increaseSeq: 0, increasedAtMs: 0 };
      continue;
    }

    const prevCount = normalizeBadgeCount(prevEntry?.count);
    const nextCount = normalizeBadgeCount(entry.count);
    const prevSeq = Number(prevEntry?.increaseSeq) || 0;
    const prevAt = Number(prevEntry?.increasedAtMs) || 0;

    if (nextCount > prevCount) {
      nextByKey[key] = {
        ...entry,
        increaseSeq: prevSeq + 1,
        increasedAtMs: nowMs,
      };
    } else if (nextCount === prevCount) {
      nextByKey[key] = {
        ...entry,
        increaseSeq: prevSeq,
        increasedAtMs: prevAt,
      };
    } else {
      // Count decreased: never trigger a new-notification animation.
      nextByKey[key] = {
        ...entry,
        increaseSeq: 0,
        increasedAtMs: 0,
      };
    }
  }

  return {
    ...nextSnapshot,
    byKey: nextByKey,
  };
}

/**
 * Resolves exact badge count, parent state, semantic tooltip, and attention metadata
 * for any leaf or hierarchical item.
 * Collapsed or closed parent items aggregate distinct child counters; open parents distribute
 * badges to children (and hide the redundant aggregate unless parent owns its own independent counter).
 */
export function resolveNavItemBadge(
  item,
  counterMap,
  {
    isBranchOpen = false,
    collapsed = false,
    isStale = false,
    tr = (s) => s,
    trf = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars?.[k] ?? '')),
  } = {},
) {
  const empty = {
    count: 0,
    parent: false,
    tooltip: '',
    counterKey: null,
    counterKind: null,
    increaseSeq: 0,
    increasedAtMs: 0,
  };
  if (!item || !counterMap) {
    return empty;
  }

  const ownKey = item.counterKey || null;
  const ownEntry = ownKey ? counterMap[ownKey] || null : null;
  const ownCount = ownKey ? normalizeBadgeCount(ownEntry?.count) : 0;
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;

  if (!hasChildren) {
    if (ownCount <= 0) return empty;
    return {
      count: ownCount,
      parent: false,
      tooltip: formatCounterTooltip({ counterKey: ownKey, count: ownCount, stale: isStale, tr, trf }),
      counterKey: ownKey,
      counterKind: ownEntry?.kind || null,
      increaseSeq: Number(ownEntry?.increaseSeq) || 0,
      increasedAtMs: Number(ownEntry?.increasedAtMs) || 0,
    };
  }

  const childKeys = collectUniqueCounterKeys(item).filter((k) => k !== ownKey);
  const nonZeroChildKeys = [];
  let childrenSum = 0;
  let hasActionRequiredChild = false;
  let aggregateIncreaseSeq = Number(ownEntry?.increaseSeq) || 0;
  let latestIncreasedAtMs = Number(ownEntry?.increasedAtMs) || 0;

  for (const key of childKeys) {
    const entry = counterMap[key];
    const val = normalizeBadgeCount(entry?.count);
    if (val > 0) {
      childrenSum += val;
      nonZeroChildKeys.push(key);
      if (entry?.kind === 'ActionRequired') hasActionRequiredChild = true;
      const seq = Number(entry?.increaseSeq) || 0;
      const at = Number(entry?.increasedAtMs) || 0;
      if (seq > 0) {
        aggregateIncreaseSeq += seq;
        if (at > latestIncreasedAtMs) latestIncreasedAtMs = at;
      }
    }
  }

  // Expanded branch distributes counts cleanly to children unless parent holds an independent counter.
  if (isBranchOpen && !collapsed) {
    if (ownCount <= 0) return { ...empty, parent: true };
    return {
      count: ownCount,
      parent: true,
      tooltip: formatCounterTooltip({ counterKey: ownKey, count: ownCount, stale: isStale, tr, trf }),
      counterKey: ownKey,
      counterKind: ownEntry?.kind || null,
      increaseSeq: Number(ownEntry?.increaseSeq) || 0,
      increasedAtMs: Number(ownEntry?.increasedAtMs) || 0,
    };
  }

  const total = ownCount + childrenSum;
  if (total <= 0) return { ...empty, parent: true };

  const tooltipKey = ownCount === 0 && nonZeroChildKeys.length === 1 ? nonZeroChildKeys[0] : ownKey;
  const resolvedKind = hasActionRequiredChild || ownEntry?.kind === 'ActionRequired'
    ? 'ActionRequired'
    : (tooltipKey ? counterMap[tooltipKey]?.kind || null : null);

  return {
    count: total,
    parent: true,
    tooltip: formatCounterTooltip({ counterKey: tooltipKey, count: total, stale: isStale, tr, trf }),
    counterKey: tooltipKey,
    counterKind: resolvedKind,
    increaseSeq: aggregateIncreaseSeq,
    increasedAtMs: latestIncreasedAtMs,
  };
}

export function computeNextDueDelayMs(nextDueAtUtc, nowMs = Date.now()) {
  if (!nextDueAtUtc) return null;
  const targetMs = Date.parse(nextDueAtUtc);
  if (!Number.isFinite(targetMs)) return null;
  const delta = targetMs - nowMs;
  if (delta <= 0) return MIN_SRS_TIMER_MS;
  if (delta > MAX_SRS_TIMER_MS) return null;
  return Math.max(MIN_SRS_TIMER_MS, delta + 500);
}
