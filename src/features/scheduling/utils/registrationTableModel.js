import {
  DEFAULT_PROPOSAL_POLICY,
  expandProposalOccurrences,
  normalizeProposalPolicy,
  resolveStableReferenceWeek,
  sortWeeklySessions,
  weeklySlotKey,
} from './proposalValidation.js';
import {
  getViewDateRange,
  shiftDateKey,
  toVnDateKey,
  weekdayOfDateKey,
} from './calendarGeometry.js';
import { clockFromMinutes } from './slotPlannerModel.js';

export const REGISTRATION_TABLE_STATUS_OPTIONS = Object.freeze([
  { id: 'ALL', label: 'Tất cả trạng thái', dotClass: 'bg-[#CE476D]' },
  { id: 'selected', label: 'Đang chọn', dotClass: 'bg-[#22C55E]' },
  { id: 'pending', label: 'Chờ duyệt', dotClass: 'bg-[#E4A020]' },
  { id: 'approved', label: 'Đã duyệt', dotClass: 'bg-[#16A34A]' },
  { id: 'rejected', label: 'Bị từ chối', dotClass: 'bg-[#DC3545]' },
]);

export const REGISTRATION_TABLE_SORT_OPTIONS = Object.freeze([
  { id: 'default', label: 'Ưu tiên đang chọn & trạng thái' },
  { id: 'createdAt', label: 'Ngày đăng ký' },
  { id: 'startDate', label: 'Ngày khai giảng' },
  { id: 'jlpt', label: 'Cấp độ JLPT' },
  { id: 'status', label: 'Trạng thái' },
  { id: 'frequency', label: 'Tần suất (buổi/tuần)' },
]);

const WEEKDAY_SHORT_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAY_FULL_VN = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

export function formatWeekdayVn(weekday) {
  return WEEKDAY_FULL_VN[Number(weekday)] || '';
}

export function formatWeekdayShortVn(weekday) {
  return WEEKDAY_SHORT_VN[Number(weekday)] || '';
}

function jlptRank(code) {
  switch (String(code || '').trim().toUpperCase()) {
    case 'N5': return 1;
    case 'N4': return 2;
    case 'N3': return 3;
    case 'N2': return 4;
    case 'N1': return 5;
    default: return 99;
  }
}

function statusGroupRank(group) {
  switch (group) {
    case 'selected': return 0;
    case 'pending': return 1;
    case 'approved': return 2;
    case 'rejected': return 3;
    default: return 4;
  }
}

function mapProposalStatusGroup(status) {
  if (status === 'Draft') return 'selected';
  if (status === 'PendingReview' || status === 'ChangesRequested') return 'pending';
  if (status === 'Approved') return 'approved';
  if (status === 'Rejected') return 'rejected';
  return null;
}

function parseIsoTimeMs(value) {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function cleanDisplayTitle({ rawTitle, jlptLevelCode, isSelectedDraft }) {
  const trimmed = String(rawTitle || '').trim();
  const code = jlptLevelCode ? String(jlptLevelCode).trim().toUpperCase() : null;
  if (trimmed) {
    const cleaned = trimmed
      .replace(/\s*\(\d{2}:\d{2}[–-]\d{2}:\d{2}\)\s*$/g, '')
      .trim();
    const includesCode = Boolean(code && new RegExp(`\\b${code}\\b`, 'i').test(cleaned));
    return {
      displayTitle: cleaned,
      showLevelBadge: Boolean(code && !includesCode),
    };
  }
  if (isSelectedDraft) {
    return {
      displayTitle: code ? `Lịch dạy JLPT ${code} đang chọn` : 'Lịch dạy đang chọn',
      showLevelBadge: false,
    };
  }
  if (code) {
    return {
      displayTitle: `JLPT ${code}`,
      showLevelBadge: false,
    };
  }
  return {
    displayTitle: 'Đề xuất mở lớp',
    showLevelBadge: false,
  };
}

function normalizeWeeklyPatterns(rawSessions = [], sessionDurationMinutes = 90) {
  const sorted = sortWeeklySessions(
    (rawSessions || [])
      .filter(Boolean)
      .map((s) => {
        const weekday = Number(s.weekday);
        const startMinute = Number(s.startMinute ?? s.startMin ?? 0);
        const endMinute = Number(s.endMinute ?? s.endMin ?? (startMinute + sessionDurationMinutes));
        return {
          key: s.key || weeklySlotKey(weekday, startMinute),
          weekday,
          startMinute,
          endMinute,
          startClock: s.startClock || clockFromMinutes(startMinute),
          endClock: s.endClock || clockFromMinutes(endMinute),
        };
      })
  );
  // Deduplicate by stable weekly key so no child row can ever duplicate
  const seen = new Set();
  const unique = [];
  for (const item of sorted) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    unique.push(item);
  }
  return unique;
}

