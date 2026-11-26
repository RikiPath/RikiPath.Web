import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  computeNextRelativeTickMs,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatNotificationDateTime,
  formatNotificationTime,
  formatRelativeTime,
  formatTime,
  formatTimeRange,
} from '@/utils/dateTimeFormat.js';
import { formatVnDateTime, formatVnSlotWindow } from '@/utils/vnDateTime.js';
import {
  classifyNotification,
  isNotificationActionable,
  isSelfActionEchoNotification,
  resolveInvalidationKeysForNotification,
  resolveNotificationNavigation,
} from '@/features/notifications/utils/notificationModel.js';
import {
  createNotificationDeduper,
  normalizeRealtimeNotification,
} from '@/features/notifications/utils/notificationDedupe.js';

const ROOT = process.cwd();
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Context-Aware DateTime Formatter — 24h Business vs 12h AM/PM Notification', () => {
  it('formats all critical boundary times as 24-hour for Business UI and 12-hour AM/PM for Notification UI', () => {
    const boundaries = [
      ['00:00', '00:00', '12:00 AM'],
      ['00:30', '00:30', '12:30 AM'],
      ['07:30', '07:30', '07:30 AM'],
      ['11:59', '11:59', '11:59 AM'],
      ['12:00', '12:00', '12:00 PM'],
      ['12:30', '12:30', '12:30 PM'],
      ['13:45', '13:45', '01:45 PM'],
      ['23:59', '23:59', '11:59 PM'],
    ];

    for (const [original, expectedBusiness, expectedNotif] of boundaries) {
      assert.equal(formatTime(original), expectedBusiness);
      assert.equal(formatNotificationTime(original), expectedNotif);
    }

    // Minute-of-day numeric support
    assert.equal(formatTime(0), '00:00');
    assert.equal(formatTime(720), '12:00');
    assert.equal(formatTime(825), '13:45');
    assert.equal(formatTime(1439), '23:59');
    assert.equal(formatNotificationTime(0), '12:00 AM');
    assert.equal(formatNotificationTime(825), '01:45 PM');
    assert.equal(formatNotificationTime(1439), '11:59 PM');

    // Converting 12-hour strings into 24-hour MUST compute real 24h clock (never string-strip AM/PM)
    assert.equal(formatTime('01:45 PM'), '13:45');
    assert.equal(formatTime('12:00 AM'), '00:00');
    assert.equal(formatTime('12:00 PM'), '12:00');
    assert.equal(formatTime('11:59 PM'), '23:59');

    // Notification 12-hour formatter is idempotent (never duplicates AM/PM)
    assert.equal(formatNotificationTime('12:00 PM'), '12:00 PM');
    assert.equal(formatNotificationTime('7:05 am'), '07:05 AM');
  });

  it('formats Business dates/ranges/datetimes in 24-hour and Notification datetimes in 12-hour AM/PM without double GMT+7 shift', () => {
    assert.equal(formatDate('2026-11-25'), '25/11/2026');
    assert.equal(formatDate('2028-02-29'), '29/02/2028'); // leap year
    assert.equal(formatDateRange('2026-12-03', '2027-02-06'), '03/12/2026 → 06/02/2027');

    // 2026-11-24T10:11:00Z = 17:11 GMT+7
    assert.equal(formatDateTime('2026-11-24T10:11:00Z'), '17:11 - 24/11/2026');
    assert.equal(formatDateTime('2026-11-24T10:11:00'), '17:11 - 24/11/2026');
    assert.equal(formatNotificationDateTime('2026-11-24T10:11:00Z'), '05:11 PM - 24/11/2026');
    assert.equal(formatNotificationDateTime('2026-11-25T16:30:00Z'), '11:30 PM - 25/11/2026');

    // Midnight rollover across UTC → GMT+7 (2026-12-31T17:30:00Z = 2027-01-01 00:30 GMT+7)
    assert.equal(formatDateTime('2026-12-31T17:30:00Z'), '00:30 - 01/01/2027');
    assert.equal(formatNotificationDateTime('2026-12-31T17:30:00Z'), '12:30 AM - 01/01/2027');

    // Compact 24-hour Business time ranges (including across noon & across midnight)
    assert.equal(formatTimeRange('08:00', '09:30'), '08:00–09:30');
    assert.equal(formatTimeRange('13:45', '15:15'), '13:45–15:15');
    assert.equal(formatTimeRange('11:30', '13:00'), '11:30–13:00');
    assert.equal(formatTimeRange('23:00', '00:30'), '23:00–00:30');

    // vnDateTime helpers inherit canonical 24-hour Business standard
    assert.equal(formatVnDateTime('2026-11-24T10:11:00Z'), '17:11 - 24/11/2026');
    assert.match(formatVnSlotWindow('2026-12-02T05:00:00Z', '2026-12-02T06:30:00Z'), /12:00–13:30$/);
  });

  it('formats relative timestamps across all UX boundaries and guards clock skew / invalid dates', () => {
    const now = Date.parse('2026-11-25T10:00:00Z');
    const ago = (sec) => new Date(now - sec * 1000).toISOString();

    assert.equal(formatRelativeTime(ago(0), now, 'vi'), 'Vừa xong');
    assert.equal(formatRelativeTime(ago(4), now, 'vi'), 'Vừa xong');
    assert.equal(formatRelativeTime(ago(-15), now, 'vi'), 'Vừa xong'); // future / clock skew never "-15 giây trước"
    assert.equal(formatRelativeTime(ago(5), now, 'vi'), '5 giây trước');
    assert.equal(formatRelativeTime(ago(59), now, 'vi'), '59 giây trước');
    assert.equal(formatRelativeTime(ago(60), now, 'vi'), '1 phút trước');
    assert.equal(formatRelativeTime(ago(59 * 60), now, 'vi'), '59 phút trước');
    assert.equal(formatRelativeTime(ago(60 * 60), now, 'vi'), '1 giờ trước');
    assert.equal(formatRelativeTime(ago(23 * 3600), now, 'vi'), '23 giờ trước');
    assert.equal(formatRelativeTime(ago(24 * 3600), now, 'vi'), '1 ngày trước');
    assert.equal(formatRelativeTime(ago(6 * 86400), now, 'vi'), '6 ngày trước');
    assert.equal(formatRelativeTime(ago(7 * 86400), now, 'vi'), '1 tuần trước');
    assert.equal(formatRelativeTime(ago(30 * 86400), now, 'vi'), '1 tháng trước');
    assert.equal(formatRelativeTime(ago(365 * 86400), now, 'vi'), '1 năm trước');

    // Japanese & English locales
    assert.equal(formatRelativeTime(ago(2), now, 'ja'), 'たった今');
    assert.equal(formatRelativeTime(ago(120), now, 'ja'), '2分前');
    assert.equal(formatRelativeTime(ago(120), now, 'en'), '2m ago');

    // Invalid / missing timestamps safely return empty string
    assert.equal(formatRelativeTime(null, now, 'vi'), '');
    assert.equal(formatRelativeTime('not-a-date', now, 'vi'), '');
    assert.equal(formatDateTime('invalid'), '');

    // Adaptive tick intervals
    assert.equal(computeNextRelativeTickMs([ago(10)], now), 1000);
    assert.equal(computeNextRelativeTickMs([ago(120)], now), 30000);
    assert.equal(computeNextRelativeTickMs([ago(4 * 3600)], now), 300000);
    assert.equal(computeNextRelativeTickMs([ago(3 * 86400)], now), null);
  });
});

