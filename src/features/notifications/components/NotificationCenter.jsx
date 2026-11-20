import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useLocale, currentIntlTag } from '@/locales/locale.js';
import {
  NOTIFICATION_EVENT,
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
  useNotificationSignalR,
  useNotificationsQuery,
  useUnreadCountQuery,
} from '@/features/notifications/hooks/useNotification.js';
import { notificationDestination } from '@/features/notifications/utils/notificationDedupe.js';
import { EmptyState, ErrorState, HeaderIconBadge, IconButton, Popover, SakuraLoader, cx, notify } from '@/components/ui';

/**
 * Notification Center: bell + popover list wired to /api/Notification, realtime via the
 * shared SignalR connection, one deduplicated toast per new notification.
 */
function itemsOf(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function countOf(data) {
  if (typeof data === 'number') return data;
  return data?.count ?? data?.unreadCount ?? 0;
}

function when(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(currentIntlTag(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { tr } = useLocale();
  useNotificationSignalR();
  const [open, setOpen] = useState(false);
  const list = useNotificationsQuery(undefined, { enabled: open });
  const unread = useUnreadCountQuery();
  const markOne = useMarkAsReadMutation();
  const markAll = useMarkAllAsReadMutation();
  const unreadCount = countOf(unread.data);
  const items = itemsOf(list.data);

  // Realtime → one toast per notification (deduped in the hook + toast store).
  useEffect(() => {
    const onIncoming = (event) => {
      const n = event.detail;
      if (!n?.title) return;
      const url = notificationDestination(n.linkUrl);
      notify.info(n.title, n.message, {
        key: `notif|${n.id ?? `${n.title}|${n.message}`}`,
        action: url ? { label: tr('Xem'), onClick: () => navigate(url) } : undefined,
      });
    };
    window.addEventListener(NOTIFICATION_EVENT, onIncoming);
    return () => window.removeEventListener(NOTIFICATION_EVENT, onIncoming);
  }, [navigate, tr]);

  function openItem(item, close) {
    if (item?.id && item.isRead === false) markOne.mutate(item.id);
    close();
    const url = notificationDestination(item?.linkUrl);
    if (url) navigate(url);
  }

  return (
    <Popover
      label={tr('Thông báo')}
      panelClassName="max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-[calc(var(--spacing-rp-topbar)+6px)] sm:w-[348px]"
      onOpenChange={setOpen}
      trigger={({ toggle, props }) => {
        return (
          <IconButton
            {...props}
            icon={Bell}
            label={unreadCount > 0 ? `${tr('Thông báo')}: ${unreadCount} ${tr('chưa đọc')}` : tr('Thông báo')}
            onClick={toggle}
            variant="outline"
            className="rp-bell-trigger shadow-rp-xs"
            badge={
              unreadCount > 0 && (
                <HeaderIconBadge pulse>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </HeaderIconBadge>
              )
            }
          />
        );
      }}
    >
      {({ close }) => (
        <div>
          <div className="flex items-center justify-between border-b border-rp-line px-3.5 py-2.5">
            <p className="text-sm font-bold text-rp-text">{tr('Thông báo')}</p>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markAll.isPending}
                onClick={() => markAll.mutate(undefined, { onError: (e) => notify.apiError(e, tr('Chưa đánh dấu được')) })}
                className="rp-focus inline-flex items-center gap-1 rounded text-xs font-semibold rp-link disabled:opacity-50"
              >
                <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" /> {tr('Đánh dấu đã đọc')}
              </button>
            )}
          </div>
          <div className="max-h-[min(420px,60vh)] overflow-y-auto">
            {list.isLoading && (
              <SakuraLoader
                variant="section"
                size={28}
                context="data"
                label={tr('Đang tải thông báo')}
                delay={160}
                className="p-4"
              />
            )}
            {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isFetching} compact />}
            {!list.isLoading && !list.isError && items.length === 0 && (
              <EmptyState compact icon={Bell} title={tr('Chưa có thông báo')} description={tr('Thông báo về lớp học, bài tập và lịch dạy sẽ xuất hiện tại đây.')} />
            )}
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item, close)}
                    className="rp-focus flex w-full items-start gap-2.5 border-b border-rp-line px-3.5 py-2.5 text-left last:border-0 hover:bg-rp-bg-2"
                  >
                    <span aria-hidden="true" className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', item.isRead ? 'bg-transparent' : 'bg-rp-brand')} />
                    <span className="min-w-0 flex-1">
                      <span className={cx('block text-[13px] leading-5', item.isRead ? 'text-rp-text-2' : 'font-semibold text-rp-text')}>
                        {tr(item.title)}
                        {!item.isRead && <span className="sr-only"> ({tr('chưa đọc')})</span>}
                      </span>
                      {item.message && <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-rp-text-muted">{tr(item.message)}</span>}
                      <span className="mt-1 block text-[11px] text-rp-text-muted">{when(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Popover>
  );
}
