import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { __testing, confirmAction, dismissToast, getToasts, notify, pushToast, setConfirmHandler } from '@/components/ui/feedbackStore.js';
import { postLoginDestination, safeInternalPath } from '@/utils/safeRedirect.js';
import { REDIRECTS, ROUTES, canAccessPath, homeForRole, matchRoute } from '@/app/routes/routeTable.js';
import { createNotificationDeduper, normalizeRealtimeNotification, notificationDestination } from '@/features/notifications/utils/notificationDedupe.js';
import { isSessionExpiry, newCorrelationId } from '@/api/client.js';
import { errorStateKind, formatBytes, monthGrid, validateUploadFile, MAX_UPLOAD_BYTES } from '@/components/ui/logic.js';
import { sceneForHour } from '@/assets/illustrations/scenes.js';

describe('feedback store (toast / confirm)', () => {
  beforeEach(() => __testing.reset());

  it('dedupes identical toasts within the window (re-render, StrictMode, reconnect)', () => {
    const now = 1_000_000;
    assert.ok(pushToast({ tone: 'info', title: 'Có bài tập mới', key: 'notif|42', now }));
    assert.equal(pushToast({ tone: 'info', title: 'Có bài tập mới', key: 'notif|42', now: now + 500 }), null);
    assert.equal(getToasts().length, 1);
    assert.ok(pushToast({ tone: 'info', title: 'Có bài tập mới', key: 'notif|43', now: now + 600 }));
    assert.equal(getToasts().length, 2);
  });

  it('caps visible toasts and dismisses by id', () => {
    const ids = [1, 2, 3, 4, 5].map((i) => pushToast({ title: `T${i}`, key: `k${i}`, now: i }));
    assert.equal(getToasts().length, 4);
    dismissToast(ids[4]);
    assert.equal(getToasts().some((t) => t.id === ids[4]), false);
  });

  it('maps API errors through describeApiError without leaking technical detail', () => {
    notify.apiError({ status: 500, data: { errorMessage: 'NullReferenceException at Foo.Bar()' } });
    const [toast] = getToasts();
    assert.equal(toast.tone, 'error');
    assert.doesNotMatch(toast.message, /Exception/);
  });

  it('offline errors become warnings', () => {
    notify.apiError({ isNetwork: true });
    assert.equal(getToasts()[0].tone, 'warning');
  });

  it('confirmAction resolves false without a provider (fail safe) and true when confirmed', async () => {
    assert.equal(await confirmAction('Xóa?'), false);
    const off = setConfirmHandler(async (opts) => opts.title === 'Xóa?');
    assert.equal(await confirmAction('Xóa?'), true);
    off();
    assert.equal(await confirmAction('Xóa?'), false);
  });
});

describe('safe redirects (no open redirect)', () => {
  it('accepts only app-relative paths', () => {
    assert.equal(safeInternalPath('/my-courses/?tab=x'), '/my-courses/?tab=x');
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', '/javascript:alert(1)', 'evil', '', null, '/auth/', '/register']) {
      assert.equal(safeInternalPath(bad), '', String(bad));
    }
  });

  it('falls back to the role home when the target is outside the role', () => {
    const learnerCan = (p) => canAccessPath(p, ['Learner']);
    assert.equal(postLoginDestination('/admin/users/', '/app', learnerCan), '/app');
    assert.equal(postLoginDestination('/my-courses/', '/app', learnerCan), '/my-courses/');
    assert.equal(postLoginDestination('https://evil.com', '/app', learnerCan), '/app');
  });
});

describe('route table and role access', () => {
  it('maps roles to their homes', () => {
    assert.equal(homeForRole('Admin'), '/admin/dashboard');
    assert.equal(homeForRole('contentauthor'), '/cms-studio');
    assert.equal(homeForRole('Mentor'), '/mentor-overview');
    assert.equal(homeForRole('Learner'), '/app');
    assert.equal(homeForRole(undefined), '/app');
  });

  it('cross-role direct URLs are denied', () => {
    assert.equal(canAccessPath('/admin/users', ['Learner']), false);
    assert.equal(canAccessPath('/cms-studio', ['Mentor']), false);
    assert.equal(canAccessPath('/mentor-homework', ['Learner']), false);
    assert.equal(canAccessPath('/my-courses', ['Mentor']), false);
    assert.equal(canAccessPath('/cms-studio', ['Admin']), true);
    assert.equal(canAccessPath('/mentors/12/', ['Learner']), true);
    assert.equal(canAccessPath('/', []), true);
    assert.equal(canAccessPath('/no-such-page', ['Admin']), false);
  });

  it('has no duplicate paths and no route doubling as a redirect', () => {
    const paths = ROUTES.map((r) => r.path);
    assert.equal(new Set(paths).size, paths.length);
    for (const [from] of REDIRECTS) assert.equal(matchRoute(from), null, from);
  });

  it('retired 1-1 booking, consultation package and payout URLs only redirect', () => {
    const retired = ['/booking-schedule', '/consultation-payment', '/payments/history', '/consultation-receipt', '/admin/mentor-plans', '/admin/operations', '/mentor-compensation', '/admin/mentor-compensation'];
    const redirectFrom = new Set(REDIRECTS.map(([f]) => f));
    for (const path of retired) {
      assert.equal(matchRoute(path), null, path);
      assert.ok(redirectFrom.has(path), path);
    }
  });

  it('every page key has a lazy import in App.jsx', () => {
    const app = readFileSync(new URL('../src/app/App.jsx', import.meta.url), 'utf8');
    for (const route of ROUTES) assert.match(app, new RegExp(`\\b${route.page}: (lazy|named|page)\\(`), route.page);
  });
});