function normalizeOfficialOccurrences(proposal, weeklyPatterns, policy) {
  const durationWeeks = Number(proposal.courseDurationWeeks || policy.courseDurationWeeks || 10);
  const durationMinutes = Number(proposal.sessionDurationMinutes || policy.sessionDurationMinutes || 90);
  const rawOccs = Array.isArray(proposal.occurrencesPreview) && proposal.occurrencesPreview.length > 0
    ? proposal.occurrencesPreview
    : (proposal.expectedStartDate && weeklyPatterns.length > 0
      ? expandProposalOccurrences({
        expectedStartDate: proposal.expectedStartDate,
        weeklySessions: weeklyPatterns,
        courseDurationWeeks: durationWeeks,
        sessionDurationMinutes: durationMinutes,
      })
      : []);

  const seen = new Set();
  const list = [];
  for (let i = 0; i < rawOccs.length; i += 1) {
    const occ = rawOccs[i];
    const dayKey = occ?.localDate || occ?.dayKey || '';
    const startMinute = Number(occ?.startMinute ?? occ?.startMin);
    const endMinute = Number(occ?.endMinute ?? occ?.endMin ?? (startMinute + durationMinutes));
    if (!dayKey || !Number.isFinite(startMinute)) continue;
    const dedupeKey = `${dayKey}_${startMinute}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const startClock = occ.localStart || occ.startClock || clockFromMinutes(startMinute);
    const endClock = occ.localEnd || occ.endClock || clockFromMinutes(endMinute);
    list.push({
      id: `${proposal.id}-${dedupeKey}`,
      sessionNumber: occ.sessionNumber || list.length + 1,
      dayKey,
      year: dayKey.slice(0, 4),
      weekday: Number.isFinite(Number(occ.weekday)) ? Number(occ.weekday) : weekdayOfDateKey(dayKey),
      startMinute,
      endMinute,
      startClock,
      endClock,
      weeklyKey: weeklySlotKey(
        Number.isFinite(Number(occ.weekday)) ? Number(occ.weekday) : weekdayOfDateKey(dayKey),
        startMinute
      ),
    });
  }
  return list;
}

/**
 * Single authoritative registration-level projection for the Expandable Grouped List View.
 * - Produces at most ONE `selected` row (ONLY when `draft.weeklySessions.length >= 1`).
 * - Produces ONE row per official proposal (`PendingReview`, `ChangesRequested`, `Approved`, `Rejected`).
 * - Excludes `Withdrawn` and 0-session drafts.
 * - Uses stable keys (`'active-selection'` for current selection; `'proposal-<id>'` for official proposals)
 *   so same-level or same-name historical registrations NEVER merge and autosave ID assignment NEVER collapses state.
 */
export function buildRegistrationRows({
  draft = null,
  proposals = [],
  proposalPreview = null,
  invalidWeeklyMap = null,
  slots = [],
  cohorts = [],
  availableLevels = [],
  policy = DEFAULT_PROPOSAL_POLICY,
  nowMs = Date.now(),
  canProceedSelection = false,
} = {}) {
  const p = normalizeProposalPolicy(policy);
  const rows = [];
  const seenRowKeys = new Set();

  const slotById = new Map();
  for (const s of slots || []) {
    if (s?.id != null) slotById.set(Number(s.id), s);
  }
  const cohortById = new Map();
  for (const c of cohorts || []) {
    if (c?.id != null) cohortById.set(Number(c.id), c);
  }

  // 1. Active current selection (0 or 1 row, strictly enforcing Zero Selection Invariant)
  const draftSessions = Array.isArray(draft?.weeklySessions) ? draft.weeklySessions : [];
  if (draft && draft.status === 'Draft' && draftSessions.length > 0) {
    const durationWeeks = Number(draft.courseDurationWeeks || p.courseDurationWeeks || 10);
    const durationMinutes = Number(draft.sessionDurationMinutes || p.sessionDurationMinutes || 90);
    const weeklyPatterns = normalizeWeeklyPatterns(draftSessions, durationMinutes);
    const levelObj = (availableLevels || []).find(
      (l) => Number(l.certificateLevelId ?? l.id) === Number(draft.certificateLevelId)
    );
    const jlptLevelCode = (levelObj?.code || draft.jlptLevelCode || null)
      ? String(levelObj?.code || draft.jlptLevelCode).trim().toUpperCase()
      : null;

    const previewMode = proposalPreview?.mode || 'empty';
    const hasValidFinitePreview = previewMode === 'finite_10_weeks' && Array.isArray(proposalPreview?.slots) && proposalPreview.slots.length > 0;
    const hasInvalidStartDate = previewMode === 'invalid_start_date';
    const validStartDate = hasValidFinitePreview ? (proposalPreview.courseStartDate || draft.expectedStartDate || null) : null;

    // Build Level 3 occurrences ONLY when expectedStartDate is valid (never fake dates!)
    const occurrences = hasValidFinitePreview
      ? proposalPreview.slots.map((sel, idx) => ({
        id: `sel-${sel.key}`,
        sessionNumber: sel.sessionNumber || idx + 1,
        dayKey: sel.dayKey,
        year: String(sel.dayKey || '').slice(0, 4),
        weekday: Number.isFinite(Number(sel.weekday)) ? Number(sel.weekday) : weekdayOfDateKey(sel.dayKey),
        startMinute: Number(sel.startMin),
        endMinute: Number(sel.endMin),
        startClock: sel.startClock,
        endClock: sel.endClock,
        weeklyKey: sel.weeklyKey || weeklySlotKey(sel.weekday, sel.startMin),
        selectedKey: sel.key,
      }))
      : [];

    const fallbackRefMon = !hasValidFinitePreview
      ? (proposalPreview?.referenceWeekKey || resolveStableReferenceWeek({ weeklySessions: weeklyPatterns, policy: p, nowMs }))
      : null;

    const enrichedPatterns = weeklyPatterns.map((pat) => {
      const matchedPreview = (proposalPreview?.slots || []).find(
        (sl) => (sl.weeklyKey || sl.key) === pat.key
      );
      const dayKeyHint = matchedPreview?.dayKey
        || (fallbackRefMon ? shiftDateKey(fallbackRefMon, (pat.weekday + 6) % 7) : null);
      const affectedOccurrenceCount = hasValidFinitePreview
        ? occurrences.filter((o) => o.weeklyKey === pat.key).length
        : 1;
      return {
        ...pat,
        selectedKey: matchedPreview?.key || pat.key,
        dayKeyHint,
        affectedOccurrenceCount,
        invalidReason: invalidWeeklyMap?.get?.(pat.key) || null,
      };
    });

    const { displayTitle, showLevelBadge } = cleanDisplayTitle({
      rawTitle: draft.courseTitle,
      jlptLevelCode,
      isSelectedDraft: true,
    });

    const rowKey = 'active-selection';
    seenRowKeys.add(rowKey);
    rows.push({
      rowKey,
      proposalId: draft.id || null,
      status: 'Draft',
      statusGroup: 'selected',
      statusLabel: 'Đang chọn',
      isSelectedDraft: true,
      isChangesRequested: false,
      jlptLevelCode,
      displayTitle,
      showLevelBadge,
      weeklyCount: enrichedPatterns.length,
      durationWeeks,
      sessionDurationMinutes: durationMinutes,
      expectedTotalSessions: hasValidFinitePreview ? occurrences.length : enrichedPatterns.length * durationWeeks,
      isEstimatedTotal: !hasValidFinitePreview,
      expectedStartDate: validStartDate,
      courseEndDate: hasValidFinitePreview ? (proposalPreview.courseEndDate || occurrences[occurrences.length - 1]?.dayKey || null) : null,
      hasValidStartDate: hasValidFinitePreview,
      hasInvalidStartDate,
      startDateWarningMessage: hasInvalidStartDate ? (proposalPreview?.startDateWarning?.message || null) : null,
      canProceed: Boolean(canProceedSelection),
      weeklyPatterns: enrichedPatterns,
      occurrences,
      reviewReason: null,
      linkedCohortId: null,
      linkedCohortName: null,
      linkedCohortHref: null,
      eligibleApprovedSlot: null,
      createdAtMs: parseIsoTimeMs(draft.updatedAtUtc || draft.createdAtUtc) || nowMs,
      rawProposal: draft,
    });
  }

  // 2. Official registrations (PendingReview, ChangesRequested, Approved, Rejected)
  for (const prop of proposals || []) {
    if (!prop || prop.status === 'Draft' || prop.status === 'Withdrawn') continue;
    const statusGroup = mapProposalStatusGroup(prop.status);
    if (!statusGroup) continue;

    const rowKey = `proposal-${prop.id}`;
    if (seenRowKeys.has(rowKey)) continue;
    seenRowKeys.add(rowKey);

    const durationWeeks = Number(prop.courseDurationWeeks || p.courseDurationWeeks || 10);
    const durationMinutes = Number(prop.sessionDurationMinutes || p.sessionDurationMinutes || 90);
    const weeklyPatterns = normalizeWeeklyPatterns(prop.weeklySessions || [], durationMinutes);
    const occurrences = normalizeOfficialOccurrences(prop, weeklyPatterns, p);

    const jlptLevelCode = prop.jlptLevelCode ? String(prop.jlptLevelCode).trim().toUpperCase() : null;
    const { displayTitle, showLevelBadge } = cleanDisplayTitle({
      rawTitle: prop.courseTitle,
      jlptLevelCode,
      isSelectedDraft: false,
    });

    const isChangesRequested = prop.status === 'ChangesRequested';
    const statusLabel = isChangesRequested
      ? 'Cần bổ sung'
      : statusGroup === 'pending'
        ? 'Chờ duyệt'
        : statusGroup === 'approved'
          ? 'Đã duyệt'
          : 'Bị từ chối';

    const enrichedPatterns = weeklyPatterns.map((pat) => {
      const firstOcc = occurrences.find((o) => o.weeklyKey === pat.key);
      return {
        ...pat,
        dayKeyHint: firstOcc?.dayKey || prop.expectedStartDate || null,
        affectedOccurrenceCount: occurrences.filter((o) => o.weeklyKey === pat.key).length || durationWeeks,
        invalidReason: null,
      };
    });

    // Resolve linked cohort & any eligible approved availability slot for change/cancel requests
    const linkedCohortId = prop.linkedCohortId || null;
    const linkedCohort = linkedCohortId ? cohortById.get(Number(linkedCohortId)) : null;
    const linkedCohortName = prop.linkedCohortName || linkedCohort?.name || null;
    const linkedCohortHref = linkedCohortId ? `/mentor-study-courses/${linkedCohortId}/` : null;

    let eligibleApprovedSlot = null;
    if (statusGroup === 'approved' && Array.isArray(prop.generatedAvailabilityIds)) {
      for (const avId of prop.generatedAvailabilityIds) {
        const s = slotById.get(Number(avId));
        if (!s || !s.isApproved || s.isDeleted || s.isInCohort || (s.bookedCount ?? 0) > 0) continue;
        const sMs = Date.parse(s.startTime);
        if (Number.isFinite(sMs) && sMs > nowMs && !s.cancelRequestedAt && !s.changeRequestedAt) {
          eligibleApprovedSlot = s;
          break;
        }
      }
    }

    const totalSessions = occurrences.length > 0
      ? occurrences.length
      : (Number(prop.weeklySessionCount || weeklyPatterns.length) * durationWeeks);

    rows.push({
      rowKey,
      proposalId: prop.id,
      status: prop.status,
      statusGroup,
      statusLabel,
      isSelectedDraft: false,
      isChangesRequested,
      jlptLevelCode,
      displayTitle,
      showLevelBadge,
      weeklyCount: weeklyPatterns.length || Number(prop.weeklySessionCount || 0),
      durationWeeks,
      sessionDurationMinutes: durationMinutes,
      expectedTotalSessions: totalSessions,
      isEstimatedTotal: false,
      expectedStartDate: prop.expectedStartDate || occurrences[0]?.dayKey || null,
      courseEndDate: occurrences[occurrences.length - 1]?.dayKey || prop.expectedStartDate || null,
      hasValidStartDate: Boolean(prop.expectedStartDate),
      hasInvalidStartDate: false,
      startDateWarningMessage: null,
      canProceed: false,
      weeklyPatterns: enrichedPatterns,
      occurrences,
      reviewReason: prop.reviewReason || null,
      linkedCohortId,
      linkedCohortName,
      linkedCohortHref,
      eligibleApprovedSlot,
      createdAtMs: parseIsoTimeMs(prop.submittedAtUtc || prop.updatedAtUtc || prop.createdAtUtc),
      rawProposal: prop,
    });
  }

  return rows;
}

function matchesRegistrationNonStatus(row, {
  jlptLevelFilter = 'ALL',
  dateFilterMode = 'view',
  customFromDate = '',
  customToDate = '',
  searchQuery = '',
  todayKey = toVnDateKey(new Date()),
} = {}) {
  if (jlptLevelFilter && jlptLevelFilter !== 'ALL') {
    if (String(row.jlptLevelCode || '').toUpperCase() !== String(jlptLevelFilter).toUpperCase()) {
      return false;
    }
  }

  const q = String(searchQuery || '').trim().toLowerCase();
  if (q) {
    const hay = [
      row.displayTitle,
      row.jlptLevelCode,
      row.linkedCohortName,
      row.reviewReason,
      row.expectedStartDate,
      row.statusLabel,
    ].filter(Boolean).join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (dateFilterMode && dateFilterMode !== 'view') {
    const rowStart = row.expectedStartDate || '';
    const rowEnd = row.courseEndDate || rowStart;

    if (dateFilterMode === 'upcoming') {
      if (row.isSelectedDraft) return true;
      return Boolean(rowEnd && rowEnd >= todayKey);
    }
    if (dateFilterMode === 'past') {
      if (row.isSelectedDraft) return false;
      return Boolean(rowEnd && rowEnd < todayKey);
    }

    let filterStart = '';
    let filterEnd = '';
    if (dateFilterMode === 'today') {
      filterStart = todayKey;
      filterEnd = todayKey;
    } else if (dateFilterMode === 'week') {
      const r = getViewDateRange(todayKey, 'week');
      filterStart = r.startKey;
      filterEnd = r.endKey;
    } else if (dateFilterMode === 'month') {
      const r = getViewDateRange(todayKey, 'month');
      filterStart = r.startKey;
      filterEnd = r.endKey;
    } else if (dateFilterMode === 'custom') {
      filterStart = customFromDate || '';
      filterEnd = customToDate || '';
    }

    if (filterStart || filterEnd) {
      if (!rowStart && !rowEnd) return false;
      if (filterStart && rowEnd && rowEnd < filterStart) return false;
      if (filterEnd && rowStart && rowStart > filterEnd) return false;
    }
  }

  return true;
}

/**
 * Computes exact registration-based status counters (`ALL === selected + pending + approved + rejected`).
 * Strictly counts parent registrations (never individual occurrences or weekly patterns).
 */
export function computeRegistrationRowCounts(rows = [], filters = {}) {
  const counts = { ALL: 0, selected: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of rows || []) {
    if (!row || !matchesRegistrationNonStatus(row, filters)) continue;
    if (counts[row.statusGroup] != null) {
      counts[row.statusGroup] += 1;
    }
  }
  counts.ALL = counts.selected + counts.pending + counts.approved + counts.rejected;
  return counts;
}

/**
 * Filters parent registration rows by status + non-status filters (JLPT, search, date range).
 */
export function filterRegistrationRows(rows = [], {
  statusFilter = 'ALL',
  jlptLevelFilter = 'ALL',
  dateFilterMode = 'view',
  customFromDate = '',
  customToDate = '',
  searchQuery = '',
  todayKey = toVnDateKey(new Date()),
} = {}) {
  return (rows || []).filter((row) => {
    if (!row) return false;
    if (statusFilter && statusFilter !== 'ALL' && row.statusGroup !== statusFilter) {
      return false;
    }
    return matchesRegistrationNonStatus(row, {
      jlptLevelFilter,
      dateFilterMode,
      customFromDate,
      customToDate,
      searchQuery,
      todayKey,
    });
  });
}

/**
 * Sorts parent registration rows cleanly without ever disturbing grouping integrity.
 * Default order: 1. Đang chọn -> 2. Chờ duyệt -> 3. Đã duyệt -> 4. Bị từ chối (newest first in each group).
 */
export function sortRegistrationRows(rows = [], { sortBy = 'default', sortDirection = 'asc' } = {}) {
  const dir = sortDirection === 'desc' ? -1 : 1;
  return [...(rows || [])].sort((a, b) => {
    if (sortBy === 'createdAt') {
      const diff = (b.createdAtMs - a.createdAtMs) * dir;
      if (diff !== 0) return diff;
    } else if (sortBy === 'startDate') {
      const sa = a.expectedStartDate || '9999-12-31';
      const sb = b.expectedStartDate || '9999-12-31';
      const cmp = sa.localeCompare(sb) * dir;
      if (cmp !== 0) return cmp;
    } else if (sortBy === 'jlpt') {
      const diff = (jlptRank(a.jlptLevelCode) - jlptRank(b.jlptLevelCode)) * dir;
      if (diff !== 0) return diff;
    } else if (sortBy === 'status') {
      const diff = (statusGroupRank(a.statusGroup) - statusGroupRank(b.statusGroup)) * dir;
      if (diff !== 0) return diff;
    } else if (sortBy === 'frequency') {
      const diff = (a.weeklyCount - b.weeklyCount) * dir;
      if (diff !== 0) return diff;
    } else {
      const gDiff = statusGroupRank(a.statusGroup) - statusGroupRank(b.statusGroup);
      if (gDiff !== 0) return gDiff;
      const tDiff = b.createdAtMs - a.createdAtMs;
      if (tDiff !== 0) return tDiff;
    }
    return String(a.rowKey).localeCompare(String(b.rowKey));
  });
}
