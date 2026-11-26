import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_PROPOSAL_POLICY,
  PROPOSAL_STATUS_META,
  buildProposalCommitments,
  expandProposalOccurrences,
  validateProposalState,
} from '../src/features/scheduling/utils/proposalValidation.js';
import {
  CALENDAR_TONES,
  getToneMeta,
} from '../src/features/scheduling/utils/calendarGeometry.js';
import {
  LIST_REGISTRATION_STATUS_OPTIONS,
  REGISTRATION_STATUS_OPTIONS,
  classifyRegistrationEvent,
  computeRegistrationStatusCounts,
  filterRegistrationEvents,
} from '../src/features/scheduling/utils/slotPlannerModel.js';
import {
  REGISTRATION_TABLE_STATUS_OPTIONS,
  buildRegistrationRows,
  computeRegistrationRowCounts,
  filterRegistrationRows,
  sortRegistrationRows,
} from '../src/features/scheduling/utils/registrationTableModel.js';

const NOW_MS = Date.parse('2026-11-25T05:00:00Z');
const TODAY_KEY = '2026-11-25';

const AVAILABLE_LEVELS = [
  { certificateLevelId: 1, code: 'N5', name: 'JLPT N5' },
  { certificateLevelId: 2, code: 'N4', name: 'JLPT N4' },
  { certificateLevelId: 3, code: 'N3', name: 'JLPT N3' },
  { certificateLevelId: 4, code: 'N2', name: 'JLPT N2' },
];

const N4_SESSIONS = [
  { key: '3_720', weekday: 3, startMinute: 720, endMinute: 810, startClock: '12:00', endClock: '13:30' },
  { key: '3_885', weekday: 3, startMinute: 885, endMinute: 975, startClock: '14:45', endClock: '16:15' },
  { key: '4_765', weekday: 4, startMinute: 765, endMinute: 855, startClock: '12:45', endClock: '14:15' },
  { key: '4_975', weekday: 4, startMinute: 975, endMinute: 1065, startClock: '16:15', endClock: '17:45' },
];

const N5_SESSIONS = [
  { key: '4_615', weekday: 4, startMinute: 615, endMinute: 705, startClock: '10:15', endClock: '11:45' },
  { key: '5_495', weekday: 5, startMinute: 495, endMinute: 585, startClock: '08:15', endClock: '09:45' },
  { key: '6_825', weekday: 6, startMinute: 825, endMinute: 915, startClock: '13:45', endClock: '15:15' },
];

const N3_SESSIONS = [
  { key: '1_480', weekday: 1, startMinute: 480, endMinute: 570, startClock: '08:00', endClock: '09:30' },
  { key: '2_480', weekday: 2, startMinute: 480, endMinute: 570, startClock: '08:00', endClock: '09:30' },
];

const N2_DRAFT_SESSIONS = [
  { key: '1_1080', weekday: 1, startMinute: 1080, endMinute: 1170, startClock: '18:00', endClock: '19:30' },
  { key: '3_1080', weekday: 3, startMinute: 1080, endMinute: 1170, startClock: '18:00', endClock: '19:30' },
];

function makeProposal({ id, status, certificateLevelId, jlptLevelCode, courseTitle, expectedStartDate, weeklySessions, reviewReason = null }) {
  return {
    id,
    status,
    revision: 2,
    certificateLevelId,
    jlptLevelCode,
    courseTitle,
    courseObjective: `Hoàn thiện ngữ pháp và luyện đề ${jlptLevelCode}`,
    expectedStartDate,
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions,
    weeklySessionCount: weeklySessions.length,
    optionalNotes: '',
    optionalAttachments: [],
    reviewReason,
    submittedAtUtc: '2026-11-25T04:00:00Z',
  };
}

function projectProposalEvents(proposal) {
  const occs = expandProposalOccurrences({
    expectedStartDate: proposal.expectedStartDate,
    weeklySessions: proposal.weeklySessions,
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
  });
  const isNeedsRevision = proposal.status === 'ChangesRequested';
  return occs.map((occ, idx) => ({
    id: `prop-${proposal.id}-${occ.localDate}_${occ.startMinute}`,
    proposalId: proposal.id,
    proposalStatus: proposal.status,
    jlptLevelCode: proposal.jlptLevelCode,
    sourceKind: isNeedsRevision ? 'needsRevisionProposal' : 'pendingProposal',
    tone: isNeedsRevision ? 'needsRevision' : 'pending',
    statusLabel: isNeedsRevision ? 'Cần bổ sung' : 'Chờ duyệt',
    locked: true,
    draggable: false,
    dayKey: occ.localDate,
    startHour: Math.floor(occ.startMinute / 60),
    startMinute: occ.startMinute % 60,
    endHour: Math.floor(occ.endMinute / 60),
    endMinute: occ.endMinute % 60,
    sessionNumber: idx + 1,
    totalSessions: occs.length,
  }));
}

