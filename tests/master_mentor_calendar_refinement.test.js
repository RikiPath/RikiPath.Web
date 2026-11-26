import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProposalCommitments,
  buildProposalPreviewCalendarSlots,
  DEFAULT_PROPOSAL_POLICY,
  evaluateCourseStartDate,
  expandProposalOccurrences,
  findEarliestAvailableStartDate,
  sortWeeklySessions,
  validateCourseStartDate,
  validateWeeklySlotAddition,
  weeklySlotKey,
} from '../src/features/scheduling/utils/proposalValidation.js';
import {
  buildRegistrationRows,
  computeRegistrationRowCounts,
} from '../src/features/scheduling/utils/registrationTableModel.js';
import {
  getViewDateRange,
  shiftDateKey,
} from '../src/features/scheduling/utils/calendarGeometry.js';
import {
  formatAttachmentSize,
  getAttachmentExtension,
  isAttachmentInlinePreviewable,
  MAX_PROPOSAL_ATTACHMENT_BYTES,
  MAX_PROPOSAL_ATTACHMENTS,
} from '../src/features/scheduling/utils/attachmentHelpers.js';

const NOW_ISO = '2026-11-25T10:00:00+07:00'; // Wednesday 10:00 VN
const NOW_MS = new Date(NOW_ISO).getTime();
const TODAY_KEY = '2026-11-25';

function makeCommitment({ id = 'c1', dayKey, startMinute, duration = 90, kind = 'approved', jlptLevelCode = 'N4', proposalId = 10, status = 'Approved' }) {
  const sh = String(Math.floor(startMinute / 60)).padStart(2, '0');
  const sm = String(startMinute % 60).padStart(2, '0');
  const endMin = startMinute + duration;
  const eh = String(Math.floor(endMin / 60)).padStart(2, '0');
  const em = String(endMin % 60).padStart(2, '0');
  return {
    id,
    dayKey,
    weekday: new Date(`${dayKey}T12:00:00Z`).getUTCDay(),
    startMin: startMinute,
    endMin,
    startMs: new Date(`${dayKey}T${sh}:${sm}:00+07:00`).getTime(),
    endMs: new Date(`${dayKey}T${eh}:${em}:00+07:00`).getTime(),
    kind,
    status,
    jlptLevelCode,
    proposalId,
    label: `Lớp ${jlptLevelCode}`,
  };
}

