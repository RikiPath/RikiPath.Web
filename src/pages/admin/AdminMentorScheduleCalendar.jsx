import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, RefreshCw, CalendarDays, Table2 } from 'lucide-react';
import { ContextualErrorState, RefreshingIndicator, SakuraLoader, StaleDataBar } from '@/components/ui';
import { getAdminMentorSchedule } from '@/features/admin/api/adminApi.js';
import SakuraCalendar from '@/features/scheduling/components/SakuraCalendar.jsx';
import {
  getViewDateRange,
  shiftDateKey,
  toVnDateKey,
  toVnTimeParts,
} from '@/features/scheduling/utils/calendarGeometry.js';
import { useLocale } from '@/locales/locale.js';

const STATES = {
  Available: ['Trống', 'bg-[#51956B]', 'open'],
  Booked: ['Đã xếp lớp', 'bg-rp-brand-strong', 'booked'],
  Held: ['Chờ thanh toán', 'bg-amber-500', 'pending'],
  HeldExpired: ['Giữ chỗ hết hạn', 'bg-[#A99AA1]', 'cancelled'],
  Draft: ['Chưa công bố', 'bg-amber-500', 'pending'],
  Ended: ['Đã kết thúc', 'bg-[#A99AA1]', 'present'],
  Cancelled: ['Đã hủy', 'bg-red-500', 'cancelled'],
  Rejected: ['Đã từ chối', 'bg-red-500', 'cancelled'],
};
const button = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rp-line bg-white px-3 text-[12px] text-rp-text-2 hover:bg-rp-brand-tint disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rp-brand-strong/40';
const asDate = value => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);
const clock = value => toVnTimeParts(value).hhmm;
const activeBookings = slot => (slot.bookings || []).filter(b => b.paymentStatus === 'Paid' && ['Assigned', 'Accepted', 'Completed'].includes(b.status));

