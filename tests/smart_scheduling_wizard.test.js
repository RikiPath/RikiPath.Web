import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  assessQuickScheduleDayFeasibility,
  buildProposalCommitments,
  DEFAULT_PROPOSAL_POLICY,
  recommendQuickSchedulePlans,
  resolveQuickScheduleTimeWindows,
  validateCompleteWeeklyPlan,
} from '@/features/scheduling/utils/proposalValidation.js';
import {
  readQuickSchedulePreferences,
  writeQuickSchedulePreferences,
} from '@/features/scheduling/utils/proposalDraftStorage.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const NOW_MS = new Date('2027-01-15T00:00:00Z').getTime();
const START_MON = '2027-02-01';
const P = DEFAULT_PROPOSAL_POLICY;

function pendingProposal(id, weeklySessions, jlptLevelCode = 'N5') {
  return {
    id,
    status: 'PendingReview',
    jlptLevelCode,
    expectedStartDate: START_MON,
    courseDurationWeeks: 10,
    sessionDurationMinutes: 90,
    weeklySessions,
  };
}

function assertHardConstraints(plan, commitments = []) {
  const sessions = plan.resultingSessions;
  assert.ok(sessions.length >= P.minSessionsPerWeek && sessions.length <= P.maxSessionsPerWeek);
  for (const s of sessions) {
    assert.equal(s.endMinute - s.startMinute, 90);
    assert.ok(s.startMinute >= P.operatingStartMinute && s.endMinute <= P.operatingEndMinute);
    for (const o of sessions) {
      if (o.key === s.key || o.weekday !== s.weekday) continue;
      const gap = s.startMinute >= o.endMinute ? s.startMinute - o.endMinute : o.startMinute - s.endMinute;
      assert.ok(gap >= 15, `own rest violated ${s.key}/${o.key}`);
    }
    for (const c of commitments) {
      if (Number(c.weekday) !== s.weekday) continue;
      const gap = s.startMinute >= c.endMin ? s.startMinute - c.endMin : c.startMin - s.endMinute;
      assert.ok(gap >= 15, `commitment conflict ${s.key}`);
    }
  }
  const whole = validateCompleteWeeklyPlan({ weeklySessions: sessions, commitments, nowMs: NOW_MS, expectedStartDate: null });
  assert.equal(whole.valid, true);
}

