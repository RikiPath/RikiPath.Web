import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonLockReason } from '../src/features/learning-journey/journeyModel.js';

// Lock state always comes from the Backend; the model only explains it (sequential roadmap rule).
const stage = (sortOrder, lessons, groupQuiz = null) => ({ sortOrder, lessons, groupQuiz });
const lesson = (lessonId, sortOrder, extra = {}) => ({ lessonId, sortOrder, title: `L${lessonId}`, ...extra });

test('names the unfinished prerequisite when it is the blocker', () => {
  const stages = [stage(1, [lesson(1, 1), lesson(2, 2, { isLocked: true, prerequisiteLessonId: 1 })])];
  assert.deepEqual(lessonLockReason(stages, stages[0].lessons[1]), { template: 'Hoàn thành bài “{0}” để mở bài này.', value: 'L1' });
});

test('when the prerequisite is done, names the first earlier open step (sequential rule)', () => {
  const stages = [stage(1, [
    lesson(1, 1, { isCompleted: true }),
    lesson(2, 2),
    lesson(3, 3, { isLocked: true, prerequisiteLessonId: 1 }),
  ])];
  assert.equal(lessonLockReason(stages, stages[0].lessons[2]).value, 'L2');
});

test('an unpassed stage check blocks the next stage', () => {
  const stages = [
    stage(1, [lesson(1, 1, { isCompleted: true })], { title: 'Kiểm tra chặng 1', questionCount: 10, isPassed: false }),
    stage(2, [lesson(5, 1, { isLocked: true })]),
  ];
  assert.deepEqual(lessonLockReason(stages, stages[1].lessons[0]), { template: 'Vượt qua “{0}” để mở bài này.', value: 'Kiểm tra chặng 1' });
});

test('an open lesson has no lock reason', () => {
  assert.equal(lessonLockReason([], lesson(1, 1)), null);
});