describe('Mentor Proposal Revision Flow (Needs Revision)', () => {
  it('standardizes Needs Revision as distinct orange official status across metadata and calendar tones', () => {
    assert.equal(PROPOSAL_STATUS_META.ChangesRequested.label, 'Cần bổ sung');
    assert.equal(PROPOSAL_STATUS_META.ChangesRequested.dot, '#EA580C');
    assert.ok(PROPOSAL_STATUS_META.ChangesRequested.pillClass.includes('orange'));

    assert.equal(CALENDAR_TONES.needsRevision.label, 'Cần bổ sung');
    assert.equal(CALENDAR_TONES.needsRevision.hex, '#EA580C');
    assert.equal(getToneMeta('needsRevision').dot, 'bg-[#EA580C]');
    assert.ok(CALENDAR_TONES.needsRevision.card.includes('#EA580C'));

    assert.deepEqual(
      REGISTRATION_STATUS_OPTIONS.map((o) => o.id),
      ['ALL', 'pending', 'needsRevision', 'approved', 'rejected']
    );
    assert.deepEqual(
      LIST_REGISTRATION_STATUS_OPTIONS.map((o) => o.id),
      ['ALL', 'selected', 'pending', 'needsRevision', 'approved', 'rejected']
    );
    assert.deepEqual(
      REGISTRATION_TABLE_STATUS_OPTIONS.map((o) => o.id),
      ['ALL', 'selected', 'pending', 'needsRevision', 'approved', 'rejected']
    );
  });

  it('counts 20 Needs Revision occurrences separately from 70 Pending occurrences (ALL = 90) and keeps them locked (not Draft)', () => {
    const propN4 = makeProposal({
      id: 34,
      status: 'PendingReview',
      certificateLevelId: 2,
      jlptLevelCode: 'N4',
      courseTitle: 'JLPT N4 (4 buổi/tuần)',
      expectedStartDate: '2026-12-02',
      weeklySessions: N4_SESSIONS,
    });
    const propN5 = makeProposal({
      id: 35,
      status: 'PendingReview',
      certificateLevelId: 1,
      jlptLevelCode: 'N5',
      courseTitle: 'Lớp JLPT N5',
      expectedStartDate: '2026-12-03',
      weeklySessions: N5_SESSIONS,
    });
    const propN3 = makeProposal({
      id: 36,
      status: 'ChangesRequested',
      certificateLevelId: 3,
      jlptLevelCode: 'N3',
      courseTitle: 'Lớp JLPT N3',
      expectedStartDate: '2026-12-07',
      weeklySessions: N3_SESSIONS,
      reviewReason: 'yêu cầu bổ sung thêm tài liệu',
    });

    const events = [
      ...projectProposalEvents(propN4),
      ...projectProposalEvents(propN5),
      ...projectProposalEvents(propN3),
    ];

    assert.equal(classifyRegistrationEvent(events[0]), 'pending');
    assert.equal(classifyRegistrationEvent(events[events.length - 1]), 'needsRevision');

    const calCounts = computeRegistrationStatusCounts(events, { nowMs: NOW_MS });
    assert.deepEqual(calCounts, {
      ALL: 90,
      pending: 70,
      needsRevision: 20,
      approved: 0,
      rejected: 0,
    });

    const needsRevisionOnly = filterRegistrationEvents(events, {
      statusFilter: 'needsRevision',
      nowMs: NOW_MS,
    });
    assert.equal(needsRevisionOnly.length, 20);
    assert.ok(needsRevisionOnly.every((e) => e.proposalId === 36 && e.tone === 'needsRevision' && e.locked === true));

    const pendingOnly = filterRegistrationEvents(events, {
      statusFilter: 'pending',
      nowMs: NOW_MS,
    });
    assert.equal(pendingOnly.length, 70);
    assert.ok(pendingOnly.every((e) => e.proposalId !== 36));
  });

  it('preserves parallel active Draft selection alongside Needs Revision without merging or overwriting', () => {
    const propN4 = makeProposal({
      id: 34,
      status: 'PendingReview',
      certificateLevelId: 2,
      jlptLevelCode: 'N4',
      courseTitle: 'JLPT N4',
      expectedStartDate: '2026-12-02',
      weeklySessions: N4_SESSIONS,
    });
    const propN5 = makeProposal({
      id: 35,
      status: 'PendingReview',
      certificateLevelId: 1,
      jlptLevelCode: 'N5',
      courseTitle: 'Lớp JLPT N5',
      expectedStartDate: '2026-12-03',
      weeklySessions: N5_SESSIONS,
    });
    const propN3 = makeProposal({
      id: 36,
      status: 'ChangesRequested',
      certificateLevelId: 3,
      jlptLevelCode: 'N3',
      courseTitle: 'Lớp JLPT N3',
      expectedStartDate: '2026-12-07',
      weeklySessions: N3_SESSIONS,
      reviewReason: 'yêu cầu bổ sung thêm tài liệu',
    });

    // Parallel unsent Draft for N2 stays completely independent of N3 Needs Revision
    const activeN2Draft = {
      id: null,
      status: 'Draft',
      certificateLevelId: 4,
      jlptLevelCode: 'N2',
      courseTitle: 'Lớp JLPT N2 Tối',
      expectedStartDate: '',
      weeklySessions: N2_DRAFT_SESSIONS,
    };

    const rows = buildRegistrationRows({
      draft: activeN2Draft,
      proposals: [propN4, propN5, propN3],
      proposalPreview: { mode: 'visible_representative', slots: [] },
      availableLevels: AVAILABLE_LEVELS,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });

    const counts = computeRegistrationRowCounts(rows, { todayKey: TODAY_KEY });
    assert.deepEqual(counts, {
      ALL: 4,
      selected: 1,
      pending: 2,
      needsRevision: 1,
      approved: 0,
      rejected: 0,
    });

    // Default sort puts selected first, then actionable needsRevision right at top before pending
    const sorted = sortRegistrationRows(rows, { sortBy: 'default' });
    assert.deepEqual(
      sorted.map((r) => r.statusGroup),
      ['selected', 'needsRevision', 'pending', 'pending']
    );

    const needsRevRows = filterRegistrationRows(rows, { statusFilter: 'needsRevision', todayKey: TODAY_KEY });
    assert.equal(needsRevRows.length, 1);
    assert.equal(needsRevRows[0].proposalId, 36);
    assert.equal(needsRevRows[0].statusLabel, 'Cần bổ sung');
    assert.equal(needsRevRows[0].reviewReason, 'yêu cầu bổ sung thêm tài liệu');
  });

  it('keeps ChangesRequested reservations blocking new drafts while allowing self-revision without self-conflict', () => {
    const propN3 = makeProposal({
      id: 36,
      status: 'ChangesRequested',
      certificateLevelId: 3,
      jlptLevelCode: 'N3',
      courseTitle: 'Lớp JLPT N3',
      expectedStartDate: '2026-12-14',
      weeklySessions: N3_SESSIONS,
      reviewReason: 'yêu cầu bổ sung thêm tài liệu',
    });

    // 1. For a NEW draft (currentProposalId = null), Proposal #36 MUST reserve its 20 slots AND block JLPT N3!
    const newDraftCommitments = buildProposalCommitments({
      occupiedItems: [],
      otherProposals: [propN3],
      currentProposalId: null,
      policy: DEFAULT_PROPOSAL_POLICY,
    });
    assert.equal(newDraftCommitments.length, 20);
    assert.ok(newDraftCommitments.every((c) => c.proposalId === 36 && c.status === 'ChangesRequested'));

    const duplicateN3DraftValidation = validateProposalState({
      proposal: {
        id: null,
        status: 'Draft',
        certificateLevelId: 3,
        jlptLevelCode: 'N3',
        courseTitle: 'Trùng N3',
        courseObjective: 'Test duplicate N3',
        expectedStartDate: '2026-12-14',
        weeklySessions: N3_SESSIONS,
      },
      availableLevels: AVAILABLE_LEVELS,
      qualifiedLevels: AVAILABLE_LEVELS,
      mentorVerified: true,
      mentorVerifiedJlptLevel: 'N1',
      proposals: [propN3],
      cohorts: [],
      commitments: newDraftCommitments,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(duplicateN3DraftValidation.canSubmit, false);

    // 2. For isolated REVISION of Proposal #36 (currentProposalId = 36), self-conflict is excluded and revision is valid!
    const revisionCommitments = buildProposalCommitments({
      occupiedItems: [],
      otherProposals: [propN3],
      currentProposalId: 36,
      policy: DEFAULT_PROPOSAL_POLICY,
    });
    assert.equal(revisionCommitments.length, 0);

    const revisionValidation = validateProposalState({
      proposal: {
        ...propN3,
        optionalNotes: 'Đã bổ sung thêm tài liệu ôn tập N3',
      },
      availableLevels: AVAILABLE_LEVELS,
      qualifiedLevels: AVAILABLE_LEVELS,
      mentorVerified: true,
      mentorVerifiedJlptLevel: 'N1',
      proposals: [propN3],
      cohorts: [],
      commitments: revisionCommitments,
      policy: DEFAULT_PROPOSAL_POLICY,
      nowMs: NOW_MS,
    });
    assert.equal(revisionValidation.canSubmit, true);
  });

  it('enforces UI and backend revision architecture contracts', () => {
    const pageSrc = fs.readFileSync(path.resolve('src/pages/mentor/MentorShiftSchedule.jsx'), 'utf8');
    const drawerSrc = fs.readFileSync(path.resolve('src/features/scheduling/components/TeachingProposalCourseInfoDrawer.jsx'), 'utf8');
    const modalSrc = fs.readFileSync(path.resolve('src/features/scheduling/components/TeachingProposalReviewModal.jsx'), 'utf8');
    const calSrc = fs.readFileSync(path.resolve('src/features/scheduling/components/InteractiveSlotCalendar.jsx'), 'utf8');
    const adminSrc = fs.readFileSync(path.resolve('src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx'), 'utf8');
    const backendSrc = fs.readFileSync(
      path.resolve('../RikiPath.Backend/RikiPath.Application/Services/MentorTeachingProposalService.cs'),
      'utf8'
    );

    // 1. Redundant warning banner above Calendar MUST be removed completely
    assert.ok(
      !pageSrc.includes('Quản trị viên yêu cầu chỉnh sửa bổ sung'),
      'Redundant revision warning banner above Calendar must be completely removed'
    );

    // 2. Active working `draft` MUST be strictly Draft (never ChangesRequested)
    assert.ok(pageSrc.includes("const isEditable = draft.status === 'Draft';"));
    assert.ok(pageSrc.includes('revisionDraft'), 'Isolated revisionDraft state must exist');
    assert.ok(pageSrc.includes('revisionBaseline'), 'Revision baseline snapshot must exist for change highlights');
    assert.ok(pageSrc.includes('resubmitMutation'), 'Isolated resubmitMutation must update the same proposal ID');
    assert.ok(pageSrc.includes("sourceKind: isNeedsRevision ? 'needsRevisionProposal' : 'pendingProposal'"));
    assert.ok(pageSrc.includes("tone: isNeedsRevision ? 'needsRevision' : 'pending'"));
    assert.ok(pageSrc.includes("value: 'ChangesRequested', label: 'Cần bổ sung'"));
    assert.ok(pageSrc.includes('Đề xuất đã được cập nhật và gửi lại quản trị viên xét duyệt.'));

    // 3. Calendar card renders Lock icon and reservation tooltip for needsRevision
    assert.ok(calSrc.includes("ev.tone === 'needsRevision'"));
    assert.ok(calSrc.includes('<Lock'));
    assert.ok(calSrc.includes('Lịch đã được giữ chỗ. Mở đề xuất để chỉnh sửa.'));

    // 4. Shared Drawer & Confirmation Modal support mode="revision"
    assert.ok(drawerSrc.includes("mode = 'create'"));
    assert.ok(drawerSrc.includes('Chỉnh sửa đề xuất mở lớp'));
    assert.ok(drawerSrc.includes('Yêu cầu từ quản trị viên'));
    assert.ok(modalSrc.includes('Xác nhận đề xuất đã chỉnh sửa'));
    assert.ok(modalSrc.includes('Gửi lại xét duyệt'));
    assert.ok(modalSrc.includes('Đã cập nhật'));
    assert.ok(modalSrc.includes('onStartRevision'));

    // 5. Admin Drawer displays resubmission indicator and excludes Withdrawn/Cancelled
    assert.ok(adminSrc.includes("h.action === 'Resubmitted'"));
    assert.ok(adminSrc.includes('Đã bổ sung'));
    assert.ok(!adminSrc.includes("value: 'Withdrawn'"), 'Admin status filter must not expose Withdrawn option');
    assert.ok(adminSrc.includes("r.status !== 'Withdrawn' && r.status !== 'Cancelled'"));

    // 6. Backend notification copy distinguishes RequestChanges/Resubmitted and deletes Withdrawn proposals
    assert.ok(backendSrc.includes('Giáo viên đã bổ sung đề xuất JLPT'));
    assert.ok(backendSrc.includes('Đề xuất mở lớp {levelLabel} cần bổ sung'));
    assert.ok(backendSrc.includes('unitOfWork.MentorTeachingProposals.Remove(proposal);'));
    assert.ok(backendSrc.includes('p.Status != MentorTeachingProposalStatus.Withdrawn'));
  });
});
