import test from 'node:test';
import assert from 'node:assert/strict';
import * as pv from './proposalValidation.js';

const NOW_VN_1444 = new Date('2026-11-24T14:44:00+07:00').getTime(); // Tue 24/11/2026 14:44 GMT+7
const LEVELS = [
  { certificateLevelId: 1, code: 'N5', name: 'JLPT N5' },
  { certificateLevelId: 2, code: 'N4', name: 'JLPT N4' },
  { certificateLevelId: 3, code: 'N3', name: 'JLPT N3' },
  { certificateLevelId: 4, code: 'N2', name: 'JLPT N2' },
];

// ─── 1. Screenshot Bug Regressions (Section 2) ───

test('Bug 1 Regression: Selected slot Wed 09:45-11:15 with finite 10-week course MUST NOT render in Sep 2027, week 11, or before start', () => {
  const preview = pv.buildProposalPreviewCalendarSlots({
    weeklySessions: [{ weekday: 3, startMinute: 9 * 60 + 45, endMinute: 11 * 60 + 15 }],
    expectedStartDate: '2026-12-02', // Wed, >= 7 days after 2026-11-24
    policy: pv.DEFAULT_PROPOSAL_POLICY,
    nowMs: NOW_VN_1444,
  });

  assert.equal(preview.mode, 'finite_10_weeks');
  assert.equal(preview.slots.length, 10);
  assert.equal(preview.courseStartDate, '2026-12-02');
  assert.equal(preview.courseEndDate, '2027-02-03');

  // Sep 2027 -> 0 cards
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2027-09-01', '2027-09-30').length, 0);
  // Week 11 (2027-02-08..2027-02-14) -> 0 cards
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2027-02-08', '2027-02-14').length, 0);
  // Before start (2026-11-23..2026-12-01) -> 0 cards
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2026-11-23', '2026-12-01').length, 0);
  // Week 1 contains exact start date
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2026-11-30', '2026-12-06').length, 1);
  // Week 10 contains exact last date
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2027-02-01', '2027-02-07').length, 1);
});

test('Bug 2 Regression: Navigating to past week, next month, or next year MUST NOT render past cards or mutate validation state', () => {
  const proposal = {
    certificateLevelId: 1,
    programType: 'StandardJlpt',
    courseObjective: 'Hoàn thiện JLPT N5 trong 10 tuần',
    expectedStartDate: '2026-12-02', // Wed
    weeklySessions: [
      { weekday: 3, startMinute: 9 * 60 + 45, endMinute: 11 * 60 + 15 },
      { weekday: 5, startMinute: 9 * 60 + 45, endMinute: 11 * 60 + 15 },
    ],
  };

  const preview = pv.buildProposalPreviewCalendarSlots({
    weeklySessions: proposal.weeklySessions,
    expectedStartDate: proposal.expectedStartDate,
    policy: pv.DEFAULT_PROPOSAL_POLICY,
    nowMs: NOW_VN_1444,
  });

  // Past week, previous year, next year -> 0 cards
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2026-11-16', '2026-11-22').length, 0);
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2025-01-01', '2025-12-31').length, 0);
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2027-03-01', '2027-12-31').length, 0);

  // Validation result MUST be strictly invariant across arbitrary viewAnchorKey values
  const anchors = ['2026-12-02', '2026-11-16', '2026-10-01', '2027-09-15', '2028-02-29', null];
  const baseline = pv.validateProposalState({
    proposal,
    availableLevels: LEVELS,
    mentorVerified: true,
    mentorVerifiedJlptLevel: 'N1',
    viewAnchorKey: anchors[0],
    nowMs: NOW_VN_1444,
  });
  assert.equal(baseline.canSubmit, true);
  assert.equal(baseline.weeklySessionCount, 2);
  assert.equal(baseline.totalSessions, 20);
  assert.equal(baseline.projectedEndDate, '2027-02-05');

  for (const anchor of anchors) {
    const res = pv.validateProposalState({
      proposal,
      availableLevels: LEVELS,
      mentorVerified: true,
      mentorVerifiedJlptLevel: 'N1',
      viewAnchorKey: anchor,
      nowMs: NOW_VN_1444,
    });
    assert.equal(res.canSubmit, baseline.canSubmit);
    assert.equal(res.weeklySessionCount, 2);
    assert.equal(res.projectedEndDate, baseline.projectedEndDate);
    assert.deepEqual(res.errors, baseline.errors);
  }
});

