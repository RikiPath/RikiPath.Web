import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  REGISTRATION_TABLE_SORT_OPTIONS,
  REGISTRATION_TABLE_STATUS_OPTIONS,
  buildRegistrationRows,
  computeRegistrationRowCounts,
  filterRegistrationRows,
  sortRegistrationRows,
} from '@/features/scheduling/utils/registrationTableModel.js';
import {
  DEFAULT_PROPOSAL_POLICY,
  buildProposalPreviewCalendarSlots,
} from '@/features/scheduling/utils/proposalValidation.js';

const NOW_MS = Date.parse('2026-11-24T10:00:00+07:00');
const TODAY_KEY = '2026-11-24';

const FOUR_WEEKLY_N4 = [
  { key: '3_720', weekday: 3, startMinute: 720, endMinute: 810, startClock: '12:00', endClock: '13:30' },
  { key: '3_885', weekday: 3, startMinute: 885, endMinute: 975, startClock: '14:45', endClock: '16:15' },
  { key: '4_765', weekday: 4, startMinute: 765, endMinute: 855, startClock: '12:45', endClock: '14:15' },
  { key: '4_975', weekday: 4, startMinute: 975, endMinute: 1065, startClock: '16:15', endClock: '17:45' },
];

const THREE_WEEKLY_N3 = [
  { key: '1_480', weekday: 1, startMinute: 480, endMinute: 570, startClock: '08:00', endClock: '09:30' },
  { key: '3_480', weekday: 3, startMinute: 480, endMinute: 570, startClock: '08:00', endClock: '09:30' },
  { key: '5_480', weekday: 5, startMinute: 480, endMinute: 570, startClock: '08:00', endClock: '09:30' },
];

const TWO_WEEKLY_N5 = [
  { key: '2_1140', weekday: 2, startMinute: 1140, endMinute: 1230, startClock: '19:00', endClock: '20:30' },
  { key: '6_1140', weekday: 6, startMinute: 1140, endMinute: 1230, startClock: '19:00', endClock: '20:30' },
];

function makeProposal({
  id,
  status = 'PendingReview',
  jlptLevelCode = 'N4',
  courseTitle = '',
  expectedStartDate = '2026-12-02',
  weeklySessions = FOUR_WEEKLY_N4,
  reviewReason = null,
  linkedCohortId = null,
  linkedCohortName = null,
  submittedAtUtc = '2026-11-24T08:00:00Z',
}) {
  return {
    id,
    status,
    jlptLevelCode,
    courseTitle,
    expectedStartDate,
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions,
    reviewReason,
    linkedCohortId,
    linkedCohortName,
    submittedAtUtc,
    updatedAtUtc: submittedAtUtc,
  };
}

