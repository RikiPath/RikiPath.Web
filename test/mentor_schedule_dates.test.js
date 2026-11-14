import test from 'node:test';
import assert from 'node:assert/strict';
import { backendUtcDate, vietnamInputValue } from '../src/utils/mentorSchedule.js';

test('legacy UTC timestamps without a suffix retain their instant and display in Vietnam time', () => {
  assert.equal(backendUtcDate('2026-11-15T01:30:00').toISOString(), '2026-11-15T01:30:00.000Z');
  assert.equal(backendUtcDate('2026-11-15T08:30:00+07:00').toISOString(), '2026-11-15T01:30:00.000Z');
  assert.equal(vietnamInputValue('2026-11-15T01:30:00'), '2026-11-15T08:30');
});
