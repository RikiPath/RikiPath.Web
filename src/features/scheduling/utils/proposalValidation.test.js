import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProposalCommitments,
  buildProposalQuickFillPreview,
  calendarSlotToWeeklySlot,
  DEFAULT_PROPOSAL_POLICY,
  expandProposalOccurrences,
  QUICK_FILL_PRESETS,
  validateProposalState,
  validateWeeklySlotAddition,
  weeklySessionsToCalendarSlots,
} from './proposalValidation.js';
import {
  buildDraftStorageKey,
  buildSubmitIdempotencyKey,
  clearAllLocalDraftsForOtherUsers,
  readLocalDraft,
  reconcileDraftWithServer,
  writeLocalDraft,
} from './proposalDraftStorage.js';

function createMemoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; },
    key(i) { return [...map.keys()][i] ?? null; },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
  };
}

const NOW_MS = new Date('2027-01-15T00:00:00Z').getTime();
const START_MON = '2027-02-01'; // Monday VN
const QUALIFIED_N3 = [{ certificateLevelId: 3, code: 'N3', name: 'JLPT N3' }];

// ───────────────────── 9.1 Selection & Validation Tests ─────────────────────

test('9.1 Selection rules: 0-1 sessions = draft only; 2-4 = valid; 5th rejected immediately before state mutation', () => {
  const baseProposal = {
    certificateLevelId: 3,
    programType: 'StandardJlpt',
    courseObjective: 'Luyện thi JLPT N3 mục tiêu 115 điểm',
    expectedStartDate: START_MON,
    weeklySessions: [],
  };

  // 0 sessions: canSaveDraft true, canSubmit false
  const zero = validateProposalState({ proposal: baseProposal, qualifiedLevels: QUALIFIED_N3, nowMs: NOW_MS });
  assert.equal(zero.canSaveDraft, true);
  assert.equal(zero.canSubmit, false);
  assert.ok(zero.errors.some((e) => e.code === 'PROPOSAL_MIN_SESSIONS_NOT_MET'));

  // 1 session: draft-only, cannot submit
  const one = validateProposalState({
    proposal: { ...baseProposal, weeklySessions: [{ weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 }] },
    qualifiedLevels: QUALIFIED_N3,
    nowMs: NOW_MS,
  });
  assert.equal(one.canSaveDraft, true);
  assert.equal(one.canSubmit, false);

  // 2, 3, 4 sessions: valid & submittable
  const fourSessions = [
    { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    { weekday: 2, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    { weekday: 4, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    { weekday: 5, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
  ];
  for (const n of [2, 3, 4]) {
    const res = validateProposalState({
      proposal: { ...baseProposal, weeklySessions: fourSessions.slice(0, n) },
      qualifiedLevels: QUALIFIED_N3,
      nowMs: NOW_MS,
    });
    assert.equal(res.canSubmit, true, `Expected ${n} sessions/week to be submittable`);
    assert.equal(res.totalSessions, n * 10);
  }

  // Attempting to add 5th session is rejected immediately with PROPOSAL_MAX_SESSIONS_EXCEEDED
  const fifth = validateWeeklySlotAddition({
    weekday: 6,
    startMinute: 19 * 60,
    currentSessions: fourSessions,
    expectedStartDate: START_MON,
    nowMs: NOW_MS,
  });
  assert.equal(fifth.valid, false);
  assert.equal(fifth.code, 'PROPOSAL_MAX_SESSIONS_EXCEEDED');
});

test('9.1 Overlap and rest boundary: 14-minute gap rejected, 15-minute gap accepted', () => {
  const existing = [{ weekday: 1, startMinute: 8 * 60, endMinute: 9 * 60 + 30 }]; // 08:00-09:30

  // Direct overlap (09:00-10:30)
  const overlap = validateWeeklySlotAddition({
    weekday: 1,
    startMinute: 9 * 60,
    currentSessions: existing,
    expectedStartDate: START_MON,
    nowMs: NOW_MS,
  });
  assert.equal(overlap.valid, false);
  assert.equal(overlap.code, 'PROPOSAL_OWN_OVERLAP');

  // 14-minute rest boundary (09:44 with custom gridStep 1 to test exact boundary)
  const gap14 = validateWeeklySlotAddition({
    weekday: 1,
    startMinute: 9 * 60 + 44,
    currentSessions: existing,
    expectedStartDate: START_MON,
    policy: { ...DEFAULT_PROPOSAL_POLICY, gridStepMinutes: 1 },
    nowMs: NOW_MS,
  });
  assert.equal(gap14.valid, false);
  assert.equal(gap14.code, 'PROPOSAL_OWN_REST_VIOLATION');

  // 15-minute rest boundary (09:45) -> VALID
  const gap15 = validateWeeklySlotAddition({
    weekday: 1,
    startMinute: 9 * 60 + 45,
    currentSessions: existing,
    expectedStartDate: START_MON,
    nowMs: NOW_MS,
  });
  assert.equal(gap15.valid, true);
  assert.equal(gap15.slot.startClock, '09:45');
  assert.equal(gap15.slot.endClock, '11:15');
});

// ───────────────────────── 9.2 Quick Fill Tests ─────────────────────────

test('9.2 Quick Fill enforces 4-session per-proposal cap, rejects conflicts, and never mutates input array', () => {
  const original = [
    { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    { weekday: 3, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
  ];
  const snapshotBefore = JSON.stringify(original);

  // Selected 7 weekday evening dayparts (14+ raw candidates) -> Quick Fill MUST stop at 4 total (2 added, rest rejected!)
  const massiveRules = new Set([
    '1-Evening', '2-Evening', '3-Evening', '4-Evening', '5-Evening', '6-Evening', '0-Evening',
  ]);
  const preview = buildProposalQuickFillPreview({
    selectedDaypartRules: massiveRules,
    currentSessions: original,
    expectedStartDate: START_MON,
    nowMs: NOW_MS,
  });

  // Input array untouched (Cancel leaves state untouched)
  assert.equal(JSON.stringify(original), snapshotBefore);
  // Total resulting sessions NEVER exceeds 4!
  assert.equal(preview.resultingSessions.length, 4);
  assert.equal(preview.validCandidates.length, 2);
  assert.ok(preview.exceededCapCount > 0);
  assert.ok(preview.rejectedCandidates.every((r) => Boolean(r.reason)));

  // Quick Fill with existing pending proposal conflict on Wednesday 19:00 rejects Wed cleanly
  const commitments = buildProposalCommitments({
    otherProposals: [
      {
        id: 50,
        status: 'PendingReview',
        courseTitle: 'N4 Tối',
        expectedStartDate: START_MON,
        courseDurationWeeks: 10,
        sessionDurationMinutes: 90,
        weeklySessions: [{ weekday: 3, startMinute: 19 * 60, endMinute: 20 * 60 + 30 }],
      },
    ],
  });
  const mwfPreset = QUICK_FILL_PRESETS.find((p) => p.id === 'mwf-evening');
  const conflictPreview = buildProposalQuickFillPreview({
    candidateInputs: mwfPreset.slots,
    currentSessions: [],
    expectedStartDate: START_MON,
    commitments,
    mode: 'replace',
    nowMs: NOW_MS,
  });
  assert.equal(conflictPreview.validCandidates.length, 2); // Mon & Fri valid
  assert.equal(conflictPreview.rejectedCandidates.length, 1); // Wed rejected
  assert.equal(conflictPreview.rejectedCandidates[0].code, 'PROPOSAL_CONFLICT_PENDING_PROPOSAL');
});

// ───────────────── 9.3 Concurrent Proposals & Policy Caps ─────────────────

test('9.3 Multiple concurrent PendingReview proposals allowed when disjoint, blocked when conflicting or exceeding policy cap', () => {
  const proposalA = {
    id: 101,
    status: 'PendingReview',
    courseTitle: 'JLPT N3 Tối 2-4-6',
    expectedStartDate: START_MON,
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions: [
      { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 3, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 5, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
  };

  const commitments = buildProposalCommitments({
    otherProposals: [proposalA],
    currentProposalId: 102,
  });
  assert.ok(commitments.every((c) => Number.isFinite(c.startMin) && Number.isFinite(c.endMin) && c.endMin > c.startMin));

  // Proposal B on Tue/Thu evening -> disjoint -> ALLOWED while A is PendingReview!
  const proposalB = {
    id: 102,
    certificateLevelId: 3,
    programType: 'StandardJlpt',
    courseObjective: 'Lớp N3 tối thứ 3-5',
    expectedStartDate: START_MON,
    weeklySessions: [
      { weekday: 2, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 4, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
  };
  const validB = validateProposalState({
    proposal: proposalB,
    qualifiedLevels: QUALIFIED_N3,
    commitments,
    nowMs: NOW_MS,
  });
  assert.equal(validB.canSubmit, true);

  // Proposal C overlapping Proposal A on Monday 19:00 -> BLOCKED
  const proposalC = {
    ...proposalB,
    id: 103,
    weeklySessions: [
      { weekday: 1, startMinute: 19 * 60 + 30, endMinute: 21 * 60 }, // overlaps 19:00-20:30
      { weekday: 4, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
  };
  const invalidC = validateProposalState({
    proposal: proposalC,
    qualifiedLevels: QUALIFIED_N3,
    commitments,
    nowMs: NOW_MS,
  });
  assert.equal(invalidC.canSubmit, false);
  assert.ok(invalidC.errors.some((e) => e.code === 'PROPOSAL_CONFLICT_PENDING_PROPOSAL'));

  // Mentor-wide weeklySessionCap (e.g. policy cap = 4/week): A has 3/week + B has 2/week = 5 > 4 -> BLOCKED
  const cappedB = validateProposalState({
    proposal: proposalB,
    qualifiedLevels: QUALIFIED_N3,
    commitments,
    policy: { ...DEFAULT_PROPOSAL_POLICY, weeklySessionCap: 4 },
    nowMs: NOW_MS,
  });
  assert.equal(cappedB.canSubmit, false);
  assert.ok(cappedB.errors.some((e) => e.code === 'PROPOSAL_WEEKLY_CAP_EXCEEDED'));
});

// ─────────── 9.4 Persistence, Offline Recovery, Account Isolation & Idempotency ───────────

test('9.4 Draft persistence: offline recovery, server-newer conflict protection, account isolation & idempotency key', () => {
  const storage = createMemoryStorage();
  const draftV1 = {
    id: 77,
    revision: 3,
    certificateLevelId: 3,
    courseTitle: 'N3 Offline Edit',
    expectedStartDate: START_MON,
    weeklySessions: [{ weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 }],
  };

  // Account-scoped storage isolates Mentor 10 vs Mentor 20
  writeLocalDraft(10, 77, { draft: draftV1, dirty: true, baseServerRevision: 3 }, storage);
  assert.equal(buildDraftStorageKey(10, 77), 'rikipath:v4:proposal-draft:10:77');
  assert.equal(readLocalDraft(20, 77, storage), null);
  assert.equal(readLocalDraft(10, 77, storage).draft.courseTitle, 'N3 Offline Edit');

  // Same server revision + dirty local -> restore_local & auto-sync
  const sameRev = reconcileDraftWithServer({
    serverDraft: { ...draftV1, courseTitle: 'N3 Server V3', revision: 3 },
    localRecord: readLocalDraft(10, 77, storage),
  });
  assert.equal(sameRev.action, 'restore_local');
  assert.equal(sameRev.needsSync, true);
  assert.equal(sameRev.draft.courseTitle, 'N3 Offline Edit');

  // Newer server revision (4 > 3) -> MUST detect conflict and NEVER silently overwrite newer server state!
  const newerServer = reconcileDraftWithServer({
    serverDraft: { ...draftV1, courseTitle: 'N3 Updated On Another Device', revision: 4 },
    localRecord: readLocalDraft(10, 77, storage),
  });
  assert.equal(newerServer.action, 'conflict');
  assert.equal(newerServer.needsSync, false);
  assert.equal(newerServer.draft.courseTitle, 'N3 Updated On Another Device');
  assert.equal(newerServer.conflict.serverRevision, 4);
  assert.equal(newerServer.conflict.localBaseRevision, 3);

  // Switching to Mentor 20 purges Mentor 10's cached local drafts
  clearAllLocalDraftsForOtherUsers(20, storage);
  assert.equal(readLocalDraft(10, 77, storage), null);

  // Idempotency key format & length safety
  const key = buildSubmitIdempotencyKey(10, 77, 4);
  assert.ok(key.startsWith('prop-10-77-r4-'));
  assert.ok(key.length <= 128);
});

// ───────────────────── 9.5 Optional File Upload Tests ─────────────────────

test('9.5 Optional file upload: submission is completely valid with zero attachments', () => {
  const proposalWithoutFiles = {
    certificateLevelId: 3,
    programType: 'StandardJlpt',
    courseObjective: 'Luyện thi N3 tiêu chuẩn không đính kèm giáo trình',
    expectedStartDate: START_MON,
    weeklySessions: [
      { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 4, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
    optionalAttachments: [],
  };
  const res = validateProposalState({
    proposal: proposalWithoutFiles,
    qualifiedLevels: QUALIFIED_N3,
    nowMs: NOW_MS,
  });
  assert.equal(res.canSubmit, true);
  assert.equal(res.errors.length, 0);
});

// ─────────── 9.6 10-Week Expansion & Cohort Schedule Parity Tests ───────────

test('9.6 10-week expansion aligns cleanly to complete ISO weeks >= ExpectedStartDate (matching StudyCohortService)', () => {
  // Expected start = Wednesday 2027-02-03, sessions = Mon & Wed
  // Week 1 Monday (2027-02-01) < 2027-02-03, so expansion starts cleanly on next Monday 2027-02-08
  // producing 10 complete ISO weeks × 2 sessions = 20 sessions, all >= 2027-02-03.
  const occs = expandProposalOccurrences({
    expectedStartDate: '2027-02-03',
    weeklySessions: [
      { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 3, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    nowMs: NOW_MS,
  });

  assert.equal(occs.length, 20);
  assert.equal(occs[0].localDate, '2027-02-08');
  assert.equal(occs[0].weekNumber, 1);
  assert.equal(occs[19].weekNumber, 10);
  assert.ok(occs.every((o) => o.localDate >= '2027-02-03'));
});

// ─────────── 9.7 HOTFIX: JLPT Self-Selection & Calendar Projection ───────────

test('9.7 HOTFIX: Mentor self-selects N5-N1 freely without pre-granted JLPT qualifications; calendar projection round-trips cleanly', () => {
  const allLevels = [
    { certificateLevelId: 1, code: 'N5', name: 'JLPT N5' },
    { certificateLevelId: 2, code: 'N4', name: 'JLPT N4' },
    { certificateLevelId: 3, code: 'N3', name: 'JLPT N3' },
    { certificateLevelId: 4, code: 'N2', name: 'JLPT N2' },
    { certificateLevelId: 5, code: 'N1', name: 'JLPT N1' },
  ];

  // Even when qualifiedLevels is completely empty, N1 & N5 proposals validate without MENTOR_NOT_QUALIFIED_FOR_LEVEL
  const proposalN1 = {
    certificateLevelId: 5,
    programType: 'StandardJlpt',
    courseObjective: 'Lớp luyện đề JLPT N1 (tự chọn không cần phân quyền trước)',
    expectedStartDate: START_MON,
    weeklySessions: [
      { weekday: 2, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      { weekday: 5, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
    ],
  };

  const res = validateProposalState({
    proposal: proposalN1,
    availableLevels: allLevels,
    qualifiedLevels: [],
    nowMs: NOW_MS,
  });
  assert.equal(res.canSubmit, true);
  assert.ok(!res.errors.some((e) => e.code === 'MENTOR_NOT_QUALIFIED_FOR_LEVEL'));

  // Missing fields carry `field` metadata for Drawer UX touched-validation
  const missingMeta = validateProposalState({
    proposal: { programType: 'StandardJlpt', weeklySessions: [] },
    availableLevels: allLevels,
    qualifiedLevels: [],
    nowMs: NOW_MS,
  });
  assert.ok(missingMeta.errors.some((e) => e.field === 'certificateLevelId'));
  assert.ok(missingMeta.errors.some((e) => e.field === 'expectedStartDate'));
  assert.ok(missingMeta.errors.some((e) => e.field === 'courseObjective'));

  // Weekly <-> Calendar projection round-trip on an arbitrary week
  const projected = weeklySessionsToCalendarSlots({
    weeklySessions: proposalN1.weeklySessions,
    anchorKey: '2027-02-10', // Wednesday of target week (Mon 2027-02-08)
    policy: DEFAULT_PROPOSAL_POLICY,
  });
  assert.equal(projected.length, 2);
  assert.equal(projected[0].dayKey, '2027-02-09'); // Tuesday
  assert.equal(projected[1].dayKey, '2027-02-12'); // Friday

  const roundTrip = projected.map((calItem) => calendarSlotToWeeklySlot({
    dayKey: calItem.dayKey,
    startMin: calItem.startMin,
    policy: DEFAULT_PROPOSAL_POLICY,
  }));
  assert.deepEqual(
    roundTrip.map((s) => ({ weekday: s.weekday, startMinute: s.startMinute, endMinute: s.endMinute })),
    proposalN1.weeklySessions
  );
});