describe('Global Notification System — Semantics, Deep Links, Dedupe & Security', () => {
  it('classifies notification categories semantically and determines actionability accurately', () => {
    assert.equal(
      classifyNotification({ type: 'MentorSchedule', title: 'Đề xuất mở lớp JLPT N4 đã được phê duyệt' }).category,
      'success',
    );
    assert.equal(
      classifyNotification({ type: 'MentorSchedule', title: 'Đề xuất mở lớp JLPT N4 bị từ chối' }).category,
      'error',
    );
    assert.equal(
      classifyNotification({ type: 'MentorSchedule', title: 'Đề xuất mở lớp JLPT N4 cần bổ sung thông tin' }).category,
      'warning',
    );
    assert.equal(
      classifyNotification({ type: 'CONTENT_APPROVAL_PENDING', title: 'Yêu cầu duyệt nội dung mới' }).category,
      'warning',
    );
    assert.equal(
      classifyNotification({ type: 'MentorSchedule', title: 'Đã gửi đề xuất mở lớp JLPT' }).category,
      'info',
    );

    assert.equal(
      isNotificationActionable({ isRead: false, type: 'MentorVerification', title: 'Hồ sơ giáo viên chờ xét duyệt' }),
      true,
    );
    assert.equal(
      isNotificationActionable({ isRead: true, type: 'MentorVerification', title: 'Hồ sơ giáo viên chờ xét duyệt' }),
      false,
    );
    assert.equal(
      isSelfActionEchoNotification({ title: 'Đã gửi đề xuất mở lớp JLPT' }),
      true,
    );
    assert.equal(
      isSelfActionEchoNotification({ title: 'Quản trị viên đã phê duyệt đề xuất mở lớp JLPT N4' }),
      false,
    );
  });

  it('resolves deep links by role, canonicalizes legacy URLs, and blocks open redirects / cross-role access', () => {
    // Admin proposal deep link strips legacy tab=proposals
    const adminNav = resolveNotificationNavigation(
      { linkUrl: '/admin/mentor-schedules?tab=proposals&proposalId=42' },
      'Admin',
    );
    assert.equal(adminNav.allowed, true);
    assert.equal(adminNav.url, '/admin/mentor-schedules/?proposalId=42');
    assert.equal(adminNav.entityType, 'TeachingProposal');
    assert.equal(adminNav.entityId, '42');

    // Mentor legacy link redirects cleanly
    const mentorNav = resolveNotificationNavigation(
      { linkUrl: '/mentor/availability?proposalId=7' },
      'Mentor',
    );
    assert.equal(mentorNav.allowed, true);
    assert.equal(mentorNav.url, '/mentor-shift-schedule/?proposalId=7');

    // Cross-role guard: Learner cannot navigate into /admin/
    const crossRole = resolveNotificationNavigation(
      { linkUrl: '/admin/mentor-schedules/?proposalId=42' },
      'Learner',
    );
    assert.equal(crossRole.allowed, false);
    assert.equal(crossRole.fallbackUrl, '/dashboard/');

    // Open-redirect / XSS guard
    assert.equal(resolveNotificationNavigation({ linkUrl: 'https://evil.example/phish' }, 'Learner').allowed, false);
    assert.equal(resolveNotificationNavigation({ linkUrl: '//evil.example/phish' }, 'Learner').allowed, false);
    assert.equal(resolveNotificationNavigation({ linkUrl: 'javascript:alert(1)' }, 'Learner').allowed, false);
  });

  it('deduplicates concurrent SignalR events and resolves selective domain invalidation keys', () => {
    const dedupe = createNotificationDeduper();
    const n1 = normalizeRealtimeNotification({ Id: 99, Title: 'Đề xuất mới', Message: 'N4', Type: 'MentorSchedule' });
    const n1Dup = normalizeRealtimeNotification({ id: 99, title: 'Đề xuất mới', message: 'N4', type: 'MentorSchedule' });
    assert.equal(dedupe(n1, 1000), true);
    assert.equal(dedupe(n1Dup, 1500), false);

    const scheduleKeys = resolveInvalidationKeysForNotification({
      type: 'MentorSchedule',
      linkUrl: '/admin/mentor-schedules/?proposalId=42',
    });
    assert.ok(scheduleKeys.some((k) => k[0] === 'admin-teaching-proposals'));
    assert.ok(scheduleKeys.some((k) => k[0] === 'mentor-teaching-proposals-context'));
    assert.ok(scheduleKeys.some((k) => k[0] === 'workspace-calendar'));

    const contentKeys = resolveInvalidationKeysForNotification({
      type: 'CONTENT_APPROVAL_PENDING',
      linkUrl: '/admin/content-review',
    });
    assert.ok(contentKeys.some((k) => k[0] === 'content-approvals'));
  });

  it('enforces Notification Center UI, shared clock, dead-code removal, and design-system contracts', () => {
    const centerSrc = readSrc('src/features/notifications/components/NotificationCenter.jsx');
    const hookSrc = readSrc('src/features/notifications/hooks/useNotification.js');
    const scheduleCardSrc = readSrc('src/features/scheduling/components/ProposalDetailedScheduleCard.jsx');

    assert.ok(centerSrc.includes('useRelativeClock'), 'NotificationCenter must use shared adaptive clock hook');
    assert.ok(centerSrc.includes('formatRelativeTime') && centerSrc.includes('formatNotificationDateTime'), 'NotificationCenter must render relative + 12-hour AM/PM absolute time');
    assert.ok(centerSrc.includes('Tất cả') && centerSrc.includes('Chưa đọc') && centerSrc.includes('Cần xử lý'));
    assert.ok(centerSrc.includes('<Drawer') && centerSrc.includes('<Popover'), 'NotificationCenter must support mobile Drawer + desktop Popover');
    assert.ok(centerSrc.includes("navigate('/profile/?tab=notifications')"), 'Settings icon must navigate to canonical /profile/?tab=notifications route');
    assert.ok(!centerSrc.includes('/account-profile'), 'Must never link to non-existent /account-profile route');
    assert.ok(!centerSrc.includes('Sparkles'), 'Must not use Sparkles icon');
    assert.ok(!centerSrc.includes('hover:underline'), 'Must not use hover:underline');
    assert.ok(!centerSrc.includes('setInterval'), 'Must never create per-row intervals');

    assert.ok(!hookSrc.includes('useMarkAllNotificationsAsRead'), 'Duplicate useMarkAllNotificationsAsRead hook must be removed');
    assert.ok(hookSrc.includes('BroadcastChannel'), 'Multi-tab notification sync must be wired');
    assert.ok(hookSrc.includes('visibilitychange'), 'Background-to-foreground reconciliation must be wired');
    assert.ok(hookSrc.includes('ownerKey'), 'SignalR connection must tear down and reset on logout / account switch');

    // Detailed 10-week schedule layout: responsive auto-fit grid, 24h formatTimeRange, no whitespace-nowrap overlap
    assert.ok(scheduleCardSrc.includes('formatTimeRange'), 'Detailed 10-week schedule must use canonical 24h formatTimeRange');
    assert.ok(scheduleCardSrc.includes('auto-fit') && scheduleCardSrc.includes('minmax'), 'Detailed 10-week schedule must use container-responsive CSS Grid');
    assert.ok(!scheduleCardSrc.includes('whitespace-nowrap'), 'Detailed 10-week schedule cards must not force whitespace-nowrap overflow');
    assert.ok(scheduleCardSrc.includes('overflow-x-hidden'), 'Expanded schedule container must never produce horizontal scrollbars');
  });
});
