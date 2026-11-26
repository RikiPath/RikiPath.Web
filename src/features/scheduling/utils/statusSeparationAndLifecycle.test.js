import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REGISTRATION_STATUS_OPTIONS,
  classifyRegistrationEvent,
  computeRegistrationStatusCounts,
  filterRegistrationEvents,
} from './slotPlannerModel.js';
import { CALENDAR_TONES } from './calendarGeometry.js';
import {
  buildProposalCommitments,
  DEFAULT_PROPOSAL_POLICY,
  expandProposalOccurrences,
  resolveJlptLevelAvailability,
  validateWeeklySlotAddition,
} from './proposalValidation.js';
import {
  clearAllLocalDraftsForUser,
  hasActiveWeeklySelection,
  readLocalDraft,
  reconcileDraftWithServer,
  writeLocalDraft,
} from './proposalDraftStorage.js';
import {
  CLASS_LIFECYCLE_STATUSES,
  TEACHING_SESSION_STATUSES,
  computeClassProgress,
  resolveClassLifecycleStatus,
  resolveTeachingSessionStatus,
} from './teachingLifecycleModel.js';

test('Section 3 & 4: Registration Calendar filter strictly exposes ALL + 3 review statuses and never counts selected draft occurrences', () => {
  const ids = REGISTRATION_STATUS_OPTIONS.map((o) => o.id);
  const labels = REGISTRATION_STATUS_OPTIONS.map((o) => o.label);
  assert.deepEqual(ids, ['ALL', 'pending', 'approved', 'rejected']);
  assert.deepEqual(labels, ['Tất cả trạng thái', 'Chờ duyệt', 'Đã duyệt', 'Bị từ chối']);
  assert.ok(!labels.includes('Đã xếp lớp'));
  assert.ok(!labels.includes('Đã hoàn thành'));
  assert.ok(!labels.includes('Đã hủy'));
  assert.ok(!labels.includes('Đang chọn'));

  // 40 pending occurrences (N4) + 40 selected draft occurrences (N5) -> official counter MUST be 40, NOT 80!
  const pendingEvents = Array.from({ length: 40 }, (_, i) => ({
    id: `prop-10-${i + 1}`,
    sourceKind: 'pendingProposal',
    proposalId: 10,
    jlptLevelCode: 'N4',
    tone: 'pending',
    locked: true,
    dayKey: `2026-12-${String((i % 28) + 1).padStart(2, '0')}`,
    startHour: 8,
    startMinute: 30,
    endHour: 10,
    endMinute: 0,
    title: '08:30–10:00',
  }));
  const selectedDraftEvents = Array.from({ length: 40 }, (_, i) => ({
    id: `selected-n5-${i + 1}`,
    sourceKind: 'selected',
    isSelectedDraft: true,
    tone: 'selected',
    locked: false,
    dayKey: `2026-12-${String((i % 28) + 1).padStart(2, '0')}`,
    startHour: 14,
    startMinute: 0,
    endHour: 15,
    endMinute: 30,
    title: '14:00–15:30',
  }));
  const withdrawnAndCancelled = [
    {
      id: 'withdrawn-1',
      sourceKind: 'withdrawn',
      proposalStatus: 'Withdrawn',
      tone: 'cancelled',
      dayKey: '2026-12-05',
      startHour: 18,
      startMinute: 0,
      endHour: 19,
      endMinute: 30,
    },
    {
      id: 'cancelled-1',
      sourceKind: 'cancelled',
      tone: 'cancelled',
      slot: { id: 999, isDeleted: true, status: 'Cancelled' },
      dayKey: '2026-12-06',
      startHour: 18,
      startMinute: 0,
      endHour: 19,
      endMinute: 30,
    },
  ];

  const allEvents = [...pendingEvents, ...selectedDraftEvents, ...withdrawnAndCancelled];
  const counts = computeRegistrationStatusCounts(allEvents);
  assert.equal(counts.pending, 40);
  assert.equal(counts.approved, 0);
  assert.equal(counts.rejected, 0);
  assert.equal(counts.ALL, 40);
  assert.equal(counts.ALL, counts.pending + counts.approved + counts.rejected);

  // Verify withdrawn/cancelled are excluded from registration view
  const visibleOfficial = filterRegistrationEvents(allEvents, { statusFilter: 'ALL', keepSelectedVisible: false });
  assert.equal(visibleOfficial.length, 40);
  assert.ok(visibleOfficial.every((e) => classifyRegistrationEvent(e) === 'pending'));
});

