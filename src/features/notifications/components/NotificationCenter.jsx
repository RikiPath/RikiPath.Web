import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Circle,
  ClipboardList,
  Info,
  Settings,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { getSession } from '@/app/auth/session.js';
import { useLocale } from '@/locales/locale.js';
import { useRelativeClock } from '@/hooks/useRelativeClock.js';
import { formatNotificationDateTime, formatRelativeTime } from '@/utils/dateTimeFormat.js';
import {
  NOTIFICATION_EVENT,
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
  useMarkAsUnreadMutation,
  useNotificationConnectionStatus,
  useNotificationSignalR,
  useNotificationsQuery,
  useUnreadCountQuery,
} from '@/features/notifications/hooks/useNotification.js';
import {
  classifyNotification,
  isNotificationActionable,
  isSelfActionEchoNotification,
  resolveNotificationNavigation,
} from '@/features/notifications/utils/notificationModel.js';
import { normalizeLegacyNotificationItem } from '@/features/notifications/utils/normalizeLegacyNotification.js';
import {
  Button,
  CountBadge,
  Drawer,
  EmptyState,
  ErrorState,
  IconButton,
  Popover,
  SakuraLoader,
  cx,
  notify,
} from '@/components/ui';

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'actionable', label: 'Cần xử lý' },
];

const INITIAL_PAGE_SIZE = 20;
const PAGE_STEP = 20;
const MAX_PAGE_SIZE = 100;

function itemsOf(data) {
  const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
  return list.map(normalizeLegacyNotificationItem);
}

function totalOf(data, fallback) {
  if (typeof data?.totalCount === 'number') return data.totalCount;
  return fallback;
}

function countOf(data) {
  if (typeof data === 'number') return data;
  return data?.count ?? data?.unreadCount ?? 0;
}

function useIsMobileViewport() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width: 639px)').matches),
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 639px)');
    if (!mq) return undefined;
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

function CategoryGlyph({ iconName }) {
  if (iconName === 'check-circle') return <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />;
  if (iconName === 'x-circle') return <XCircle aria-hidden="true" className="h-4 w-4 shrink-0" />;
  if (iconName === 'alert-triangle') return <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />;
  if (iconName === 'clipboard-list') return <ClipboardList aria-hidden="true" className="h-4 w-4 shrink-0" />;
  return <Info aria-hidden="true" className="h-4 w-4 shrink-0" />;
}

/**
 * Global Notification Center:
 * - Desktop Popover + Mobile Drawer
 * - Sticky header with unread counter, Mark All Read, offline status & settings link
 * - 3 semantic filters: Tất cả / Chưa đọc / Cần xử lý
 * - Shared adaptive clock updating live relative time + canonical `hh:mm AM/PM - dd/MM/yyyy`
 * - Centralized Smart Notification Navigation with role guard & stale-target fallback
 */
