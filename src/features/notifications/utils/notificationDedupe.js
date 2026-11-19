// Pure helpers for realtime notifications (unit-tested in node).

/** Normalises the two Backend payload shapes (NotificationReceived DTO / ReceiveNotification anon object). */
export function normalizeRealtimeNotification(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const pick = (a, b) => raw[a] ?? raw[b];
  const title = pick('title', 'Title');
  if (!title) return null;
  return {
    id: pick('id', 'Id') ?? pick('notificationId', 'NotificationId') ?? null,
    title: String(title),
    message: String(pick('message', 'Message') || ''),
    linkUrl: String(pick('linkUrl', 'LinkUrl') || ''),
    type: String(pick('type', 'Type') || ''),
    createdAt: pick('createdAt', 'CreatedAt') || null,
  };
}

/**
 * Remembers which notifications were already surfaced. Keyed by id when the
 * server sends one, otherwise by title+message+minute so that the duplicate
 * `ReceiveNotification` + `NotificationReceived` pair and reconnect replays
 * produce one toast.
 */
export function createNotificationDeduper(limit = 300) {
  const seen = new Map();
  return function shouldSurface(notification, now = Date.now()) {
    if (!notification) return false;
    const minute = Math.floor(now / 60000);
    const key = notification.id != null
      ? `id:${notification.id}`
      : `tm:${notification.title}|${notification.message}|${minute}`;
    if (seen.has(key)) return false;
    seen.set(key, now);
    if (notification.id == null) {
      // Also guard the adjacent minute boundary.
      seen.set(`tm:${notification.title}|${notification.message}|${minute + 1}`, now);
    }
    if (seen.size > limit) {
      const oldest = seen.keys().next().value;
      seen.delete(oldest);
    }
    return true;
  };
}

/** Only app-relative links from notifications are followed (no open redirect). */
export function notificationDestination(url) {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return '';
  const [rawPath, rawQuery] = url.split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const suffix = rawQuery ? `?${rawQuery}` : '';

  if (path === '/mentor-availability' || path === '/mentor/availability') return `/work-schedule/${suffix}`;
  if (path === '/mentor/schedule') return `/work-schedule/${suffix}`;
  if (path === '/mentor/profile') return `/mentor-profile/${suffix}`;
  if (path === '/mentor/reviews') return `/mentor-reviews/${suffix}`;
  if (path === '/mentor/disputes' || path === '/mentor/complaints') return `/mentor-disputes/${suffix}`;
  if (path === '/mentor/cohorts') return `/mentor-study-courses/${suffix}`;

  const cohortMatch = path.match(/^\/mentor\/cohorts\/(\d+)$/);
  if (cohortMatch) return `/mentor-study-courses/${cohortMatch[1]}/${suffix}`;

  const complaintMatch = path.match(/^\/mentor\/complaints\/(\d+)$/);
  if (complaintMatch) {
    const params = new URLSearchParams(rawQuery || '');
    params.set('complaintId', complaintMatch[1]);
    return `/mentor-disputes/?${params.toString()}`;
  }

  return url;
}