export default function AdminMentorScheduleCalendar({ mentorId, mentorName, email, initials, onClose }) {
  const { tr, trf } = useLocale();
  const [anchorKey, setAnchorKey] = useState(() => toVnDateKey(new Date()));
  const [view, setView] = useState('week');
  const [displayMode, setDisplayMode] = useState('calendar');

  const range = useMemo(() => getViewDateRange(anchorKey, view), [anchorKey, view]);
  const from = new Date(`${range.startKey}T00:00:00+07:00`).toISOString();
  const to = new Date(`${shiftDateKey(range.endKey, 1)}T00:00:00+07:00`).toISOString();

  const query = useQuery({
    queryKey: ['admin-mentor-calendar', mentorId, from, to],
    queryFn: async () => {
      // Backend limits each query window to 31 days; chunk wider Month/Agenda views transparently.
      const startMs = new Date(from).getTime();
      const endMs = new Date(to).getTime();
      const chunkMs = 28 * 86400_000;
      if (endMs - startMs <= chunkMs) {
        return getAdminMentorSchedule(mentorId, from, to);
      }
      const chunks = [];
      for (let cursor = startMs; cursor < endMs; cursor += chunkMs) {
        const nextEnd = Math.min(cursor + chunkMs, endMs);
        chunks.push(getAdminMentorSchedule(mentorId, new Date(cursor).toISOString(), new Date(nextEnd).toISOString()));
      }
      const pages = await Promise.all(chunks);
      const byId = new Map();
      pages.flat().forEach((slot) => {
        if (slot?.id != null) byId.set(slot.id, slot);
      });
      return [...byId.values()];
    },
    enabled: Number(mentorId) > 0,
    refetchInterval: 15000,
  });

  const allSlots = useMemo(() => query.data || [], [query.data]);
  const daySlots = useMemo(
    () => allSlots.filter(s => toVnDateKey(asDate(s.startTime)) === anchorKey),
    [allSlots, anchorKey]
  );

  const events = useMemo(() => allSlots.map((slot) => {
    const [label, , tone] = STATES[slot.status] || ['Chưa xác định', 'bg-[#A99AA1]', 'open'];
    const start = toVnTimeParts(slot.startTime);
    const end = toVnTimeParts(slot.endTime);
    const paid = activeBookings(slot);
    const learnerTitle = paid.length ? paid.map(b => b.learnerName).filter(Boolean).join(', ') : '';
    return {
      id: `adm-slot-${slot.id}`,
      dayKey: toVnDateKey(slot.startTime),
      startHour: start.hour,
      startMinute: start.minute,
      endHour: end.hour,
      endMinute: end.minute,
      title: learnerTitle || `${start.hhmm}–${end.hhmm}`,
      detail: label,
      statusLabel: label,
      tone,
      metaRows: [
        { label: 'Cố vấn', value: mentorName },
        { label: 'Trạng thái', value: label },
        paid.length > 0 && { label: 'Học viên', value: learnerTitle || trf('{0} học viên', { 0: paid.length }) },
      ].filter(Boolean),
    };
  }), [allSlots, mentorName]);

  const bookedCount = allSlots.reduce((count, slot) => count + activeBookings(slot).length, 0);

  return (
    <>
      <header className="flex items-start justify-between gap-4 border-b border-rp-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rp-brand-soft text-[13px] font-medium text-rp-brand-strong">{initials}</div>
          <div className="min-w-0">
            <h2 id="mentor-schedule-title" className="truncate text-[16px] font-semibold">{mentorName}</h2>
            <p className="mt-1 truncate text-[12px] text-rp-text-muted">{email || tr('Lịch giảng dạy')} · {bookedCount}{' '}{tr('lượt xếp lớp')}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={tr('Đóng lịch')} className="rounded-lg p-1.5 text-rp-text-muted hover:bg-rp-bg-2"><X size={19} /></button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 bg-rp-brand-tint px-5 py-2.5">
        <p className="inline-flex items-center gap-2 text-[12px] text-rp-text-2">
          <span>{tr('Giờ Việt Nam · Tự cập nhật mỗi 15 giây')}</span>
          <RefreshingIndicator active={query.isFetching && !query.isPending} label={tr('Đang cập nhật')} />
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-rp-line bg-white p-0.5">
            <button
              type="button"
              onClick={() => setDisplayMode('calendar')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium ${displayMode === 'calendar' ? 'bg-rp-brand-soft text-rp-brand-strong' : 'text-rp-text-muted'}`}
            >
              <CalendarDays size={13} />{' '}{tr('Lịch')}
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('table')}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px] font-medium ${displayMode === 'table' ? 'bg-rp-brand-soft text-rp-brand-strong' : 'text-rp-text-muted'}`}
            >
              <Table2 size={13} />{' '}{tr('Bảng ngày')}
            </button>
          </div>
          <button type="button" disabled={query.isFetching} onClick={() => query.refetch()} className={button} aria-label={tr('Làm mới lịch cố vấn')}>
            <RefreshCw size={14} className={query.isFetching ? 'animate-spin' : ''} />{' '}{tr('Làm mới')}
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-5 py-4">
        {query.isError && !query.data && (
          <ContextualErrorState variant="inline" compact error={query.error} title={tr('Không thể tải lịch giảng dạy')} onRetry={() => query.refetch()} retrying={query.isFetching} />
        )}
        {query.isError && query.data && (
          <StaleDataBar className="mb-3" onRetry={() => query.refetch()} retrying={query.isFetching} />
        )}

        {query.isPending ? (
          <div className="py-10"><SakuraLoader variant="section" context="cohort" label={tr('Đang tải lịch từ hệ thống')} delay={160} /></div>
        ) : displayMode === 'calendar' ? (
          <SakuraCalendar
            events={events}
            anchorKey={anchorKey}
            onAnchorChange={setAnchorKey}
            view={view}
            onViewChange={setView}
            onRefresh={() => query.refetch()}
            refreshing={query.isFetching}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-rp-line" aria-busy={query.isFetching}>
            <table className="w-full min-w-[520px] text-left">
              <thead className="bg-rp-bg-2 text-[12px] text-rp-text-muted">
                <tr>
                  <th className="px-3 py-2.5 font-medium">{trf('Khung giờ ({0})', { 0: anchorKey })}</th>
                  <th className="px-3 py-2.5 font-medium">{tr('Học viên / Nội dung')}</th>
                  <th className="px-3 py-2.5 text-right font-medium">{tr('Trạng thái')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rp-line">
                {daySlots.map(slot => {
                  const [label, color] = STATES[slot.status] || ['Chưa xác định', 'bg-[#A99AA1]'];
                  const paid = activeBookings(slot);
                  const visible = paid.length ? paid : (slot.bookings || []).filter(b => slot.status === 'Held' ? b.status === 'AwaitingPayment' : slot.status === 'Cancelled' && b.status === 'Cancelled');
                  return (
                    <tr key={slot.id}>
                      <td className="whitespace-nowrap px-3 py-3 text-[13px] font-medium tabular-nums text-rp-text-2">{clock(slot.startTime)}–{clock(slot.endTime)}</td>
                      <td className="px-3 py-3">
                        {visible.length ? visible.map(b => (
                          <div key={b.id} className="mb-2 last:mb-0">
                            <p className="text-[13px] font-medium">{b.learnerName || tr('Học viên chưa cập nhật tên')}</p>
                            <p className="mt-0.5 whitespace-pre-wrap break-words text-[12px] text-rp-text-muted">{b.question || tr('Khung giờ lớp nhóm')}</p>
                          </div>
                        )) : <span className="text-[12px] text-rp-text-muted">{tr('Chưa có học viên')}</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap text-[12px] text-rp-text-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${color}`} />{tr(label)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!daySlots.length && (
                  <tr><td colSpan={3} className="p-6 text-center text-sm text-rp-text-muted">{tr('Ngày này chưa có khung giờ nào được xếp cho cố vấn.')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <footer className="flex justify-end border-t border-rp-line px-5 py-3">
        <button type="button" onClick={onClose} className={button}>{tr('Đóng')}</button>
      </footer>
    </>
  );
}
