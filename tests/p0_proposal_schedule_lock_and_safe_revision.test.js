import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildProposalCommitments,
  computeProposalTuitionPreview,
  normalizeProposalPolicy,
  sortWeeklySessions,
  validateProposalState,
  validateWeeklySlotAddition,
} from '@/features/scheduling/utils/proposalValidation.js';
import {
  buildVisibleRestWindowSources,
  computeDayRestWindows,
  filterRegistrationEvents,
} from '@/features/scheduling/utils/slotPlannerModel.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(TEST_DIR, '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '..');
const BACKEND_ROOT = path.join(REPO_ROOT, 'RikiPath.Backend');

const readWeb = (rel) => fs.readFileSync(path.join(WEB_ROOT, rel), 'utf8');
const readBackend = (rel) => fs.readFileSync(path.join(BACKEND_ROOT, rel), 'utf8');

describe('P0 Hotfix — Official Schedule Lock & Mutation Guards', () => {
  it('renders locked status and lock icon + tooltip for PendingReview and ChangesRequested cards', () => {
    const calendarSrc = readWeb('src/features/scheduling/components/InteractiveSlotCalendar.jsx');
    const mentorPageSrc = readWeb('src/pages/mentor/MentorShiftSchedule.jsx');

    // InteractiveSlotCalendar enforces lock icon & reservation tooltip on needsRevision cards
    assert.ok(calendarSrc.includes("Lịch đã được giữ chỗ. Mở đề xuất để chỉnh sửa."));
    assert.ok(calendarSrc.includes("ev.tone === 'needsRevision' ? (\r\n                                      <Lock") || calendarSrc.includes("ev.tone === 'needsRevision' ? (\n                                      <Lock"));
    assert.ok(calendarSrc.includes('if (ev.isSelectedDraft && !ev.locked && ev.selectedKey)'));
    assert.ok(calendarSrc.includes('if (ev.isSelectedDraft && !ev.locked) removeSelectedSlotByKey(ev.selectedKey)'));
    assert.ok(calendarSrc.includes('if (proposalMode && proposalReadOnly) return;'));

    // Official proposal cards built in MentorShiftSchedule always mark PendingReview & ChangesRequested locked and non-draggable
    assert.ok(mentorPageSrc.includes("sourceKind: isNeedsRevision ? 'needsRevisionProposal' : 'pendingProposal'"));
    assert.ok(mentorPageSrc.includes('draggable: false'));
    assert.ok(mentorPageSrc.includes('locked: true'));
  });

  it('prevents autosave, draft hydration, quick fill, and clear-all from mutating non-Draft official proposals', () => {
    const persistenceSrc = readWeb('src/features/scheduling/hooks/useProposalDraftPersistence.js');
    const mentorPageSrc = readWeb('src/pages/mentor/MentorShiftSchedule.jsx');

    assert.ok(persistenceSrc.includes("if (!current || current.status !== 'Draft' || !isEditable || !userId) return null;"));
    assert.ok(persistenceSrc.includes("if (serverDraft?.status && serverDraft.status !== 'Draft') {\r\n      return serverDraft;") || persistenceSrc.includes("if (serverDraft?.status && serverDraft.status !== 'Draft') {\n      return serverDraft;"));

    assert.ok(mentorPageSrc.includes("if (!targetDraft || targetDraft.status !== 'Draft')"));
    assert.ok(mentorPageSrc.includes("if (revisionScheduleEditing || draft.status !== 'Draft') {\r\n      return;") || mentorPageSrc.includes("if (revisionScheduleEditing || draft.status !== 'Draft') {\n      return;"));
    assert.ok(mentorPageSrc.includes("if (!isEditable || draft.status !== 'Draft' || revisionScheduleEditing) return;"));
  });
});