test('Section 3.2, 4 & 5: Approved/cohort/completed map to approved, rejected is non-locked, deduplication prevents double-counting, and semantic colors match spec', () => {
  assert.equal(CALENDAR_TONES.pending.hex, '#E4A020');
  assert.equal(CALENDAR_TONES.approved.hex, '#16A34A');
  assert.equal(CALENDAR_TONES.rejected.hex, '#DC3545');
  assert.match(CALENDAR_TONES.selected.card, /border-dashed/);

  const events = [
    { id: 'av-501', slotId: 501, availabilityId: 501, sourceKind: 'approved', tone: 'approved', dayKey: '2026-12-10', startHour: 9, startMinute: 0, endHour: 10, endMinute: 30 },
    // Duplicate of slotId 501 from cohortSessions source -> must NOT double-count!
    { id: 'cohort-501', availabilityId: 501, sourceKind: 'session', tone: 'session', dayKey: '2026-12-10', startHour: 9, startMinute: 0, endHour: 10, endMinute: 30 },
    { id: 'cohort-completed', sourceKind: 'present', tone: 'present', sessionCompleted: true, dayKey: '2026-11-10', startHour: 9, startMinute: 0, endHour: 10, endMinute: 30 },
    { id: 'rej-prop-1', sourceKind: 'rejectedProposal', proposalId: 77, tone: 'rejected', locked: false, dayKey: '2026-12-12', startHour: 19, startMinute: 0, endHour: 20, endMinute: 30 },
    { id: 'pending-1', sourceKind: 'pendingProposal', proposalId: 88, tone: 'pending', locked: true, dayKey: '2026-12-13', startHour: 19, startMinute: 0, endHour: 20, endMinute: 30 },
  ];

  const counts = computeRegistrationStatusCounts(events);
  assert.equal(counts.approved, 2); // av-501 (deduped with cohort-501) + cohort-completed
  assert.equal(counts.rejected, 1);
  assert.equal(counts.pending, 1);
  assert.equal(counts.ALL, 4);
  assert.equal(counts.ALL, counts.pending + counts.approved + counts.rejected);

  const rejectedOnly = filterRegistrationEvents(events, { statusFilter: 'rejected', keepSelectedVisible: false });
  assert.equal(rejectedOnly.length, 1);
  assert.equal(rejectedOnly[0].id, 'rej-prop-1');
  assert.equal(rejectedOnly[0].locked, false);
});

