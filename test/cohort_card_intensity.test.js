import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cohortCardFacts, enrollmentStatusOf, intensityOf } from '../src/components/studyCourses/cohortCardModel.js';

const base = {
  id: 7, name: 'N4 Tối 2-4-6', level: 'N4', mentorId: 3, mentorName: 'Tanaka Sensei', sessionMinutes: 90,
  capacity: 4, seatsAvailable: 2, enrollmentOpen: true, price: 2500000, startsAt: '2026-12-07T12:00:00Z', endsAt: '2027-02-14T13:30:00Z',
  schedulePattern: [{ weekday: 1, weekdayLabel: 'Thứ 2', localStart: '19:00', localEnd: '20:30' }, { weekday: 3, weekdayLabel: 'Thứ 4', localStart: '19:00', localEnd: '20:30' }],
  sessions: [],
};
const render = (c) => `${intensityOf(c).text} data-intensity="${intensityOf(c).key}" ${cohortCardFacts(c).map(([k, v]) => `${k}: >${v}<`).join(' | ')} data-enrollment-status="${enrollmentStatusOf(c).key}"`;

describe('Cohort card shows intensity without filtering', () => {
  for (const [intensity, intensityLabel, spw] of [['Light', 'Nhẹ', 2], ['Standard', 'Tiêu chuẩn', 3], ['Advanced', 'Nâng cao', 4]]) {
    it(`${spw} sessions/week -> ${intensityLabel}`, () => {
      const html = render({ ...base, intensity, intensityLabel, sessionsPerWeek: spw, totalSessions: spw * 10, totalTeachingHours: spw * 15 });
      assert.match(html, new RegExp(`Cường độ: ${intensityLabel} · ${spw} buổi/tuần`));
      assert.match(html, new RegExp(`data-intensity="${intensity}"`));
      assert.match(html, />N4</);
      assert.match(html, /Tanaka Sensei/);
      assert.match(html, /Thứ 2, Thứ 4 · 19:00–20:30/);
      assert.match(html, /90 phút\/buổi/);
      assert.match(html, new RegExp(`${spw * 10} buổi`));
      assert.match(html, /10 tuần/);
      assert.match(html, /2\/4/);
      assert.match(html, /2\.500\.000/);
    });
  }

  it('keeps enrollment status separate from intensity', () => {
    assert.equal(enrollmentStatusOf({ ...base, seatsAvailable: 0 }).key, 'Full');
    assert.equal(enrollmentStatusOf({ ...base, enrollmentOpen: false }).key, 'Upcoming');
    assert.equal(enrollmentStatusOf(base).key, 'Available');
    const html = render({ ...base, intensity: 'Advanced', intensityLabel: 'Nâng cao', sessionsPerWeek: 4, totalSessions: 40, seatsAvailable: 0 });
    assert.match(html, /data-enrollment-status="Full"/);
    assert.match(html, /Cường độ: Nâng cao/);
  });
});
