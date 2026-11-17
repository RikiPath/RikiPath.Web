import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLocale } from '../../i18n/locale.js';
import {
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
  useNotificationSignalR,
  useNotificationsQuery,
  useUnreadCountQuery,
} from '../../hooks/useNotification.js';

function itemsOf(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function destination(url) {
  if (typeof url !== 'string' || !url.startsWith('/')) return '';
  const path = url.split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/mentor-availability') return '/work-schedule/';
  return url;
}

function countOf(data) {
  if (typeof data === 'number') return data;
  return data?.count ?? data?.unreadCount ?? 0;
}

function when(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.15a1.1 1.1 0 0 0-1.07.84A5.2 5.2 0 0 0 6.35 9.05v2.6c0 .7-.21 1.38-.62 1.95l-.58.8a.85.85 0 0 0 .68 1.35h12.34a.85.85 0 0 0 .68-1.35l-.58-.8a3.35 3.35 0 0 1-.62-1.95v-2.6a5.2 5.2 0 0 0-4.58-5.06A1.1 1.1 0 0 0 12 3.15Zm-1.65 13.5a1.65 1.65 0 0 0 3.3 0h-3.3Z"
      />
    </svg>
  );
}

export default function NotificationBell() {
  const { tr } = useLocale();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useNotificationSignalR();
  const list = useNotificationsQuery();
  const unread = useUnreadCountQuery();
  const markOne = useMarkAsReadMutation();
  const markAll = useMarkAllAsReadMutation();

  const items = itemsOf(list.data);
  const unreadCount = countOf(unread.data);

  useEffect(() => {
    const onIncoming = (event) => {
      const next = event.detail;
      if (!next?.title) return;
      setToast(next);
    };
    window.addEventListener('rikipath:notification', onIncoming);
    return () => window.removeEventListener('rikipath:notification', onIncoming);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  function openItem(item) {
    if (item?.id && item.isRead === false) markOne.mutate(item.id);
    setOpen(false);
    setToast(null);
    const url = destination(item?.linkUrl);
    if (url) navigate(url);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unreadCount > 0 ? `${tr('Thông báo')}, ${unreadCount}` : tr('Thông báo')}
        onClick={() => setOpen((current) => !current)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 ${open ? 'bg-[#982B4B]' : 'bg-[#AD3155] hover:bg-[#982B4B]'}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[9px] font-medium leading-none text-[#AD3155] ring-1 ring-[#AD3155]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {toast && !open && (
        <button
          type="button"
          role="status"
          onClick={() => openItem(toast)}
          className="absolute right-0 top-[calc(100%+12px)] z-50 w-[260px] rounded-xl border border-[#EEDCE5] bg-white px-4 py-3 text-left shadow-[0_12px_32px_rgba(75,42,55,0.10)]"
        >
          <span className="block truncate text-[13px] font-medium text-[#3F3038]">{toast.title}</span>
          {toast.message && <span className="mt-1 block text-[12px] leading-5 text-[#826A76]">{toast.message}</span>}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={tr('Thông báo')}
          className="absolute right-0 top-[calc(100%+12px)] z-50 w-[280px] overflow-hidden rounded-xl border border-[#EEDCE5] bg-white shadow-[0_12px_32px_rgba(75,42,55,0.10)]"
        >
          <div className="flex items-center justify-between border-b border-[#F1E8ED] bg-[#FFF7FA] px-4 py-3">
            <p className="text-[13px] font-medium text-[#3F3038]">{tr('Thông báo')}</p>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markAll.isPending}
                onClick={() => markAll.mutate()}
                className="text-[12px] text-[#AD3155] hover:text-[#982B4B] disabled:opacity-50"
              >
                {tr('Đọc hết')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {list.isLoading && <p className="px-4 py-6 text-[12px] text-[#AA8F9B]">{tr('Đang tải...')}</p>}
            {list.isError && <p className="px-4 py-6 text-[12px] text-[#A33357]">{list.error.message}</p>}
            {!list.isLoading && !list.isError && items.length === 0 && (
              <p className="px-4 py-6 text-[12px] text-[#AA8F9B]">{tr('Chưa có thông báo')}</p>
            )}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openItem(item)}
                className="block w-full px-4 py-2.5 text-left hover:bg-[#FFF1F6]"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className={`text-[12px] leading-5 ${item.isRead ? 'text-[#826A76]' : 'font-medium text-[#3F3038]'}`}>{item.title}</span>
                  {!item.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#AD3155]" />}
                </span>
                {item.message && <span className="mt-0.5 block text-[12px] leading-5 text-[#826A76]">{item.message}</span>}
                <span className="mt-1 block text-[10px] text-[#AA8F9B]">{when(item.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