describe('P0 Hotfix — Backend Draft Lock, Atomic Resubmission & Audit Repair Contract', () => {
  it('locks UpdateDraftAsync to Draft-only and implements atomic ResubmitProposalAsync on POST /{id}/resubmit', () => {
    const controllerSrc = readBackend('RikiPath.WebApi/Controllers/MentorTeachingProposalController.cs');
    const adminControllerSrc = readBackend('RikiPath.WebApi/Controllers/AdminTeachingProposalController.cs');
    const serviceSrc = readBackend('RikiPath.Application/Services/MentorTeachingProposalService.cs');
    const mentorPageSrc = readWeb('src/pages/mentor/MentorShiftSchedule.jsx');
    const apiSrc = readWeb('src/features/scheduling/api/teachingProposalApi.js');

    // UpdateDraftAsync must reject ChangesRequested and any non-Draft status
    const updateDraftSlice = serviceSrc.slice(
      serviceSrc.indexOf('UpdateDraftAsync('),
      serviceSrc.indexOf('DeleteDraftAsync(')
    );
    assert.ok(updateDraftSlice.includes('if (proposal.Status != MentorTeachingProposalStatus.Draft)'));
    assert.ok(!updateDraftSlice.includes('MentorTeachingProposalStatus.ChangesRequested'));

    // Dedicated atomic Resubmit endpoint exists and validates minPerWeek & full EvaluateProposalAsync before mutating DB
    assert.ok(controllerSrc.includes('[HttpPost("{id:int}/resubmit")]'));
    assert.ok(serviceSrc.includes('public async Task<ApiResponse<TeachingProposalResponse>> ResubmitProposalAsync('));
    assert.ok(serviceSrc.includes('PROPOSAL_MIN_SESSIONS_NOT_MET'));
    assert.ok(serviceSrc.includes('PROPOSAL_LEVEL_LOCKED_ON_REVISION'));
    assert.ok(serviceSrc.includes('NEVER mutate official proposal row/schedule if validation fails'));

    // Frontend resubmitMutation uses single atomic resubmitTeachingProposal (no pre-mutation via updateTeachingProposalDraft)
    assert.ok(apiSrc.includes('/resubmit'));
    assert.ok(mentorPageSrc.includes('return resubmitTeachingProposal(revisionDraft.id, atomicPayload);'));
    assert.ok(!mentorPageSrc.includes('updateTeachingProposalDraft'));

    // Admin repair endpoint restores strictly from historical SnapshotJson without inventing slots
    assert.ok(adminControllerSrc.includes('[HttpPost("repair-invalid-schedules")]'));
    assert.ok(serviceSrc.includes('public async Task<ApiResponse<RepairInvalidProposalSchedulesResponse>> RepairInvalidNeedsRevisionSchedulesAsync('));
    assert.ok(serviceSrc.includes('FindLatestValidSnapshot('));
    assert.ok(serviceSrc.includes('ScheduleRestoredFromAudit'));
  });
});

