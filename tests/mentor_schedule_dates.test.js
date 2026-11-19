import test from 'node:test';
import assert from 'node:assert/strict';
import { backendUtcDate, planMentorAvailability, shiftDate, vietnamInputValue } from '@/utils/mentorSchedule.js';

test('legacy UTC timestamps without a suffix retain their instant and display in Vietnam time', () => {
  assert.equal(backendUtcDate('2026-11-15T01:30:00').toISOString(), '2026-11-15T01:30:00.000Z');
  assert.equal(backendUtcDate('2026-11-15T08:30:00+07:00').toISOString(), '2026-11-15T01:30:00.000Z');
  assert.equal(vietnamInputValue('2026-11-15T01:30:00'), '2026-11-15T08:30');
});

const now = new Date('2026-11-16T00:00:00Z');

test('a single future block is one pending session', () => {
  const plan = planMentorAvailability({ date: '2026-11-16', from: '09:00', to: '11:00', repeating: false, now });
  assert.equal(plan.ready, true);
  assert.deepEqual(plan.rows, ['2026-11-16']);
});

test('weekday presets expand only matching days through the end date', () => {
  const odd = planMentorAvailability({
    date: '2026-11-16', from: '08:00', to: '12:00', until: '2026-11-29', repeating: true, days: [1, 3, 5], now,
  });
  assert.deepEqual(odd.rows, ['2026-11-16', '2026-11-18', '2026-11-20', '2026-11-23', '2026-11-25', '2026-11-27']);
  const even = planMentorAvailability({
    date: '2026-11-16', from: '08:00', to: '12:00', until: '2026-11-28', repeating: true, days: [2, 4, 6], now,
  });
  assert.deepEqual(even.rows, ['2026-11-17', '2026-11-19', '2026-11-21', '2026-11-24', '2026-11-26', '2026-11-28']);
});

test('registration is blocked by the same limits the API enforces', () => {
  assert.match(planMentorAvailability({ date: '2026-11-16', from: '12:00', to: '09:00', repeating: false, now }).error, /sau giờ bắt đầu/);
  assert.match(planMentorAvailability({ date: '2026-11-16', from: '08:00', to: '17:00', repeating: false, now }).error, /8 giờ/);
  assert.match(planMentorAvailability({ date: '2026-11-15', from: '09:00', to: '11:00', repeating: false, now }).error, /tương lai/);
  assert.match(planMentorAvailability({
    date: '2026-11-16', from: '09:00', to: '11:00', until: shiftDate('2026-11-16', 367), repeating: true, days: [1], now,
  }).error, /một năm/);
  assert.equal(planMentorAvailability({
    date: '2026-11-16', from: '09:00', to: '11:00', until: shiftDate('2026-11-16', 366), repeating: true, days: [1], now,
  }).ready, true);
  assert.match(planMentorAvailability({
    date: '2026-11-17', from: '09:00', to: '11:00', until: '2026-11-17', repeating: true, days: [1], now,
  }).error, /Không có ngày/);
});

test('any overlap blocks the whole registration', () => {
  const slots = [{ startTime: '2026-11-18T01:00:00Z', endTime: '2026-11-18T05:00:00Z', rejectedAt: null }];
  const plan = planMentorAvailability({
    date: '2026-11-16', from: '08:00', to: '12:00', until: '2026-11-20', repeating: true, days: [1, 3, 5], slots, now,
  });
  assert.equal(plan.ready, false);
  assert.deepEqual(plan.overlapping, ['2026-11-18']);
  const rejected = planMentorAvailability({
    date: '2026-11-16', from: '08:00', to: '12:00', until: '2026-11-20', repeating: true, days: [1, 3, 5],
    slots: [{ ...slots[0], rejectedAt: '2026-11-01T00:00:00Z' }], now,
  });
  assert.equal(rejected.ready, true);
});