describe('Mentor Expandable Registration Table & Unified History', () => {
  it('A. groups 40 occurrences into 1 registration row and 4 registrations x 40 into 4 rows without merging same-level historical proposals', () => {
    const proposals = [
      makeProposal({ id: 101, status: 'PendingReview', jlptLevelCode: 'N4', courseTitle: 'Lớp JLPT N4 Tối', expectedStartDate: '2026-12-02', weeklySessions: FOUR_WEEKLY_N4 }),
      makeProposal({ id: 102, status: 'Approved', jlptLevelCode: 'N3', courseTitle: 'Lớp JLPT N3 Sáng', expectedStartDate: '2026-12-07', weeklySessions: FOUR_WEEKLY_N4, linkedCohortId: 55, linkedCohortName: 'N3-K12' }),
      makeProposal({ id: 103, status: 'Rejected', jlptLevelCode: 'N4', courseTitle: 'Lớp JLPT N4 Tối', expectedStartDate: '2026-12-09', weeklySessions: FOUR_WEEKLY_N4, reviewReason: 'Trùng lịch phòng học' }),
      makeProposal({ id: 104, status: 'Rejected', jlptLevelCode: 'N4', courseTitle: 'Lớp JLPT N4 Tối', expectedStartDate: '2026-12-16', weeklySessions: FOUR_WEEKLY_N4, reviewReason: 'Cần điều chỉnh giờ' }),
      makeProposal({ id: 105, status: 'Withdrawn', jlptLevelCode: 'N5', courseTitle: 'Đã hủy không hiển thị', expectedStartDate: '2026-12-10', weeklySessions: TWO_WEEKLY_N5 }),
    ];

    const rows = buildRegistrationRows({
      draft: { id: null, status: 'Draft', weeklySessions: [] },
      proposals,
      proposalPreview: { mode: 'empty', slots: [] },
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });

    // 4 official rows (Withdrawn excluded; 0-slot Draft excluded)
    assert.equal(rows.length, 4);

    // Each registration has 40 Level 3 occurrences, yet takes strictly 1 parent row
    assert.ok(rows.every((r) => r.occurrences.length === 40));
    assert.ok(rows.every((r) => r.weeklyPatterns.length === 4));

    // Historical same-level / same-name proposals stay strictly separate by proposal-<id>
    const n4Rows = rows.filter((r) => r.jlptLevelCode === 'N4');
    assert.equal(n4Rows.length, 3);
    assert.deepEqual(
      n4Rows.map((r) => r.rowKey).sort(),
      ['proposal-101', 'proposal-103', 'proposal-104']
    );
  });

  it('B & D. counts by registration (4 selected patterns + 40 pending occurrences = 2 registrations) and enforces Zero Selection Invariant', () => {
    const pendingN4 = makeProposal({
      id: 201,
      status: 'PendingReview',
      jlptLevelCode: 'N4',
      expectedStartDate: '2026-12-02',
      weeklySessions: FOUR_WEEKLY_N4,
    });

    // Zero Selection Invariant: 0 weekly slots -> no Đang chọn row
    const rowsZeroDraft = buildRegistrationRows({
      draft: { id: 999, status: 'Draft', weeklySessions: [], expectedStartDate: '2026-12-07' },
      proposals: [pendingN4],
      proposalPreview: { mode: 'empty', slots: [] },
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    const countsZero = computeRegistrationRowCounts(rowsZeroDraft, { todayKey: TODAY_KEY });
    assert.deepEqual(countsZero, { ALL: 1, selected: 0, pending: 1, needsRevision: 0, approved: 0, rejected: 0 });
    assert.equal(rowsZeroDraft.some((r) => r.isSelectedDraft), false);

    // 4 selected patterns (without start date) + 40 pending occurrences = 2 registrations
    const previewWithoutStart = buildProposalPreviewCalendarSlots({
      weeklySessions: THREE_WEEKLY_N3,
      expectedStartDate: null,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    const rowsWithDraft = buildRegistrationRows({
      draft: {
        id: null,
        status: 'Draft',
        weeklySessions: THREE_WEEKLY_N3,
        expectedStartDate: '',
        courseDurationWeeks: 10,
      },
      proposals: [pendingN4],
      proposalPreview: previewWithoutStart,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });

    const counts = computeRegistrationRowCounts(rowsWithDraft, { todayKey: TODAY_KEY });
    assert.deepEqual(counts, { ALL: 2, selected: 1, pending: 1, needsRevision: 0, approved: 0, rejected: 0 });
    assert.equal(counts.ALL, counts.selected + counts.pending + counts.needsRevision + counts.approved + counts.rejected);
    assert.ok(counts.selected <= 1);
  });

  it('C. generates no fake dated occurrences when start date is unset, and generates exact 10-week finite occurrences across years once valid start date is set', () => {
    // 1. Without start date: Level 2 shows weekly patterns, Level 3 occurrences MUST be empty
    const previewNoStart = buildProposalPreviewCalendarSlots({
      weeklySessions: THREE_WEEKLY_N3,
      expectedStartDate: null,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(previewNoStart.mode, 'visible_representative');

    const [noStartRow] = buildRegistrationRows({
      draft: { id: null, status: 'Draft', weeklySessions: THREE_WEEKLY_N3, expectedStartDate: '' },
      proposals: [],
      proposalPreview: previewNoStart,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(noStartRow.rowKey, 'active-selection');
    assert.equal(noStartRow.hasValidStartDate, false);
    assert.equal(noStartRow.expectedStartDate, null);
    assert.equal(noStartRow.weeklyPatterns.length, 3);
    assert.equal(noStartRow.expectedTotalSessions, 30);
    assert.equal(noStartRow.isEstimatedTotal, true);
    assert.equal(noStartRow.occurrences.length, 0);

    // 2. With valid start date crossing 2026 -> 2027: Level 3 has exact 30 finite occurrences, no Week 11, no past dates
    const previewFinite = buildProposalPreviewCalendarSlots({
      weeklySessions: THREE_WEEKLY_N3,
      expectedStartDate: '2026-12-14', // Monday (>= 14-day proposal lead time from 2026-11-24)
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(previewFinite.mode, 'finite_10_weeks');

    const [finiteRow] = buildRegistrationRows({
      draft: {
        id: 777, // Autosaved server ID must still keep stable rowKey = 'active-selection'
        status: 'Draft',
        jlptLevelCode: 'N3',
        weeklySessions: THREE_WEEKLY_N3,
        expectedStartDate: '2026-12-14',
      },
      proposals: [],
      proposalPreview: previewFinite,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(finiteRow.rowKey, 'active-selection');
    assert.equal(finiteRow.hasValidStartDate, true);
    assert.equal(finiteRow.isEstimatedTotal, false);
    assert.equal(finiteRow.occurrences.length, 30);
    assert.equal(finiteRow.occurrences[0].dayKey, '2026-12-14');
    assert.equal(finiteRow.occurrences[0].sessionNumber, 1);
    assert.equal(finiteRow.occurrences[29].sessionNumber, 30);
    assert.ok(finiteRow.occurrences.every((o) => o.dayKey >= '2026-12-14'));
    assert.ok(finiteRow.occurrences.some((o) => o.year === '2026'));
    assert.ok(finiteRow.occurrences.some((o) => o.year === '2027'));
    // Verify 10-week finite window (no Week 11 beyond 69 days from start)
    assert.ok(finiteRow.occurrences[29].dayKey <= '2027-02-21');
  });

  it('G. filters and sorts accurately at the registration level without losing active selection when status is ALL', () => {
    const rows = buildRegistrationRows({
      draft: {
        id: null,
        status: 'Draft',
        jlptLevelCode: 'N5',
        courseTitle: 'N5 Căn bản',
        weeklySessions: TWO_WEEKLY_N5,
        expectedStartDate: '',
      },
      proposals: [
        makeProposal({ id: 301, status: 'Approved', jlptLevelCode: 'N3', courseTitle: 'Lớp N3 Sáng', expectedStartDate: '2026-12-07', weeklySessions: THREE_WEEKLY_N3, submittedAtUtc: '2026-11-20T08:00:00Z' }),
        makeProposal({ id: 302, status: 'PendingReview', jlptLevelCode: 'N4', courseTitle: 'Lớp N4 Chiều', expectedStartDate: '2026-12-02', weeklySessions: FOUR_WEEKLY_N4, submittedAtUtc: '2026-11-23T08:00:00Z' }),
        makeProposal({ id: 303, status: 'Rejected', jlptLevelCode: 'N2', courseTitle: 'Lớp N2 Luyện đề', expectedStartDate: '2026-12-14', weeklySessions: TWO_WEEKLY_N5, submittedAtUtc: '2026-11-22T08:00:00Z' }),
      ],
      proposalPreview: { mode: 'visible_representative', slots: [] },
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });

    // Default priority order: Đang chọn -> Chờ duyệt -> Đã duyệt -> Bị từ chối
    const defaultSorted = sortRegistrationRows(rows, { sortBy: 'default' });
    assert.deepEqual(
      defaultSorted.map((r) => r.statusGroup),
      ['selected', 'pending', 'approved', 'rejected']
    );

    // Filter by status = pending
    assert.deepEqual(
      filterRegistrationRows(rows, { statusFilter: 'pending', todayKey: TODAY_KEY }).map((r) => r.proposalId),
      [302]
    );

    // Filter by JLPT = N3
    assert.deepEqual(
      filterRegistrationRows(rows, { jlptLevelFilter: 'N3', todayKey: TODAY_KEY }).map((r) => r.jlptLevelCode),
      ['N3']
    );

    // Filter by search query matching weekday/class title
    assert.deepEqual(
      filterRegistrationRows(rows, { searchQuery: 'luyện đề', todayKey: TODAY_KEY }).map((r) => r.proposalId),
      [303]
    );

    // Sort by JLPT ascending: N5 -> N4 -> N3 -> N2
    const byJlpt = sortRegistrationRows(rows, { sortBy: 'jlpt', sortDirection: 'asc' });
    assert.deepEqual(byJlpt.map((r) => r.jlptLevelCode), ['N5', 'N4', 'N3', 'N2']);

    // Sort by frequency ascending: 2, 2, 3, 4
    const byFreq = sortRegistrationRows(rows, { sortBy: 'frequency', sortDirection: 'asc' });
    assert.deepEqual(byFreq.map((r) => r.weeklyCount), [2, 2, 3, 4]);

    // Sort by startDate ascending (valid start dates first, unset last)
    const byStart = sortRegistrationRows(rows, { sortBy: 'startDate', sortDirection: 'asc' });
    assert.deepEqual(byStart.map((r) => r.expectedStartDate), ['2026-12-02', '2026-12-07', '2026-12-14', null]);
  });

  it('E, H & I. enforces architectural consolidation, terminology, and clean toolbar contracts', () => {
    assert.deepEqual(
      REGISTRATION_TABLE_STATUS_OPTIONS.map((o) => o.id),
      ['ALL', 'selected', 'pending', 'needsRevision', 'approved', 'rejected']
    );
    assert.deepEqual(
      REGISTRATION_TABLE_SORT_OPTIONS.map((o) => o.id),
      ['default', 'createdAt', 'startDate', 'jlpt', 'status', 'frequency']
    );

    const tableSrc = fs.readFileSync(
      path.resolve('src/features/scheduling/components/ExpandableRegistrationTable.jsx'),
      'utf8'
    );
    const calSrc = fs.readFileSync(
      path.resolve('src/features/scheduling/components/InteractiveSlotCalendar.jsx'),
      'utf8'
    );
    const pageSrc = fs.readFileSync(
      path.resolve('src/pages/mentor/MentorShiftSchedule.jsx'),
      'utf8'
    );

    // 3-level expandable table & status-based actions present
    assert.ok(tableSrc.includes('expandable-registration-table'));
    assert.ok(tableSrc.includes('Xem toàn bộ {0} buổi học'));
    assert.ok(tableSrc.includes('Thu gọn lịch chi tiết'));
    assert.ok(tableSrc.includes('e.stopPropagation()'), 'Action buttons must not trigger row expand/collapse');
    assert.ok(!tableSrc.includes('Sparkles'), 'Must never use Sparkles icon');
    assert.ok(!tableSrc.includes('hover:underline'), 'Must never use hover:underline');
    assert.ok(!tableSrc.includes('accent-'), 'Must never use accent-* Tailwind classes');
    assert.ok(!tableSrc.includes('Admin'), 'Vietnamese UI must use quản trị viên instead of Admin');

    // Consolidation: no Nhóm theo đăng ký toggle; Registration History toolbar button & drawer restored
    assert.ok(!calSrc.includes('list-group-toggle'));
    assert.ok(!calSrc.includes('Nhóm theo đăng ký'));
    assert.ok(pageSrc.includes('Lịch sử đăng ký'), 'Toolbar button and drawer for Registration History must be available');
    assert.ok(pageSrc.includes('PROPOSAL_STATUS_FILTERS'), 'Registration History drawer must provide status filters');
    assert.ok(!pageSrc.includes('lastSubmittedBanner'), 'Post-submit green banner above calendar must be removed');
    assert.ok(pageSrc.includes('Đăng ký mở lớp thành công'), 'Post-submit toast notification must inform mentor of registration');

    // Review Modal & Admin Drawer UI polish: weekly metric label and non-interactive attachments
    const reviewModalSrc = fs.readFileSync(
      path.resolve('src/features/scheduling/components/TeachingProposalReviewModal.jsx'),
      'utf8'
    );
    const adminPanelSrc = fs.readFileSync(
      path.resolve('src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx'),
      'utf8'
    );
    const courseDrawerSrc = fs.readFileSync(
      path.resolve('src/features/scheduling/components/TeachingProposalCourseInfoDrawer.jsx'),
      'utf8'
    );
    assert.ok(reviewModalSrc.includes("tr('Buổi mỗi tuần')"), 'Weekly summary metric must display "Buổi mỗi tuần" without "/4" denominator');
    assert.ok(!reviewModalSrc.includes("tr('Buổi / tuần')"), 'Legacy "Buổi / tuần" label must be replaced');
    assert.ok(
      reviewModalSrc.includes('fetchMentorProposalAttachmentBlob') && reviewModalSrc.includes('openOrDownloadBlob') && !reviewModalSrc.includes('href={a.url}'),
      'Mentor review attachments must open/download safely through authorized API without exposing raw storage URLs'
    );
    assert.ok(
      adminPanelSrc.includes('fetchAdminProposalAttachmentBlob') && adminPanelSrc.includes('openOrDownloadBlob') && !adminPanelSrc.includes('href={a.url}'),
      'Admin drawer attachments must open/download safely through authorized API without exposing raw storage URLs'
    );
    assert.ok(
      courseDrawerSrc.includes('uploadOptionalProposalAttachment') && !courseDrawerSrc.includes('href={att.url}'),
      'Course info drawer attachments must never render raw storage anchor links'
    );

    // Proposal Detail Modal & deep links preserved
    assert.ok(pageSrc.includes('<TeachingProposalReviewModal'));
    assert.ok(pageSrc.includes("searchParams.get('proposalId')"));
  });
});