test('Section 6, 7 & 8: Hidden Pending/Approved reservations still block conflicts, while Rejected/Withdrawn release slots and JLPT levels', () => {
  const nowMs = new Date('2026-11-24T10:00:00+07:00').getTime();
  const n4PendingProposal = {
    id: 21,
    status: 'PendingReview',
    certificateLevelId: 2,
    jlptLevelCode: 'N4',
    courseTitle: 'JLPT N4 (4 buổi/tuần)',
    expectedStartDate: '2026-12-02',
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions: [
      { weekday: 3, startMinute: 12 * 60, endMinute: 13 * 60 + 30 }, // Wed 12:00-13:30
      { weekday: 3, startMinute: 14 * 60 + 45, endMinute: 16 * 60 + 15 },
      { weekday: 4, startMinute: 12 * 60 + 45, endMinute: 14 * 60 + 15 },
      { weekday: 4, startMinute: 16 * 60 + 15, endMinute: 17 * 60 + 45 },
    ],
  };
  const n5RejectedProposal = {
    id: 22,
    status: 'Rejected',
    certificateLevelId: 1,
    jlptLevelCode: 'N5',
    expectedStartDate: '2026-12-02',
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions: [
      { weekday: 1, startMinute: 8 * 60 + 30, endMinute: 10 * 60 }, // Mon 08:30-10:00 (released!)
    ],
  };
  const n3WithdrawnProposal = {
    id: 23,
    status: 'Withdrawn',
    certificateLevelId: 3,
    jlptLevelCode: 'N3',
    expectedStartDate: '2026-12-02',
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions: [
      { weekday: 2, startMinute: 8 * 60 + 30, endMinute: 10 * 60 }, // Tue 08:30-10:00 (released!)
    ],
  };

  // Commitments come from authoritative unfiltered proposals (never filtered calendar events!)
  const commitments = buildProposalCommitments({
    occupiedItems: [],
    otherProposals: [n4PendingProposal, n5RejectedProposal, n3WithdrawnProposal],
    currentProposalId: null,
    policy: DEFAULT_PROPOSAL_POLICY,
  });

  // Only N4 PendingReview (40 occurrences) holds reservations; Rejected and Withdrawn hold 0!
  assert.equal(commitments.length, 40);
  assert.ok(commitments.every((c) => c.proposalId === 21));

  // Selecting Wed 12:00-13:30 MUST fail with clear N4 pending conflict reason even if pending cards are hidden by filter
  const overlapCheck = validateWeeklySlotAddition({
    weekday: 3,
    startMinute: 12 * 60,
    currentSessions: [],
    expectedStartDate: '2026-12-02',
    commitments,
    policy: DEFAULT_PROPOSAL_POLICY,
    nowMs,
  });
  assert.equal(overlapCheck.valid, false);
  assert.equal(overlapCheck.code, 'PROPOSAL_CONFLICT_PENDING_PROPOSAL');
  assert.match(overlapCheck.reason, /JLPT N4/);
  assert.match(overlapCheck.reason, /chờ duyệt/);

  // 14-minute rest gap after 13:30 (13:44) MUST be blocked; 15-minute gap (13:45) allowed (note: 13:45-15:15 overlaps 14:45, test 10:15 before 12:00 -> 10:15-11:45 has exact 15m gap!)
  const gap14Check = validateWeeklySlotAddition({
    weekday: 3,
    startMinute: 10 * 60 + 16, // 10:16–11:46 -> 14m before 12:00
    currentSessions: [],
    expectedStartDate: '2026-12-02',
    commitments,
    policy: DEFAULT_PROPOSAL_POLICY,
    nowMs,
  });
  assert.equal(gap14Check.valid, false);

  const gap15Check = validateWeeklySlotAddition({
    weekday: 3,
    startMinute: 10 * 60 + 15, // 10:15–11:45 -> exact 15m before 12:00
    currentSessions: [],
    expectedStartDate: '2026-12-02',
    commitments,
    policy: DEFAULT_PROPOSAL_POLICY,
    nowMs,
  });
  assert.equal(gap15Check.valid, true);

  // Re-selecting Mon 08:30-10:00 (from Rejected N5) and Tue 08:30-10:00 (from Withdrawn N3) MUST be allowed!
  const reselectRejected = validateWeeklySlotAddition({
    weekday: 1,
    startMinute: 8 * 60 + 30,
    currentSessions: [],
    expectedStartDate: '2026-12-07',
    commitments,
    policy: DEFAULT_PROPOSAL_POLICY,
    nowMs,
  });
  assert.equal(reselectRejected.valid, true);

  // Level availability: N4 blocked (PendingReview), N5 (Rejected) & N3 (Withdrawn) are AVAILABLE, N2 blocked for N3-verified mentor!
  const levels = resolveJlptLevelAvailability({
    availableLevels: [
      { certificateLevelId: 1, code: 'N5' },
      { certificateLevelId: 2, code: 'N4' },
      { certificateLevelId: 3, code: 'N3' },
      { certificateLevelId: 4, code: 'N2' },
    ],
    proposals: [n4PendingProposal, n5RejectedProposal, n3WithdrawnProposal],
    cohorts: [],
    mentorVerified: true,
    mentorVerifiedJlptLevel: 'N3',
    nowMs,
  });
  const byCode = Object.fromEntries(levels.map((l) => [l.code, l]));
  assert.equal(byCode.N5.isAvailable, true);
  assert.equal(byCode.N4.isAvailable, false);
  assert.equal(byCode.N3.isAvailable, true);
  assert.equal(byCode.N2.isQualified, false);
});

