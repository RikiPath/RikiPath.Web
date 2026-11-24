import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  formatFullDayWithYearVn,
  getViewDateRange,
} from '@/features/scheduling/utils/calendarGeometry.js';
import {
  LIST_REGISTRATION_STATUS_OPTIONS,
  REGISTRATION_EVENT_TYPE_OPTIONS,
  REGISTRATION_STATUS_OPTIONS,
  computeListRegistrationStatusCounts,
  computeRegistrationStatusCounts,
  filterRegistrationEvents,
  sortScheduleEvents,
} from '@/features/scheduling/utils/slotPlannerModel.js';
import {
  buildProposalPreviewCalendarSlots,
  expandProposalOccurrences,
  DEFAULT_PROPOSAL_POLICY,
} from '@/features/scheduling/utils/proposalValidation.js';

const NOW_MS = Date.parse('2026-11-24T10:00:00+07:00');
const TODAY_KEY = '2026-11-24';

function buildPendingOccurrences({ proposalId = 10, level = 'N4', startDate = '2026-12-02', weeklySessions }) {
  const occs = expandProposalOccurrences({
    expectedStartDate: startDate,
    weeklySessions,
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
  });
  return occs.map((occ) => ({
    id: `prop-${proposalId}-${occ.localDate}_${occ.startMinute}`,
    proposalId,
    proposalStatus: 'PendingReview',
    jlptLevelCode: level,
    courseTitle: `JLPT ${level} (${weeklySessions.length} buổi/tuần)`,
    sessionNumber: occ.sessionNumber,
    totalSessions: occs.length,
    sourceKind: 'pendingProposal',
    dayKey: occ.localDate,
    startHour: Math.floor(occ.startMinute / 60),
    startMinute: occ.startMinute % 60,
    endHour: Math.floor(occ.endMinute / 60),
    endMinute: occ.endMinute % 60,
    timeLabel: `${occ.localStart}–${occ.localEnd}`,
    title: `${occ.localStart}–${occ.localEnd}`,
    statusLabel: 'Chờ duyệt',
    tone: 'pending',
  }));
}

function buildSelectedEvents(previewSlots, { level = null, courseTitle = null } = {}) {
  return previewSlots.map((sel) => ({
    id: `selected-${sel.key}`,
    selectedKey: sel.key,
    weeklyKey: sel.weeklyKey,
    weekday: sel.weekday,
    jlptLevelCode: level,
    courseTitle,
    sessionNumber: sel.sessionNumber || null,
    totalSessions: sel.totalSessions || null,
    isFiniteOccurrence: Boolean(sel.isFiniteOccurrence),
    isWeeklyPattern: !sel.isFiniteOccurrence,
    sourceKind: 'selected',
    isSelectedDraft: true,
    dayKey: sel.dayKey,
    startHour: Math.floor(sel.startMin / 60),
    startMinute: sel.startMin % 60,
    endHour: Math.floor(sel.endMin / 60),
    endMinute: sel.endMin % 60,
    timeLabel: `${sel.startClock}–${sel.endClock}`,
    title: `${sel.startClock}–${sel.endClock}`,
    statusLabel: 'Đã chọn',
    tone: 'selected',
  }));
}

