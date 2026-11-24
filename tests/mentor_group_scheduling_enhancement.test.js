import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildProposalCommitments,
  buildProposalQuickFillPreview,
  DEFAULT_PROPOSAL_POLICY,
  findAlternativeSlotsForCandidate,
  recommendQuickSchedulePlans,
  resolveJlptLevelAvailability,
  validateProposalState,
  validateWeeklySlotAddition,
} from '@/features/scheduling/utils/proposalValidation.js';
import {
  clearAllLocalDraftsForOtherUsers,
  DRAFT_SAVE_STATUS,
  readLocalDraft,
  reconcileDraftWithServer,
  writeLocalDraft,
} from '@/features/scheduling/utils/proposalDraftStorage.js';
import { formatIsoDateDisplay } from '@/components/ui/dateFormat.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const NOW_MS = new Date('2027-01-15T00:00:00Z').getTime();
const START_MON = '2027-02-01'; // Monday VN (10 weeks: 2027-02-01 -> 2027-04-xx)

const ALL_LEVELS = [
  { certificateLevelId: 1, code: 'N5', name: 'JLPT N5' },
  { certificateLevelId: 2, code: 'N4', name: 'JLPT N4' },
  { certificateLevelId: 3, code: 'N3', name: 'JLPT N3' },
  { certificateLevelId: 4, code: 'N2', name: 'JLPT N2' },
  { certificateLevelId: 5, code: 'N1', name: 'JLPT N1' },
];

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