test('Section 9: Class Lifecycle distinguishes Recruiting, Upcoming (Sắp bắt đầu), Teaching (Đang giảng dạy), Completed, Cancelled and computes real progress', () => {
  assert.deepEqual(
    CLASS_LIFECYCLE_STATUSES.map((s) => s.label),
    ['Đang tuyển sinh', 'Sắp bắt đầu', 'Đang giảng dạy', 'Đã hoàn thành', 'Đã hủy']
  );

  const nowMs = new Date('2026-12-01T10:00:00+07:00').getTime();

  // Published cohort with 0 learners -> Đang tuyển sinh (never falsely Sắp bắt đầu)
  assert.equal(
    resolveClassLifecycleStatus({ cohortStatus: 'Published', enrolledCount: 0, startsAt: '2026-12-10T01:30:00Z', nowMs }).id,
    'Recruiting'
  );

  // Published cohort with 1 paid learner (1-4 policy) and future start -> Sắp bắt đầu
  assert.equal(
    resolveClassLifecycleStatus({
      cohortStatus: 'Published',
      enrolledCount: 1,
      enrolledCourses: [{ id: 1, status: 'Ready' }],
      startsAt: '2026-12-10T01:30:00Z',
      nowMs,
    }).id,
    'Upcoming'
  );

  // Started cohort with 12/40 completed sessions -> Đang giảng dạy (NOT Completed!)
  const sessions40 = Array.from({ length: 40 }, (_, i) => ({
    number: i + 1,
    status: i < 12 ? 'Present' : 'Scheduled',
    sessionCompleted: i < 12,
  }));
  const progress = computeClassProgress(sessions40, 40);
  assert.equal(progress.completedSessions, 12);
  assert.equal(progress.totalSessions, 40);
  assert.equal(progress.percent, 30);

  assert.equal(
    resolveClassLifecycleStatus({
      cohortStatus: 'Published',
      enrolledCount: 3,
      enrolledCourses: [{ id: 1, status: 'Active' }],
      startsAt: '2026-11-15T01:30:00Z',
      sessions: sessions40,
      nowMs,
    }).id,
    'Teaching'
  );

  assert.equal(resolveClassLifecycleStatus({ cohortStatus: 'Completed', nowMs }).id, 'Completed');
  assert.equal(resolveClassLifecycleStatus({ cohortStatus: 'Cancelled', nowMs }).id, 'Cancelled');
});

test('Section 10: Teaching Session Lifecycle never auto-completes sessions from clock time alone', () => {
  assert.deepEqual(
    TEACHING_SESSION_STATUSES.map((s) => s.id),
    ['ALL', 'upcoming', 'live', 'completed', 'rescheduled', 'cancelled']
  );

  const nowMs = new Date('2026-12-01T15:00:00+07:00').getTime();

  // Future scheduled session -> Sắp diễn ra
  const future = resolveTeachingSessionStatus({
    status: 'Scheduled',
    startMs: new Date('2026-12-02T08:30:00+07:00').getTime(),
    endMs: new Date('2026-12-02T10:00:00+07:00').getTime(),
    nowMs,
  });
  assert.equal(future.id, 'upcoming');
  assert.equal(future.label, 'Sắp diễn ra');
  assert.equal(future.awaitingConfirmation, false);

  // Live session -> Đang diễn ra
  const live = resolveTeachingSessionStatus({
    status: 'Scheduled',
    startMs: new Date('2026-12-01T14:30:00+07:00').getTime(),
    endMs: new Date('2026-12-01T16:00:00+07:00').getTime(),
    nowMs,
  });
  assert.equal(live.id, 'live');
  assert.equal(live.label, 'Đang diễn ra');

  // Elapsed unconfirmed session -> MUST NOT auto-mark completed!
  const elapsedUnconfirmed = resolveTeachingSessionStatus({
    status: 'Scheduled',
    sessionCompleted: false,
    startMs: new Date('2026-12-01T08:30:00+07:00').getTime(),
    endMs: new Date('2026-12-01T10:00:00+07:00').getTime(),
    nowMs,
  });
  assert.equal(elapsedUnconfirmed.isCompleted, false);
  assert.equal(elapsedUnconfirmed.id, 'upcoming');
  assert.equal(elapsedUnconfirmed.awaitingConfirmation, true);

  // Verified completed session -> Đã hoàn thành
  const verifiedDone = resolveTeachingSessionStatus({
    status: 'Completed',
    sessionCompleted: true,
    startMs: new Date('2026-12-01T08:30:00+07:00').getTime(),
    endMs: new Date('2026-12-01T10:00:00+07:00').getTime(),
    nowMs,
  });
  assert.equal(verifiedDone.id, 'completed');
  assert.equal(verifiedDone.isCompleted, true);

  // Rescheduled & Cancelled sessions
  assert.equal(resolveTeachingSessionStatus({ status: 'Rescheduled', nowMs }).id, 'rescheduled');
  assert.equal(resolveTeachingSessionStatus({ status: 'CancelledByMentor', nowMs }).id, 'cancelled');
});

