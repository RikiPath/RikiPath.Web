import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildLearnerCalendarEvents,
  buildUpcomingHeaderSummary,
  classifyHomeworkItem,
  displayCourseTitle,
  extractSrsCalendarState,
  extractSrsDueCount,
  getSessionJoinState,
  isContentAuthorNotification,
  isScheduleNotification,
  isSrsActivityNotification,
  summarizeAuthorApprovals,
} from '@/features/calendar/utils/calendarEventsModel.js';
import { CALENDAR_CATEGORIES, CALENDAR_TONES, getCalendarCategoryMeta } from '@/features/scheduling/utils/calendarGeometry.js';

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
    assert.equal(srs.href, '/daily-srs/due/');

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

  it('synchronizes SRS due now, completed today, and future scheduled dates (GMT+7) across Full Calendar & Topbar Popup', () => {
    const nowMs = new Date('2026-11-22T07:30:00Z').getTime(); // 14:30 GMT+7 on 2026-11-22

    // 1. Before review: 5 cards due today, preferred mode = typing
    const beforeSummary = {
      dueTodayCount: 5,
      reviewedTodayCount: 0,
      activeCards: 5,
      studyTodayDate: '2026-11-22',
      preferredReviewMode: 'typing',
      calendarDays: [
        {
          date: '2026-11-22',
          dueNowCount: 5,
          dueLaterCount: 0,
          dueScheduledCount: 5,
          reviewedCount: 0,
          status: 'DueNow',
        },
      ],
    };
    const eventsBefore = buildLearnerCalendarEvents({
      srsSummary: beforeSummary,
      srsQueue: { totalDue: 5, studyMode: 'typing', items: [] },
      nowMs,
    });
    const todayBefore = eventsBefore.find((e) => e.dayKey === '2026-11-22' && e.eventType === 'srs');
    assert.ok(todayBefore, 'Today must have an SRS event when dueTodayCount > 0');
    assert.equal(todayBefore.title, '5 thẻ cần ôn');
    assert.equal(todayBefore.canReviewNow, true);
    assert.equal(todayBefore.href, '/daily-srs/due/');
    assert.equal(todayBefore.hrefLabel, 'Ôn ngay');

    const headerBefore = buildUpcomingHeaderSummary({ events: eventsBefore, nowMs });
    assert.equal(headerBefore.todayActionCount, 1, 'Topbar badge counts actionable due SRS today');

    // 2. After completing all 5 cards: dueTodayCount = 0, reviewedTodayCount = 5, next review 2026-11-23T00:00:00Z (07:00 GMT+7)
    const afterSummary = {
      dueTodayCount: 0,
      reviewedTodayCount: 5,
      activeCards: 5,
      studyTodayDate: '2026-11-22',
      preferredReviewMode: 'typing',
      nextDueAtUtc: '2026-11-23T00:00:00Z',
      calendarDays: [
        {
          date: '2026-11-21',
          dueScheduledCount: 2, // even if stale past due count arrives, past unreviewed must be ignored
          reviewedCount: 0,
        },
        {
          date: '2026-11-22',
          dueNowCount: 0,
          dueLaterCount: 0,
          dueScheduledCount: 0,
          reviewedCount: 5,
          nextDueAtUtc: '2026-11-23T00:00:00Z',
          status: 'CompletedToday',
        },
        {
          date: '2026-11-23',
          dueNowCount: 0,
          dueLaterCount: 5,
          dueScheduledCount: 5,
          reviewedCount: 0,
          earliestDueAtUtc: '2026-11-23T00:00:00Z',
          status: 'ScheduledFuture',
        },
      ],
    };

    const eventsAfter = buildLearnerCalendarEvents({
      srsSummary: afterSummary,
      srsQueue: { totalDue: 0, emptyReason: 'CompletedToday', nextDueAtUtc: '2026-11-23T00:00:00Z', items: [] },
      nowMs,
    });

    assert.equal(
      eventsAfter.find((e) => e.dayKey === '2026-11-21' && e.eventType === 'srs'),
      undefined,
      'Unreviewed or completed past days must never generate SRS calendar events or dots',
    );

    const todayAfter = eventsAfter.find((e) => e.dayKey === '2026-11-22' && e.eventType === 'srs');
    assert.equal(todayAfter, undefined, 'Completed SRS today must not generate a fake green completed event or dot');

    const tomorrowAfter = eventsAfter.find((e) => e.dayKey === '2026-11-23' && e.eventType === 'srs');
    assert.ok(tomorrowAfter, 'Future scheduled day 23/11 must display scheduled SRS count');
    assert.equal(tomorrowAfter.title, '5 thẻ cần ôn');
    assert.equal(tomorrowAfter.tone, 'srs');
    assert.equal(tomorrowAfter.statusLabel, 'Ôn tiếp lúc 07:00');
    assert.equal(tomorrowAfter.startHour, 7);
    assert.equal(tomorrowAfter.startMinute, 0);
    assert.equal(tomorrowAfter.canReviewNow, false, 'Future scheduled SRS must not allow premature review session start');
    assert.equal(tomorrowAfter.href, '/daily-srs/library/');
    assert.equal(tomorrowAfter.hrefLabel, 'Xem thẻ');

    const headerAfter = buildUpcomingHeaderSummary({ events: eventsAfter, nowMs });
    assert.equal(headerAfter.todayActionCount, 0, 'Topbar actionable badge drops to 0 once today SRS is completed');
    assert.equal(headerAfter.dayTonesMap.has('2026-11-22'), false, 'Mini-calendar must not show a green dot for completed SRS');
    assert.ok(headerAfter.dayTonesMap.get('2026-11-23')?.has('srs'), 'Mini-calendar marks 23/11 with yellow SRS dot');

    const stateAfter = extractSrsCalendarState({ srsSummary: afterSummary, nowMs });
    assert.equal(stateAfter.dueNowCount, 0);
    assert.equal(stateAfter.reviewedTodayCount, 5);

    // 3. Verify Unified 4-Category Calendar Colors (SRS Yellow, Homework Light Red, Class Green, Reminder Blue)
    assert.equal(CALENDAR_CATEGORIES.srs.hex, '#D5A12F');
    assert.equal(CALENDAR_CATEGORIES.srs.bgHex, '#FFF8E7');
    assert.equal(CALENDAR_CATEGORIES.homework.hex, '#DC6977');
    assert.equal(CALENDAR_CATEGORIES.homework.bgHex, '#FFF1F3');
    assert.equal(CALENDAR_CATEGORIES.class.hex, '#2F9B6B');
    assert.equal(CALENDAR_CATEGORIES.class.bgHex, '#EAF8F0');
    assert.equal(CALENDAR_CATEGORIES.reminder.hex, '#477FDC');
    assert.equal(CALENDAR_CATEGORIES.reminder.bgHex, '#EDF4FF');

    // Submitted/graded homework keeps Homework Light Red category tone (never class green 'present')
    const submittedHwEvents = buildLearnerCalendarEvents({
      homeworks: [
        { id: 77, cohortId: 2, title: 'Bài tập đã nộp', dueAt: '2026-11-22T10:00:00Z', status: 'Submitted', submission: { id: 1 } },
      ],
      notifications: [
        { id: 901, title: 'Thông báo dời buổi học', message: 'Lớp N3 dời sang Thứ 6', linkUrl: '/my-courses/1', createdAt: '2026-11-22T02:00:00Z', isRead: false },
        { id: 902, title: 'Tin tức chung', message: 'Khuyến mãi mùa thu', linkUrl: '/plans', createdAt: '2026-11-22T02:00:00Z', isRead: false },
      ],
      nowMs,
    });
    const submittedHw = submittedHwEvents.find((e) => e.id === 'hw-77');
    assert.equal(submittedHw.tone, 'homework', 'Completed homework must retain Homework category color');
    assert.equal(getCalendarCategoryMeta(submittedHw).hex, '#DC6977');

    const reminderEv = submittedHwEvents.find((e) => e.eventType === 'reminder');
    assert.ok(reminderEv, 'Unread schedule-related notification must create a Blue reminder event');
    assert.equal(reminderEv.tone, 'reminder');
    assert.equal(getCalendarCategoryMeta(reminderEv).hex, '#477FDC');
    assert.equal(submittedHwEvents.filter((e) => e.eventType === 'reminder').length, 1, 'General non-schedule notifications must be excluded');

    // Interactive calendar card links + arrow indicator hover contract
    const popoverSrc = fs.readFileSync(path.resolve(process.cwd(), 'src/features/calendar/components/HeaderCalendarPopover.jsx'), 'utf8');
    assert.ok(CALENDAR_CATEGORIES.srs.hoverCard && CALENDAR_CATEGORIES.srs.arrowChip);
    assert.ok(popoverSrc.includes('data-testid="popover-srs-due-link"'));
    assert.ok(popoverSrc.includes('CALENDAR_CATEGORIES.srs.hoverCard'));
    assert.ok(popoverSrc.includes('CALENDAR_CATEGORIES.srs.arrowChip'));
    assert.ok(popoverSrc.includes('group-hover:translate-x-0.5'));
  });

  it('enforces SRS Preferences Modal simplified labels, validation, and Review Player audio/reading settings', () => {
    const read = (rel) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
    const prefsSrc = read('src/features/srs/components/SrsPreferencesModal.jsx');
    const playerSrc = read('src/features/srs/components/SrsReviewPlayer.jsx');
    const syncSrc = read('src/features/srs/utils/srsCacheSync.js');

    // Simplified labels & zero SMTP technical jargon
    assert.ok(prefsSrc.includes("tr('Cài đặt ôn tập')"));
    assert.ok(prefsSrc.includes("tr('Ôn tập')"));
    assert.ok(prefsSrc.includes("tr('Thẻ mới mỗi ngày')"));
    assert.ok(prefsSrc.includes("tr('Mục tiêu ôn mỗi ngày')"));
    assert.ok(prefsSrc.includes('label="Tự phát âm"'));
    assert.ok(prefsSrc.includes('label="Hiện cách đọc khi lật"'));
    assert.ok(prefsSrc.includes('label="Tự thêm thẻ sau bài học"'));
    assert.ok(prefsSrc.includes("tr('Nhắc ôn tập')"));
    assert.ok(prefsSrc.includes('label="Nhắc khi có thẻ cần ôn"'));
    assert.ok(prefsSrc.includes('label="Nhắc qua email"'));
    assert.ok(!prefsSrc.includes('SMTP'), 'Learner UI must not display SMTP technical term');

    // Validation & 0 new cards support
    assert.ok(prefsSrc.includes('min={0}'));
    assert.ok(prefsSrc.includes('parsedNewLimit < 0'));
    assert.ok(prefsSrc.includes('parsedReviewLimit < 5'));
    assert.ok(prefsSrc.includes('invalidateSrsAndCalendarCaches(queryClient)'));

    // ReviewPlayer enforces showFuriganaHint & autoPlayAudio
    assert.ok(playerSrc.includes('showFuriganaHint || manualReadingRevealed'));
    assert.ok(playerSrc.includes('stopActiveAudio()'));
    assert.ok(playerSrc.includes('lastAutoPlayedKeyRef'));
    assert.ok(playerSrc.includes('invalidateSrsAndCalendarCaches(queryClient)'));

    // Centralized cache sync invalidates all SRS + Calendar + Learner Home + Notification prefixes
    assert.ok(syncSrc.includes("queryKey: ['srs-summary']"));
    assert.ok(syncSrc.includes("queryKey: ['srs-queue']"));
    assert.ok(syncSrc.includes("queryKey: ['srs-calendar']"));
    assert.ok(syncSrc.includes("queryKey: ['workspace-calendar']"));
    assert.ok(syncSrc.includes("queryKey: ['learner', 'daily-review-queue']"));
    assert.ok(syncSrc.includes("queryKey: ['notifications']"));
  });

  it('deduplicates SRS reminders across Calendar & Notification sources and enforces Priority 1/2/3 rules', () => {
    const nowMs = new Date('2026-11-22T07:30:00Z').getTime(); // 14:30 GMT+7 on 2026-11-22
    const notifications = [
      {
        id: 101,
        type: 'SrsReminder',
        title: 'Bạn có 22 thẻ SRS đến hạn ôn hôm nay',
        message: 'Hãy dành vài phút ôn tập 22 thẻ đến hạn hôm nay.',
        linkUrl: '/daily-srs/',
        createdAt: '2026-11-22T06:00:00Z',
        isRead: false,
      },
      {
        id: 102,
        title: 'Nhắc ôn tập bổ sung từ Notification API',
        message: 'Còn thẻ chờ ôn trong ngày',
        linkUrl: '/daily-srs',
        idempotencyKey: 'srs-reminder-2026-11-22',
        createdAt: '2026-11-22T06:05:00Z',
        isRead: false,
      },
      {
        id: 103,
        type: 'CohortSessionMoved',
        title: 'Lớp N3 dời sang Thứ 6',
        message: 'Giáo viên đã cập nhật lịch học.',
        linkUrl: '/my-courses/1',
        createdAt: '2026-11-22T02:00:00Z',
        isRead: false,
      },
    ];
    const courses = [
      {
        id: 1,
        cohortId: 2,
        cohortName: 'N3 Chuyên sâu',
        status: 'Active',
        paymentStatus: 'Paid',
        sessions: [{ id: 11, number: 1, scheduledAt: '2026-11-22T12:00:00Z', status: 'Scheduled' }],
      },
    ];
    const homeworks = [
      { id: 8, cohortId: 2, title: 'Bài tập ngữ pháp', dueAt: '2026-11-22T16:59:00Z' },
    ];

    assert.equal(isSrsActivityNotification(notifications[0]), true);
    assert.equal(isSrsActivityNotification(notifications[1]), true);
    assert.equal(isSrsActivityNotification(notifications[2]), false);

    // Priority 2: 22 due cards, no active session, class + homework + non-SRS reminder on same day
    const p2SummaryData = {
      dueTodayCount: 22,
      reviewedTodayCount: 0,
      studyTodayDate: '2026-11-22',
      preferredReviewMode: 'flip',
      hasActiveSession: false,
      activeSessionPendingCount: 0,
    };
    const p2Events = buildLearnerCalendarEvents({ courses, homeworks, notifications, srsSummary: p2SummaryData, nowMs });
    const p2Header = buildUpcomingHeaderSummary({ events: p2Events, homeworks, notifications, nowMs });
    const p2Srs = p2Events.filter((e) => e.eventType === 'srs');
    assert.equal(p2Srs.length, 1, 'Exactly one SRS card on Priority 2');
    assert.equal(p2Srs[0].title, '22 thẻ cần ôn');
    assert.equal(p2Srs[0].hrefLabel, 'Ôn ngay');
    assert.equal(p2Srs[0].href, '/daily-srs/due/');
    assert.equal(p2Header.scheduleNotifications.length, 1, 'Only non-SRS reminder survives in scheduleNotifications');
    assert.equal(p2Header.scheduleNotifications[0].id, 103);
    assert.equal(p2Events.filter((e) => e.eventType === 'reminder').length, 1);
    assert.ok(p2Header.dayTonesMap.get('2026-11-22')?.has('srs'));
    assert.ok(p2Header.dayTonesMap.get('2026-11-22')?.has('class') || p2Header.dayTonesMap.get('2026-11-22')?.has('session'));
    assert.ok(p2Header.dayTonesMap.get('2026-11-22')?.has('homework'));

    // Priority 1: Active session started with 22 cards, then progresses down to 5 remaining cards
    const p1StartSummary = {
      ...p2SummaryData,
      hasActiveSession: true,
      activeSessionKey: 'sess-22',
      activeSessionStudyMode: 'MultipleChoice',
      activeSessionPendingCount: 22,
    };
    const p1StartState = extractSrsCalendarState({ srsSummary: p1StartSummary, nowMs });
    assert.equal(p1StartState.hasActiveSession, true);
    assert.equal(p1StartState.activeSessionPendingCount, 22);
    assert.equal(p1StartState.reviewHref, '/daily-srs/due/?resume=1');

    const p1MidSummary = {
      ...p2SummaryData,
      dueTodayCount: 22, // total due differs from session remaining cards
      hasActiveSession: true,
      activeSessionKey: 'sess-22',
      activeSessionStudyMode: 'Typing',
      activeSessionPendingCount: 5,
    };
    const p1MidEvents = buildLearnerCalendarEvents({ notifications, srsSummary: p1MidSummary, nowMs });
    const p1Srs = p1MidEvents.filter((e) => e.eventType === 'srs');
    assert.equal(p1Srs.length, 1);
    assert.equal(p1Srs[0].title, 'Tiếp tục ôn tập');
    assert.equal(p1Srs[0].detail, 'Còn 5 thẻ chưa hoàn thành');
    assert.equal(p1Srs[0].hrefLabel, 'Tiếp tục ôn');
    assert.equal(p1Srs[0].href, '/daily-srs/due/?resume=1');

    // Priority 3: Completed session / 0 due cards — no SRS yellow card AND no blue SRS notification card
    const p3Summary = {
      dueTodayCount: 0,
      dueLaterTodayCount: 0,
      reviewedTodayCount: 22,
      studyTodayDate: '2026-11-22',
      hasActiveSession: false,
      activeSessionPendingCount: 0,
    };
    const p3Events = buildLearnerCalendarEvents({ notifications, srsSummary: p3Summary, nowMs });
    const p3Header = buildUpcomingHeaderSummary({ events: p3Events, notifications, nowMs });
    assert.equal(p3Events.filter((e) => e.eventType === 'srs').length, 0);
    assert.equal(p3Header.scheduleNotifications.length, 1);
    assert.equal(p3Header.scheduleNotifications[0].id, 103);
    assert.equal(p3Header.dayTonesMap.get('2026-11-22')?.has('srs'), false);

    // UI + cache-sync contracts across Popover, Full Calendar, DailySRS, SrsReviewPlayer
    const read = (rel) => fs.readFileSync(path.resolve(process.cwd(), rel), 'utf8');
    const popoverSrc = read('src/features/calendar/components/HeaderCalendarPopover.jsx');
    const calPageSrc = read('src/pages/learner/LearnerCalendarPage.jsx');
    const dailySrsSrc = read('src/pages/learner/DailySRS.jsx');
    const playerSrc = read('src/features/srs/components/SrsReviewPlayer.jsx');

    for (const uiSrc of [popoverSrc, calPageSrc]) {
      assert.ok(uiSrc.includes("tr('Tiếp tục ôn tập')"));
      assert.ok(uiSrc.includes("trf('Còn {0} thẻ chưa hoàn thành'"));
      assert.ok(uiSrc.includes("tr('Tiếp tục ôn')"));
      assert.ok(uiSrc.includes("tr('Ôn ngay')"));
    }
    assert.ok(dailySrsSrc.includes('invalidateSrsAndCalendarCaches(queryClient)'));
    assert.ok(!/queryClient\.invalidateQueries\(\{\s*queryKey:\s*\['srs-active-session'\]\s*\}\)/.test(dailySrsSrc));
    assert.ok(playerSrc.includes("queryClient.invalidateQueries({ queryKey: ['srs-summary'] })"));
  });
});