export default function NotificationCenter() {
  const navigate = useNavigate();
  const { tr, trf, locale } = useLocale();
  const isMobile = useIsMobileViewport();
  const session = getSession();
  const currentRole = session?.role || null;

  useNotificationSignalR();
  const connectionStatus = useNotificationConnectionStatus();

  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const queryParams = useMemo(
    () => ({ page: 1, pageSize, onlyUnread: filter === 'unread' }),
    [filter, pageSize],
  );

  const list = useNotificationsQuery(queryParams, { enabled: open });
  const unread = useUnreadCountQuery();
  const markOne = useMarkAsReadMutation();
  const markUnread = useMarkAsUnreadMutation();
  const markAll = useMarkAllAsReadMutation();

  const unreadCount = countOf(unread.data);
  const rawItems = useMemo(() => itemsOf(list.data), [list.data]);
  const totalCount = totalOf(list.data, rawItems.length);

  const visibleItems = useMemo(() => {
    if (filter === 'unread') return rawItems.filter((item) => !item.isRead);
    if (filter === 'actionable') return rawItems.filter((item) => isNotificationActionable(item));
    return rawItems;
  }, [filter, rawItems]);

  const actionableCount = useMemo(
    () => rawItems.filter((item) => isNotificationActionable(item)).length,
    [rawItems],
  );

  const timestamps = useMemo(() => visibleItems.map((i) => i.createdAt), [visibleItems]);
  const nowMs = useRelativeClock(timestamps, open);

  // Realtime → semantic deduplicated toast (suppresses self-action echo toasts).
  useEffect(() => {
    const onIncoming = (event) => {
      const n = normalizeLegacyNotificationItem(event.detail);
      if (!n?.title) return;
      if (isSelfActionEchoNotification(n)) return;

      const meta = classifyNotification(n);
      const nav = resolveNotificationNavigation(n, getSession()?.role || null);
      const toneFn = notify[meta.toastTone] || notify.info;

      toneFn(tr(n.title), tr(n.message || ''), {
        key: `notif|${n.id ?? `${n.title}|${n.message}`}`,
        action: nav.allowed && nav.url ? { label: tr('Xem'), onClick: () => navigate(nav.url) } : undefined,
      });
    };
    window.addEventListener(NOTIFICATION_EVENT, onIncoming);
    return () => window.removeEventListener(NOTIFICATION_EVENT, onIncoming);
  }, [navigate, tr]);

  const handleOpenItem = useCallback((item, closeOverlay) => {
    if (!item) return;
    if (item.id && item.isRead === false) {
      markOne.mutate(item.id, {
        onError: (e) => notify.apiError(e, tr('Chưa cập nhật được trạng thái đã đọc')),
      });
    }

    const nav = resolveNotificationNavigation(item, currentRole);
    closeOverlay?.();

    if (nav.allowed && nav.url) {
      navigate(nav.url);
      return;
    }

    if (item.linkUrl) {
      notify.info(
        tr('Thông tin này không còn khả dụng hoặc đã được cập nhật.'),
        nav.reason ? tr(nav.reason) : '',
        {
          key: `notif-nav-fallback-${item.id || 'x'}`,
          replace: true,
          action: nav.fallbackUrl ? { label: tr('Về trang chính'), onClick: () => navigate(nav.fallbackUrl) } : undefined,
        },
      );
    }
  }, [currentRole, markOne, navigate, tr]);

  const handleToggleRead = useCallback((e, item) => {
    e.stopPropagation();
    if (!item?.id) return;
    if (item.isRead) {
      markUnread.mutate(item.id, {
        onError: (err) => notify.apiError(err, tr('Chưa đánh dấu chưa đọc được')),
      });
    } else {
      markOne.mutate(item.id, {
        onError: (err) => notify.apiError(err, tr('Chưa đánh dấu đã đọc được')),
      });
    }
  }, [markOne, markUnread, tr]);

  const handleToggleExpand = useCallback((e, id) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const hasMore = rawItems.length < totalCount && pageSize < MAX_PAGE_SIZE;

  const renderPanelContent = (closeOverlay) => (
    <div className="flex max-h-[min(540px,76vh)] flex-col bg-[var(--rp-popup-bg)] text-rp-text">
      {/* Sticky Header */}
      <div className="shrink-0 border-b border-[var(--rp-popup-divider)] bg-[var(--rp-popup-header-bg)] px-4 pt-3 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="m-0 text-sm font-bold text-rp-text">{tr('Thông báo')}</h2>
            {connectionStatus === 'offline' && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800"
                title={tr('Đang ngoại tuyến — sẽ tự động đồng bộ khi có mạng')}
              >
                <WifiOff aria-hidden="true" className="h-3 w-3" />
                <span>{tr('Ngoại tuyến')}</span>
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markAll.isPending}
                onClick={() =>
                  markAll.mutate(undefined, {
                    onSuccess: () => notify.success(tr('Đã đánh dấu đọc tất cả thông báo.'), '', { key: 'notif-mark-all-ok', replace: true }),
                    onError: (e) => notify.apiError(e, tr('Chưa đánh dấu được')),
                  })
                }
                className="rp-focus rp-link inline-flex items-center gap-1 rounded text-xs font-semibold text-rp-brand-strong disabled:opacity-50"
              >
                <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" />
                <span>{tr('Đọc tất cả')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                closeOverlay?.();
                navigate('/profile/?tab=notifications');
              }}
              aria-label={tr('Cài đặt thông báo')}
              title={tr('Cài đặt thông báo')}
              className="rp-focus inline-flex h-7 w-7 items-center justify-center rounded-lg text-rp-text-muted transition-colors hover:bg-rp-bg-2 hover:text-rp-text"
            >
              <Settings aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Filters: Tất cả / Chưa đọc / Cần xử lý */}
        <div
          role="tablist"
          aria-label={tr('Lọc thông báo')}
          className="mt-2.5 flex items-center gap-1.5"
        >
          {FILTERS.map((tab) => {
            const active = filter === tab.id;
            const badgeNum = tab.id === 'unread' ? unreadCount : tab.id === 'actionable' ? actionableCount : null;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={cx(
                  'rp-focus inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
                  active
                    ? 'border-[#F2CCD7] bg-[#FFF5F7] text-[#B53D5C]'
                    : 'border-transparent bg-transparent text-rp-text-muted hover:bg-rp-bg-2 hover:text-rp-text',
                )}
              >
                <span>{tr(tab.label)}</span>
                {badgeNum != null && (
                  <CountBadge count={badgeNum} size="sm" max={99} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.isLoading && rawItems.length === 0 && (
          <SakuraLoader
            variant="section"
            size={28}
            context="data"
            label={tr('Đang tải thông báo')}
            delay={160}
            className="p-6"
          />
        )}

        {list.isError && rawItems.length === 0 && (
          <div className="p-3">
            <ErrorState
              error={list.error}
              onRetry={() => list.refetch()}
              retrying={list.isFetching}
              compact
            />
          </div>
        )}

        {!list.isLoading && !list.isError && visibleItems.length === 0 && (
          <div className="p-4">
            <EmptyState
              variant="compact"
              illustration="bell"
              title={
                filter === 'unread'
                  ? tr('Không có thông báo chưa đọc')
                  : filter === 'actionable'
                    ? tr('Không có mục cần xử lý')
                    : tr('Chưa có thông báo')
              }
              description={
                filter === 'all'
                  ? tr('Thông báo về lớp học, bài tập và lịch dạy sẽ xuất hiện tại đây.')
                  : tr('Tất cả thông báo thuộc mục này đã được xử lý hoặc đọc xong.')
              }
            />
          </div>
        )}

        {visibleItems.length > 0 && (
          <ul className="m-0 list-none divide-y divide-rp-line/80 p-0">
            {visibleItems.map((item) => {
              const meta = classifyNotification(item);
              const nav = resolveNotificationNavigation(item, currentRole);
              const isClickable = Boolean(nav.allowed && nav.url) || Boolean(item.linkUrl);
              const relTime = formatRelativeTime(item.createdAt, nowMs, locale);
              const absTime = formatNotificationDateTime(item.createdAt);
              const msgText = item.message ? tr(item.message) : '';
              const isLongMessage = msgText.length > 130 || msgText.includes('\n');
              const isExpanded = expandedIds.has(item.id);

              return (
                <li
                  key={item.id ?? `${item.title}-${item.createdAt}`}
                  className={cx(
                    'group relative transition-colors',
                    item.isRead ? 'bg-white hover:bg-[#FAF8F9]' : (meta.unreadBgClass || 'bg-[#FFF8FA] hover:bg-[#FFF2F6]'),
                  )}
                >
                  <div
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onClick={isClickable ? () => handleOpenItem(item, closeOverlay) : undefined}
                    onKeyDown={
                      isClickable
                        ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenItem(item, closeOverlay);
                          }
                        }
                        : undefined
                    }
                    className={cx(
                      'rp-focus flex w-full items-start gap-3 px-4 py-3 text-left',
                      isClickable && 'cursor-pointer',
                    )}
                  >
                    {/* Semantic Category Icon */}
                    <span
                      aria-hidden="true"
                      className={cx(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                        meta.iconBoxClass,
                      )}
                    >
                      <CategoryGlyph iconName={meta.iconName} />
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cx(
                            'm-0 text-[13px] leading-5 [overflow-wrap:break-word]',
                            item.isRead ? 'font-medium text-rp-text' : 'font-bold text-rp-text',
                          )}
                        >
                          {tr(item.title)}
                          {!item.isRead && <span className="sr-only"> ({tr('chưa đọc')})</span>}
                        </p>

                        {/* Unread Indicator / Read-Unread Toggle */}
                        <div className="flex shrink-0 items-center gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={(e) => handleToggleRead(e, item)}
                            title={item.isRead ? tr('Đánh dấu chưa đọc') : tr('Đánh dấu đã đọc')}
                            aria-label={item.isRead ? tr('Đánh dấu chưa đọc') : tr('Đánh dấu đã đọc')}
                            className="rp-focus flex h-6 w-6 items-center justify-center rounded-full text-rp-text-muted transition-colors hover:bg-white hover:text-rp-brand-strong"
                          >
                            {item.isRead ? (
                              <Circle aria-hidden="true" className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-70" />
                            ) : (
                              <span className={cx('h-2 w-2 rounded-full', meta.dotClass || 'bg-rp-brand')} aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      {msgText && (
                        <div className="mt-0.5">
                          <p
                            className={cx(
                              'm-0 whitespace-pre-line text-xs leading-[18px] text-rp-text-2 [overflow-wrap:break-word]',
                              !isExpanded && isLongMessage && 'line-clamp-2',
                            )}
                          >
                            {msgText}
                          </p>
                          {isLongMessage && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleExpand(e, item.id)}
                              className="rp-focus rp-link mt-0.5 text-[11px] font-semibold text-rp-brand-strong"
                            >
                              {isExpanded ? tr('Thu gọn') : tr('Xem đầy đủ')}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Live Relative + Canonical Absolute Timestamp */}
                      {(relTime || absTime) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] tabular-nums text-rp-text-muted">
                          {relTime && <span className="font-medium text-rp-text-2">{relTime}</span>}
                          {relTime && absTime && <span aria-hidden="true">·</span>}
                          {absTime && <span>{absTime}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer: Load more when more notifications exist */}
      {hasMore && (
        <div className="shrink-0 border-t border-rp-line bg-[#FAF8F9] px-4 py-2 text-center">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            loading={list.isFetching}
            onClick={() => setPageSize((cur) => Math.min(MAX_PAGE_SIZE, cur + PAGE_STEP))}
            className="w-full text-xs font-semibold text-rp-brand-strong hover:bg-[#FFF5F7]"
          >
            {trf('Xem thêm thông báo ({0}/{1})', { 0: rawItems.length, 1: totalCount })}
          </Button>
        </div>
      )}
    </div>
  );

  const bellTrigger = (toggle, props = {}) => (
    <IconButton
      {...props}
      icon={Bell}
      label={unreadCount > 0 ? `${tr('Thông báo')}: ${unreadCount} ${tr('chưa đọc')}` : tr('Thông báo')}
      onClick={toggle}
      variant="outline"
      className="rp-hc rp-bell-trigger shadow-rp-xs"
      badge={
        unreadCount > 0 && (
          <CountBadge
            count={unreadCount}
            size="xs"
            max={99}
            className="pointer-events-none absolute -right-0.5 -top-0.5"
          />
        )
      }
    />
  );

  if (isMobile) {
    return (
      <>
        {bellTrigger(() => setOpen((v) => !v), { 'aria-expanded': open, 'aria-haspopup': 'dialog' })}
        <Drawer
          open={open}
          onClose={() => setOpen(false)}
          side="bottom"
          padded={false}
          labelledBy="mobile-notification-center"
        >
          {renderPanelContent(() => setOpen(false))}
        </Drawer>
      </>
    );
  }

  return (
    <Popover
      label={tr('Thông báo')}
      align="end"
      panelClassName="w-[min(410px,calc(100vw-24px))] overflow-hidden p-0"
      onOpenChange={setOpen}
      trigger={({ toggle, props }) => bellTrigger(toggle, props)}
    >
      {({ close }) => renderPanelContent(close)}
    </Popover>
  );
}