test('Section 15: Finite 10-week recurrence generates exact occurrences with zero week-11 leakage', () => {
  const occs = expandProposalOccurrences({
    expectedStartDate: '2026-12-02',
    weeklySessions: [
      { weekday: 3, startMinute: 12 * 60, endMinute: 13 * 60 + 30 },
      { weekday: 3, startMinute: 14 * 60 + 45, endMinute: 16 * 60 + 15 },
      { weekday: 4, startMinute: 12 * 60 + 45, endMinute: 14 * 60 + 15 },
      { weekday: 4, startMinute: 16 * 60 + 15, endMinute: 17 * 60 + 45 },
    ],
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
  });
  assert.equal(occs.length, 40);
  assert.equal(occs[0].localDate, '2026-12-02');
  assert.equal(occs[occs.length - 1].localDate, '2027-02-04');
  assert.ok(occs.every((o) => o.weekNumber >= 1 && o.weekNumber <= 10));
});

test('Zero Selection Invariant & persistence cleanup: empty cache and cross-tab deleted drafts are NEVER restored', () => {
  const mem = new Map();
  const storage = {
    get length() { return mem.size; },
    key(i) { return [...mem.keys()][i] ?? null; },
    getItem(k) { return mem.has(k) ? mem.get(k) : null; },
    setItem(k, v) { mem.set(k, String(v)); },
    removeItem(k) { mem.delete(k); },
  };

  // 0-session draft is NOT an active selection
  assert.equal(hasActiveWeeklySelection({ status: 'Draft', weeklySessions: [], expectedStartDate: '2026-12-03' }), false);
  assert.equal(hasActiveWeeklySelection({ status: 'Draft', weeklySessions: [{ weekday: 3, startMinute: 600 }] }), true);

  // Empty 0-session local cache MUST NOT be restored onto a blank server session
  writeLocalDraft(42, 'new', {
    draft: { id: null, status: 'Draft', weeklySessions: [], expectedStartDate: '2026-12-03' },
    dirty: true,
    baseServerRevision: 0,
  }, storage);
  const emptyReconcile = reconcileDraftWithServer({
    serverDraft: { id: null, status: 'Draft', weeklySessions: [] },
    localRecord: readLocalDraft(42, 'new', storage),
  });
  assert.equal(emptyReconcile.action, 'use_server');
  assert.equal(emptyReconcile.needsSync, false);

  // Cross-tab deleted draft (local cache had server id=99, server no longer has it) MUST NOT resurrect!
  writeLocalDraft(42, 'new', {
    draft: { id: 99, status: 'Draft', weeklySessions: [{ weekday: 3, startMinute: 600, endMinute: 690 }] },
    dirty: true,
    baseServerRevision: 2,
  }, storage);
  const deletedInOtherTab = reconcileDraftWithServer({
    serverDraft: { id: null, status: 'Draft', weeklySessions: [] },
    localRecord: readLocalDraft(42, 'new', storage),
  });
  assert.equal(deletedInOtherTab.action, 'use_server');
  assert.equal(deletedInOtherTab.needsSync, false);

  // Legitimate offline unsynced selection (id: null, >= 1 session, dirty: true) IS safely restored
  writeLocalDraft(42, 'new', {
    draft: { id: null, status: 'Draft', weeklySessions: [{ weekday: 3, startMinute: 600, endMinute: 690 }] },
    dirty: true,
    baseServerRevision: 0,
  }, storage);
  const offlineRestore = reconcileDraftWithServer({
    serverDraft: { id: null, status: 'Draft', weeklySessions: [] },
    localRecord: readLocalDraft(42, 'new', storage),
  });
  assert.equal(offlineRestore.action, 'restore_local');
  assert.equal(offlineRestore.needsSync, true);
  assert.equal(offlineRestore.draft.weeklySessions.length, 1);

  // clearAllLocalDraftsForUser wipes every draft key for user 42 without touching other users
  writeLocalDraft(42, 105, { draft: { id: 105, weeklySessions: [{ weekday: 1, startMinute: 600 }] }, dirty: false }, storage);
  writeLocalDraft(77, 'new', { draft: { id: null, weeklySessions: [{ weekday: 2, startMinute: 600 }] }, dirty: true }, storage);
  clearAllLocalDraftsForUser(42, storage);
  assert.equal(readLocalDraft(42, 'new', storage), null);
  assert.equal(readLocalDraft(42, 105, storage), null);
  assert.notEqual(readLocalDraft(77, 'new', storage), null);
});

