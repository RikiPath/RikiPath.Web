import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLearningGoal, jlptExamDate } from './learningGoal.js';
const today = '2026-11-09';
const valid = { certificateTypeId: 1, levelId: 2, minMinutes: '30', maxMinutes: '60', examDate: '2027-07-04' };
test('saves both range limits and exam date, uses minimum as planning budget', () => {
  assert.deepEqual(buildLearningGoal(valid, today), {
    certificateTypeId: 1, targetCertificateLevelId: 2, dailyStudyMinutesMin: 30,
    dailyStudyMinutesMax: 60, targetExamDate: '2027-07-04',
  });
});
test('explicitly clears a removed date', () => {
  const goal = buildLearningGoal({ ...valid, examDate: '' }, today);
  assert.ok(!Object.hasOwn(goal, 'targetExamDate'));
  assert.equal(goal.clearTargetExamDate, true);
});
test('rejects reversed, missing, fractional, or out of bounds study ranges', () => {
  for (const [minMinutes, maxMinutes] of [[60, 30], ['', 60], [15, 481], [14, 30], [30.5, 60], [30, '']]) {
    assert.throws(() => buildLearningGoal({ ...valid, minMinutes, maxMinutes }, today));
  }
});
test('rejects today and past dates', () => {
  for (const examDate of ['2026-11-09', '2026-11-08']) {
    assert.throws(() => buildLearningGoal({ ...valid, examDate }, today));
  }
});

test('fixed minutes ignore the hidden range maximum and save one duration', () => {
  const goal = buildLearningGoal({ ...valid, minMinutes: '47', maxMinutes: '', timeMode: 'fixed' }, today);
  assert.equal(goal.dailyStudyMinutes, 47);
  assert.ok(!Object.hasOwn(goal, 'dailyStudyMinutesMin'));
  assert.ok(!Object.hasOwn(goal, 'dailyStudyMinutesMax'));
});

test('omits both date fields when the existing date is untouched', () => {
  const goal = buildLearningGoal({ ...valid, examDate: undefined }, today);
  assert.ok(!Object.hasOwn(goal, 'targetExamDate'));
  assert.ok(!Object.hasOwn(goal, 'clearTargetExamDate'));
});

test('JLPT accepts only the first Sunday in July and December', () => {
  for (const examDate of ['2026-12-06', '2027-07-04']) {
    assert.equal(buildLearningGoal({ ...valid, examDate }, today).targetExamDate, examDate);
  }
  for (const examDate of ['2027-08-01', '2027-07-11', '2026-12-07']) {
    assert.throws(() => buildLearningGoal({ ...valid, examDate }, today), /Chủ nhật đầu tiên/);
  }
  assert.throws(() => buildLearningGoal({ ...valid, examDate: '2027-07-' }, today), /chọn đủ ngày/);
  assert.throws(() => buildLearningGoal({ ...valid, examDate: '2027-07-32' }, today), /chọn đủ ngày/);
});

test('finds the first Sunday when the month starts on Sunday or another weekday', () => {
  assert.equal(jlptExamDate('2029', '07'), '2029-07-01');
  assert.equal(jlptExamDate('2026', '12'), '2026-12-06');
  assert.equal(jlptExamDate('2030', '07'), '2030-07-07');
  assert.equal(jlptExamDate('2027', '08'), null);
});
