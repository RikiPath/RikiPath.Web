import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOccupiedItems,
  buildPresetCandidateSlots,
  classifyScheduleEvent,
  clockFromMinutes,
  computeDayRestWindows,
  expandRecurrenceSeries,
  filterScheduleEvents,
  resolveSchedulePolicy,
  snapMinutesToGrid,
  sortScheduleEvents,
  validateCandidateSlot,
} from './slotPlannerModel.js';
import { CALENDAR_TONES, formatCleanCohortTitle } from './calendarGeometry.js';

test('resolveSchedulePolicy prefers backend schedule.policy and falls back cleanly', () => {
  const fromBackend = resolveSchedulePolicy({
    schedule: {
      policy: {
        policyVersion: 5,
        sessionMinutes: 90,
        restMinutes: 15,
        dailySessionCap: 3,
        weeklySessionCap: 12,
        publicationHorizonDays: 45,
        courseDurationWeeks: 10,
        allowedGridSteps: [15, 30],
        gridStepMinutes: 15,
      },
    },
  });
  assert.equal(fromBackend.policyVersion, 5);
  assert.equal(fromBackend.sessionMinutes, 90);
  assert.equal(fromBackend.restMinutes, 15);
  assert.equal(fromBackend.dailySessionCap, 3);
  assert.equal(fromBackend.weeklySessionCap, 12);
  assert.equal(fromBackend.defaultStepMinutes, 15);

  const fallback = resolveSchedulePolicy({
    cohorts: [{ sessionMinutes: 90 }],
  });
  assert.equal(fallback.sessionMinutes, 90);
  assert.equal(fallback.restMinutes, 15);
  assert.deepEqual(fallback.allowedGridSteps, [15, 30]);
});

test('snapMinutesToGrid aligns click floor and drag round within bounds', () => {
  assert.equal(clockFromMinutes(snapMinutesToGrid({ rawMinutes: 8 * 60 + 12, stepMinutes: 15, mode: 'floor' })), '08:00');
  assert.equal(clockFromMinutes(snapMinutesToGrid({ rawMinutes: 8 * 60 + 22, stepMinutes: 15, mode: 'round' })), '08:15');
  assert.equal(clockFromMinutes(snapMinutesToGrid({ rawMinutes: 8 * 60 + 22, stepMinutes: 30, mode: 'floor' })), '08:00');
  assert.equal(clockFromMinutes(snapMinutesToGrid({ rawMinutes: 8 * 60 + 22, stepMinutes: 30, mode: 'round' })), '08:30');
});

test('validateCandidateSlot enforces overlap and 15-minute rest window around existing 90m slot', () => {
  const policy = resolveSchedulePolicy();
  const occupied = buildOccupiedItems({
    slots: [
      {
        id: 10,
        startTime: '2027-02-01T01:00:00Z', // 08:00 VN
        endTime: '2027-02-01T02:30:00Z',   // 09:30 VN
        isApproved: true,
        publishedAt: '2027-01-01T00:00:00Z',
        bookedCount: 0,
      },
    ],
  });
  const nowMs = new Date('2027-01-20T00:00:00Z').getTime();

  // Direct overlap (09:00-10:30 overlaps 08:00-09:30)
  const overlap = validateCandidateSlot({ dayKey: '2027-02-01', startMin: 9 * 60, policy, occupiedItems: occupied, nowMs });
  assert.equal(overlap.valid, false);
  assert.equal(overlap.code, 'OVERLAP');

  // Adjacent at 09:30 violates 15-min rest window
  const zeroGap = validateCandidateSlot({ dayKey: '2027-02-01', startMin: 9 * 60 + 30, policy, occupiedItems: occupied, nowMs });
  assert.equal(zeroGap.valid, false);
  assert.equal(zeroGap.code, 'REST_GAP');
  assert.equal(zeroGap.suggestedStartMin, 9 * 60 + 45);

  // Starting at 09:45 (15m rest) is valid
  const validNext = validateCandidateSlot({ dayKey: '2027-02-01', startMin: 9 * 60 + 45, policy, occupiedItems: occupied, nowMs });
  assert.equal(validNext.valid, true);

  // Ignoring self allows minor reschedule of own pending slot
  const ignored = buildOccupiedItems({
    slots: [{ id: 10, startTime: '2027-02-01T01:00:00Z', endTime: '2027-02-01T02:30:00Z', isApproved: false }],
    ignoreSlotId: 10,
  });
  const selfMoved = validateCandidateSlot({ dayKey: '2027-02-01', startMin: 8 * 60 + 30, policy, occupiedItems: ignored, nowMs });
  assert.equal(selfMoved.valid, true);

  const restWindows = computeDayRestWindows({ dayKey: '2027-02-01', occupiedItems: occupied, policy });
  assert.equal(restWindows.length, 2);
});