describe('Smart Scheduling Wizard — recommendation engine', () => {
  it('returns exactly the requested 2, 3 or 4 sessions without duplicates', () => {
    for (const target of [2, 3, 4]) {
      const res = recommendQuickSchedulePlans({ targetSessionsPerWeek: target, flexibleDays: true, timeWindows: ['Evening'], mode: 'replace', nowMs: NOW_MS });
      assert.equal(res.status, 'ok');
      assert.ok(res.plans.length >= 1 && res.plans.length <= 6);
      const ids = new Set(res.plans.map((pl) => pl.id));
      assert.equal(ids.size, res.plans.length, 'no duplicate plans');
      for (const plan of res.plans) {
        assert.equal(plan.sessionCount, target);
        assert.equal(new Set(plan.resultingSessions.map((s) => s.weekday)).size, target, 'one session per day by default');
        assert.ok(plan.resultingSessions.every((s) => s.startMinute >= 18 * 60 && s.endMinute <= 22 * 60));
        assertHardConstraints(plan);
      }
    }
  });

  it('ranks a uniform, evenly spread plan first and labels alternatives', () => {
    const res = recommendQuickSchedulePlans({ targetSessionsPerWeek: 3, preferredWeekdays: [1, 3, 5], timeWindows: ['Evening'], mode: 'replace', nowMs: NOW_MS });
    const best = res.plans[0];
    assert.equal(best.kind, 'best');
    assert.equal(best.uniformTime, true);
    assert.deepEqual(best.resultingSessions.map((s) => s.weekday), [1, 3, 5]);
    assert.ok(res.plans.slice(1).every((pl) => pl.kind !== 'best'));
  });

  it('never leaves the selected days in strict mode and never expands one day into several sessions', () => {
    const res = recommendQuickSchedulePlans({ targetSessionsPerWeek: 3, preferredWeekdays: [1, 3, 5], timeWindows: ['any'], mode: 'replace', nowMs: NOW_MS });
    for (const plan of res.plans) {
      assert.deepEqual(plan.resultingSessions.map((s) => s.weekday), [1, 3, 5]);
      assert.equal(plan.resultingSessions.length, 3);
    }
  });

  it('prefers selected days in flexible mode but may use other days when they are busy', () => {
    const commitments = buildProposalCommitments({
      otherProposals: [pendingProposal(41, [
        { weekday: 3, startMinute: 18 * 60 },
        { weekday: 3, startMinute: 20 * 60 },
      ])],
    });
    const strict = recommendQuickSchedulePlans({ targetSessionsPerWeek: 3, preferredWeekdays: [1, 3, 5], timeWindows: ['Evening'], mode: 'replace', commitments, nowMs: NOW_MS });
    assert.equal(strict.status, 'no_match');
    assert.ok(strict.relaxations.includes('flexibleDays'));

    const flex = recommendQuickSchedulePlans({ targetSessionsPerWeek: 3, preferredWeekdays: [1, 3, 5], flexibleDays: true, timeWindows: ['Evening'], mode: 'replace', commitments, nowMs: NOW_MS });
    assert.equal(flex.status, 'ok');
    const best = flex.plans[0];
    assert.ok(best.resultingSessions.some((s) => s.weekday === 1) && best.resultingSessions.some((s) => s.weekday === 5));
    assert.ok(!best.resultingSessions.some((s) => s.weekday === 3));
    assert.deepEqual(best.differences.offPreferenceDays.length, 1);
  });

  it('respects several time windows and the exclusive flexible time option', () => {
    const res = recommendQuickSchedulePlans({ targetSessionsPerWeek: 2, preferredWeekdays: [2, 4], timeWindows: ['Morning', 'Afternoon'], mode: 'replace', nowMs: NOW_MS });
    for (const plan of res.plans) {
      for (const s of plan.resultingSessions) {
        const inMorning = s.startMinute >= 7 * 60 && s.endMinute <= 11 * 60;
        const inAfternoon = s.startMinute >= 13 * 60 + 30 && s.endMinute <= 17 * 60 + 30;
        assert.ok(inMorning || inAfternoon);
      }
    }
    const windows = resolveQuickScheduleTimeWindows(P).map((w) => w.id);
    assert.deepEqual(windows, ['Morning', 'Noon', 'Afternoon', 'Evening']);
    const narrow = resolveQuickScheduleTimeWindows({ ...P, operatingStartMinute: 13 * 60, operatingEndMinute: 21 * 60 }).map((w) => w.id);
    assert.deepEqual(narrow, ['Afternoon', 'Evening'], 'windows outside the configured hours are not offered');
  });

  it('blocks fewer days than sessions unless same-day sessions are allowed', () => {
    const blocked = assessQuickScheduleDayFeasibility({ targetSessionsPerWeek: 3, preferredWeekdays: [1, 4], mode: 'replace' });
    assert.equal(blocked.feasible, false);
    assert.equal(blocked.code, 'NOT_ENOUGH_DAYS');
    assert.equal(assessQuickScheduleDayFeasibility({ targetSessionsPerWeek: 3, preferredWeekdays: [1, 4], allowMultiplePerDay: true, mode: 'replace' }).feasible, true);
    assert.equal(assessQuickScheduleDayFeasibility({ targetSessionsPerWeek: 3, preferredWeekdays: [1, 4], flexibleDays: true, mode: 'replace' }).feasible, true);
    assert.equal(recommendQuickSchedulePlans({ targetSessionsPerWeek: 3, preferredWeekdays: [1, 4], mode: 'replace', nowMs: NOW_MS }).status, 'infeasible');

    const multi = recommendQuickSchedulePlans({ targetSessionsPerWeek: 3, preferredWeekdays: [1, 4], allowMultiplePerDay: true, timeWindows: ['Evening'], mode: 'replace', nowMs: NOW_MS });
    assert.equal(multi.status, 'ok');
    for (const plan of multi.plans) {
      assert.equal(plan.sessionCount, 3);
      assert.ok(plan.resultingSessions.every((s) => [1, 4].includes(s.weekday)));
      assertHardConstraints(plan);
    }
  });

  it('avoids pending/approved commitments with the 15-minute rest, across JLPT levels, without sharing capacity', () => {
    const commitments = buildProposalCommitments({
      otherProposals: [pendingProposal(51, [
        { weekday: 1, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
        { weekday: 2, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
        { weekday: 3, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
        { weekday: 4, startMinute: 18 * 60, endMinute: 19 * 60 + 30 },
      ], 'N5')],
    });
    const res = recommendQuickSchedulePlans({ targetSessionsPerWeek: 4, flexibleDays: true, timeWindows: ['Evening'], mode: 'replace', expectedStartDate: START_MON, commitments, nowMs: NOW_MS });
    assert.equal(res.status, 'ok', 'another level with 4 pending sessions must not consume this proposal capacity');
    for (const plan of res.plans) {
      assert.equal(plan.sessionCount, 4);
      assertHardConstraints(plan, commitments);
      assert.equal(plan.validationScope, plan.startDateMismatch ? 'preliminary' : 'full');
    }
  });

  it('append mode searches only the remainder and keeps existing sessions', () => {
    const existing = [{ weekday: 2, startMinute: 19 * 60, endMinute: 20 * 60 + 30 }];
    const res = recommendQuickSchedulePlans({ targetSessionsPerWeek: 3, flexibleDays: true, timeWindows: ['Evening'], currentSessions: existing, mode: 'append', nowMs: NOW_MS });
    assert.equal(res.neededCount, 2);
    for (const plan of res.plans) {
      assert.equal(plan.addedCount, 2);
      assert.equal(plan.sessionCount, 3);
      assert.ok(plan.resultingSessions.some((s) => s.weekday === 2 && s.startMinute === 19 * 60));
      assert.ok(!plan.addedSessions.some((s) => s.weekday === 2), 'no second session on an existing day by default');
    }
    assert.equal(res.plans[0].uniformTime, true, 'best plan matches the existing teaching time');
    const atTarget = recommendQuickSchedulePlans({ targetSessionsPerWeek: 2, currentSessions: [...existing, { weekday: 4, startMinute: 19 * 60 }], mode: 'append', nowMs: NOW_MS });
    assert.equal(atTarget.status, 'already_at_target');
  });

  it('reports only preliminary availability without a start date and full checks with one', () => {
    const prelim = recommendQuickSchedulePlans({ targetSessionsPerWeek: 2, preferredWeekdays: [1, 3], timeWindows: ['Evening'], mode: 'replace', nowMs: NOW_MS });
    assert.ok(prelim.plans.every((pl) => pl.validationScope === 'preliminary'));
    const full = recommendQuickSchedulePlans({ targetSessionsPerWeek: 2, preferredWeekdays: [1, 3], timeWindows: ['Evening'], mode: 'replace', expectedStartDate: START_MON, nowMs: NOW_MS });
    assert.ok(full.plans.every((pl) => pl.validationScope === 'full'));
    const past = validateCompleteWeeklyPlan({
      weeklySessions: [{ weekday: 1, startMinute: 19 * 60 }, { weekday: 3, startMinute: 19 * 60 }],
      expectedStartDate: '2027-01-04',
      nowMs: NOW_MS,
    });
    assert.equal(past.validationScope, 'preliminary', 'a past start date never counts as a full 10-week check');
  });

  it('offers actionable relaxations when nothing matches', () => {
    const commitments = buildProposalCommitments({
      otherProposals: [pendingProposal(61, [
        { weekday: 6, startMinute: 18 * 60 },
        { weekday: 6, startMinute: 20 * 60 },
      ])],
    });
    const res = recommendQuickSchedulePlans({ targetSessionsPerWeek: 2, preferredWeekdays: [6, 0], timeWindows: ['Evening'], mode: 'replace', commitments, nowMs: NOW_MS });
    assert.equal(res.status, 'no_match');
    assert.ok(res.relaxations.length > 0);
    const relaxed = recommendQuickSchedulePlans({ targetSessionsPerWeek: 2, preferredWeekdays: [6, 0], timeWindows: ['Evening'], mode: 'replace', commitments, nowMs: NOW_MS, relaxPreferences: true });
    assert.equal(relaxed.status, 'ok');
    assert.ok(relaxed.plans.every((pl) => !pl.matchesPreferences));
  });
});

describe('Smart Scheduling Wizard — preferences persistence & UI contracts', () => {
  it('persists wizard answers per teacher and proposal only', () => {
    const map = new Map();
    const storage = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
    writeQuickSchedulePreferences('u1', 7, { targetSessionsPerWeek: 3, preferredWeekdays: [1, 3, 5], flexibleDays: false, allowMultiplePerDay: false, timeWindows: ['Evening'] }, storage);
    assert.deepEqual(readQuickSchedulePreferences('u1', 7, storage).preferredWeekdays, [1, 3, 5]);
    assert.equal(readQuickSchedulePreferences('u2', 7, storage), null);
    assert.equal(readQuickSchedulePreferences('u1', 8, storage), null);
  });

  it('ships a four-step wizard without Sparkles, presets or the old two-tab layout', () => {
    const quickSrc = fs.readFileSync(path.join(ROOT, 'src/features/scheduling/components/SmartQuickRegistrationModal.jsx'), 'utf8');
    const pageSrc = fs.readFileSync(path.join(ROOT, 'src/pages/mentor/MentorShiftSchedule.jsx'), 'utf8');
    assert.ok(!quickSrc.includes('Sparkles'));
    assert.ok(!pageSrc.includes('Sparkles'));
    assert.ok(!quickSrc.includes('QUICK_FILL_PRESETS'));
    assert.ok(!quickSrc.includes("'Lịch dạy gợi ý'") && !quickSrc.includes("'Tùy chỉnh lịch'"));
    assert.ok(!quickSrc.includes('Khả dụng đủ 10 tuần'));
    for (const copy of ['Bạn muốn dạy bao nhiêu buổi mỗi tuần?', 'Bạn muốn dạy vào những ngày nào?', 'Bạn thường rảnh vào thời gian nào?', 'Tìm lịch phù hợp', 'Áp dụng lịch dạy', 'Điều chỉnh lịch']) {
      assert.ok(quickSrc.includes(copy), `missing copy: ${copy}`);
    }
    assert.ok(quickSrc.includes('recommendQuickSchedulePlans'));
  });
});