describe('Master Mentor Calendar Refinement, Start Date & Data Integrity (Groups A–I)', () => {
  // Group A — Weekly Pattern Selection & Deduplication
  it('A. enforces 2-4 weekly session selection, deduplicates identical weekday+time, and keeps pattern count exact', () => {
    const rawWithDuplicate = [
      { weekday: 5, startMinute: 10 * 60 },
      { weekday: 1, startMinute: 8 * 60 },
      { weekday: 5, startMinute: 10 * 60 }, // duplicate Friday 10:00
    ];
    const deduped = sortWeeklySessions(rawWithDuplicate);
    assert.equal(deduped.length, 2);
    assert.equal(deduped[0].key, weeklySlotKey(1, 480));
    assert.equal(deduped[1].key, weeklySlotKey(5, 600));

    // Adding a 5th pattern is blocked cleanly at 4 max
    const four = [
      { weekday: 1, startMinute: 8 * 60, endMinute: 9 * 60 + 30 },
      { weekday: 2, startMinute: 8 * 60, endMinute: 9 * 60 + 30 },
      { weekday: 3, startMinute: 8 * 60, endMinute: 9 * 60 + 30 },
      { weekday: 4, startMinute: 8 * 60, endMinute: 9 * 60 + 30 },
    ];
    const fifth = validateWeeklySlotAddition({
      weekday: 5,
      startMinute: 8 * 60,
      currentSessions: four,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(fifth.valid, false);
    assert.equal(fifth.code, 'PROPOSAL_MAX_SESSIONS_EXCEEDED');

    // Representative projection across Month View (~4 Mondays + Fridays) still counts 2 weekly patterns
    const monthRange = getViewDateRange('2026-12-01', 'month');
    const preview = buildProposalPreviewCalendarSlots({
      weeklySessions: deduped,
      expectedStartDate: null,
      visibleRange: monthRange,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(preview.mode, 'visible_representative');
    assert.equal(preview.weeklyPatternCount, 2);
    assert.ok(preview.slots.length > 2);
  });

  // Group B — Visible-Range Representative Projection & Switch to Finite 10-Week Course Schedule
  it('B. projects weekly patterns across visible Day/Week/Month/Cross-Year ranges without past time and stops once valid start date is chosen', () => {
    const patterns = sortWeeklySessions([
      { weekday: 3, startMinute: 8 * 60 },  // Wednesday 08:00 (already past on 2026-11-25 10:00!)
      { weekday: 5, startMinute: 10 * 60 }, // Friday 10:00
    ]);

    // Visible current week (2026-11-23 .. 2026-11-29):
    // Wednesday 2026-11-25 08:00 is <= NOW (10:00) so MUST NOT appear! Friday 2026-11-27 10:00 MUST appear!
    const currentWeekRange = getViewDateRange('2026-11-25', 'week');
    const curWeekPreview = buildProposalPreviewCalendarSlots({
      weeklySessions: patterns,
      expectedStartDate: null,
      visibleRange: currentWeekRange,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(curWeekPreview.mode, 'visible_representative');
    assert.equal(curWeekPreview.slots.some((s) => s.dayKey === '2026-11-25'), false);
    assert.equal(curWeekPreview.slots.some((s) => s.dayKey === '2026-11-27' && s.isRepresentativeProjection), true);

    // Cross-year week (2026-12-28 .. 2027-01-03): both Wed 30/12 and Fri 01/01 project cleanly
    const crossYearRange = getViewDateRange('2026-12-30', 'week');
    const crossYearPreview = buildProposalPreviewCalendarSlots({
      weeklySessions: patterns,
      expectedStartDate: null,
      visibleRange: crossYearRange,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(crossYearPreview.slots.length, 2);
    assert.deepEqual(crossYearPreview.slots.map((s) => s.dayKey), ['2026-12-30', '2027-01-01']);

    // Visible-date overlap conflict flags non-obscuring warning tooltip without deleting the pattern
    const commitmentOnDec30 = makeCommitment({
      dayKey: '2026-12-30',
      startMinute: 8 * 60,
      jlptLevelCode: 'N4',
      status: 'PendingReview',
      kind: 'pendingProposal',
    });
    const overlapPreview = buildProposalPreviewCalendarSlots({
      weeklySessions: patterns,
      expectedStartDate: null,
      visibleRange: crossYearRange,
      commitments: [commitmentOnDec30],
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    const dec30Rep = overlapPreview.slots.find((s) => s.dayKey === '2026-12-30');
    assert.equal(dec30Rep.hasVisibleDateConflict, true);
    assert.equal(
      dec30Rep.visibleConflictTooltip,
      'Khung giờ này đã có lịch vào ngày đang xem. Hệ thống sẽ kiểm tra lại khi chọn ngày khai giảng.'
    );
    assert.equal(overlapPreview.weeklyPatternCount, 2);

    // Selecting valid expectedStartDate ('2026-12-11', Friday >= 14 days from 2026-11-25) switches cleanly to finite_10_weeks
    const finite = buildProposalPreviewCalendarSlots({
      weeklySessions: patterns,
      expectedStartDate: '2026-12-11',
      visibleRange: crossYearRange,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(finite.mode, 'finite_10_weeks');
    assert.equal(finite.slots.length, 20);
    assert.ok(finite.slots.every((s) => s.isFiniteOccurrence && !s.isRepresentativeProjection));
  });

  // Group C — Past Date & Past Time
  it('C. rejects past start dates and today past time', () => {
    const patterns = sortWeeklySessions([
      { weekday: 3, startMinute: 8 * 60 },
      { weekday: 5, startMinute: 10 * 60 },
    ]);
    const pastDay = evaluateCourseStartDate({
      dayKey: '2026-11-20',
      weeklySessions: patterns,
      policy: { ...DEFAULT_PROPOSAL_POLICY, minimumProposalLeadDays: 0 },
      nowMs: NOW_MS,
    });
    assert.equal(pastDay.valid, false);
    assert.equal(pastDay.reason, 'Đã quá thời gian này.');

    const todayPastTime = evaluateCourseStartDate({
      dayKey: TODAY_KEY, // 2026-11-25 10:00, session is 08:00
      weeklySessions: patterns,
      policy: { ...DEFAULT_PROPOSAL_POLICY, minimumProposalLeadDays: 0 },
      nowMs: NOW_MS,
    });
    assert.equal(todayPastTime.valid, false);
    assert.equal(todayPastTime.reason, 'Đã quá thời gian này.');
  });

  // Group D — Exact Course Start Date, Disabled-Date Tooltips & Conflict Skipping
  it('D. evaluates disabled start-date reasons accurately and computes true conflict-free earliest start date across 10 weeks', () => {
    const patterns = sortWeeklySessions([
      { weekday: 2, startMinute: 19 * 60 }, // Tuesday 19:00
      { weekday: 4, startMinute: 19 * 60 }, // Thursday 19:00
    ]);

    // 1. Inside 14-day lead time (from 2026-11-25, min lead = 2026-12-09)
    const leadErr = evaluateCourseStartDate({
      dayKey: '2026-12-08',
      weeklySessions: patterns,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(leadErr.valid, false);
    assert.equal(leadErr.reason, 'Chưa đủ thời gian xét duyệt và tuyển sinh.');

    // 2. Wrong weekday (2026-12-11 is Friday)
    const wdErr = evaluateCourseStartDate({
      dayKey: '2026-12-11',
      weeklySessions: patterns,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(wdErr.valid, false);
    assert.equal(wdErr.reason, 'Không có khung giờ giảng dạy vào ngày này.');

    // 3. Commitment overlaps Week 3 of starting on 2026-12-10 (Thu), e.g., on 2026-12-24 19:00,
    //    AND horizon limit test
    const blockingCommitments = [
      makeCommitment({ id: 'blk-1', dayKey: '2026-12-15', startMinute: 19 * 60, jlptLevelCode: 'N4' }),
      makeCommitment({ id: 'blk-2', dayKey: '2026-12-17', startMinute: 19 * 60, jlptLevelCode: 'N4' }),
      makeCommitment({ id: 'blk-3', dayKey: '2026-12-22', startMinute: 19 * 60, jlptLevelCode: 'N4' }),
      makeCommitment({ id: 'blk-4', dayKey: '2026-12-24', startMinute: 19 * 60, jlptLevelCode: 'N4' }),
    ];

    const blockedStart = validateCourseStartDate({
      dayKey: '2026-12-10',
      weeklySessions: patterns,
      commitments: blockingCommitments,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(blockedStart.valid, false);
    assert.equal(blockedStart.reason, 'Trùng lớp N4 ngày 15/12.');

    // Rest window < 15 min violation
    const restCommitment = [
      makeCommitment({ id: 'rst-1', dayKey: '2026-12-15', startMinute: 17 * 60 + 20, jlptLevelCode: 'N5' }), // ends 18:50 -> 10 min before 19:00
    ];
    const restErr = evaluateCourseStartDate({
      dayKey: '2026-12-10',
      weeklySessions: patterns,
      commitments: restCommitment,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(restErr.valid, false);
    assert.equal(restErr.reason, 'Cần nghỉ ít nhất 15 phút giữa hai buổi.');

    // Horizon limit violation
    const horizonErr = evaluateCourseStartDate({
      dayKey: '2027-02-02',
      weeklySessions: patterns,
      policy: { ...DEFAULT_PROPOSAL_POLICY, maxProposalStartAdvanceDays: 45 },
      nowMs: NOW_MS,
    });
    assert.equal(horizonErr.valid, false);
    assert.equal(horizonErr.reason, 'Ngày này nằm ngoài thời gian được phép đăng ký.');

    // True earliest available start date must skip past blockingCommitments (all future >= 2026-12-29 are clear!)
    const earliest = findEarliestAvailableStartDate({
      weeklySessions: patterns,
      commitments: blockingCommitments,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.ok(earliest);
    assert.equal(earliest.startDate, '2026-12-29'); // First Tuesday >= 2026-12-29 where all 10 weeks miss 15/12..24/12!
    assert.equal(earliest.totalSessions, 20);
  });

  // Group E — 10-Week Course Recurrence Calculation (20/30/40, Mid-Week, Cross-Year, Leap Year)
  it('E. expands exact 20/30/40 finite occurrences across mid-week, cross-year, and leap-year Feb 29', () => {
    // 3 sessions/week starting Thu 03/12/2026 -> 30 sessions across 2026->2027, end date = Sat 06/02/2027
    const thuFriSat = sortWeeklySessions([
      { weekday: 4, startMinute: 10 * 60 + 15 },
      { weekday: 5, startMinute: 8 * 60 + 15 },
      { weekday: 6, startMinute: 13 * 60 + 45 },
    ]);
    const thirty = expandProposalOccurrences({
      expectedStartDate: '2026-12-03',
      weeklySessions: thuFriSat,
      courseDurationWeeks: 10,
      sessionDurationMinutes: 90,
    });
    assert.equal(thirty.length, 30);
    assert.equal(thirty[0].localDate, '2026-12-03');
    assert.equal(thirty[29].localDate, '2027-02-06');

    // Leap year check: Thu 2028-02-17 for 10 weeks covers Feb 29, 2028 on Tue!
    const tueThu = sortWeeklySessions([
      { weekday: 2, startMinute: 9 * 60 },
      { weekday: 4, startMinute: 9 * 60 },
    ]);
    const leapOccurrences = expandProposalOccurrences({
      expectedStartDate: '2028-02-17',
      weeklySessions: tueThu,
      courseDurationWeeks: 10,
      sessionDurationMinutes: 90,
    });
    assert.equal(leapOccurrences.length, 20);
    assert.equal(leapOccurrences.some((o) => o.localDate === '2028-02-29'), true);
    assert.equal(leapOccurrences[19].localDate, '2028-04-25');
  });

  // Group F — Calendar Navigation & Cross-Year Toolbar Labels
  it('F. formats cross-year week/day/agenda range titles clearly without losing year context', () => {
    const crossYearWeek = getViewDateRange('2026-12-30', 'week');
    assert.equal(crossYearWeek.startKey, '2026-12-28');
    assert.equal(crossYearWeek.endKey, '2027-01-03');
    assert.equal(crossYearWeek.title, 'Tháng 12/2026 – Tháng 01/2027');
    assert.equal(crossYearWeek.subtitle, '28/12/2026 – 03/01/2027');

    const janDay = getViewDateRange('2027-01-01', 'day');
    assert.equal(janDay.title, 'Thứ 6, 01/01/2027');

    const shifted = shiftDateKey('2026-12-31', 1);
    assert.equal(shifted, '2027-01-01');
  });

  // Group G — Proposal-Level Status Filter Counters (NOT Occurrences)
  it('G. counts unique official proposals across Calendar & List views regardless of session counts', () => {
    const proposals = [
      { id: 101, status: 'PendingReview', jlptLevelCode: 'N4', courseTitle: 'Lớp N4', weeklySessions: [{ weekday: 1, startMinute: 480 }, { weekday: 2, startMinute: 480 }, { weekday: 3, startMinute: 480 }, { weekday: 4, startMinute: 480 }], expectedStartDate: '2026-12-14', courseDurationWeeks: 10 },
      { id: 102, status: 'ChangesRequested', jlptLevelCode: 'N3', courseTitle: 'Lớp N3', weeklySessions: [{ weekday: 5, startMinute: 480 }, { weekday: 6, startMinute: 480 }], expectedStartDate: '2026-12-18', courseDurationWeeks: 10 },
      { id: 103, status: 'Approved', jlptLevelCode: 'N5', courseTitle: 'Lớp N5', weeklySessions: [{ weekday: 1, startMinute: 600 }, { weekday: 3, startMinute: 600 }, { weekday: 5, startMinute: 600 }], expectedStartDate: '2026-12-14', courseDurationWeeks: 10 },
      { id: 104, status: 'Withdrawn', jlptLevelCode: 'N2', courseTitle: 'Đã rút', weeklySessions: [{ weekday: 2, startMinute: 600 }, { weekday: 4, startMinute: 600 }], expectedStartDate: '2026-12-15', courseDurationWeeks: 10 },
    ];
    const draft = {
      id: null,
      status: 'Draft',
      weeklySessions: [{ weekday: 0, startMinute: 600, endMinute: 690 }],
      expectedStartDate: '',
    };

    const rows = buildRegistrationRows({
      draft,
      proposals,
      proposalPreview: { mode: 'visible_representative', slots: [] },
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });

    // Calendar official filter counters (excluding Draft/Withdrawn) MUST equal 3 (NOT 90 occurrences!)
    const officialRowsOnly = rows.filter((r) => !r.isSelectedDraft);
    const calendarCounts = computeRegistrationRowCounts(officialRowsOnly, { todayKey: TODAY_KEY });
    assert.deepEqual(calendarCounts, {
      ALL: 3,
      selected: 0,
      pending: 1,
      needsRevision: 1,
      approved: 1,
      rejected: 0,
    });
  });

  // Group H — Attachments Formatting, Limits & Extension Safety
  it('H. enforces attachment limits, size formatting, and safe inline-preview rules', () => {
    assert.equal(MAX_PROPOSAL_ATTACHMENTS, 5);
    assert.equal(MAX_PROPOSAL_ATTACHMENT_BYTES, 25 * 1024 * 1024);
    assert.equal(formatAttachmentSize(1536), '2 KB');
    assert.equal(formatAttachmentSize(2.5 * 1024 * 1024), '2.5 MB');
    assert.equal(getAttachmentExtension('Giao_trinh_N4.PDF'), '.pdf');
    assert.equal(isAttachmentInlinePreviewable('de-cuong.pdf'), true);
    assert.equal(isAttachmentInlinePreviewable('bang-diem.xlsx'), false);
    assert.equal(isAttachmentInlinePreviewable('lich-chi-tiet.docx'), false);
  });

  // Group I — Official Schedule Lock & Revision Working Copy Isolation
  it('I. keeps official PendingReview and ChangesRequested schedules locked out of Draft commitments', () => {
    const proposals = [
      {
        id: 36,
        status: 'ChangesRequested',
        jlptLevelCode: 'N3',
        courseTitle: 'Lớp JLPT N3',
        expectedStartDate: '2026-12-17',
        courseDurationWeeks: 10,
        sessionDurationMinutes: 90,
        weeklySessions: [
          { weekday: 4, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
          { weekday: 6, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
        ],
      },
    ];
    const fullCommitments = buildProposalCommitments({
      occupiedItems: [],
      otherProposals: proposals,
      currentProposalId: null,
      policy: DEFAULT_PROPOSAL_POLICY,
    });
    assert.equal(fullCommitments.length, 20);

    // Entering isolated revision mode for proposal #36 excludes #36 from commitments so teacher can edit freely without self-blocking
    const revisionCommitments = buildProposalCommitments({
      occupiedItems: [],
      otherProposals: proposals,
      currentProposalId: 36,
      policy: DEFAULT_PROPOSAL_POLICY,
    });
    assert.equal(revisionCommitments.length, 0);
  });
});
