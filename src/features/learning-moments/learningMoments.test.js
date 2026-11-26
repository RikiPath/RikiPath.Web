import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CELEBRATION_KIND,
  MOMENT_GAP_MS,
  REMINDER_COOLDOWN_MS,
  acquireCelebration,
  canOpenCelebration,
  celebrationGateSnapshot,
  scopeCelebrationGate,
  setPendingMoments,
} from './celebrationGate.js';
import { describeMoment } from './momentCatalog.js';

const tr = (s) => s;
const trf = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

test('gate: only one celebration modal at a time', () => {
  scopeCelebrationGate('u1');
  const release = acquireCelebration(CELEBRATION_KIND.MOMENT, 'a');
  assert.ok(release);
  assert.equal(acquireCelebration(CELEBRATION_KIND.MOMENT, 'b'), null);
  assert.equal(acquireCelebration(CELEBRATION_KIND.REMINDER, 'streak'), null);
  release({ shown: false });
  assert.ok(canOpenCelebration(CELEBRATION_KIND.MOMENT));
});

test('gate: "Để sau" is not followed immediately by another popup', () => {
  scopeCelebrationGate('u2');
  const release = acquireCelebration(CELEBRATION_KIND.MOMENT, 'goal');
  release();
  const t = celebrationGateSnapshot().lastClosedAt;
  assert.equal(canOpenCelebration(CELEBRATION_KIND.MOMENT, t + 1000), false);
  assert.equal(canOpenCelebration(CELEBRATION_KIND.MOMENT, t + MOMENT_GAP_MS), true);
  assert.equal(canOpenCelebration(CELEBRATION_KIND.REMINDER, t + MOMENT_GAP_MS), false);
  assert.equal(canOpenCelebration(CELEBRATION_KIND.REMINDER, t + REMINDER_COOLDOWN_MS), true);
});

test('gate: reminders yield to pending milestones; release is idempotent; account switch resets', () => {
  scopeCelebrationGate('u3');
  setPendingMoments(true);
  assert.equal(canOpenCelebration(CELEBRATION_KIND.REMINDER), false);
  setPendingMoments(false);
  assert.equal(canOpenCelebration(CELEBRATION_KIND.REMINDER), true);
  const release = acquireCelebration(CELEBRATION_KIND.REMINDER, 'streak');
  release();
  release();
  assert.equal(celebrationGateSnapshot().holder, null);
  scopeCelebrationGate('u4');
  assert.equal(celebrationGateSnapshot().lastClosedAt, 0);
  assert.ok(canOpenCelebration(CELEBRATION_KIND.MOMENT));
});

test('goal confirmed: dynamic level and only confirmed facts as chips', () => {
  const view = describeMoment({
    type: 'GOAL_CONFIRMED',
    data: { targetLevel: 'N4', nextStep: 'placement', dailyMinutesMin: '30', dailyMinutesMax: '60' },
  }, tr, trf);
  assert.equal(view.variant, 'goal');
  assert.equal(view.title, 'Mục tiêu JLPT N4 đã sẵn sàng!');
  assert.equal(view.cta, 'Đánh giá năng lực');
  assert.deepEqual(view.chips.map((c) => c.label), ['JLPT N4', '30–60 phút/ngày']);
});

test('roadmap ready: standard and AI roadmaps have distinct copy', () => {
  const std = describeMoment({ type: 'LEARNING_PATH_CREATED', data: { kind: 'standard', lessons: '42' } }, tr, trf);
  const ai = describeMoment({ type: 'LEARNING_PATH_CREATED', data: { kind: 'ai', stages: '4' } }, tr, trf);
  assert.notEqual(std.chips.find((c) => c.label === 'Lộ trình tiêu chuẩn'), undefined);
  assert.notEqual(ai.chips.find((c) => c.label === 'Lộ trình cá nhân hóa AI'), undefined);
  assert.ok(std.chips.some((c) => c.label === '42 bài học'));
  assert.ok(ai.chips.some((c) => c.label === '4 chặng học'));
});

test('purchase: activation unlocks, renewal/top-up never claim a new unlock, CTA follows prerequisites', () => {
  const activation = describeMoment({
    type: 'PURCHASE_COMPLETED',
    data: { planName: 'Gói tự học JLPT', kind: 'self_study', mode: 'activation' },
    benefits: [{ code: 'LESSONS', name: 'Bài học JLPT', isNew: true }],
  }, tr, trf);
  assert.equal(activation.variant, 'purchase');
  assert.equal(activation.unlock, true);
  assert.equal(activation.benefits.length, 1);
  assert.equal(activation.cta, 'Bắt đầu học');

  const renewal = describeMoment({ type: 'PURCHASE_COMPLETED', data: { planName: 'Gói tự học JLPT', kind: 'self_study', mode: 'renewal' } }, tr, trf);
  assert.equal(renewal.unlock, false);
  assert.equal(renewal.title, 'Gia hạn gói học thành công!');

  const topup = describeMoment({ type: 'PURCHASE_COMPLETED', data: { kind: 'ai_grading', mode: 'topup', aiUses: '5' } }, tr, trf);
  assert.equal(topup.unlock, false);
  assert.equal(topup.title, 'Đã bổ sung lượt AI thành công!');

  const needsGoal = describeMoment({ type: 'PURCHASE_COMPLETED', data: { kind: 'learning_path', ctaStep: 'goal' } }, tr, trf);
  assert.equal(needsGoal.cta, 'Thiết lập mục tiêu học tập');
});

test('assessment completed: roadmap CTA only when the result fits the goal', () => {
  const ready = describeMoment({ type: 'PLACEMENT_COMPLETED', data: { hasGoal: 'true', nextStep: 'roadmap', targetLevel: 'N4', assessedLevel: 'N5' } }, tr, trf);
  assert.equal(ready.title, 'Bạn đã hoàn thành bài đánh giá!');
  assert.equal(ready.cta, 'Tạo lộ trình học');
  const more = describeMoment({ type: 'PLACEMENT_COMPLETED', data: { hasGoal: 'true', nextStep: 'supplement_placement' } }, tr, trf);
  assert.equal(more.cta, 'Đánh giá năng lực');
});

test('unknown moment types are ignored (older UI never breaks)', () => {
  assert.equal(describeMoment({ type: 'SOMETHING_NEW', data: {} }, tr, trf), null);
});