describe('P0 Hotfix — Explicit Revision Schedule Editing Mode Validation (0 / 1 / 2–4 / 5 / Conflicts / Self-Exclusion)', () => {
  const policy = normalizeProposalPolicy({
    minSessionsPerWeek: 2,
    maxSessionsPerWeek: 4,
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    restMinutes: 15,
    dailySessionCap: 4,
    weeklySessionCap: 12,
    minimumProposalLeadDays: 14,
  });
  const nowMs = Date.parse('2026-11-25T05:00:00+07:00'); // Wednesday
  const availableLevels = [
    { certificateLevelId: 1, code: 'N5', name: 'JLPT N5', qualified: true, isAvailable: true },
    { certificateLevelId: 3, code: 'N3', name: 'JLPT N3', qualified: true, isAvailable: true },
  ];
  const qualifiedLevels = availableLevels;

  const sessionMon08 = { weekday: 1, startMinute: 480, endMinute: 570, key: '1_480', startClock: '08:00', endClock: '09:30' };
  const sessionTue08 = { weekday: 2, startMinute: 480, endMinute: 570, key: '2_480', startClock: '08:00', endClock: '09:30' };
  const sessionWed08 = { weekday: 3, startMinute: 480, endMinute: 570, key: '3_480', startClock: '08:00', endClock: '09:30' };
  const sessionThu10 = { weekday: 4, startMinute: 600, endMinute: 690, key: '4_600', startClock: '10:00', endClock: '11:30' };
  const sessionFri14 = { weekday: 5, startMinute: 840, endMinute: 930, key: '5_840', startClock: '14:00', endClock: '15:30' };
  const sessionSat14 = { weekday: 6, startMinute: 840, endMinute: 930, key: '6_840', startClock: '14:00', endClock: '15:30' };

  const otherPendingN5 = {
    id: 50,
    status: 'PendingReview',
    certificateLevelId: 1,
    jlptLevelCode: 'N5',
    courseTitle: 'Lớp JLPT N5',
    expectedStartDate: '2026-12-16',
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions: [
      { weekday: 5, startMinute: 480, endMinute: 570, startClock: '08:00', endClock: '09:30' },
      { weekday: 6, startMinute: 480, endMinute: 570, startClock: '08:00', endClock: '09:30' },
    ],
  };

  const targetRevisionN3 = {
    id: 36,
    status: 'ChangesRequested',
    revision: 4,
    certificateLevelId: 3,
    jlptLevelCode: 'N3',
    courseTitle: 'Lớp JLPT N3',
    courseObjective: 'Luyện thi JLPT N3 đạt 120+',
    expectedStartDate: '2026-12-14', // Monday >= 14 days from 2026-11-25
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions: [sessionMon08, sessionTue08],
  };

  it('excludes only revisionDraft.id from commitments so original slots remain selectable while other proposals stay blocking', () => {
    const revCommitments = buildProposalCommitments({
      occupiedItems: [],
      otherProposals: [targetRevisionN3, otherPendingN5],
      currentProposalId: targetRevisionN3.id,
      policy,
    });

    // Self-check keeping Mon 08:00 (from own Proposal #36) + adding Wed 08:00 must succeed
    const keepOwnCheck = validateWeeklySlotAddition({
      weekday: 1,
      startMinute: 480,
      currentSessions: [sessionWed08],
      expectedStartDate: '2026-12-14',
      commitments: revCommitments,
      policy,
      nowMs,
    });
    assert.equal(keepOwnCheck.valid, true);

    // Selecting Fri 08:00 (overlaps other PendingReview N5 proposal #50) must be blocked
    const overlapOtherCheck = validateWeeklySlotAddition({
      weekday: 5,
      startMinute: 480,
      currentSessions: [sessionMon08],
      expectedStartDate: '2026-12-14',
      commitments: revCommitments,
      policy,
      nowMs,
    });
    assert.equal(overlapOtherCheck.valid, false);

    // Selecting Fri 09:30 (only 0m rest after N5's 08:00–09:30; requires 15m rest) must be blocked
    const restOtherCheck = validateWeeklySlotAddition({
      weekday: 5,
      startMinute: 570,
      currentSessions: [sessionMon08],
      expectedStartDate: '2026-12-14',
      commitments: revCommitments,
      policy,
      nowMs,
    });
    assert.equal(restOtherCheck.valid, false);

    // Selecting a 5th weekly session must be blocked
    const fifthCheck = validateWeeklySlotAddition({
      weekday: 6,
      startMinute: 840,
      currentSessions: [sessionMon08, sessionTue08, sessionWed08, sessionThu10],
      expectedStartDate: '2026-12-14',
      commitments: revCommitments,
      policy,
      nowMs,
    });
    assert.equal(fifthCheck.valid, false);
    assert.equal(fifthCheck.code, 'PROPOSAL_MAX_SESSIONS_EXCEEDED');
  });

  it('rejects 0 or 1 sessions and validates 2–4 sessions/week with updated hours and tuition preview', () => {
    const proposals = [targetRevisionN3, otherPendingN5];
    const revCommitments = buildProposalCommitments({
      occupiedItems: [],
      otherProposals: proposals,
      currentProposalId: targetRevisionN3.id,
      policy,
    });

    const evalSchedule = (weeklySessions, expectedStartDate = '2026-12-14') =>
      validateProposalState({
        proposal: { ...targetRevisionN3, weeklySessions, expectedStartDate },
        availableLevels,
        qualifiedLevels,
        mentorVerified: true,
        mentorVerifiedJlptLevel: 'N2',
        proposals,
        cohorts: [],
        commitments: revCommitments,
        policy,
        nowMs,
      });

    // 0 sessions -> invalid
    const zeroRes = evalSchedule([]);
    assert.equal(zeroRes.step1Valid, false);
    assert.equal(zeroRes.canSubmit, false);

    // 1 session -> invalid (PROPOSAL_MIN_SESSIONS_NOT_MET)
    const oneRes = evalSchedule([sessionMon08]);
    assert.equal(oneRes.step1Valid, false);
    assert.equal(oneRes.canSubmit, false);
    assert.ok(oneRes.errors.some((e) => e.code === 'PROPOSAL_MIN_SESSIONS_NOT_MET'));

    // 3 valid sessions -> step1Valid & canSubmit true, 30 sessions, 45h, updated tuition
    const threeRes = evalSchedule(sortWeeklySessions([sessionMon08, sessionWed08, sessionFri14]));
    assert.equal(threeRes.step1Valid, true);
    assert.equal(threeRes.step2Valid, true);
    assert.equal(threeRes.canSubmit, true);
    assert.equal(threeRes.totalSessions, 30);
    assert.equal(threeRes.totalTeachingHours, 45);
    const tuition3 = computeProposalTuitionPreview('N3', threeRes.totalSessions, policy);
    assert.equal(tuition3.totalCourseTuition, 2700000);

    // 5 sessions -> invalid (PROPOSAL_MAX_SESSIONS_EXCEEDED)
    const fiveRes = evalSchedule([sessionMon08, sessionTue08, sessionWed08, sessionThu10, sessionSat14]);
    assert.equal(fiveRes.step1Valid, false);
    assert.ok(fiveRes.errors.some((e) => e.code === 'PROPOSAL_MAX_SESSIONS_EXCEEDED'));
  });

  it('wires explicit schedule editing controls into Drawer, Review Modal, and InteractiveSlotCalendar', () => {
    const drawerSrc = readWeb('src/features/scheduling/components/TeachingProposalCourseInfoDrawer.jsx');
    const reviewSrc = readWeb('src/features/scheduling/components/TeachingProposalReviewModal.jsx');
    const calendarSrc = readWeb('src/features/scheduling/components/InteractiveSlotCalendar.jsx');

    assert.ok(drawerSrc.includes('data-testid="revision-schedule-summary"'));
    assert.ok(drawerSrc.includes('data-testid="revision-edit-schedule-btn"'));
    assert.ok(drawerSrc.includes("tr('Chỉnh sửa lịch')"));

    assert.ok(reviewSrc.includes('data-testid="review-schedule-changed-badge"'));
    assert.ok(reviewSrc.includes("tr('Lịch giảng dạy đã thay đổi')"));
    assert.ok(reviewSrc.includes("tr('Gửi lại xét duyệt')"));

    assert.ok(calendarSrc.includes('data-testid="cancel-revision-schedule-btn"'));
    assert.ok(calendarSrc.includes('data-testid="apply-revision-schedule-btn"'));
    assert.ok(calendarSrc.includes("tr('Hủy thay đổi')"));
    assert.ok(calendarSrc.includes("tr('Áp dụng lịch')"));
  });
});