describe('Mentor Group Scheduling §14 A-C: Per-Level Uniqueness, Rest Rules & 10-Week Conflict Detection', () => {
  it('enforces max 1 active proposal or active cohort per JLPT N5-N2 level while allowing Draft/Rejected/Withdrawn/Cancelled & parallel levels', () => {
    const proposals = [
      { id: 11, status: 'PendingReview', certificateLevelId: 1, jlptLevelCode: 'N5', courseTitle: 'Lớp N5 chờ duyệt' },
      { id: 12, status: 'Rejected', certificateLevelId: 2, jlptLevelCode: 'N4', courseTitle: 'Lớp N4 bị từ chối' },
      { id: 13, status: 'Withdrawn', certificateLevelId: 2, jlptLevelCode: 'N4', courseTitle: 'Lớp N4 đã rút' },
      { id: 14, status: 'Draft', certificateLevelId: 3, jlptLevelCode: 'N3', courseTitle: 'Đang chọn N3 chưa gửi' },
    ];
    const cohorts = [
      { id: 21, status: 'Cancelled', certificateLevelId: 2, levelCode: 'N4', name: 'N4 đã hủy' },
      { id: 22, status: 'Completed', certificateLevelId: 2, levelCode: 'N4', name: 'N4 đã kết thúc' },
      { id: 23, status: 'Published', certificateLevelId: 3, levelCode: 'N3', name: 'Lớp N3 đang tuyển sinh', totalSessions: 20, completedSessions: 5 },
    ];

    const availability = resolveJlptLevelAvailability({
      availableLevels: ALL_LEVELS,
      proposals,
      cohorts,
      currentProposalId: 99,
      nowMs: NOW_MS,
    });

    // Only N5-N2 included for class opening (N1 excluded from class-opening list)
    assert.deepEqual(availability.map((l) => l.code), ['N5', 'N4', 'N3', 'N2']);

    const n5 = availability.find((l) => l.code === 'N5');
    const n4 = availability.find((l) => l.code === 'N4');
    const n3 = availability.find((l) => l.code === 'N3');
    const n2 = availability.find((l) => l.code === 'N2');

    // N5 blocked by PendingReview
    assert.equal(n5.isAvailable, false);
    assert.equal(n5.blockingProposalId, 11);
    // N4 AVAILABLE because Rejected, Withdrawn, Cancelled, Completed do NOT lock level
    assert.equal(n4.isAvailable, true);
    // N3 blocked by active Published cohort (Draft does not block, active cohort does!)
    assert.equal(n3.isAvailable, false);
    assert.equal(n3.blockingCohortId, 23);
    // N2 AVAILABLE
    assert.equal(n2.isAvailable, true);

    // Proposing N4 in parallel with N5 PendingReview is allowed AND N4 still gets full 4 sessions/week capacity
    const n5PendingProposal = {
      id: 11,
      status: 'PendingReview',
      certificateLevelId: 1,
      jlptLevelCode: 'N5',
      expectedStartDate: START_MON,
      courseDurationWeeks: 10,
      sessionDurationMinutes: 90,
      weeklySessions: [
        { weekday: 1, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
        { weekday: 3, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
        { weekday: 5, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
      ],
    };
    const commitments = buildProposalCommitments({
      otherProposals: [n5PendingProposal],
      currentProposalId: 100,
    });

    const parallelN4 = validateProposalState({
      proposal: {
        id: 100,
        certificateLevelId: 2,
        courseObjective: 'Lớp N4 song song full 4 buổi/tuần',
        expectedStartDate: '2027-02-02', // Tuesday — matches Tue/Thu/Sat/Sun weekly pattern
        weeklySessions: [
          { weekday: 2, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
          { weekday: 4, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
          { weekday: 6, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
          { weekday: 0, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
        ],
      },
      availableLevels: ALL_LEVELS,
      proposals: [n5PendingProposal],
      cohorts: [],
      commitments,
      nowMs: NOW_MS,
    });
    assert.equal(parallelN4.canSubmit, true);
    assert.equal(parallelN4.weeklySessionCount, 4);

    // Attempting to submit duplicate N5 while N5 #11 is PendingReview -> blocked cleanly
    const duplicateN5 = validateProposalState({
      proposal: {
        id: 101,
        certificateLevelId: 1,
        courseObjective: 'Đề xuất trùng cấp độ N5',
        expectedStartDate: START_MON,
        weeklySessions: [
          { weekday: 2, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
          { weekday: 4, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
        ],
      },
      availableLevels: ALL_LEVELS,
      proposals: [n5PendingProposal],
      cohorts: [],
      commitments,
      nowMs: NOW_MS,
    });
    assert.equal(duplicateN5.canSubmit, false);
    assert.ok(duplicateN5.errors.some((e) => e.code === 'PROPOSAL_DUPLICATE_ACTIVE_LEVEL'));
  });

  it('detects conflicts when expectedStartDate is set (including week-10 intersection), allows non-overlapping 10-week windows, and enforces preliminary blocking without expectedStartDate', () => {
    // Existing PendingReview N5: Monday 18:00-19:30 starting 2027-02-01 (10 weeks: W1=2027-02-01 .. W10=2027-04-05)
    const n5Pending = {
      id: 201,
      status: 'PendingReview',
      jlptLevelCode: 'N5',
      courseTitle: 'N5 Tối T2',
      expectedStartDate: '2027-02-01',
      courseDurationWeeks: 10,
      sessionDurationMinutes: 90,
      weeklySessions: [{ weekday: 1, startMinute: 18 * 60, endMinute: 19 * 60 + 30 }],
    };
    const commitments = buildProposalCommitments({
      otherProposals: [n5Pending],
      currentProposalId: 202,
    });

    // 1) Start 2027-04-12 (week AFTER N5's week 10 = 2027-04-05) on SAME Monday 18:00 -> NO date overlap -> ALLOWED!
    const nonOverlapping = validateWeeklySlotAddition({
      weekday: 1,
      startMinute: 18 * 60,
      currentSessions: [],
      expectedStartDate: '2027-04-12',
      commitments,
      nowMs: NOW_MS,
    });
    assert.equal(nonOverlapping.valid, true);

    // 2) Start 2027-04-05 (overlaps N5 ONLY on its week 10!) on Monday 18:00 -> BLOCKED!
    const week10Overlap = validateWeeklySlotAddition({
      weekday: 1,
      startMinute: 18 * 60,
      currentSessions: [],
      expectedStartDate: '2027-04-05',
      commitments,
      nowMs: NOW_MS,
    });
    assert.equal(week10Overlap.valid, false);
    assert.equal(week10Overlap.code, 'PROPOSAL_CONFLICT_PENDING_PROPOSAL');
    assert.equal(week10Overlap.conflictDate, '2027-04-05');

    // 3) Preliminary check (expectedStartDate = null) viewing 2027-02-15 -> BLOCKS clicking over N5 Monday 18:00 card!
    const preliminaryBlocked = validateWeeklySlotAddition({
      weekday: 1,
      startMinute: 18 * 60,
      currentSessions: [],
      expectedStartDate: null,
      viewAnchorKey: '2027-02-15',
      commitments,
      nowMs: NOW_MS,
    });
    assert.equal(preliminaryBlocked.valid, false);
    assert.equal(preliminaryBlocked.preliminary, true);
    assert.equal(preliminaryBlocked.code, 'PROPOSAL_CONFLICT_PENDING_PROPOSAL');

    // 4) Rest boundary against external commitment: 14 min gap (19:44-21:14) BLOCKED, exact 15 min gap (19:45-21:15) ALLOWED!
    const external14Min = validateWeeklySlotAddition({
      weekday: 1,
      startMinute: 19 * 60 + 44,
      currentSessions: [],
      expectedStartDate: '2027-02-01',
      commitments,
      policy: { ...DEFAULT_PROPOSAL_POLICY, gridStepMinutes: 1 },
      nowMs: NOW_MS,
    });
    assert.equal(external14Min.valid, false);
    assert.equal(external14Min.code, 'PROPOSAL_REST_VIOLATION');

    const external15Min = validateWeeklySlotAddition({
      weekday: 1,
      startMinute: 19 * 60 + 45,
      currentSessions: [],
      expectedStartDate: '2027-02-01',
      commitments,
      nowMs: NOW_MS,
    });
    assert.equal(external15Min.valid, true);
  });
});

describe('Mentor Group Scheduling §14 D-E: Smart Quick Registration Engine & Persistence Reconciliation', () => {
  it('generates validated schedule suggestions (Mode A) & custom alternatives (Mode B) without skipping Friday or double-counting', () => {
    const busyMonEvening = buildProposalCommitments({
      otherProposals: [{
        id: 301,
        status: 'PendingReview',
        jlptLevelCode: 'N5',
        expectedStartDate: START_MON,
        courseDurationWeeks: 10,
        sessionDurationMinutes: 90,
        weeklySessions: [{ weekday: 1, startMinute: 18 * 60, endMinute: 19 * 60 + 30 }],
      }],
    });

    // Wizard engine: request 3 Evening sessions/week on Mon/Wed/Fri when Monday 18:00 is busy -> every plan passes validation
    const suggestions = recommendQuickSchedulePlans({
      targetSessionsPerWeek: 3,
      timeWindows: ['Evening'],
      preferredWeekdays: [1, 3, 5],
      currentSessions: [],
      mode: 'replace',
      expectedStartDate: START_MON,
      commitments: busyMonEvening,
      nowMs: NOW_MS,
    });
    assert.equal(suggestions.status, 'ok');
    assert.ok(suggestions.plans.length > 0, 'Should suggest at least one exact 3-session Evening schedule');
    for (const s of suggestions.plans) {
      assert.equal(s.resultingSessions.length, 3);
      assert.ok(!s.resultingSessions.some((slot) => slot.weekday === 1 && slot.startMinute === 18 * 60));
      assert.ok(s.resultingSessions.every((slot) => [1, 3, 5].includes(slot.weekday)));
    }

    // Mode B: Find validated alternatives when Mon 18:00 conflicts
    const alts = findAlternativeSlotsForCandidate({
      weekday: 1,
      startMinute: 18 * 60,
      currentSessions: [],
      expectedStartDate: START_MON,
      commitments: busyMonEvening,
      nowMs: NOW_MS,
    });
    assert.ok(alts.length > 0);
    // Notice 19:45 on Monday is 15 min after 19:30 (18:00+90m) -> valid same-day alternative!
    assert.ok(alts.some((a) => a.weekday === 1 && a.startMinute === 19 * 60 + 45));

    // Append vs Replace math when already having 1 slot
    const existing = [{ weekday: 2, startMinute: 19 * 60, endMinute: 20 * 60 + 30 }];
    const appendPreview = buildProposalQuickFillPreview({
      candidateInputs: [{ weekday: 4, startMinute: 19 * 60 }],
      currentSessions: existing,
      mode: 'append',
      expectedStartDate: START_MON,
      nowMs: NOW_MS,
    });
    assert.equal(appendPreview.keptSessions.length, 1);
    assert.equal(appendPreview.replacedSessions.length, 0);
    assert.equal(appendPreview.resultingCount, 2);

    const replacePreview = buildProposalQuickFillPreview({
      candidateInputs: [
        { weekday: 1, startMinute: 19 * 60 },
        { weekday: 3, startMinute: 19 * 60 },
        { weekday: 5, startMinute: 19 * 60 },
      ],
      currentSessions: existing,
      mode: 'replace',
      expectedStartDate: START_MON,
      nowMs: NOW_MS,
    });
    assert.equal(replacePreview.keptSessions.length, 0);
    assert.equal(replacePreview.replacedSessions.length, 1);
    assert.equal(replacePreview.resultingCount, 3);
  });

  it('restores dirty local draft cleanly when serverDraft.id is missing/blank and keeps multi-account storage isolated', () => {
    const storage = createMemoryStorage();
    const localDraft = {
      id: null,
      revision: 0,
      weeklySessions: [
        { weekday: 1, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
        { weekday: 5, startMinute: 19 * 60, endMinute: 20 * 60 + 30 },
      ],
    };

    writeLocalDraft(77, 'new', { draft: localDraft, dirty: true, baseServerRevision: 0 }, storage);
    const record = readLocalDraft(77, 'new', storage);
    assert.ok(record);
    assert.equal(DRAFT_SAVE_STATUS.UNSYNCED, 'unsynced');

    // Reconcile against blank server draft (id === null, revision === 0) MUST NOT raise false conflict (0 || 1 bug fixed!)
    const reconciled = reconcileDraftWithServer({
      serverDraft: { id: null, revision: 0, weeklySessions: [] },
      localRecord: record,
    });
    assert.equal(reconciled.action, 'restore_local');
    assert.equal(reconciled.needsSync, true);
    assert.equal(reconciled.conflict, null);
    assert.equal(reconciled.draft.weeklySessions.length, 2);

    // Switching user clears previous user's local drafts
    clearAllLocalDraftsForOtherUsers(88, storage);
    assert.equal(readLocalDraft(77, 'new', storage), null);
  });
});

describe('Mentor Group Scheduling §14 F-H: Static UI, DatePicker, Terminology & Portal Layering Contracts', () => {
  it('enforces UI copy cleanup, Step 2/3 field cleanup, DatePicker reuse, floating portal Escape layering, and raw asterisk rule', () => {
    const pageSrc = fs.readFileSync(path.join(ROOT, 'src/pages/mentor/MentorShiftSchedule.jsx'), 'utf8');
    const calSrc = fs.readFileSync(path.join(ROOT, 'src/features/scheduling/components/InteractiveSlotCalendar.jsx'), 'utf8');
    const drawerSrc = fs.readFileSync(path.join(ROOT, 'src/features/scheduling/components/TeachingProposalCourseInfoDrawer.jsx'), 'utf8');
    const reviewSrc = fs.readFileSync(path.join(ROOT, 'src/features/scheduling/components/TeachingProposalReviewModal.jsx'), 'utf8');
    const quickSrc = fs.readFileSync(path.join(ROOT, 'src/features/scheduling/components/SmartQuickRegistrationModal.jsx'), 'utf8');
    const pickerSrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/CalendarDateRangePicker.jsx'), 'utf8');
    const overlaySrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/overlay.jsx'), 'utf8');
    const hooksSrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/hooks.js'), 'utf8');

    // No "Bản nháp" or "Điền nhanh" in proposal workflow UI
    assert.ok(!pageSrc.includes('Bản nháp') && !pageSrc.includes('bản nháp'), 'MentorShiftSchedule must not use "Bản nháp"');
    assert.ok(!pageSrc.includes("'Điền nhanh'"), 'MentorShiftSchedule must not use "Điền nhanh" button copy');
    assert.ok(!drawerSrc.includes('Bản nháp') && !drawerSrc.includes('bản nháp'), 'Step 2 Drawer must not use "Bản nháp"');

    // Removed ProgramType & Reference CoursePlan from Step 2 & Step 3 UI
    assert.ok(!drawerSrc.includes('Loại chương trình'), 'Step 2 Drawer must remove Loại chương trình');
    assert.ok(!drawerSrc.includes('Gói khóa học tham chiếu'), 'Step 2 Drawer must remove Gói khóa học tham chiếu');
    assert.ok(!reviewSrc.includes('PROPOSAL_PROGRAM_TYPES'), 'Step 3 Modal must remove PROPOSAL_PROGRAM_TYPES');

    // Shared Sakura DatePicker used in Step 2 & DatePicker + floating portal Escape layering in shared UI
    assert.ok(pickerSrc.includes('export function DatePicker('), 'CalendarDateRangePicker.jsx must export shared DatePicker');
    assert.equal(formatIsoDateDisplay('2027-02-01'), '01/02/2027', 'formatIsoDateDisplay must format ISO date in dd/MM/yyyy without TZ drift');
    assert.equal(formatIsoDateDisplay('2027-12-31'), '31/12/2027', 'formatIsoDateDisplay must preserve year-end day in dd/MM/yyyy');
    assert.ok(drawerSrc.includes('<DatePicker'), 'Step 2 Drawer must use shared DatePicker instead of native input[type="date"]');
    assert.ok(!drawerSrc.includes('type="date"'), 'Step 2 Drawer must not contain native input[type="date"]');
    assert.ok(overlaySrc.includes('data-rp-floating-portal="true"'), 'Popover must mark portal with data-rp-floating-portal="true"');
    assert.ok(hooksSrc.includes('[data-rp-floating-portal="true"]'), 'useFocusTrap must defer Escape when floating portal is open');

    // Unified Quick Registration & Step 1-2-3 wording contracts
    assert.ok(pageSrc.includes('<SmartQuickRegistrationModal'), 'MentorShiftSchedule must integrate SmartQuickRegistrationModal');
    assert.ok(pageSrc.includes("e.code !== 'PROPOSAL_MIN_SESSIONS_NOT_MET'"), 'MentorShiftSchedule must keep <2 slots in yellow warning instead of red error state');
    assert.ok(calSrc.includes('{showSelectionActionBar && ('), 'InteractiveSlotCalendar must hide selection bar when 0 slots are selected');
    assert.ok(calSrc.includes("tr('Bước tiếp theo')"), 'Step 1 status bar must use Bước tiếp theo CTA');
    assert.ok(calSrc.includes('focusRequest'), 'InteractiveSlotCalendar must support focusRequest navigation & scroll');
    assert.ok(quickSrc.includes("tr('Đăng ký lịch dạy nhanh')"), 'SmartQuickRegistrationModal must use Đăng ký lịch dạy nhanh title');
    assert.ok(reviewSrc.includes("tr('Xác nhận đề xuất mở lớp')"), 'Step 3 modal must use Xác nhận đề xuất mở lớp title');
    assert.ok(reviewSrc.includes("tr('Gửi quản trị viên duyệt')"), 'Step 3 modal must use Gửi quản trị viên duyệt CTA');

    // Ensure no unstyled raw asterisk in Drawer labels (must use Field required)
    assert.ok(!drawerSrc.includes('>*<') && !drawerSrc.includes(" *')"), 'Drawer must not render unstyled raw asterisks');
  });
});