test('Bug 3 Regression: Past-time slots in current week MUST NEVER render as valid selected preview cards', () => {
  // At Tue 24/11/2026 14:44, Tue 09:45-11:15 has already passed!
  const preview = pv.buildProposalPreviewCalendarSlots({
    weeklySessions: [
      { weekday: 2, startMinute: 9 * 60 + 45, endMinute: 11 * 60 + 15 },
      { weekday: 4, startMinute: 9 * 60 + 45, endMinute: 11 * 60 + 15 },
    ],
    expectedStartDate: '',
    referenceWeekKey: '2026-11-23', // current week
    policy: pv.DEFAULT_PROPOSAL_POLICY,
    nowMs: NOW_VN_1444,
  });

  assert.equal(preview.mode, 'reference_week');
  assert.equal(preview.slots.length, 2);
  // Must automatically advance reference week so ALL slots are strictly in the future
  assert.notEqual(preview.referenceWeekKey, '2026-11-23');
  for (const slot of preview.slots) {
    assert.ok(new Date(slot.startUtcIso).getTime() > NOW_VN_1444);
  }
});

// ─── 2. Temporal Boundaries (Section 15.A) ───

test('15.A Temporal boundaries: yesterday, past hour, exact now, started-not-ended, lead-time < 7 days vs == 7 days', () => {
  // Yesterday -> blocked
  const yesterday = pv.validateCourseStartDate({
    dayKey: '2026-11-23',
    weeklySessions: [{ weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 }],
    nowMs: NOW_VN_1444,
  });
  assert.equal(yesterday.valid, false);
  assert.equal(yesterday.code, 'PAST_SCHEDULE_SLOT');

  // 6 days from today (2026-11-30) -> fails 7-day lead-time
  const day6 = pv.validateCourseStartDate({
    dayKey: '2026-11-30',
    weeklySessions: [{ weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 }],
    nowMs: NOW_VN_1444,
  });
  assert.equal(day6.valid, false);
  assert.equal(day6.code, 'INSUFFICIENT_PROPOSAL_LEAD_TIME');

  // Exactly 7 days from today (2026-12-01, Tuesday) matching Tue slot -> VALID
  const day7 = pv.validateCourseStartDate({
    dayKey: '2026-12-01',
    weeklySessions: [{ weekday: 2, startMinute: 19 * 60, endMinute: 20 * 60 + 30 }],
    nowMs: NOW_VN_1444,
  });
  assert.equal(day7.valid, true);

  // Exact current minute (14:44) & already-started-not-ended (14:00-15:30 at 14:44) -> blocked even if leadDays=0
  const exactNow = pv.validateProposalState({
    proposal: {
      certificateLevelId: 1,
      courseObjective: 'Test exact now',
      expectedStartDate: '2026-11-24',
      weeklySessions: [
        { weekday: 2, startMinute: 14 * 60, endMinute: 15 * 60 + 30 }, // started 44 mins ago, ends in future!
        { weekday: 4, startMinute: 14 * 60, endMinute: 15 * 60 + 30 },
      ],
    },
    availableLevels: LEVELS,
    policy: { ...pv.DEFAULT_PROPOSAL_POLICY, minimumProposalLeadDays: 0 },
    nowMs: NOW_VN_1444,
  });
  assert.equal(exactNow.canSubmit, false);
  assert.ok(exactNow.errors.some((e) => e.code === 'SESSION_ALREADY_STARTED'));
});

// ─── 3. Recurrence Edge Cases (Section 15.B) ───