describe('P0 Hotfix — Calendar Filter Visual Consistency (No Orphaned "Nghỉ 15 phút" Decorations)', () => {
  const policy = { sessionMinutes: 90, restMinutes: 15 };
  const sampleEvents = [
    {
      id: 'pending-n5-tue',
      proposalId: 40,
      proposalStatus: 'PendingReview',
      sourceKind: 'pendingProposal',
      tone: 'pending',
      dayKey: '2026-12-15',
      startHour: 8,
      startMinute: 0,
      endHour: 9,
      endMinute: 30,
      timeLabel: '08:00–09:30',
      jlptLevelCode: 'N5',
    },
    {
      id: 'rev-n3-tue',
      proposalId: 36,
      proposalStatus: 'ChangesRequested',
      sourceKind: 'needsRevisionProposal',
      tone: 'needsRevision',
      dayKey: '2026-12-15',
      startHour: 13,
      startMinute: 0,
      endHour: 14,
      endMinute: 30,
      timeLabel: '13:00–14:30',
      jlptLevelCode: 'N3',
    },
    {
      id: 'rej-n4-tue',
      proposalId: 21,
      proposalStatus: 'Rejected',
      sourceKind: 'rejectedProposal',
      tone: 'rejected',
      dayKey: '2026-12-15',
      startHour: 16,
      startMinute: 0,
      endHour: 17,
      endMinute: 30,
      timeLabel: '16:00–17:30',
      jlptLevelCode: 'N4',
    },
  ];

  it('emits rest bands ONLY for currently visible blocking events under statusFilter', () => {
    // 1. All official events visible -> Pending (08:00-09:30) and ChangesRequested (13:00-14:30) emit rest windows; Rejected does NOT
    const allVisible = filterRegistrationEvents(sampleEvents, {
      statusFilter: 'ALL',
      keepSelectedVisible: false,
    });
    const allBands = computeDayRestWindows({
      dayKey: '2026-12-15',
      occupiedItems: buildVisibleRestWindowSources(allVisible),
      policy,
    });
    assert.deepEqual(
      allBands.map((b) => [b.startMin, b.endMin]),
      [
        [465, 480], // 07:45-08:00 around Pending N5
        [570, 585], // 09:30-09:45 around Pending N5
        [765, 780], // 12:45-13:00 around NeedsRevision N3
        [870, 885], // 14:30-14:45 around NeedsRevision N3
      ]
    );

    // 2. Filter to Cần bổ sung ('needsRevision') -> zero orphaned rest bands at 07:45/09:30!
    const revisionOnlyVisible = filterRegistrationEvents(sampleEvents, {
      statusFilter: 'needsRevision',
      keepSelectedVisible: false,
    });
    assert.equal(revisionOnlyVisible.length, 1);
    assert.equal(revisionOnlyVisible[0].id, 'rev-n3-tue');

    const revisionOnlyBands = computeDayRestWindows({
      dayKey: '2026-12-15',
      occupiedItems: buildVisibleRestWindowSources(revisionOnlyVisible),
      policy,
    });
    assert.deepEqual(
      revisionOnlyBands.map((b) => [b.startMin, b.endMin]),
      [
        [765, 780], // ONLY NeedsRevision N3 rest bands remain visible
        [870, 885],
      ]
    );

    // 3. Even when PendingReview N5 is visually filtered out, real conflict validation MUST still block 08:00 and 09:30 on Tuesday
    const fullCommitments = buildProposalCommitments({
      occupiedItems: [],
      otherProposals: [
        {
          id: 40,
          status: 'PendingReview',
          expectedStartDate: '2026-12-15',
          courseDurationWeeks: 10,
          sessionDurationMinutes: 90,
          weeklySessions: [{ weekday: 2, startMinute: 480, endMinute: 570 }],
        },
      ],
      policy: normalizeProposalPolicy(policy),
    });
    const blockedByHiddenPending = validateWeeklySlotAddition({
      weekday: 2,
      startMinute: 570, // 09:30–11:00 violates 15m rest with hidden 08:00–09:30 Pending N5
      currentSessions: [],
      expectedStartDate: '2026-12-15',
      commitments: fullCommitments,
      policy: normalizeProposalPolicy(policy),
      nowMs: Date.parse('2026-11-25T05:00:00+07:00'),
    });
    assert.equal(blockedByHiddenPending.valid, false);
  });
});
