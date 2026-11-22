import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLearnerCalendarEvents,
  buildUpcomingHeaderSummary,
  classifyHomeworkItem,
  displayCourseTitle,
  extractSrsDueCount,
  getSessionJoinState,
  isContentAuthorNotification,
  isScheduleNotification,
  summarizeAuthorApprovals,
} from '@/features/calendar/utils/calendarEventsModel.js';
import { CALENDAR_TONES } from '@/features/scheduling/utils/calendarGeometry.js';

describe('calendarEventsModel — real schedule, join window, homework & SRS normalization', () => {
  it('opens meeting room CTA only within [start - 15m, end + 30m] for active paid courses', () => {
    const startIso = '2026-11-20T12:45:00Z';
    const startMs = new Date(startIso).getTime();
    const course = { id: 7, status: 'Active', paymentStatus: 'Paid', sessionMinutes: 90 };
    const session = { id: 101, number: 1, scheduledAt: startIso, status: 'Scheduled', meetingUrl: '/meeting-room/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' };

    assert.equal(getSessionJoinState(session, course, startMs - 20 * 60_000).canJoin, false);
    assert.equal(getSessionJoinState(session, course, startMs - 10 * 60_000).canJoin, true);
    assert.equal(getSessionJoinState(session, course, startMs + 95 * 60_000).canJoin, true);
    assert.equal(getSessionJoinState(session, course, startMs + 125 * 60_000).canJoin, false);

    const pendingCourse = { ...course, paymentStatus: 'Pending' };
    assert.equal(getSessionJoinState(session, pendingCourse, startMs).canJoin, false);
  });

  it('builds learner calendar events across sessions, approved moves, homework deadlines, and today-only SRS', () => {
    const nowMs = new Date('2026-11-20T03:00:00Z').getTime(); // 10:00 GMT+7 on 2026-11-20
    const courses = [
      {
        id: 12,
        cohortId: 6,
        cohortName: 'N3 Chuyên sâu Tối 2-4-6',
        mentorName: 'Mentor One',
        status: 'Active',
        paymentStatus: 'Paid',
        sessionMinutes: 90,
        sessions: [
          {
            id: 501,
            number: 1,
            scheduledAt: '2026-11-20T12:45:00Z',
            status: 'Scheduled',
            meetingUrl: '/meeting-room/11111111-1111-1111-1111-111111111111',
          },
          {
            id: 502,
            number: 2,
            scheduledAt: '2026-11-23T12:45:00Z',
            status: 'Scheduled',
          },
        ],
      },
    ];
    const homeworks = [
      {
        id: 3,
        cohortId: 6,
        title: 'Luyện đọc hiểu tuần 1',
        dueAt: '2026-11-21T16:59:00Z', // 23:59 GMT+7 same day
        status: 'Assigned',
        submission: null,
      },
    ];
    const changeRequests = [
      { id: 9, sessionId: 502, kind: 'Move', status: 'Approved' },
    ];
    const srsQueue = [{ id: 1 }, { id: 2 }];

    const events = buildLearnerCalendarEvents({ courses, homeworks, changeRequests, srsQueue, nowMs });
    assert.equal(events.length, 4);

    const s1 = events.find((e) => e.sessionId === 501);
    const s2 = events.find((e) => e.sessionId === 502);
    const hw = events.find((e) => e.homeworkId === 3);
    const srs = events.find((e) => e.eventType === 'srs');

    assert.equal(s1.dayKey, '2026-11-20');
    assert.equal(s1.startHour, 19);
    assert.equal(s1.startMinute, 45);
    assert.equal(s1.tone, 'session');
    assert.equal(s1.relatedHomeworks.length, 1);

    assert.equal(s2.tone, 'rescheduled');
    assert.equal(hw.tone, 'homework');
    assert.equal(hw.dayKey, '2026-11-21');
    assert.equal(hw.endHour, 23);
    assert.equal(hw.endMinute, 59);

    assert.equal(srs.tone, 'srs');
    assert.equal(srs.href, '/daily-srs');

    assert.equal(extractSrsDueCount({ totalDue: 25, items: [{ id: 1 }] }), 25);
    assert.equal(extractSrsDueCount({ items: [{ id: 1 }, { id: 2 }] }), 2);
    const srsObjEvents = buildLearnerCalendarEvents({ courses: [], homeworks: [], srsQueue: { totalDue: 25, items: [] }, nowMs });
    assert.equal(srsObjEvents.length, 1);
    assert.match(srsObjEvents[0].title, /25 thẻ/);
  });

  it('classifies homework statuses accurately and avoids raw #ID course titles', () => {
    const nowMs = new Date('2026-11-20T05:00:00Z').getTime();
    assert.equal(classifyHomeworkItem({ publishedGrade: { score: 85 } }, nowMs), 'graded');
    assert.equal(classifyHomeworkItem({ submission: { id: 1 } }, nowMs), 'submitted');
    assert.equal(classifyHomeworkItem({ dueAt: '2026-11-19T10:00:00Z' }, nowMs), 'overdue');
    assert.equal(classifyHomeworkItem({ dueAt: '2026-11-21T10:00:00Z' }, nowMs), 'dueSoon');
    assert.equal(classifyHomeworkItem({ dueAt: '2026-11-29T10:00:00Z' }, nowMs), 'pending');

    assert.equal(displayCourseTitle({ id: 42, level: 'N4' }), 'Lớp JLPT N4');
    assert.doesNotMatch(displayCourseTitle({ id: 42 }), /#\d+/);
  });

  it('builds mini-calendar tone dots and filters schedule notifications', () => {
    const nowMs = new Date('2026-11-20T03:00:00Z').getTime();
    const events = buildLearnerCalendarEvents({
      courses: [
        {
          id: 1,
          cohortId: 2,
          name: 'N3 Sáng',
          status: 'Active',
          paymentStatus: 'Paid',
          sessions: [{ id: 11, number: 1, scheduledAt: '2026-11-20T04:00:00Z', status: 'Scheduled' }],
        },
      ],
      homeworks: [{ id: 8, cohortId: 2, title: 'Ngữ pháp N3', dueAt: '2026-11-22T10:00:00Z' }],
      srsQueue: [{ id: 1 }],
      nowMs,
    });
    const notifications = [
      { id: 1, title: 'Nhắc lịch học', linkUrl: '/my-courses/1' },
      { id: 2, title: 'Khuyến mãi chung', linkUrl: '/plans' },
    ];
    const summary = buildUpcomingHeaderSummary({
      events,
      homeworks: [{ id: 8, cohortId: 2, title: 'Ngữ pháp N3', dueAt: '2026-11-22T10:00:00Z' }],
      notifications,
      nowMs,
    });

    assert.equal(summary.todayEvents.length, 2); // 1 session + 1 today SRS
    assert.equal(summary.upcomingSessions.length, 1);
    assert.equal(summary.upcoming7DaysSessions.length, 1);
    assert.equal(summary.pendingHomeworks.length, 1);
    assert.equal(summary.scheduleNotifications.length, 1);
    assert.ok(summary.dayTonesMap.get('2026-11-22')?.has('homework'));
    assert.ok(CALENDAR_TONES.live && CALENDAR_TONES.homework && CALENDAR_TONES.rescheduled && CALENDAR_TONES.srs);
  });

  it('summarizes ContentAuthor approval batches and recognizes Admin/Mentor/Author notifications', () => {
    const authorSummary = summarizeAuthorApprovals([
      { id: 1, batchId: 'b1', entityType: 'Lesson', rowKey: 'N3 Bài 1 / Từ vựng', status: 'PendingReview' },
      { id: 2, batchId: 'b1', entityType: 'Vocabulary', rowKey: 'Từ 1', status: 'Rejected' },
      { id: 3, batchId: 'b2', entityType: 'Grammar', rowKey: 'Ngữ pháp 1', status: 'PendingReview' },
      { id: 4, batchId: 'b3', entityType: 'Kanji', rowKey: 'Hán tự 1', status: 'Draft' },
      { id: 5, batchId: 'b4', entityType: 'Kanji', rowKey: 'Hán tự 2', status: 'Approved' },
    ]);
    assert.equal(authorSummary.totalGroups, 4);
    assert.equal(authorSummary.rejectedCount, 1);
    assert.equal(authorSummary.pendingReviewCount, 1);
    assert.equal(authorSummary.draftCount, 1);
    assert.equal(authorSummary.approvedCount, 1);
    assert.equal(authorSummary.activeCount, 3);
    assert.equal(authorSummary.recentAttention.length, 3);

    assert.equal(isScheduleNotification({ linkUrl: '/admin/mentor-schedules/', title: 'Mentor gửi lịch' }), true);
    assert.equal(isScheduleNotification({ linkUrl: '/mentor/cohorts/5', title: 'Buổi học mới' }), true);
    assert.equal(isContentAuthorNotification({ linkUrl: '/author-dashboard', title: 'Lô học liệu được duyệt' }), true);
  });
});