test('15.B Recurrence: 1/2/3/4 slots, same-day double slots, Mon+Sun, year-end crossing, leap year 29/02, zero duplicates', () => {
  // 1, 2, 3, 4 weekly slots -> 10, 20, 30, 40 occurrences; 1 slot previews 10 but cannot submit
  const four = [
    { weekday: 1, startMinute: 8 * 60, endMinute: 9 * 60 + 30 },
    { weekday: 1, startMinute: 10 * 60, endMinute: 11 * 60 + 30 }, // 2 slots same day!
    { weekday: 4, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    { weekday: 0, startMinute: 19 * 60, endMinute: 20 * 60 + 30 }, // Sunday end-of-week!
  ];

  for (const count of [1, 2, 3, 4]) {
    const slice = four.slice(0, count);
    const preview = pv.buildProposalPreviewCalendarSlots({
      weeklySessions: slice,
      expectedStartDate: '2026-12-07', // Mon
      policy: pv.DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_VN_1444,
    });
    assert.equal(preview.slots.length, count * 10);
    assert.equal(preview.courseEndDate, preview.occurrences[preview.occurrences.length - 1].localDate);

    // Every ID must be unique & deterministic (zero duplicates)
    const uniqueIds = new Set(preview.slots.map((s) => s.key));
    assert.equal(uniqueIds.size, count * 10);

    // Session numbers strictly continuous 1..N and sorted chronologically
    for (let i = 0; i < preview.occurrences.length; i += 1) {
      assert.equal(preview.occurrences[i].sessionNumber, i + 1);
      if (i > 0) {
        assert.ok(preview.occurrences[i].startMs > preview.occurrences[i - 1].startMs);
      }
    }

    // 1 slot MUST NOT be submittable even though preview shows 10 occurrences
    const val = pv.validateProposalState({
      proposal: {
        certificateLevelId: 1,
        courseObjective: 'Mục tiêu N5',
        expectedStartDate: '2026-12-07',
        weeklySessions: slice,
      },
      availableLevels: LEVELS,
      nowMs: NOW_VN_1444,
    });
    assert.equal(val.canSubmit, count >= 2);
  }

  // Duplicate weekly session inputs MUST be deduplicated cleanly
  const dupExpanded = pv.expandProposalOccurrences({
    expectedStartDate: '2026-12-07',
    weeklySessions: [
      { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
  });
  assert.equal(dupExpanded.length, 10);

  // Leap year 2028 crossing Feb 29 (2028-02-29 is Tuesday!)
  const nowFeb2028 = new Date('2028-02-01T08:00:00+07:00').getTime();
  const leapPreview = pv.buildProposalPreviewCalendarSlots({
    weeklySessions: [
      { weekday: 2, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 5, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
    expectedStartDate: '2028-02-29', // Leap day!
    policy: pv.DEFAULT_PROPOSAL_POLICY,
    nowMs: nowFeb2028,
  });
  assert.equal(leapPreview.mode, 'finite_10_weeks');
  assert.equal(leapPreview.slots.length, 20);
  assert.equal(leapPreview.slots[0].dayKey, '2028-02-29');
  assert.equal(leapPreview.slots[1].dayKey, '2028-03-03');
  assert.equal(leapPreview.courseEndDate, '2028-05-05');
});

// ─── 4. Selection Without Course Start Date (Section 6) ───

test('Section 6: Without expectedStartDate, preview renders ONLY in ONE stable future reference week (never infinite)', () => {
  const preview = pv.buildProposalPreviewCalendarSlots({
    weeklySessions: [
      { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 3, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
    expectedStartDate: '',
    referenceWeekKey: '2026-12-07',
    policy: pv.DEFAULT_PROPOSAL_POLICY,
    nowMs: NOW_VN_1444,
  });

  assert.equal(preview.mode, 'reference_week');
  assert.equal(preview.referenceWeekKey, '2026-12-07');
  assert.equal(preview.slots.length, 2);
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2026-12-07', '2026-12-13').length, 2);
  // Next week & next month & past week -> ZERO cards!
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2026-12-14', '2026-12-20').length, 0);
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2027-01-01', '2027-01-31').length, 0);
  assert.equal(pv.filterSlotsForVisibleRange(preview.slots, '2026-11-16', '2026-11-22').length, 0);
});

// ─── 5. Existing Invalid / Expired Restored Draft (Section 8 & 15.E) ───

test('Section 8 & 15.E: Restored draft with expired start date renders 0 past cards, preserves weekly patterns, emits single warning, blocks submit', () => {
  const expiredProposal = {
    certificateLevelId: 1,
    courseObjective: 'Lớp N5 đã lưu cũ',
    expectedStartDate: '2026-11-27', // Only 3 days after 2026-11-24 (< 7d lead-time!)
    weeklySessions: [
      { weekday: 5, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
  };

  const preview = pv.buildProposalPreviewCalendarSlots({
    weeklySessions: expiredProposal.weeklySessions,
    expectedStartDate: expiredProposal.expectedStartDate,
    policy: pv.DEFAULT_PROPOSAL_POLICY,
    nowMs: NOW_VN_1444,
  });

  assert.equal(preview.mode, 'invalid_start_date');
  assert.equal(preview.slots.length, 0);
  assert.ok(preview.startDateWarning);
  assert.match(preview.startDateWarning.message, /Ngày bắt đầu không còn phù hợp/);
  // Weekly patterns remain intact in the proposal object
  assert.equal(expiredProposal.weeklySessions.length, 2);

  const val = pv.validateProposalState({
    proposal: expiredProposal,
    availableLevels: LEVELS,
    nowMs: NOW_VN_1444,
  });
  assert.equal(val.canSubmit, false);
  assert.ok(val.errors.some((e) => e.code === 'INSUFFICIENT_PROPOSAL_LEAD_TIME'));
});

// ─── 6. Date Range Synchronization, Start Date Change & Disjoint Courses (Section 11 & 15.D & 15.G) ───

test('Section 11 & 15.G: Changing start date replaces all old occurrences cleanly (zero ghosts); disjoint courses with same weekday/time do not conflict; week-10 conflict is caught', () => {
  const weeklySessions = [
    { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    { weekday: 3, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
  ];

  // Initial start date: 2026-12-07 (ends 2027-02-10)
  const previewA = pv.buildProposalPreviewCalendarSlots({
    weeklySessions,
    expectedStartDate: '2026-12-07',
    policy: pv.DEFAULT_PROPOSAL_POLICY,
    nowMs: NOW_VN_1444,
  });
  assert.equal(previewA.courseStartDate, '2026-12-07');
  assert.equal(previewA.courseEndDate, '2027-02-10');

  // Change start date to 2027-03-01 -> ZERO occurrences remain in Dec 2026..Feb 2027!
  const previewB = pv.buildProposalPreviewCalendarSlots({
    weeklySessions,
    expectedStartDate: '2027-03-01',
    policy: pv.DEFAULT_PROPOSAL_POLICY,
    nowMs: NOW_VN_1444,
  });
  assert.equal(previewB.courseStartDate, '2027-03-01');
  assert.equal(pv.filterSlotsForVisibleRange(previewB.slots, '2026-12-01', '2027-02-28').length, 0);
  assert.equal(previewB.slots.length, 20);

  // Two courses with SAME Mon/Wed 19:00-20:30 in non-overlapping 10-week windows -> NO false conflict!
  const existingCourseCommitments = pv.buildProposalCommitments({
    otherProposals: [{
      id: 200,
      status: 'PendingReview',
      jlptLevelCode: 'N5',
      courseTitle: 'N5 Khóa 1',
      expectedStartDate: '2026-12-07',
      courseDurationWeeks: 10,
      sessionDurationMinutes: 90,
      weeklySessions,
    }],
  });

  const disjointVal = pv.validateProposalState({
    proposal: {
      id: 201,
      certificateLevelId: 2, // N4
      courseObjective: 'N4 Khóa 2 sau khi N5 kết thúc',
      expectedStartDate: '2027-03-01', // Starts after 2027-02-10!
      weeklySessions,
    },
    availableLevels: LEVELS,
    commitments: existingCourseCommitments,
    nowMs: NOW_VN_1444,
  });
  assert.equal(disjointVal.canSubmit, true);

  // Single conflict landing specifically on Week 10 (2027-02-10 Wed 19:00-20:30) MUST be caught!
  const week10ConflictStartMs = new Date('2027-02-10T19:00:00+07:00').getTime();
  const week10ConflictEndMs = new Date('2027-02-10T20:30:00+07:00').getTime();
  const week10Val = pv.validateProposalState({
    proposal: {
      certificateLevelId: 2,
      courseObjective: 'Kiểm tra xung đột tuần 10',
      expectedStartDate: '2026-12-07',
      weeklySessions,
    },
    availableLevels: LEVELS,
    commitments: [{
      id: 'wk10-busy',
      dayKey: '2027-02-10',
      weekday: 3,
      startMin: 19 * 60,
      endMin: 20 * 60 + 30,
      startMs: week10ConflictStartMs,
      endMs: week10ConflictEndMs,
      kind: 'approved',
      status: 'Approved',
      label: 'Lịch dạy cố định tuần 10',
    }],
    nowMs: NOW_VN_1444,
  });
  assert.equal(week10Val.canSubmit, false);
  assert.ok(week10Val.errors.some((e) => e.conflictDate === '2027-02-10'));
});

// ─── 7. Teaching Qualification & Per-Level Capacity Isolation (Section 12) ───

test('Section 12: JLPT qualification matrix & per-level 4-session independence (N5 4 pending + N4 4 disjoint allowed)', () => {
  // N3 mentor can teach N5, N4, N3, NOT N2
  assert.equal(pv.canMentorTeachJlptLevel('N3', 'N5'), true);
  assert.equal(pv.canMentorTeachJlptLevel('N3', 'N4'), true);
  assert.equal(pv.canMentorTeachJlptLevel('N3', 'N3'), true);
  assert.equal(pv.canMentorTeachJlptLevel('N3', 'N2'), false);
  assert.equal(pv.canMentorTeachJlptLevel('N1', 'N2'), true);
  assert.equal(pv.canMentorTeachJlptLevel('N1', 'N1'), false); // N1 class opening out of scope

  const n5PendingProposal = {
    id: 501,
    certificateLevelId: 1,
    jlptLevelCode: 'N5',
    status: 'PendingReview',
    expectedStartDate: '2026-12-07',
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions: [
      { weekday: 1, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
      { weekday: 2, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
      { weekday: 4, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
      { weekday: 5, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
    ],
  };

  const commitments = pv.buildProposalCommitments({
    otherProposals: [n5PendingProposal],
    currentProposalId: 502,
  });

  // N4 with 4 disjoint evening slots (20:00-21:30, 30 min gap > 15 min rest) MUST be allowed!
  const n4Val = pv.validateProposalState({
    proposal: {
      id: 502,
      certificateLevelId: 2,
      courseObjective: 'Lớp JLPT N4 song song',
      expectedStartDate: '2026-12-07',
      weeklySessions: [
        { weekday: 1, startMinute: 20 * 60, endMinute: 21 * 60 + 30 },
        { weekday: 2, startMinute: 20 * 60, endMinute: 21 * 60 + 30 },
        { weekday: 4, startMinute: 20 * 60, endMinute: 21 * 60 + 30 },
        { weekday: 5, startMinute: 20 * 60, endMinute: 21 * 60 + 30 },
      ],
    },
    availableLevels: LEVELS,
    mentorVerified: true,
    mentorVerifiedJlptLevel: 'N3',
    proposals: [n5PendingProposal],
    commitments,
    nowMs: NOW_VN_1444,
  });
  assert.equal(n4Val.canSubmit, true);
  assert.equal(n4Val.totalSessions, 40);

  // Attempting N2 as an N3 mentor MUST be blocked with INSUFFICIENT_TEACHING_QUALIFICATION
  const n2Blocked = pv.validateProposalState({
    proposal: {
      id: 503,
      certificateLevelId: 4,
      courseObjective: 'Thử mở lớp N2 bằng chứng chỉ N3',
      expectedStartDate: '2026-12-07',
      weeklySessions: [
        { weekday: 1, startMinute: 20 * 60, endMinute: 21 * 60 + 30 },
        { weekday: 3, startMinute: 20 * 60, endMinute: 21 * 60 + 30 },
      ],
    },
    availableLevels: LEVELS,
    mentorVerified: true,
    mentorVerifiedJlptLevel: 'N3',
    proposals: [n5PendingProposal],
    commitments,
    nowMs: NOW_VN_1444,
  });
  assert.equal(n2Blocked.canSubmit, false);
  assert.ok(n2Blocked.errors.some((e) => e.code === 'INSUFFICIENT_TEACHING_QUALIFICATION'));
});