test('expandRecurrenceSeries validates all occurrences across 10-week course and catches future week conflict', () => {
  const policy = resolveSchedulePolicy();
  const occupied = buildOccupiedItems({
    cohortSessions: [
      {
        id: 'cohort-week-5',
        cohortName: 'N3 Intensive',
        scheduledAt: '2027-03-08T02:00:00Z', // Monday week 6, 09:00-10:30 VN
        sessionMinutes: 90,
      },
    ],
  });
  const nowMs = new Date('2027-01-20T00:00:00Z').getTime();

  const plan = expandRecurrenceSeries({
    startDate: '2027-02-01', // Monday
    startMin: 8 * 60,        // 08:00-09:30 VN
    repeating: true,
    weekdays: [1],           // Weekly Mondays
    repeatUntil: '2027-04-05', // 10 Mondays
    policy,
    occupiedItems: occupied,
    nowMs,
  });

  assert.equal(plan.occurrences.length, 10);
  assert.equal(plan.ready, false);
  assert.equal(plan.invalidOccurrences.length, 1);
  assert.equal(plan.invalidOccurrences[0].dayKey, '2027-03-08');
  assert.equal(plan.invalidOccurrences[0].code, 'OVERLAP');
});

test('buildPresetCandidateSlots splits dayparts into valid 90m slots with 15m rest and formatCleanCohortTitle cleans QA prefix', () => {
  const policy = resolveSchedulePolicy();
  const nowMs = new Date('2027-01-20T00:00:00Z').getTime();
  const selectedRules = new Set(['1-Morning']); // Monday Morning 07:00-11:00 -> 07:00-08:30 & 08:45-10:15
  const { validSlots } = buildPresetCandidateSlots({
    weekStart: '2027-02-01',
    selectedRules,
    policy,
    occupiedItems: [],
    existingSelectedSlots: [],
    nowMs,
  });
  assert.equal(validSlots.length, 2);
  assert.equal(validSlots[0].startClock, '07:00');
  assert.equal(validSlots[0].endClock, '08:30');
  assert.equal(validSlots[1].startClock, '08:45');
  assert.equal(validSlots[1].endClock, '10:15');

  assert.equal(formatCleanCohortTitle('QA-N4-202611199999', 3), 'N4 · Buổi 3');
});