describe('notification realtime dedupe', () => {
  it('normalises both Backend payload shapes', () => {
    assert.deepEqual(normalizeRealtimeNotification({ Id: 5, Title: 'A', Message: 'm', LinkUrl: '/x', Type: 'T' }).id, 5);
    assert.equal(normalizeRealtimeNotification({ title: '' }), null);
    assert.equal(normalizeRealtimeNotification(3), null);
  });

  it('surfaces each notification once across ReceiveNotification + NotificationReceived + reconnect', () => {
    const should = createNotificationDeduper();
    const n = { id: 9, title: 'Bài tập mới', message: '' };
    assert.equal(should(n), true);
    assert.equal(should({ ...n }), false);
    const anon = { id: null, title: 'Lịch học thay đổi', message: 'Buổi 3' };
    assert.equal(should(anon, 60_000 * 10), true);
    assert.equal(should({ ...anon }, 60_000 * 10 + 30_000), false);
  });

  it('only follows internal notification links', () => {
    assert.equal(notificationDestination('/homework/'), '/homework/');
    assert.equal(notificationDestination('https://evil.com'), '');
    assert.equal(notificationDestination('//evil.com'), '');
  });
});

describe('API client session semantics', () => {
  const authed = { url: '/study-courses/cohorts', headers: { Authorization: 'Bearer x' } };
  it('401 on an authenticated request is a session expiry', () => {
    assert.equal(isSessionExpiry(401, authed), true);
  });
  it('403 is never a session expiry', () => {
    assert.equal(isSessionExpiry(403, authed), false);
  });
  it('401 from the login endpoint (wrong password) is not an expiry', () => {
    assert.equal(isSessionExpiry(401, { url: '/Auth/login', headers: { Authorization: 'Bearer x' } }), false);
    assert.equal(isSessionExpiry(401, { url: '/x', headers: {} }), false);
  });
  it('generates correlation ids', () => {
    const a = newCorrelationId();
    assert.ok(a.length >= 16);
    assert.notEqual(a, newCorrelationId());
  });
});

describe('UI logic helpers', () => {
  it('classifies error states (403 is forbidden, not expired)', () => {
    assert.equal(errorStateKind({ status: 403 }), 'forbidden');
    assert.equal(errorStateKind({ status: 401 }), 'expired');
    assert.equal(errorStateKind({ status: 404 }), 'notFound');
    assert.equal(errorStateKind({ status: 409, errorCode: 'HOMEWORK_SUBMISSION_CHANGED' }), 'conflict');
    assert.equal(errorStateKind({ isNetwork: true }), 'offline');
    assert.equal(errorStateKind({ status: 500 }), 'error');
  });

  it('validates uploads against the 10 MB limit and accepted types', () => {
    assert.equal(MAX_UPLOAD_BYTES, 10 * 1024 * 1024);
    assert.match(validateUploadFile({ name: 'a.pdf', size: MAX_UPLOAD_BYTES + 1, type: 'application/pdf' }), /10\.0 MB/);
    assert.equal(validateUploadFile({ name: 'a.pdf', size: 100, type: 'application/pdf' }, { accept: ['.pdf', 'image/*'] }), '');
    assert.equal(validateUploadFile({ name: 'a.png', size: 100, type: 'image/png' }, { accept: ['.pdf', 'image/*'] }), '');
    assert.match(validateUploadFile({ name: 'a.exe', size: 100, type: 'application/x-msdownload' }, { accept: ['.pdf', 'image/*'] }), /chưa được hỗ trợ/);
    assert.match(validateUploadFile({ name: 'e.pdf', size: 0, type: 'application/pdf' }), /trống/);
    assert.equal(formatBytes(2048), '2 KB');
  });

  it('builds a Monday-first 6-week month grid', () => {
    const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
    assert.equal(grid.length, 42);
    assert.equal(grid[0].getDay(), 1);
    assert.ok(grid.some((d) => d.getMonth() === 10 && d.getDate() === 1));
  });

  it('picks the landscape scene by local hour', () => {
    assert.equal(sceneForHour(6), 'dawn');
    assert.equal(sceneForHour(12), 'day');
    assert.equal(sceneForHour(18), 'dusk');
    assert.equal(sceneForHour(23), 'night');
  });
});

describe('cohort seat hold countdown', async () => {
  const { formatCountdown, holdSecondsLeft } = await import('@/features/checkout/utils/hold.js');
  it('uses only the server expiry (UTC, with or without suffix)', () => {
    const now = Date.parse('2026-11-18T10:00:00Z');
    assert.equal(holdSecondsLeft('2026-11-18T10:10:00Z', now), 600);
    assert.equal(holdSecondsLeft('2026-11-18T10:10:00', now), 600);
    assert.equal(holdSecondsLeft('2026-11-18T09:59:00Z', now), 0);
    assert.equal(holdSecondsLeft(null, now), null);
  });
  it('formats mm:ss', () => {
    assert.equal(formatCountdown(600), '10:00');
    assert.equal(formatCountdown(65), '01:05');
  });
});
