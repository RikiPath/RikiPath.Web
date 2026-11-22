import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthMatrix,
  buildWeekDays,
  getViewDateRange,
  groupAgendaEvents,
  mondayOfDateKey,
  packDayEvents,
  shiftDateKey,
  stepAnchorKey,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';

describe('SakuraCalendar VN timezone & date geometry', () => {
  it('converts naive UTC timestamps to Asia/Ho_Chi_Minh date & clock accurately', () => {
    // 2026-11-23T11:00:00 (naive UTC) -> 18:00 GMT+7 on 2026-11-23
    assert.equal(toVnDateKey('2026-11-23T11:00:00'), '2026-11-23');
    assert.deepEqual(toVnTimeParts('2026-11-23T11:00:00'), { hour: 18, minute: 0, hhmm: '18:00' });

    // Cross-midnight boundary: 2026-11-22T18:30:00Z -> 2026-11-23 01:30 GMT+7
    assert.equal(toVnDateKey('2026-11-22T18:30:00'), '2026-11-23');
    assert.deepEqual(toVnTimeParts('2026-11-22T18:30:00'), { hour: 1, minute: 30, hhmm: '01:30' });
  });

  it('computes Monday start across Sunday and builds 7-day & month matrices cleanly', () => {
    assert.equal(mondayOfDateKey('2026-11-22'), '2026-11-16'); // Sunday -> Monday 16th
    assert.equal(mondayOfDateKey('2026-11-23'), '2026-11-23');
    const week = buildWeekDays('2026-11-22', '2026-11-19');
    assert.equal(week.length, 7);
    assert.equal(week[0].key, '2026-11-16');
    assert.equal(week[6].key, '2026-11-22');
    assert.equal(week.find((d) => d.key === '2026-11-19')?.isToday, true);

    const month = buildMonthMatrix('2026-11-19', '2026-11-19');
    assert.equal(month.cells.length % 7, 0);
    assert.ok(month.cells.length >= 35);
    assert.equal(month.title, 'Tháng 11, 2026');
  });

  it('steps anchor across Day / Week / Month views including month-end clamping', () => {
    assert.equal(stepAnchorKey('2026-11-19', 'day', 1), '2026-11-20');
    assert.equal(stepAnchorKey('2026-11-19', 'week', -1), '2026-11-12');
    assert.equal(stepAnchorKey('2027-01-31', 'month', 1), '2027-02-28');
    assert.equal(shiftDateKey('2026-11-30', 1), '2026-12-01');
    const range = getViewDateRange('2026-11-19', 'week');
    assert.equal(range.startKey, '2026-11-16');
    assert.equal(range.endKey, '2026-11-22');
  });
});

describe('SakuraCalendar collision packing & agenda grouping', () => {
  it('assigns non-overlapping columns for concurrent events without hiding any block', () => {
    const events = [
      { id: 'a', startHour: 9, startMinute: 0, endHour: 11, endMinute: 0 },
      { id: 'b', startHour: 9, startMinute: 30, endHour: 10, endMinute: 30 },
      { id: 'c', startHour: 10, startMinute: 0, endHour: 11, endMinute: 30 },
      { id: 'd', startHour: 14, startMinute: 0, endHour: 15, endMinute: 30 },
    ];
    const packed = packDayEvents(events);
    const byId = Object.fromEntries(packed.map((e) => [e.id, e]));
    assert.equal(byId.a.totalCols, 3);
    assert.equal(byId.b.totalCols, 3);
    assert.equal(byId.c.totalCols, 3);
    assert.notEqual(byId.a.col, byId.b.col);
    assert.notEqual(byId.b.col, byId.c.col);
    assert.equal(byId.d.totalCols, 1);
    assert.equal(byId.d.col, 0);
  });

  it('groups agenda events chronologically within range', () => {
    const groups = groupAgendaEvents(
      [
        { id: 1, dayKey: '2026-11-21', startHour: 18, startMinute: 0, endHour: 19, endMinute: 30, title: 'S2' },
        { id: 2, dayKey: '2026-11-19', startHour: 19, startMinute: 0, endHour: 20, endMinute: 30, title: 'S1b' },
        { id: 3, dayKey: '2026-11-19', startHour: 8, startMinute: 0, endHour: 9, endMinute: 30, title: 'S1a' },
      ],
      { startKey: '2026-11-19', endKey: '2026-11-25', todayKey: '2026-11-19' },
    );
    assert.equal(groups.length, 2);
    assert.equal(groups[0].isToday, true);
    assert.deepEqual(groups[0].items.map((x) => x.title), ['S1a', 'S1b']);
  });
});