test('classifyScheduleEvent, filterScheduleEvents and sortScheduleEvents separate EventType from Status and enforce combined AND filters + smart sort', () => {
  // Verify canonical 4+2 semantic status colors in CALENDAR_TONES (plus Draft selection)
  assert.equal(CALENDAR_TONES.pending.hex, '#E4A020');
  assert.equal(CALENDAR_TONES.approved.hex, '#0D9488');
  assert.equal(CALENDAR_TONES.session.hex, '#CE476D');
  assert.equal(CALENDAR_TONES.present.hex, '#16A34A');
  assert.equal(CALENDAR_TONES.rejected.hex, '#DC3545');
  assert.equal(CALENDAR_TONES.cancelled.hex, '#8B8B97');
  assert.equal(CALENDAR_TONES.selected.hex, '#22C55E');

  const nowMs = new Date('2026-11-19T05:00:00Z').getTime(); // 2026-11-19 12:00 GMT+7
  const todayKey = '2026-11-19';

  const sampleEvents = [
    {
      id: 'ev-completed',
      sourceKind: 'session',
      tone: 'present',
      dayKey: '2026-11-18',
      startHour: 8,
      startMinute: 0,
      endHour: 9,
      endMinute: 30,
      title: 'N3 · Buổi 1',
    },
    {
      id: 'ev-rejected',
      sourceKind: 'rejected',
      tone: 'rejected',
      dayKey: '2026-11-20',
      startHour: 19,
      startMinute: 0,
      endHour: 20,
      endMinute: 30,
      title: '19:00–20:30',
      slot: { id: 2, isApproved: false, rejectedAt: '2026-11-18T00:00:00Z' },
    },
    {
      id: 'ev-approved-evening',
      sourceKind: 'approved',
      tone: 'approved',
      dayKey: '2026-11-20',
      startHour: 18,
      startMinute: 30,
      endHour: 20,
      endMinute: 0,
      title: '18:30–20:00',
      slot: { id: 3, isApproved: true, startTime: '2026-11-20T11:30:00Z', endTime: '2026-11-20T13:00:00Z' },
    },
    {
      id: 'ev-pending-morning',
      sourceKind: 'pending',
      tone: 'pending',
      dayKey: '2026-11-21',
      startHour: 8,
      startMinute: 0,
      endHour: 9,
      endMinute: 30,
      title: '08:00–09:30',
      slot: { id: 4, isApproved: false, startTime: '2026-11-21T01:00:00Z', endTime: '2026-11-21T02:30:00Z' },
    },
    {
      id: 'ev-draft',
      sourceKind: 'selected',
      isSelectedDraft: true,
      tone: 'selected',
      dayKey: '2026-11-22',
      startHour: 14,
      startMinute: 0,
      endHour: 15,
      endMinute: 30,
      title: '14:00–15:30',
    },
  ];

  // 1. EventType classification separates CohortSession from Availability and Draft
  assert.equal(classifyScheduleEvent(sampleEvents[0], nowMs).eventType, 'CohortSession');
  assert.equal(classifyScheduleEvent(sampleEvents[0], nowMs).statusKey, 'present');
  assert.equal(classifyScheduleEvent(sampleEvents[2], nowMs).eventType, 'Availability');
  assert.equal(classifyScheduleEvent(sampleEvents[2], nowMs).statusKey, 'approved');
  assert.equal(classifyScheduleEvent(sampleEvents[4], nowMs).eventType, 'Draft');
  assert.equal(classifyScheduleEvent(sampleEvents[4], nowMs).statusKey, 'selected');

  // 2. Combined AND filtering: Date Range + Status + Evening Time Window (18:00–22:00 -> 1080..1320)
  const eveningApproved = filterScheduleEvents(sampleEvents, {
    statusFilter: 'approved',
    eventTypeFilter: 'Availability',
    dateRange: { startKey: '2026-11-19', endKey: '2026-11-22' },
    timeRange: { startMin: 18 * 60, endMin: 22 * 60 },
    nowMs,
  });
  assert.equal(eveningApproved.length, 1);
  assert.equal(eveningApproved[0].id, 'ev-approved-evening');

  // 3. Smart sorting order:
  // Bucket 0: selected Draft ('ev-draft')
  // Bucket 1: upcoming Pending ('ev-pending-morning')
  // Bucket 2: upcoming Approved ('ev-approved-evening')
  // Bucket 3: past Completed ('ev-completed')
  // Bucket 4: Rejected/Cancelled ('ev-rejected')
  const smartSorted = sortScheduleEvents(sampleEvents, { sortBy: 'smart', todayKey, nowMs });
  assert.deepEqual(
    smartSorted.map((e) => e.id),
    ['ev-draft', 'ev-pending-morning', 'ev-approved-evening', 'ev-completed', 'ev-rejected']
  );
});

test('Anti-Spam policy caps resolve dynamically from Backend and block daily/weekly limit excess cleanly', () => {
  const policy = resolveSchedulePolicy({
    schedule: {
      policyVersion: 7,
      policy: {
        sessionMinutes: 90,
        restMinutes: 15,
        dailySessionCap: 3,
        weeklySessionCap: 2,
        maxSlotsPerSubmission: 10,
        maxPendingSlots: 16,
        submissionCooldownSeconds: 8,
      },
    },
  });

  assert.equal(policy.dailySessionCap, 3);
  assert.equal(policy.weeklySessionCap, 2);
  assert.equal(policy.maxSlotsPerSubmission, 10);
  assert.equal(policy.maxPendingSlots, 16);
  assert.equal(policy.submissionCooldownSeconds, 8);

  const nowMs = new Date('2026-11-18T00:00:00Z').getTime();
  const occupied = [
    {
      id: 's1',
      dayKey: '2026-11-19',
      startMin: 8 * 60,
      endMin: 9 * 60 + 30,
      startMs: new Date('2026-11-19T01:00:00Z').getTime(),
      endMs: new Date('2026-11-19T02:30:00Z').getTime(),
      blocksOverlap: true,
      blocksRest: true,
    },
    {
      id: 's2',
      dayKey: '2026-11-20',
      startMin: 8 * 60,
      endMin: 9 * 60 + 30,
      startMs: new Date('2026-11-20T01:00:00Z').getTime(),
      endMs: new Date('2026-11-20T02:30:00Z').getTime(),
      blocksOverlap: true,
      blocksRest: true,
    },
  ];

  const weeklyBlocked = validateCandidateSlot({
    dayKey: '2026-11-21',
    startMin: 10 * 60,
    policy,
    occupiedItems: occupied,
    nowMs,
  });
  assert.equal(weeklyBlocked.valid, false);
  assert.equal(weeklyBlocked.code, 'WEEKLY_CAP');
  assert.ok(weeklyBlocked.reason.includes('Bạn đã đạt giới hạn đăng ký lịch trong tuần này'));
});