describe('Mentor Calendar & List View Synchronization', () => {
  it('formats cross-year week range title accurately without misleading single-year suffix', () => {
    const crossYear = getViewDateRange('2026-12-30', 'week');
    assert.equal(crossYear.startKey, '2026-12-28');
    assert.equal(crossYear.endKey, '2027-01-03');
    assert.equal(crossYear.title, 'Tháng 12/2026 – Tháng 01/2027');

    const sameYearCrossMonth = getViewDateRange('2026-12-02', 'week');
    assert.equal(sameYearCrossMonth.title, 'Tháng 11 – 12, 2026');

    const sameMonth = getViewDateRange('2026-11-18', 'week');
    assert.equal(sameMonth.title, 'Tháng 11, 2026');

    assert.equal(formatFullDayWithYearVn('2026-12-02', TODAY_KEY), 'Thứ 4, 02/12/2026');
    assert.equal(formatFullDayWithYearVn('2027-01-04', TODAY_KEY), 'Thứ 2, 04/01/2027');
    assert.equal(formatFullDayWithYearVn(TODAY_KEY, TODAY_KEY), 'Hôm nay · Thứ 3, 24/11/2026');
  });

  it('keeps Calendar official counters separate from List View counters and shows 4 patterns + 40 pending = 44 list rows before start date', () => {
    const pendingN4 = buildPendingOccurrences({
      proposalId: 101,
      level: 'N4',
      startDate: '2026-12-02',
      weeklySessions: [
        { key: '3_720', weekday: 3, startMinute: 720, endMinute: 810 },
        { key: '3_885', weekday: 3, startMinute: 885, endMinute: 975 },
        { key: '4_765', weekday: 4, startMinute: 765, endMinute: 855 },
        { key: '4_975', weekday: 4, startMinute: 975, endMinute: 1065 },
      ],
    });
    assert.equal(pendingN4.length, 40);

    // 4 selected weekly patterns WITHOUT expectedStartDate -> exactly 4 pattern rows (NOT 40 fake dated rows)
    const previewWithoutStart = buildProposalPreviewCalendarSlots({
      weeklySessions: [
        { key: '1_480', weekday: 1, startMinute: 480, endMinute: 570 },
        { key: '2_480', weekday: 2, startMinute: 480, endMinute: 570 },
        { key: '5_480', weekday: 5, startMinute: 480, endMinute: 570 },
        { key: '6_480', weekday: 6, startMinute: 480, endMinute: 570 },
      ],
      expectedStartDate: null,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(previewWithoutStart.mode, 'reference_week');
    assert.equal(previewWithoutStart.slots.length, 4);

    const selectedEvents = buildSelectedEvents(previewWithoutStart.slots);
    const withdrawnLeak = {
      id: 'withdrawn-1',
      proposalStatus: 'Withdrawn',
      sourceKind: 'withdrawn',
      dayKey: '2026-12-10',
      startHour: 9,
      startMinute: 0,
      endHour: 10,
      endMinute: 30,
      tone: 'cancelled',
    };
    const allEvents = [...pendingN4, ...selectedEvents, withdrawnLeak];

    // Calendar official counts: strictly exclude selected & withdrawn -> ALL = 40
    const calCounts = computeRegistrationStatusCounts(allEvents, { nowMs: NOW_MS });
    assert.deepEqual(calCounts, { ALL: 40, pending: 40, approved: 0, rejected: 0 });

    // List View counts (all time): include 4 selected patterns + 40 pending -> ALL = 44
    const listCounts = computeListRegistrationStatusCounts(allEvents, { nowMs: NOW_MS });
    assert.deepEqual(listCounts, { ALL: 44, selected: 4, pending: 40, approved: 0, rejected: 0 });

    // List View rows default (ALL, keepSelectedVisible=true, no calendar dateRange cap) -> 44 rows
    const listAll = filterRegistrationEvents(allEvents, {
      statusFilter: 'ALL',
      keepSelectedVisible: true,
      dateRange: null,
      nowMs: NOW_MS,
    });
    assert.equal(listAll.length, 44);
    assert.equal(listAll.filter((e) => e.isSelectedDraft).length, 4);
    assert.equal(listAll.filter((e) => !e.isSelectedDraft).length, 40);

    // Filter List View strictly to 'selected' -> 4 pattern rows
    const listSelected = filterRegistrationEvents(allEvents, {
      statusFilter: 'selected',
      keepSelectedVisible: true,
      dateRange: null,
      nowMs: NOW_MS,
    });
    assert.equal(listSelected.length, 4);
    assert.ok(listSelected.every((e) => e.isSelectedDraft && e.isWeeklyPattern));
  });

  it('expands finite 10-week selection to 40 preview rows once valid expectedStartDate is set and keeps 0 duplicates', () => {
    const pendingN4 = buildPendingOccurrences({
      proposalId: 201,
      level: 'N4',
      startDate: '2026-12-02',
      weeklySessions: [
        { key: '3_720', weekday: 3, startMinute: 720, endMinute: 810 },
        { key: '3_885', weekday: 3, startMinute: 885, endMinute: 975 },
        { key: '4_765', weekday: 4, startMinute: 765, endMinute: 855 },
        { key: '4_975', weekday: 4, startMinute: 975, endMinute: 1065 },
      ],
    });

    const previewFinite = buildProposalPreviewCalendarSlots({
      weeklySessions: [
        { key: '1_540', weekday: 1, startMinute: 540, endMinute: 630 },
        { key: '2_540', weekday: 2, startMinute: 540, endMinute: 630 },
        { key: '5_540', weekday: 5, startMinute: 540, endMinute: 630 },
        { key: '6_540', weekday: 6, startMinute: 540, endMinute: 630 },
      ],
      expectedStartDate: '2026-12-07', // Monday (>= 7 days lead from 2026-11-24)
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(previewFinite.mode, 'finite_10_weeks');
    assert.equal(previewFinite.slots.length, 40);

    const selectedN3 = buildSelectedEvents(previewFinite.slots, { level: 'N3', courseTitle: 'JLPT N3 Sáng' });
    const combined = [...pendingN4, ...selectedN3, ...pendingN4.slice(0, 3)]; // Inject duplicates to verify dedupe

    const listCounts = computeListRegistrationStatusCounts(combined, { nowMs: NOW_MS });
    assert.deepEqual(listCounts, { ALL: 80, selected: 40, pending: 40, approved: 0, rejected: 0 });

    // Filter by JLPT N3 -> strictly 40 selected rows; N4 -> strictly 40 pending rows
    const onlyN3 = filterRegistrationEvents(combined, {
      statusFilter: 'ALL',
      jlptLevelFilter: 'N3',
      keepSelectedVisible: true,
      nowMs: NOW_MS,
    });
    assert.equal(onlyN3.length, 40);
    assert.ok(onlyN3.every((e) => e.jlptLevelCode === 'N3'));

    // Search by class name
    const searched = filterRegistrationEvents(combined, {
      statusFilter: 'ALL',
      searchQuery: 'N3 Sáng',
      keepSelectedVisible: true,
      nowMs: NOW_MS,
    });
    assert.equal(searched.length, 40);

    // Smart sort puts Đã chọn before Chờ duyệt; JLPT sort puts N4 before N3 (N5 < N4 < N3 < N2)
    const smartSorted = sortScheduleEvents([pendingN4[0], selectedN3[0]], { sortBy: 'smart', todayKey: TODAY_KEY, nowMs: NOW_MS });
    assert.equal(smartSorted[0].isSelectedDraft, true);

    const jlptSorted = sortScheduleEvents([selectedN3[0], pendingN4[0]], { sortBy: 'jlpt', sortDirection: 'asc', todayKey: TODAY_KEY, nowMs: NOW_MS });
    assert.equal(jlptSorted[0].jlptLevelCode, 'N4');
    assert.equal(jlptSorted[1].jlptLevelCode, 'N3');
  });

  it('enforces UI & architecture contracts for synchronized Calendar/List workspace', () => {
    assert.deepEqual(REGISTRATION_STATUS_OPTIONS.map((o) => o.id), ['ALL', 'pending', 'approved', 'rejected']);
    assert.deepEqual(LIST_REGISTRATION_STATUS_OPTIONS.map((o) => o.id), ['ALL', 'selected', 'pending', 'approved', 'rejected']);
    assert.deepEqual(REGISTRATION_EVENT_TYPE_OPTIONS.map((o) => o.id), ['ALL', 'Draft', 'Proposal']);

    const calSrc = fs.readFileSync(
      path.resolve('src/features/scheduling/components/InteractiveSlotCalendar.jsx'),
      'utf8',
    );
    const pageSrc = fs.readFileSync(
      path.resolve('src/pages/mentor/MentorShiftSchedule.jsx'),
      'utf8',
    );

    assert.ok(calSrc.includes('Danh sách lịch đăng ký'), 'List View must render dedicated header title instead of calendar nav');
    assert.ok(calSrc.includes('Toàn bộ thời gian'), 'List View must default to All Time scope');
    assert.ok(calSrc.includes('<ExpandableRegistrationTable'), 'List View in proposalMode must render the 3-level ExpandableRegistrationTable');
    assert.ok(!calSrc.includes('Nhóm theo đăng ký'), 'Group-by-Registration toggle must be removed once grouping is the default');
    assert.ok(calSrc.includes('handleViewOnCalendar'), 'List View must support View on Calendar navigation');
    assert.ok(!calSrc.includes('min-h-[440px]'), 'List View table must not create excess empty whitespace when few rows exist');
    assert.ok(!calSrc.includes('Sparkles'), 'Must not use Sparkles icon');
    assert.ok(pageSrc.includes('handleWithdrawProposalById'), 'MentorShiftSchedule must wire whole-proposal withdraw action');
    assert.ok(pageSrc.includes('handleReregisterProposalById'), 'MentorShiftSchedule must wire validated re-register flow');
    assert.ok(pageSrc.includes('reregisterConfirmTarget'), 'Re-registering while an active selection exists must require confirmation');
    assert.ok(!pageSrc.includes('listDrawerOpen'), 'Duplicate Registration History drawer must be consolidated into List View');
  });
});
